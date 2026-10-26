'use client';

import * as React from 'react';
import type { DataTableFilterField } from '@/types';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Search } from 'lucide-react';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/custom/inputs';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { useLocale, useTranslations } from 'next-intl';

interface DataTableToolbarProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  table: TanstackTable<TData>;
  filterFields?: DataTableFilterField<TData>[];
  onReset?: () => void;
  showResetButton?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  filterFields = [],
  children,
  className,
  onReset,
  showResetButton = true,
  ...props
}: DataTableToolbarProps<TData>) {
  const t = useTranslations('common');

  const isFiltered = table.getState().columnFilters.length > 0;
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';
  // Memoize computation of searchableColumns and filterableColumns
  const { searchableColumns, filterableColumns } = React.useMemo(() => {
    return {
      searchableColumns: filterFields.filter((field) => !field.options),
      filterableColumns: filterFields.filter((field) => field.options),
    };
  }, [filterFields]);

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 w-full flex-1 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {searchableColumns.length > 0 &&
          searchableColumns.map((column) => {
            const tableColumn = column.value ? table.getColumn(String(column.value)) : undefined;
            if (!tableColumn) return null;

            return (
              <div key={String(column.value)} className="w-full min-w-0 sm:w-auto sm:shrink-0">
                <Input
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  inputDir={isRtl ? 'rtl' : 'ltr'}
                  leftIcon={
                    !isRtl ? (
                      <Search className="size-[18px] text-muted-foreground" aria-hidden />
                    ) : undefined
                  }
                  rightIcon={
                    isRtl ? (
                      <Search className="size-[18px] text-muted-foreground" aria-hidden />
                    ) : undefined
                  }
                  placeholder={
                    column.placeholder ??
                    t('table.filter.placeholder.search')
                  }
                  value={(tableColumn.getFilterValue() as string) ?? ''}
                  onChange={(event) => tableColumn.setFilterValue(event.target.value)}
                  className={cn(
                    'w-full sm:w-40 lg:w-64',
                    'border-border/80 bg-background/80 shadow-sm transition-[border-color,box-shadow]',
                    'hover:border-muted-foreground/35',
                    'focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:shadow-sm',
                    '[&::-webkit-search-cancel-button]:hidden',
                  )}
                />
              </div>
            );
          })}
        {filterableColumns.length > 0 &&
          filterableColumns.map((column) => {
            const tableColumn = column.value ? table.getColumn(String(column.value)) : undefined;
            if (!tableColumn) return null;

            return (
              <div key={String(column.value)} className="w-full min-w-0 sm:w-auto sm:shrink-0">
                <DataTableFacetedFilter
                  column={tableColumn}
                  title={column.label}
                  options={column.options ?? []}
                />
              </div>
            );
          })}
        {isFiltered && showResetButton && (
          <Button
            aria-label="Reset filters"
            variant="ghost"
            className={cn('shrink-0 px-2 lg:px-3 flex', {
              'flex-row-reverse': isRtl,
            })}
            onClick={() => {
              if (onReset) {
                onReset();
              } else {
                table.resetColumnFilters();
              }
            }}
          >
            {t('reset')}
            <Cross2Icon
              className={cn('size-4 ', {
                'mr-2 ': !isRtl,
                'ml-2 ': isRtl,
              })}
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
