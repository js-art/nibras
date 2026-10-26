"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function Spire({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 84 176" className={className} fill="none" stroke="currentColor" strokeWidth="1.05">
      <path d="M10 164 H74" />
      <path d="M16 164 V132 H68 V164" />
      <path d="M16 148 H68" />
      <path d="M24 132 V86 H60 V132" />
      <path d="M24 102 H60 M24 118 H60" />
      <path d="M30 86 V48 H54 V86" />
      <path d="M30 62 H54 M30 74 H54" />
      <path d="M36 48 V28 H48 V48" />
      <path d="M40 28 V12 H44 V28" />
    </svg>
  );
}

function Tower({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 72 140" className={className} fill="none" stroke="currentColor" strokeWidth="1.15">
      <path d="M27 132 V34 H45 V132" />
      <path d="M17 132 V56 H55 V132" />
      <path d="M17 76 H55 M17 96 H55 M17 116 H55" />
      <path d="M31 34 V18 H41 V34" />
    </svg>
  );
}

function Pavilion({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 168 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.15">
      <path d="M2 12 H166 V26 H2 Z" />
      <path d="M30 26 V62 M138 26 V62" />
      <path d="M8 72 H160" />
    </svg>
  );
}

function Slab({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 156 84" className={className} fill="none" stroke="currentColor" strokeWidth="1.15">
      <path d="M6 16 H150 V40 H6 Z" />
      <path d="M30 40 V64 H126 V40" />
      <path d="M52 64 V76 H104" />
    </svg>
  );
}

const marks = {
  spire: Spire,
  tower: Tower,
  pavilion: Pavilion,
  slab: Slab,
} as const;

export function BuildingMark({
  kind,
  tone = "brass",
  className = "",
}: {
  kind: keyof typeof marks;
  tone?: "brass" | "palm";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const Mark = marks[kind];
  const ink = tone === "palm" ? "text-palm" : "text-[#e4c27a]";

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const paint = () => {
      const box = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      setLive(box.bottom > 8 && box.top < view - 8);
    };
    paint();
    window.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    return () => {
      window.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.querySelectorAll("path").forEach((path) => path.setAttribute("pathLength", "1"));
  }, []);

  return (
    <div ref={ref} data-ink={live ? "1" : "0"} className={`pointer-events-none ${ink} ${className}`} aria-hidden>
      <Mark className="bldg h-auto w-full" />
    </div>
  );
}

export function SectionScene({
  film = false,
  children,
}: {
  film?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const paint = () => {
      const box = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const enter = box.bottom > view * 0.18 && box.top < view * 0.82;
      const leave = box.bottom < view * 0.04 || box.top > view * 0.96;
      setLive((current) => (enter ? true : leave ? false : current));
    };
    paint();
    window.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    return () => {
      window.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!live) {
      video.pause();
      return;
    }
    const start = () => {
      video.play().catch(() => undefined);
    };
    if (video.readyState >= 2) start();
    else video.addEventListener("canplay", start, { once: true });
    return () => video.removeEventListener("canplay", start);
  }, [live]);

  return (
    <div ref={ref} data-live={live ? "1" : "0"} className="relative">
      {film ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
            poster="/video/hero-poster.jpg"
          >
            <source src="/video/section.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--palm-deep)]/90 via-[var(--palm-deep)]/72 to-[var(--palm-deep)]/92" />
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
