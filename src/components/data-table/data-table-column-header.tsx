import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon, EyeNoneIcon } from '@radix-ui/react-icons';
import { type Column } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const t = useTranslations('common.table');
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={
              column.getIsSorted() === 'desc'
                ? 'Sorted descending. Click to sort ascending.'
                : column.getIsSorted() === 'asc'
                ? 'Sorted ascending. Click to sort descending.'
                : 'Not sorted. Click to sort ascending.'
            }
            variant="ghost"
            size="sm"
            className="h-8 text-palm-deep/85 hover:bg-white/70 data-[state=open]:bg-white ltr:-ml-3 rtl:ml-3"
          >
            <span>{title}</span>
            {column.getCanSort() && column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="size-4 rtl:mr-2 ltr:ml-2" aria-hidden="true" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="size-4 ltr:ml-2 rtl:mr-2" aria-hidden="true" />
            ) : (
              <CaretSortIcon className="size-4 ltr:ml-2 rtl:mr-2" aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRtl ? 'end' : 'start'}
          className={cn({
            'dir-rtl': isRtl,
          })}
        >
          {column.getCanSort() && (
            <>
              <DropdownMenuItem
                aria-label="Sort ascending"
                onClick={() => column.toggleSorting(false)}
              >
                <ArrowUpIcon
                  className={cn('size-3.5 text-muted-foreground/70', {
                    'mr-2': !isRtl,
                    'ml-2': isRtl,
                  })}
                  aria-hidden="true"
                />
                {t('asc')}
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label="Sort descending"
                onClick={() => column.toggleSorting(true)}
              >
                <ArrowDownIcon
                  className={cn('size-3.5 text-muted-foreground/70', {
                    'mr-2': !isRtl,
                    'ml-2': isRtl,
                  })}
                  aria-hidden="true"
                />
                {t('desc')}
              </DropdownMenuItem>
            </>
          )}
          {column.getCanSort() && column.getCanHide() && <DropdownMenuSeparator />}
          {column.getCanHide() && (
            <DropdownMenuItem
              aria-label="Hide column"
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeNoneIcon
                className={cn('size-3.5 text-muted-foreground/70', {
                  'mr-2': !isRtl,
                  'ml-2': isRtl,
                })}
                aria-hidden="true"
              />
              {t('hide')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
