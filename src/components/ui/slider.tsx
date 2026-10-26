'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { trackClassName?: string }
>(({ className, trackClassName, value, ...props }, ref) => {
  // Determine if this is a range slider (array with 2 values) or single value slider
  const isRange = Array.isArray(value) && value.length === 2;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex h-5 w-full touch-none select-none items-center', className)}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn('relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200', trackClassName)}
      >
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      {isRange && (
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      )}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
