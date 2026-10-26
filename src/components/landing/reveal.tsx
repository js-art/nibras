"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Motion =
  | "enter"
  | "rise"
  | "wipe"
  | "unroll"
  | "rule"
  | "rail"
  | "mask"
  | "settle"
  | "track";

export function Reveal({
  motion,
  delay = 0,
  className,
  children,
}: {
  motion: Motion;
  delay?: number;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || motion === "enter") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const reveal = () => {
      const box = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const onScreen = box.bottom > 8 && box.top < view - 8;
      setShown(onScreen);
    };
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
    };
  }, [motion]);

  return (
    <div
      ref={ref}
      data-motion={motion}
      data-in={shown ? "1" : "0"}
      style={{ animationDelay: `${delay}ms` }}
      className={className}
    >
      {children}
    </div>
  );
}
