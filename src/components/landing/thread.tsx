"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function Thread({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = root.current;
    const line = fill.current;
    if (!node || !line) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paint = () => {
      if (reduced) {
        line.style.transform = "scaleY(1)";
        return;
      }
      const box = node.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const passed = Math.min(Math.max(-box.top, 0), Math.max(total, 0));
      const progress = total > 0 ? passed / total : 1;
      line.style.transform = `scaleY(${progress})`;
    };

    paint();
    if (reduced) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 z-20 hidden w-px origin-top sm:block start-[max(0px,calc((100%-72rem)/2-3rem))]"
        aria-hidden
      >
        <div className="h-full w-px bg-[#e4c27a]/30" />
        <div ref={fill} className="absolute inset-0 origin-top bg-[#e4c27a]" />
      </div>
      {children}
    </div>
  );
}
