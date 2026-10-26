"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAP_STYLES, mapStyleMeta, type MapStyleId } from "@/lib/map-style";
import { cn } from "@/lib/utils";

const LABEL_KEY: Record<
  MapStyleId,
  | "styleBright"
  | "styleColorful"
  | "styleNatural"
  | "styleLiberty"
  | "styleMuted"
  | "stylePositron"
  | "styleDark"
  | "styleFiord"
> = {
  bright: "styleBright",
  colorful: "styleColorful",
  natural: "styleNatural",
  liberty: "styleLiberty",
  muted: "styleMuted",
  positron: "stylePositron",
  dark: "styleDark",
  fiord: "styleFiord",
};

function StyleSwatch({ colors, className }: { colors: [string, string, string]; className?: string }) {
  return (
    <span
      className={cn("relative inline-block overflow-hidden rounded-md ring-1 ring-ink/10", className)}
      aria-hidden
    >
      <span className="absolute inset-0" style={{ background: colors[0] }} />
      <span className="absolute inset-y-0 start-0 w-[42%]" style={{ background: colors[1] }} />
      <span
        className="absolute bottom-[18%] start-[38%] end-[8%] h-[18%] rounded-sm opacity-90"
        style={{ background: colors[2] }}
      />
    </span>
  );
}

export function MapStylePicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: MapStyleId;
  onChange: (id: MapStyleId) => void;
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("map");
  const [open, setOpen] = useState(false);
  const current = mapStyleMeta(value);
  const light = MAP_STYLES.filter((style) => style.group === "light");
  const dark = MAP_STYLES.filter((style) => style.group === "dark");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl bg-white/95 text-ink shadow-[0_10px_28px_-18px_rgba(6,36,33,0.55)] ring-1 ring-ink/10 transition hover:bg-white",
            compact ? "h-9 px-2.5" : "h-11 px-3",
            className,
          )}
          aria-label={t("style")}
        >
          <StyleSwatch colors={current.swatch} className={compact ? "size-6" : "size-7"} />
          <span className="min-w-0 text-start">
            <span className={cn("block font-medium leading-none text-mist", compact ? "text-[10px]" : "text-[10px]")}>
              {t("style")}
            </span>
            <span className={cn("mt-0.5 block truncate font-semibold leading-none", compact ? "text-[11px]" : "text-xs")}>
              {t(LABEL_KEY[value])}
            </span>
          </span>
          <svg
            viewBox="0 0 16 16"
            className={cn(
              "ms-0.5 shrink-0 text-mist transition",
              open ? "rotate-180" : "",
              compact ? "size-3" : "size-3.5",
            )}
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06Z"
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,18.5rem)] rounded-2xl border-[#d5dfd8] bg-paper p-3 shadow-[0_24px_50px_-28px_rgba(6,36,33,0.55)]"
      >
        <p className="mb-2 text-xs leading-5 text-mist">{t("styleHint")}</p>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist">
          {t("styleGroupLight")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {light.map((style) => {
            const active = style.id === value;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onChange(style.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-2 text-start transition",
                  active ? "bg-palm-deep text-[#e7f2ec]" : "bg-white hover:bg-sand",
                )}
              >
                <StyleSwatch colors={style.swatch} className="size-8 shrink-0" />
                <span className={cn("text-xs font-semibold leading-4", active ? "text-[#e7f2ec]" : "text-ink")}>
                  {t(LABEL_KEY[style.id])}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist">
          {t("styleGroupDark")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {dark.map((style) => {
            const active = style.id === value;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onChange(style.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-2 text-start transition",
                  active ? "bg-palm-deep text-[#e7f2ec]" : "bg-white hover:bg-sand",
                )}
              >
                <StyleSwatch colors={style.swatch} className="size-8 shrink-0" />
                <span className={cn("text-xs font-semibold leading-4", active ? "text-[#e7f2ec]" : "text-ink")}>
                  {t(LABEL_KEY[style.id])}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
