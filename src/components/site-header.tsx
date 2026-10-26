"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Mark } from "@/components/mark";

export function SiteHeader({
  links,
  brandName,
  brandLogo,
  deskHref,
  deskLabel,
}: {
  links: readonly (readonly [string, string])[];
  brandName: string;
  brandLogo?: string;
  deskHref?: string;
  deskLabel?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  function current(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 bg-palm-deep text-[#e7f2ec]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <Mark tone="light" src={brandLogo} alt="" />
          <span className="text-lg font-semibold tracking-tight">{brandName}</span>
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {links.map(([href, label]) => {
            const on = current(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2.5 py-1.5 text-sm transition ${on ? "bg-white/10 font-medium text-[#e4c27a]" : "text-[#d5dfd8] hover:bg-white/10 hover:text-white"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          {deskHref && deskLabel ? (
            <Link
              href={deskHref}
              className="hidden h-9 items-center rounded-lg bg-[#e4c27a] px-3 text-sm font-semibold text-palm-deep transition hover:bg-[#f0d49a] sm:inline-flex"
            >
              {deskLabel}
            </Link>
          ) : null}
          <LocaleSwitcher />
          <button
            type="button"
            className="grid h-10 place-items-center rounded-lg px-3 text-sm text-[#e7f2ec] hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("closeMenu") : t("menu")}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          {links.map(([href, label]) => {
            const on = current(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-3 text-lg ${on ? "bg-white/10 font-medium text-[#e4c27a]" : "text-[#e7f2ec] hover:bg-white/10"}`}
              >
                {label}
              </Link>
            );
          })}
          {deskHref && deskLabel ? (
            <Link
              href={deskHref}
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-[#e4c27a] px-3 py-3 text-center text-lg font-semibold text-palm-deep"
            >
              {deskLabel}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
