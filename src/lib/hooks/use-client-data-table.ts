"use client";

import * as React from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import type { DataTableFilterField } from "@/types";
import { dataTableRowId } from "@/lib/hooks/data-table-row-id";

type UseClientDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  filterFields?: DataTableFilterField<TData>[];
  initialPageSize?: number;
  initialSorting?: SortingState;
  isLoading?: boolean;
};

/** Client-side DataTable hook (same UI as app-multi, no URL sync). */
export function useClientDataTable<TData>({
  data,
  columns,
  filterFields = [],
  initialPageSize = 10,
  initialSorting = [],
  isLoading = false,
}: UseClientDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const searchable = React.useMemo(
    () => filterFields.filter((field) => !field.options).map((field) => String(field.value)),
    [filterFields],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: initialPageSize },
      sorting: initialSorting,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: dataTableRowId,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!needle) return true;
      const keys = searchable.length ? searchable : Object.keys(row.original as object);
      return keys.some((key) =>
        String((row.original as Record<string, unknown>)[key] ?? "")
          .toLowerCase()
          .includes(needle),
      );
    },
    meta: { isLoading },
  });

  return { table };
}
