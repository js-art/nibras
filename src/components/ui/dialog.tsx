'use client';

import { cn } from '@/lib/utils';
import {
  preventDismissIfSelectMenu,
  SelectPortalContainerProvider,
} from '@/components/custom/select/select-portal';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = ({ ...props }: DialogPrimitive.DialogPortalProps) => (
  <DialogPrimitive.Portal {...props} />
);
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  hideClose?: boolean;
  /**
   * When true, clicks/focus outside never dismiss the dialog.
   * Use for forms with portaled selects so the search field stays usable
   * and accidental backdrop clicks don’t discard work.
   */
  disableOutsideDismiss?: boolean;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  {
    className,
    children,
    dir,
    overlayClassName,
    hideClose = false,
    disableOutsideDismiss = false,
    onPointerDownOutside,
    onInteractOutside,
    onFocusOutside,
    ...props
  },
  ref,
) {
  const [selectPortalHost, setSelectPortalHost] = React.useState<HTMLDivElement | null>(null);

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        dir={dir}
        onPointerDownOutside={(e) => {
          if (disableOutsideDismiss) {
            e.preventDefault();
          } else {
            preventDismissIfSelectMenu(e, e.target);
          }
          onPointerDownOutside?.(e);
        }}
        onInteractOutside={(e) => {
          if (disableOutsideDismiss) {
            e.preventDefault();
          } else {
            preventDismissIfSelectMenu(e, e.target);
          }
          onInteractOutside?.(e);
        }}
        onFocusOutside={(e) => {
          if (disableOutsideDismiss) {
            e.preventDefault();
          } else {
            preventDismissIfSelectMenu(e, e.target);
          }
          onFocusOutside?.(e);
        }}
        className={cn(
          'fixed left-[50%] top-[50%] z-[200] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full',
          className,
        )}
        {...props}
      >
        <SelectPortalContainerProvider container={selectPortalHost}>
          {children}
          {/*
            Portaled Select menus mount here (inside the dialog focus scope)
            instead of document.body, so searchable inputs can receive focus/typing.
          */}
          <div
            ref={setSelectPortalHost}
            data-select-portal-host=""
            className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
          />
        </SelectPortalContainerProvider>
        {!hideClose ? (
          <DialogPrimitive.Close
            className={cn(
              'absolute top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground',
              dir === 'rtl' ? 'left-4' : 'right-4',
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center ltr:sm:text-left rtl:sm:text-right rtl:mt-4',
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    // No tracking-tight: negative letter-spacing breaks FA/AR connected glyphs.
    className={cn('text-lg font-semibold leading-snug', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
