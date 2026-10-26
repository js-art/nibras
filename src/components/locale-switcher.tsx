"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const locales = [
  { id: "en", label: "EN" },
  { id: "ar", label: "عربي" },
  { id: "fa", label: "فارسی" },
] as const;

function barePath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && routing.locales.includes(parts[0] as Locale)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

export function LocaleSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const locale = useLocale();
  const pathname = barePath(usePathname());
  const shell = tone === "light" ? "bg-ink/5" : "bg-white/10";
  const active =
    tone === "light"
      ? "bg-palm-deep font-medium text-[#e7f2ec]"
      : "bg-[#e7f2ec] font-medium text-palm-deep";
  const idle = tone === "light" ? "text-mist hover:text-ink" : "text-[#d5dfd8] hover:text-white";

  return (
    <div className={`flex items-center gap-1 rounded-lg p-1 text-sm ${shell}`}>
      {locales.map((item) => (
        <Link
          key={item.id}
          href={pathname}
          locale={item.id}
          hrefLang={item.id}
          className={`rounded-md px-2.5 py-1 ${locale === item.id ? active : idle}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
