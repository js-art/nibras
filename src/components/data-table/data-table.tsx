'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { flexRender, type Row, type Table as TanstackTable } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import {
  DataTableRowActionsProvider,
  useDataTableRowActions,
  useDataTableRowActionsRef,
} from '@/components/data-table/data-table-row-actions-context';
import { useLocale, useTranslations } from 'next-intl';
import { getCommonPinningStyles } from '@/lib/data-table';

interface DataTableProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  table: TanstackTable<TData>;
  floatingBar?: React.ReactNode | null;
  totalItems?: number;
  /** When true and there are no rows yet, show loading instead of empty state. */
  isLoading?: boolean;
}

function RowContextMenuPortal({
  open,
  x,
  y,
  isRtl,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  isRtl: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('common.table');
  const actions = useDataTableRowActions();
  const actionsRef = useDataTableRowActionsRef();
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const maxX = Math.max(8, window.innerWidth - 200);
  const maxY = Math.max(8, window.innerHeight - 240);
  const left = Math.min(Math.max(8, x), maxX);
  const top = Math.min(Math.max(8, y), maxY);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        'fixed z-[100] min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        isRtl && 'dir-rtl',
      )}
      style={{ left, top }}
    >
      <div className={cn('px-2 py-1.5 text-sm font-semibold', isRtl && 'text-right')}>
        {t('rowActions')}
      </div>
      {actions.length === 0 ? (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('noRowActions')}</div>
      ) : (
        actions.map((action, index) => {
          if (action.type === 'separator') {
            return <div key={`sep-${index}`} className="-mx-1 my-1 h-px bg-muted" />;
          }
          const Icon = action.icon;
          return (
            <button
              key={`${action.label}-${index}`}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full cursor-default items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent',
                action.destructive && 'text-red-600 hover:text-red-600',
                isRtl && 'flex-row-reverse text-right',
              )}
              onClick={() => {
                const latest = actionsRef?.current[index];
                if (latest && latest.type === 'item') latest.onClick();
                else action.onClick();
                onClose();
              }}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    action.destructive ? 'text-red-600' : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
              ) : null}
              <span className="min-w-0 flex-1">{action.label}</span>
            </button>
          );
        })
      )}
    </div>,
    document.body,
  );
}

function DataTableBodyRow<TData>({
  row,
  isRtl,
  table,
}: {
  row: Row<TData>;
  isRtl: boolean;
  table: TanstackTable<TData>;
}) {
  const t = useTranslations('common.table');
  const [menu, setMenu] = React.useState<{ x: number; y: number } | null>(null);
  const rowClassName = (
    table.options.meta as { getRowClassName?: (row: Row<TData>) => string } | undefined
  )?.getRowClassName?.(row);

  return (
    <DataTableRowActionsProvider>
      <TableRow
        data-state={row.getIsSelected() && 'selected'}
        title={t('rowContextHint')}
        className={cn(
          'border-[#e8efe9] transition-colors hover:bg-[#f0f7f3] data-[state=selected]:bg-[#e7f2ec]',
          rowClassName,
        )}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        {row.getVisibleCells().map((cell) => {
          const isActions = cell.column.id === 'actions';
          return (
            <TableCell
              isRtl={isRtl}
              key={cell.id}
              data-column-id={cell.column.id}
              className={cn(isActions && 'whitespace-nowrap')}
              style={{
                ...getCommonPinningStyles({ column: cell.column, isRtl }),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
      <RowContextMenuPortal
        open={menu != null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        isRtl={isRtl}
        onClose={() => setMenu(null)}
      />
    </DataTableRowActionsProvider>
  );
}

export function DataTable<TData>({
  table,
  floatingBar = null,
  totalItems: _totalItems,
  isLoading: isLoadingProp,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const t = useTranslations('common.table');
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';
  const hasSelection = table.getFilteredSelectedRowModel().rows.length > 0;
  const metaIsLoading = Boolean(
    (table.options.meta as { isLoading?: boolean } | undefined)?.isLoading,
  );
  const isLoading = isLoadingProp ?? metaIsLoading;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('w-full space-y-3', className)} {...props}>
      <div className="overflow-hidden rounded-2xl border border-[#d5dfd8] bg-white shadow-[0_16px_40px_-28px_rgba(6,36,33,0.55)]">
        {children ? (
          <div className="border-b border-[#e4ece7] bg-gradient-to-b from-[#f7fbf8] to-[#f2f7f4] px-3 py-3">
            {children}
          </div>
        ) : null}
        {hasSelection && floatingBar}
        <div className="overflow-x-auto table-scroll">
          <Table
            overflow={false}
            className={cn({
              'dir-rtl': isRtl,
            })}
          >
            <TableHeader className="bg-[#eef4f0] [&_tr]:border-[#dce6e0]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const isActions = header.column.id === 'actions';
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        data-column-id={header.column.id}
                        className={cn(
                          'h-12 text-sm font-semibold tracking-wide text-palm-deep/80',
                          isActions && 'whitespace-nowrap',
                        )}
                        style={{
                          ...getCommonPinningStyles({ column: header.column, isRtl }),
                        }}
                        isRtl={isRtl}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {rows?.length ? (
                rows.map((row) => (
                  <DataTableBodyRow key={row.id} row={row} isRtl={isRtl} table={table} />
                ))
              ) : isLoading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`} className="hover:bg-transparent">
                    {Array.from({ length: Math.max(visibleColumnCount, 1) }).map((_, colIndex) => (
                      <TableCell key={`loading-${rowIndex}-${colIndex}`} isRtl={isRtl}>
                        <Skeleton className="h-4 w-full max-w-[12rem]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    isRtl={isRtl}
                    colSpan={Math.max(visibleColumnCount, 1)}
                    className="h-28 text-center text-mist"
                  >
                    {t('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-[#e4ece7] bg-[#f7fbf8] px-3 py-2.5">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
