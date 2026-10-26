"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";

export const controlClass =
  "h-13 w-full min-w-0 rounded-lg border border-[#c5d0c9] bg-white px-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#5c6b63] hover:border-[#8eaa9c] focus-visible:border-palm focus-visible:ring-[3px] focus-visible:ring-palm/30 disabled:cursor-not-allowed disabled:bg-[#f3f6f4] disabled:text-ink/45";

export const areaClass =
  "min-h-28 w-full resize-y rounded-lg border border-[#c5d0c9] bg-white px-3 py-3 text-sm leading-7 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#5c6b63] hover:border-[#8eaa9c] focus-visible:border-palm focus-visible:ring-[3px] focus-visible:ring-palm/30 disabled:cursor-not-allowed disabled:bg-[#f3f6f4]";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="font-normal">{children}</div>
    </label>
  );
}

export function Input({ type, className = "", ...props }: React.ComponentProps<"input">) {
  const locale = useLocale();
  const [shown, setShown] = useState(false);
  const password = type === "password";
  const hide = locale === "fa" ? "پنهان کردن رمز" : locale === "ar" ? "إخفاء كلمة السر" : "Hide password";
  const show = locale === "fa" ? "نشان دادن رمز" : locale === "ar" ? "إظهار كلمة السر" : "Show password";

  return (
    <div className="relative flex items-center">
      <input
        type={password && shown ? "text" : type}
        className={`${controlClass} ${password ? "pe-12" : ""} ${className}`}
        {...props}
      />
      {password ? (
        <button
          type="button"
          className="absolute end-3 grid size-8 place-items-center text-[#3e5248]"
          aria-label={shown ? hide : show}
          onClick={() => setShown((value) => !value)}
        >
          {shown ? <EyeOff /> : <Eye />}
        </button>
      ) : null}
    </div>
  );
}

export function Textarea({ className = "", ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={`${areaClass} ${className}`} {...props} />;
}

export function Select({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "",
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = options.find((option) => option.value === value);
  const empty = !current;

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(72, window.innerHeight - rect.bottom - 8),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    place();
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (root.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function move() {
      place();
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", move);
    window.addEventListener("scroll", move, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", move);
      window.removeEventListener("scroll", move, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        ref={buttonRef}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        aria-invalid={invalid || undefined}
        className={`${controlClass} flex cursor-pointer items-center justify-between gap-2 text-start disabled:cursor-not-allowed ${empty ? "text-[#5c6b63]" : ""} ${
          invalid
            ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/25"
            : open
              ? "border-palm ring-[3px] ring-palm/30"
              : ""
        }`}
      >
        <span className="truncate">{current?.label || placeholder}</span>
        <Chevron className={`size-4 shrink-0 text-[#3e5248] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && box
        ? createPortal(
        <ul
          ref={menuRef}
          role="listbox"
          style={{
            position: "fixed",
            top: box.top,
            left: box.left,
            width: box.width,
            maxHeight: box.maxHeight,
            margin: 0,
            zIndex: 80,
          }}
          className="overflow-auto rounded-lg border border-[#c5d0c9] bg-white py-1 shadow-[0_12px_28px_-12px_rgba(7,31,22,0.45)]"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm ${selected ? "bg-palm/10 font-medium text-palm-deep" : "text-ink hover:bg-[#f3f6f4]"}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? <Check /> : null}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )
        : null}
    </div>
  );
}

export function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-13 items-center gap-3 rounded-lg border border-[#c5d0c9] bg-white px-3 focus-within:border-palm focus-within:ring-[3px] focus-within:ring-palm/30">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
      />
      <span className="font-mono text-sm tracking-wide text-ink">{value}</span>
    </label>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none">
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-palm" aria-hidden="true" fill="none">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" fill="none">
      <path d="M2.5 12S6.5 6.5 12 6.5 21.5 12 21.5 12 17.5 17.5 12 17.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" fill="none">
      <path d="M4 5.5 19 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.2 8.2A8.8 8.8 0 0 1 12 7.5c5.5 0 9.5 5.5 9.5 5.5a16 16 0 0 1-3.2 3.3M6.1 9.2C3.8 10.8 2.5 13 2.5 13S6.5 18.5 12 18.5c1.1 0 2.1-.2 3-.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
