'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Clearer than a bare ⋯ icon — looks like a real menu control. */
export const DataTableRowActionsTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    label: string;
    className?: string;
  } & Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children' | 'variant' | 'size'>
>(function DataTableRowActionsTrigger({ label, className, type = 'button', ...props }, ref) {
  return (
    <Button
      ref={ref}
      type={type}
      variant="outline"
      size="sm"
      className={cn('h-8 gap-1 px-2.5 text-xs font-medium shadow-none', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Button>
  );
});

DataTableRowActionsTrigger.displayName = 'DataTableRowActionsTrigger';
