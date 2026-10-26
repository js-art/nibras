"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Thread({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    const line = fill.current;
    if (!node || !line) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      line.style.transform = "scaleY(1)";
      return;
    }
    let frame = 0;
    const paint = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const passed = Math.min(Math.max(-box.top, 0), Math.max(total, 0));
      const progress = total > 0 ? passed / total : 1;
      line.style.transform = `scaleY(${progress})`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };
    paint();
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
      <div className="pointer-events-none absolute inset-y-0 start-3 z-10 hidden w-px sm:block lg:start-6" aria-hidden>
        <div className="h-full w-px bg-[#e4c27a]/30" />
        <div ref={fill} className="absolute inset-x-0 top-0 h-full w-px origin-top bg-[#e4c27a]" style={{ transform: "scaleY(0)" }} />
      </div>
      {children}
    </div>
  );
}
