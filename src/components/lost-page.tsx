"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function LostPage() {
  const t = useTranslations("lost");

  return (
    <section className="flex flex-1 flex-col justify-center bg-palm-deep px-4 py-24 text-[#e7f2ec]">
      <div className="mx-auto w-full max-w-xl">
        <div className="h-px w-12 bg-[#e4c27a]" />
        <p className="mt-6 font-display text-4xl leading-none text-[#e4c27a] sm:text-5xl">{t("code")}</p>
        <h1 className="mt-4 font-display text-2xl leading-[1.3] sm:text-3xl">{t("title")}</h1>
        <p className="mt-4 max-w-[42ch] text-base leading-8 text-[#d5dfd8]">{t("lede")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-13 items-center rounded-lg bg-[#e4c27a] px-5 text-sm font-semibold text-palm-deep transition hover:bg-white"
          >
            {t("home")}
          </Link>
          <Link
            href="/map"
            className="inline-flex h-13 items-center rounded-lg border border-[#e4c27a]/50 px-5 text-sm font-medium text-[#e7f2ec] transition hover:border-[#e4c27a] hover:text-[#e4c27a]"
          >
            {t("map")}
          </Link>
        </div>
      </div>
    </section>
  );
}
