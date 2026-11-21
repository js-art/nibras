"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Mark } from "@/components/mark";
import "./site-header.css";

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function current(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 bg-palm-deep text-[#e7f2ec]">
      <div className="relative z-10 mx-auto flex h-16 max-w-6xl items-center gap-2 bg-palm-deep px-3 sm:gap-4 sm:px-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2" onClick={() => setOpen(false)}>
          <Mark tone="light" src={brandLogo} alt="" className="h-10 w-9 shrink-0 sm:h-11 sm:w-10" />
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">{brandName}</span>
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
            className="menu-toggle grid h-10 w-10 place-items-center rounded-lg text-[#e7f2ec] hover:bg-white/10 lg:hidden"
            data-open={open ? "true" : "false"}
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("menu")}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="menu-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
      <div className="site-menu lg:hidden" data-open={open ? "true" : "false"} aria-hidden={open ? undefined : true}>
        <button type="button" className="site-menu-scrim" tabIndex={-1} aria-label={t("closeMenu")} onClick={() => setOpen(false)} />
        <nav className="site-menu-panel" aria-label={t("menu")}>
          {links.map(([href, label], index) => {
            const on = current(href);
            return (
              <Link
                key={href}
                href={href}
                style={{ ["--i" as string]: index }}
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
              style={{ ["--i" as string]: links.length }}
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-[#e4c27a] px-3 py-3 text-center text-lg font-semibold text-palm-deep"
            >
              {deskLabel}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
