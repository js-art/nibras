"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HintLabel } from "@/components/admin/hint-label";

type Paint = { palm: string; deep: string };

const STORAGE = "nibras-palette";

const offers: Array<Paint & { name: string }> = [
  { name: "نخل", palm: "#0f6a40", deep: "#071f16" },
  { name: "زمرد", palm: "#0e8a4f", deep: "#06301c" },
  { name: "یشم", palm: "#0f7a72", deep: "#062421" },
  { name: "کاج", palm: "#1f6a3c", deep: "#0b2416" },
  { name: "زیتون", palm: "#6b7c2a", deep: "#1c220c" },
  { name: "شب", palm: "#0c5c6e", deep: "#061c24" },
  { name: "سرمه", palm: "#1a3f78", deep: "#08111f" },
  { name: "نیلی", palm: "#2f4aa8", deep: "#0f1630" },
  { name: "سیاه‌اب", palm: "#3d4a5c", deep: "#12161d" },
  { name: "ماسه", palm: "#a67c52", deep: "#2a1c12" },
  { name: "کهربا", palm: "#b7791f", deep: "#2a1a08" },
  { name: "مس", palm: "#b85c38", deep: "#2a140e" },
  { name: "گِل", palm: "#8b4a3a", deep: "#1f120f" },
  { name: "عناب", palm: "#8e2f3a", deep: "#210c10" },
  { name: "انار", palm: "#a12a4a", deep: "#240914" },
  { name: "ارغوان", palm: "#6e3a7a", deep: "#1a0f1f" },
];

const fallback = offers.find((offer) => offer.name === "یشم") ?? offers[0];

function isHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function deepen(hex: string) {
  const bits = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((bits >> shift) & 255) * 0.28)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function readSaved(): Paint | null {
  const raw = window.localStorage.getItem(STORAGE);
  if (!raw) return null;
  if (isHex(raw)) return { palm: raw.toLowerCase(), deep: deepen(raw) };
  try {
    const parsed = JSON.parse(raw) as Partial<Paint>;
    if (parsed.palm && parsed.deep && isHex(parsed.palm) && isHex(parsed.deep)) {
      return { palm: parsed.palm.toLowerCase(), deep: parsed.deep.toLowerCase() };
    }
  } catch {
    return null;
  }
  return null;
}

function writePaint(paint: Paint) {
  const root = document.documentElement;
  root.style.setProperty("--palm", paint.palm);
  root.style.setProperty("--palm-deep", paint.deep);
}

export function PalmTuner() {
  const panelId = useId();
  const [paint, setPaint] = useState<Paint>(fallback);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function apply(next: Paint, remember: boolean) {
    const color = { palm: next.palm.toLowerCase(), deep: next.deep.toLowerCase() };
    writePaint(color);
    setPaint(color);
    if (inputRef.current) inputRef.current.value = color.palm;
    if (remember) window.localStorage.setItem(STORAGE, JSON.stringify(color));
    else window.localStorage.removeItem(STORAGE);
  }

  function openPanel() {
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
  }

  function closePanel() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 220);
  }

  useEffect(() => {
    const saved = readSaved();
    if (saved) apply(saved, true);
    return () => {
      document.documentElement.style.removeProperty("--palm");
      document.documentElement.style.removeProperty("--palm-deep");
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) closePanel();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="fixed bottom-20 end-4 z-50">
      {!open ? (
        <HintLabel hint="پالت رنگ سایت" side="left">
          <button
            type="button"
            onClick={openPanel}
            aria-label="پالت رنگ"
            aria-expanded={false}
            aria-controls={panelId}
            className="group grid size-11 place-items-center rounded-full bg-palm-deep text-[#e4c27a] shadow-[0_12px_28px_-14px_rgba(7,31,22,0.95)] ring-1 ring-white/15 transition duration-300 ease-out hover:-translate-y-0.5 hover:ring-[#e4c27a]/50"
          >
            <span
              className="size-5 rounded-full ring-2 ring-[#e4c27a]/70 ring-offset-2 ring-offset-palm-deep transition duration-300 group-hover:scale-110"
              style={{ background: `conic-gradient(from 20deg, ${paint.palm}, ${paint.deep}, #e4c27a, ${paint.palm})` }}
              aria-hidden
            />
          </button>
        </HintLabel>
      ) : (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="پالت رنگ"
          className={`w-[min(18.5rem,calc(100vw-2rem))] origin-bottom-left rounded-2xl bg-palm-deep p-3.5 text-[#e7f2ec] shadow-[0_22px_48px_-20px_rgba(7,31,22,0.95)] ring-1 ring-white/10 transition duration-200 ease-out rtl:origin-bottom-right ${
            visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="size-4 rounded-full"
                style={{ background: `linear-gradient(160deg, ${paint.palm} 0 50%, ${paint.deep} 50% 100%)` }}
                aria-hidden
              />
              <p className="text-sm font-medium text-[#e4c27a]">پالت</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="grid size-8 place-items-center rounded-full text-[#d5dfd8] transition hover:bg-white/10 hover:text-white"
              aria-label="بستن پالت"
            >
              ×
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-4">
            {offers.map((offer) => {
              const on = paint.palm === offer.palm && paint.deep === offer.deep;
              return (
                <button
                  key={offer.name}
                  type="button"
                  onClick={() => apply(offer, true)}
                  aria-label={offer.name}
                  aria-pressed={on}
                  className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${on ? "bg-white/10 text-[#e4c27a]" : "text-[#d5dfd8] hover:bg-white/5"}`}
                >
                  <span
                    className={`block h-8 w-full rounded-md ring-2 ring-offset-2 ring-offset-palm-deep transition ${on ? "ring-[#e4c27a]" : "ring-transparent"}`}
                    style={{ background: `linear-gradient(160deg, ${offer.palm} 0 46%, ${offer.deep} 46% 100%)` }}
                  />
                  <span className="text-[10px] leading-none">{offer.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <input
              ref={inputRef}
              type="color"
              value={paint.palm}
              onChange={(event) => {
                const hex = event.target.value.toLowerCase();
                if (isHex(hex)) apply({ palm: hex, deep: deepen(hex) }, true);
              }}
              aria-label="انتخاب رنگ دلخواه"
              className="h-8 w-10 shrink-0 cursor-pointer border-0 bg-transparent"
            />
            <span className="min-w-0 flex-1 font-mono text-sm text-[#e4c27a]">{paint.palm}</span>
            <button
              type="button"
              onClick={() => apply(fallback, false)}
              className="rounded-md px-2 py-1 text-sm text-[#d5dfd8] transition hover:bg-white/10 hover:text-white"
            >
              بازگشت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
