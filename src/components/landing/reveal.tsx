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
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShown((current) => (current === entry.isIntersecting ? current : entry.isIntersecting)),
      { rootMargin: "-8px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
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
