"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DataTableFilterField } from "@/types"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type PaginationState,
  type SortingState,
  type TableOptions,
  type TableState,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"
import { useLocale } from "next-intl"

import { useDebounce } from "./useDebounce"
import { dataTableRowId } from "./data-table-row-id"

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "pageCount"
    | "getCoreRowModel"
    | "manualFiltering"
    | "manualPagination"
    | "manualSorting"
  >,
  Required<Pick<TableOptions<TData>, "pageCount">> {
  /**
   * Defines filter fields for the table. Supports both dynamic faceted filters and search filters.
   * - Faceted filters are rendered when `options` are provided for a filter field.
   * - Otherwise, search filters are rendered.
   *
   * The indie filter field `value` represents the corresponding column name in the database table.
   * @default []
   * @type { label: string, value: keyof TData, placeholder?: string, options?: { label: string, value: string, icon?: React.ComponentType<{ className?: string }> }[] }[]
   * @example
   * ```ts
   * // Render a search filter
   * const filterFields = [
   *   { label: "Title", value: "title", placeholder: "Search titles" }
   * ];
   * // Render a faceted filter
   * const filterFields = [
   *   {
   *     label: "Status",
   *     value: "status",
   *     options: [
   *       { label: "Todo", value: "todo" },
   *       { label: "In Progress", value: "in-progress" },
   *       { label: "Done", value: "done" },
   *       { label: "Canceled", value: "canceled" }
   *     ]
   *   }
   * ];
   * ```
   */
  filterFields?: DataTableFilterField<TData>[]

  /**
   * Enable notion like column filters.
   * Advanced filters and column filters cannot be used at the same time.
   * @default false
   * @type boolean
   */
  enableAdvancedFilter?: boolean

  /**
   * When true and the table has no rows, DataTable shows a loading skeleton
   * instead of the empty "no results" state.
   */
  isLoading?: boolean

  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: {
      id: Extract<keyof TData, string>
      desc: boolean
    }[]
  }
}

const searchParamsSchema = z.object({
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().optional(),
  sort: z.string().optional(),
})

