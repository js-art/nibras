"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { DESK_PATH } from "@/lib/desk";
import { cn } from "@/lib/utils";

export type DeskId = "atlas" | "site" | "users";

type DeskSidebarProps = {
  desk: DeskId;
  brand?: string;
  /** Sections inside the current desk — only these use an “active” highlight. */
  items?: { id: string; label: string; active?: boolean; onSelect: () => void }[];
};

const DESKS: { id: DeskId; href: string; labelKey: "deskAtlas" | "deskSite" | "deskUsers" }[] = [
  { id: "atlas", href: DESK_PATH, labelKey: "deskAtlas" },
  { id: "site", href: `${DESK_PATH}/site`, labelKey: "deskSite" },
  { id: "users", href: `${DESK_PATH}/users`, labelKey: "deskUsers" },
];

export function DeskSidebar({ desk, brand = "Jolom", items = [] }: DeskSidebarProps) {
  const t = useTranslations("admin");
  const router = useRouter();

  function signOut() {
    void fetch("/api/admin/logout", { method: "POST" }).then(() => {
      router.replace(`${DESK_PATH}/login`);
      router.refresh();
    });
  }

  return (
    <nav className="flex w-56 shrink-0 flex-col bg-palm-deep text-paper" aria-label={t("deskNavLabel")}>
      <div className="border-b border-white/10 px-4 pb-4 pt-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-paper/45 uppercase">{brand}</p>
        <p className="mt-1 text-sm text-paper/70">{t("deskNavHint")}</p>

        <div
          className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-black/20 p-1"
          role="tablist"
          aria-label={t("deskWorkspace")}
        >
          {DESKS.map((item) => {
            const on = desk === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                role="tab"
                aria-selected={on}
                className={cn(
                  "rounded-lg px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors",
                  on
                    ? "bg-[#e7f2ec] text-palm-deep shadow-sm"
                    : "text-paper/65 hover:bg-white/10 hover:text-paper",
                )}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        {items.length ? (
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/40">
              {t("deskSections")}
            </p>
            <div className="flex flex-col gap-0.5" role="navigation" aria-label={t("deskSections")}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-start text-sm transition-colors",
                    item.active
                      ? "bg-white/15 font-medium text-paper"
                      : "text-paper/70 hover:bg-white/10 hover:text-paper",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-2 text-sm leading-6 text-paper/55">{t("deskEmptyHint")}</p>
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 flex flex-col gap-0.5">
          <Link
            href="/map"
            className="rounded-lg px-3 py-2 text-sm text-paper/65 transition-colors hover:bg-white/10 hover:text-paper"
          >
            {t("backMap")}
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm text-paper/65 transition-colors hover:bg-white/10 hover:text-paper"
          >
            {t("home")}
          </Link>
        </div>
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/40">
          {t("deskLanguage")}
        </p>
        <LocaleSwitcher />
        <button
          type="button"
          onClick={signOut}
          className="mt-3 w-full rounded-lg px-3 py-2.5 text-start text-sm text-paper/50 transition-colors hover:bg-white/10 hover:text-paper"
        >
          {t("logout")}
        </button>
      </div>
    </nav>
  );
}
