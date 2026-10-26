import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, value, ...props }: React.ComponentProps<'input'>) {
  const isControlled = value !== undefined;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex h-12 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm selection:bg-primary/30 selection:text-foreground',
        className,
      )}
      {...(isControlled ? { value: value ?? '' } : {})}
      {...props}
    />
  );
}

export { Input };







