export function useDataTable<TData>({
  pageCount = -1,
  filterFields = [],
  enableAdvancedFilter = false,
  isLoading = false,
  ...props
}: UseDataTableProps<TData>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const isRtl = locale === "ar" || locale === "fa"

  // Search params
  const search = searchParamsSchema.parse(Object.fromEntries(searchParams))
  const page = search.page
  const perPage =
    search.per_page ?? props.initialState?.pagination?.pageSize ?? 10
  const initialSortId = props.initialState?.sorting?.[0]?.id as string | undefined
  const initialSortDesc = !!props.initialState?.sorting?.[0]?.desc
  const sort =
    search.sort ?? (initialSortId ? `${initialSortId}.${initialSortDesc ? "desc" : "asc"}` : undefined)
  const [column, order] = sort?.split(".") ?? []

  // Memoize computation of searchableColumns and filterableColumns
  const { searchableColumns, filterableColumns } = React.useMemo(() => {
    return {
      searchableColumns: filterFields.filter((field) => !field.options),
      filterableColumns: filterFields.filter((field) => field.options),
    }
  }, [filterFields])

  // Create query string
  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString())

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      }

      return newSearchParams.toString()
    },
    [searchParams]
  )

  // Initial column filters
  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    return Array.from(searchParams.entries()).reduce<ColumnFiltersState>(
      (filters, [key, value]) => {
        const filterableColumn = filterableColumns.find(
          (column) => column.value === key
        )
        const searchableColumn = searchableColumns.find(
          (column) => column.value === key
        )

        if (filterableColumn) {
          filters.push({
            id: key,
            value: value.split("."),
          })
        } else if (searchableColumn) {
          filters.push({
            id: key,
            value: [value],
          })
        }

        return filters
      },
      []
    )
  }, [filterableColumns, searchableColumns, searchParams])

  // Keep select then actions at the reading-start edge (right in RTL, left in LTR).
  // Do not sticky-pin them: RTL sticky offsets were overlapping neighboring cells and
  // breaking the actions dropdown hit-target.
  const columns = React.useMemo(() => {
    const cols = (props.columns ?? []) as ColumnDef<TData, unknown>[]
    const idOf = (col: ColumnDef<TData, unknown>) => {
      if (col.id) return col.id
      if ("accessorKey" in col && col.accessorKey != null) {
        return String(col.accessorKey)
      }
      return undefined
    }
    const selectCols = cols.filter((col) => idOf(col) === "select")
    const actionCols = cols.filter((col) => idOf(col) === "actions")
    if (selectCols.length === 0 && actionCols.length === 0) return cols
    const rest = cols.filter((col) => {
      const id = idOf(col)
      return id !== "select" && id !== "actions"
    })
    // DOM order: select → actions → rest.
    // With dir=rtl on the table, the first columns render on the physical right.
    return [...selectCols, ...actionCols, ...rest]
  }, [props.columns])

  // Table states
  const [rowSelection, setRowSelection] = React.useState({})
  const selectionPageRef = React.useRef({ pageIndex: page - 1, pageSize: perPage })
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(props.initialState?.columnVisibility || {})
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters)
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    () => props.initialState?.columnPinning ?? { left: [], right: [] },
  )

  // Handle server-side pagination
  const [{ pageIndex, pageSize }, setPagination] =
    React.useState<PaginationState>({
      pageIndex: page - 1,
      pageSize: perPage,
    })

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  )

  // Selection keys are record ids. Drop them when the page changes so a checked
  // row on page 1 cannot stay checked on a different record after paging.
  React.useEffect(() => {
    const previous = selectionPageRef.current
    if (previous.pageIndex === pageIndex && previous.pageSize === pageSize) return
    selectionPageRef.current = { pageIndex, pageSize }
    setRowSelection({})
  }, [pageIndex, pageSize])

  // Handle server-side sorting
  const [sorting, setSorting] = React.useState<SortingState>(
    column ? [{ id: column, desc: order === "desc" }] : []
  )

  const paginationReady = React.useRef(false)

  React.useEffect(() => {
    // The first run is the current URL. Replacing it here drops a language
    // filter that was just written, because this effect still sees the old query.
    if (!paginationReady.current) {
      paginationReady.current = true
      return
    }
    const params = new URLSearchParams(
      typeof window === "undefined" ? searchParams.toString() : window.location.search,
    )
    params.set("page", String(pageIndex + 1))
    params.set("per_page", String(pageSize))
    if (sorting[0]?.id) {
      params.set("sort", `${sorting[0].id}.${sorting[0].desc ? "desc" : "asc"}`)
    } else {
      params.delete("sort")
    }
    const next = params.toString()
    const current = (
      typeof window === "undefined" ? searchParams.toString() : window.location.search
    ).replace(/^\?/, "")
    if (next === current) return
    router.replace(`${pathname}?${next}`, { scroll: false })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, sorting])

  // Handle server-side filtering
  const debouncedSearchableColumnFilters = JSON.parse(
    useDebounce<string>(
      JSON.stringify(
        columnFilters.filter((filter) => {
          return searchableColumns.find((column) => column.value === filter.id)
        })
      ),
      500
    )
  ) as ColumnFiltersState

  const filterableColumnFilters = columnFilters.filter((filter) => {
    return filterableColumns.find((column) => column.value === filter.id)
  })

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // Opt out when advanced filter is enabled, because it contains additional params
    if (enableAdvancedFilter) return

    // Prevent resetting the page on initial render
    if (!mounted) {
      setMounted(true)
      return
    }

    // Initialize new params
    const newParamsObject = {
      page: 1,
    }

    // Handle debounced searchable column filters
    for (const column of debouncedSearchableColumnFilters) {
      const raw = Array.isArray(column.value) ? column.value[0] : column.value
      const text = typeof raw === "string" ? raw.trim() : ""
      if (text) {
        Object.assign(newParamsObject, { [column.id]: text })
      }
    }

    // Handle filterable column filters
    for (const column of filterableColumnFilters) {
      if (typeof column.value === "object" && Array.isArray(column.value)) {
        Object.assign(newParamsObject, { [column.id]: column.value.join(".") })
      }
    }

    // Remove deleted values
    //@ts-ignore
    for (const key of searchParams.keys()) {
      if (
        (searchableColumns.find((column) => column.value === key) &&
          !debouncedSearchableColumnFilters.find(
            (column) => column.id === key
          )) ||
        (filterableColumns.find((column) => column.value === key) &&
          !filterableColumnFilters.find((column) => column.id === key))
      ) {
        Object.assign(newParamsObject, { [key]: null })
      }
    }

    // After cumulating all the changes, push new params
    router.replace(`${pathname}?${createQueryString(newParamsObject)}`, { scroll: false })

    table.setPageIndex(0)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(debouncedSearchableColumnFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(filterableColumnFilters),
  ])

  // TanStack Table returns unstable function references; React Compiler skips memoizing this hook.
  const table = useReactTable({
    ...props,
    columns,
    pageCount,
    meta: {
      ...(props.meta as Record<string, unknown> | undefined),
      isLoading,
    },
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      columnPinning,
    },
    enableRowSelection: true,
    enableColumnPinning: true,
    getRowId: props.getRowId ?? dataTableRowId,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  return { table }
}
