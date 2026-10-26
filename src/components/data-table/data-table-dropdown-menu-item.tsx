'use client';

import type { ComponentType } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function DataTableDropdownMenuItem({
  isRtl,
  label,
  icon: Icon,
  onClick,
  destructive = false,
  className,
}: {
  isRtl: boolean;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <DropdownMenuItem
      className={cn(
        'gap-1.5 px-2 py-1.5',
        destructive && 'text-red-600 focus:text-red-600',
        className,
      )}
      onClick={onClick}
    >
      {Icon ? (
        isRtl ? (
          <>
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                destructive ? 'text-red-600' : className ? 'text-current' : 'text-muted-foreground',
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-right">{label}</span>
          </>
        ) : (
          <>
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                destructive ? 'text-red-600' : className ? 'text-current' : 'text-muted-foreground',
              )}
              aria-hidden
            />
            {label}
          </>
        )
      ) : (
        <span className={cn('w-full', isRtl && 'text-right')}>{label}</span>
      )}
    </DropdownMenuItem>
  );
}
