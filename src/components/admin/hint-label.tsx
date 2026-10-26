"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HelpIcon({ hint, side = "top" }: { hint: string; side?: "top" | "bottom" | "left" | "right" }) {
  if (!hint.trim()) return null;
  return (
    <HintLabel hint={hint} side={side}>
      <button
        type="button"
        className="inline-grid size-4 shrink-0 place-items-center rounded-full border border-[#c5d0c9] bg-white text-[10px] font-semibold leading-none text-mist transition hover:border-palm hover:text-palm"
        aria-label={hint}
        onClick={(event) => event.preventDefault()}
      >
        ?
      </button>
    </HintLabel>
  );
}

export function HintLabel({
  hint,
  children,
  side = "top",
}: {
  hint: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (!hint.trim()) return children;
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-start leading-5">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message?.trim()) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-red-700" role="alert">
      <span
        className="mt-0.5 inline-grid size-3.5 shrink-0 place-items-center rounded-full bg-red-700 text-[10px] font-bold leading-none text-white"
        aria-hidden
      >
        !
      </span>
      <span>{message}</span>
    </p>
  );
}

export function FieldHint({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-sm font-medium leading-6 text-ink/80">
      <div className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        {hint ? <HelpIcon hint={hint} /> : null}
      </div>
      <div
        className={cn(
          "mt-1.5 font-normal",
          error
            ? "[&_button]:border-red-500 [&_button]:focus-visible:border-red-500 [&_button]:focus-visible:ring-red-500/25 [&_input]:border-red-500 [&_input]:focus-visible:border-red-500 [&_input]:focus-visible:ring-red-500/25 [&_textarea]:border-red-500"
            : "",
        )}
      >
        {children}
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function SectionHint({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
        {title}
        {hint ? <HelpIcon hint={hint} /> : null}
      </h3>
      {action}
    </div>
  );
}
