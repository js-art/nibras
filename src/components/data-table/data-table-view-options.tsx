'use client';

import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import type { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';
  const t = useTranslations('common.actions');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Toggle columns"
          variant="outline"
          className={'hidden  lg:flex ltr:ml-auto rtl:mr-auto rtl:dir-rtl'}
        >
          <MixerHorizontalIcon className="size-4 rtl:ml-2 ltr:mr-2" />
          {t('view')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRtl ? 'start' : 'end'} className={'w-40 rtl:dir-rtl'}>
        <DropdownMenuLabel>{t('showHideCols.toggleColumns')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                <span className="truncate">
                  {t.has(`showHideCols.${column.id}`)
                    ? t(`showHideCols.${column.id}` as 'showHideCols.title')
                    : column.id}
                </span>
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
