import * as React from 'react';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';

interface DataTableSelectionBarProps<TData> {
  table: TanstackTable<TData>;
  selectionLabel: React.ReactNode;
  clearLabel: string;
  onClearSelection?: () => void;
  primaryAction?: React.ReactElement<ButtonProps>;
}

export function DataTableSelectionBar<TData>({
  table,
  selectionLabel,
  clearLabel,
  onClearSelection,
  primaryAction,
}: DataTableSelectionBarProps<TData>) {
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';

  const handleClear = React.useCallback(() => {
    if (onClearSelection) {
      onClearSelection();
      return;
    }
    table.resetRowSelection();
  }, [onClearSelection, table]);

  return (
    <div className="rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div
        className={cn('flex flex-wrap items-center justify-between gap-3', {
          'flex-row-reverse': isRtl,
        })}
      >
        <span className="text-sm text-muted-foreground">{selectionLabel}</span>
        <div
          className={cn('flex flex-wrap items-center gap-2', {
            'flex-row-reverse': isRtl,
          })}
        >
          <Button variant="outline" size="sm" onClick={handleClear}>
            {clearLabel}
          </Button>
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

