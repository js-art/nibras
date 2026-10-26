import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import { type Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale, useTranslations } from 'next-intl';

import { toPersianNumbers } from '@/lib/persian-date';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps<TData>) {
  const t = useTranslations('common.table');
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8"
    >
      <div className="flex-1 whitespace-nowrap text-sm text-muted-foreground">
        {t('rowsSelected', {
          count: isRtl
            ? toPersianNumbers(table.getFilteredSelectedRowModel().rows.length)
            : table.getFilteredSelectedRowModel().rows.length,
          total: isRtl
            ? toPersianNumbers(table.getFilteredRowModel().rows.length)
            : table.getFilteredRowModel().rows.length,
        })}
      </div>
      <div
        className={cn(
          'flex flex-col-reverse items-center gap-4 sm:gap-6 lg:gap-8',
          isRtl ? 'sm:flex-row-reverse' : 'sm:flex-row',
        )}
      >
        <div className="flex items-center gap-2">
          <p className="whitespace-nowrap text-sm font-medium">{t('rowsPerPage')}</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger
              className={cn(
                'h-8 w-12 shrink-0 px-2 [&_svg]:size-3.5',
                isRtl && 'text-end',
              )}
            >
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent
              side="top"
              dir={isRtl ? 'rtl' : 'ltr'}
              className="min-w-0 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
            >
              {pageSizeOptions.map((pageSize) => (
                <SelectItem
                  key={pageSize}
                  value={`${pageSize}`}
                  className="justify-center py-1 ps-6 pe-1.5 text-center"
                >
                  {isRtl ? toPersianNumbers(pageSize) : pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          {t('pagination', {
            page: isRtl
              ? toPersianNumbers(table.getState().pagination.pageIndex + 1)
              : table.getState().pagination.pageIndex + 1,
            totalPages: isRtl ? toPersianNumbers(table.getPageCount()) : table.getPageCount(),
          })}
        </div>
        <div className="flex items-center gap-2" dir={isRtl ? 'rtl' : 'ltr'}>
          <Button
            aria-label="Go to first page"
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {isRtl ? (
              <DoubleArrowRightIcon className="size-4" aria-hidden="true" />
            ) : (
              <DoubleArrowLeftIcon className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {isRtl ? (
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            ) : (
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {isRtl ? (
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {isRtl ? (
              <DoubleArrowLeftIcon className="size-4" aria-hidden="true" />
            ) : (
              <DoubleArrowRightIcon className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
