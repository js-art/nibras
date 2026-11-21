"use client";

import { useState } from "react";

export function ProjectRoom({
  href,
  title,
  lede,
  openLabel,
  closeLabel,
}: {
  href: string;
  title: string;
  lede: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl leading-snug text-palm-deep">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-mist">{lede}</p>
      <button
        type="button"
        className="mt-4 inline-flex h-11 items-center rounded-lg bg-palm-deep px-4 text-sm font-medium text-[#e7f2ec]"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? closeLabel : openLabel}
      </button>
      {open ? (
        <iframe
          className="mt-4 h-[min(72dvh,720px)] w-full overflow-hidden rounded-2xl border border-[#d5dfd8] bg-[#e7f2ec] shadow-[0_16px_36px_rgba(6,36,33,0.08)]"
          src={href}
          title={title}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          allowFullScreen
        />
      ) : null}
    </section>
  );
}
