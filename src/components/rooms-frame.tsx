"use client";

import { useEffect, useState } from "react";

export function RoomsFrame({
  src,
  locale,
  title,
  retryLabel,
}: {
  src: string;
  locale: "fa" | "en" | "ar";
  title: string;
  retryLabel: string;
}) {
  const [down, setDown] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    setFrameSrc(src);
    let gone = false;
    fetch(src, { redirect: "manual" })
      .then((response) => {
        if (!gone) setDown(response.status >= 500);
      })
      .catch(() => {
        if (!gone) setDown(true);
      });
    return () => {
      gone = true;
    };
  }, [locale, src]);

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full max-w-full overflow-hidden bg-[#eef3f0]">
      {down ? null : (
        <iframe
          title={title}
          src={frameSrc}
          className="block h-full w-full max-w-full border-0 bg-white"
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          allowFullScreen
        />
      )}
      {down ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <a href={src} className="inline-flex h-13 items-center rounded-lg bg-palm-deep px-5 text-sm font-semibold text-[#e7f2ec]">
            {retryLabel}
          </a>
        </div>
      ) : null}
    </div>
  );
}
