"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Select } from "@/components/ui/controls";
import { BuildingMark } from "@/components/landing/section-scene";
import { Reveal } from "@/components/landing/reveal";

export type HeroArea = {
  id: string;
  country: "ae" | "om";
  name: string;
  image: string;
  price: string;
};

export function HeroEntry({
  poster,
  areas,
  map,
  title,
  lede,
}: {
  poster: string;
  areas: HeroArea[];
  map: ReactNode;
  title?: string;
  lede?: string;
}) {
  const t = useTranslations("hero");
  const [country, setCountry] = useState<"ae" | "om">("ae");
  const shown = areas.filter((area) => area.country === country).slice(0, 4);
  const lead = shown[0];

  return (
    <section className="bg-palm-deep text-[#e7f2ec]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-8 pt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch lg:pt-20">
        <div className="flex min-h-0 flex-col">
          <div className="h-px w-12 bg-[#e4c27a]" />
          <div className="mt-6 inline-flex max-w-full items-center gap-3.5 font-display text-3xl leading-[1.3] sm:gap-4 sm:text-4xl sm:leading-[1.25]">
            <BuildingMark kind="spire" className="hidden w-[1.25em] shrink-0 sm:block" />
            <h1 className="min-w-0 text-inherit">{title ?? t("title")}</h1>
          </div>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#d5dfd8] sm:text-lg">{lede ?? t("lede")}</p>
          <label className="mt-8 grid max-w-sm gap-2">
            <span className="text-sm font-medium text-[#d5dfd8]">{t("country")}</span>
            <Select
              value={country}
              onChange={(value) => setCountry(value === "om" ? "om" : "ae")}
              options={[
                { value: "ae", label: t("uae") },
                { value: "om", label: t("oman") },
              ]}
            />
          </label>
          <p className="mt-3 text-sm leading-6 text-[#d5dfd8]">
            {country === "ae" ? t("currencyAe") : t("currencyOm")}
          </p>
          <div className="mt-8 lg:mt-auto lg:pt-10">
            <Link
              href="/map"
              className="inline-flex h-12 items-center rounded-lg bg-[#e4c27a] px-5 text-sm font-semibold text-palm-deep transition hover:bg-white"
            >
              {t("mapCta")}
            </Link>
          </div>
        </div>
        <div className="group/map relative min-h-[22rem] overflow-hidden rounded-2xl ring-1 ring-white/15 transition duration-500 sm:min-h-[26rem] lg:min-h-0 lg:h-full hover:ring-[#e4c27a]/45">
          {country === "ae" ? (
            map
          ) : lead ? (
            <Link href={`/map?area=${lead.id}`} className="relative block h-full min-h-[22rem] sm:min-h-[26rem] lg:min-h-full">
              <img src={lead.image || poster} alt="" className="h-full w-full object-cover transition duration-700 ease-out group-hover/map:scale-[1.03]" />
              <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--palm-deep)] to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                <span>
                  <span className="block text-sm text-[#e4c27a]">{lead.price}</span>
                  <span className="mt-1 block font-display text-3xl">{lead.name}</span>
                </span>
                <span className="mb-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 text-[#e7f2ec] backdrop-blur-sm transition group-hover/map:border-[#e4c27a] group-hover/map:bg-[#e4c27a] group-hover/map:text-palm-deep">
                  <svg viewBox="0 0 24 24" className="size-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          ) : (
            <img src={poster} alt="" className="h-full min-h-[22rem] w-full object-cover sm:min-h-[26rem]" />
          )}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <h2 className="font-display text-2xl text-[#e7f2ec]">{t("areasLabel")}</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {shown.map((area, index) => (
            <li key={area.id}>
              <Reveal motion="rise" delay={index * 70}>
              <Link href={`/map?area=${area.id}`} className="group relative block overflow-hidden rounded-2xl">
                <img
                  src={area.image || poster}
                  alt=""
                  className="aspect-[3/4] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--palm-deep)] from-35% to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block text-sm text-[#e4c27a]">{area.price}</span>
                  <span className="mt-1 block font-display text-xl leading-tight text-[#e7f2ec] sm:text-2xl">{area.name}</span>
                </span>
              </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
