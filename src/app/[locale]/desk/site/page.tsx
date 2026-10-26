import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SiteDesk } from "@/components/admin/site-desk";
import { hasAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";
import { readAtlas } from "@/lib/atlas-store";
import { readSite } from "@/lib/site-store";

export const instant = false;

const tabs = ["brand", "contact", "landing", "seo"] as const;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeskSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  if (!(await hasAdminSession())) redirect(`/${locale}${DESK_PATH}/login`);
  const [site, atlas] = await Promise.all([readSite(), readAtlas()]);
  const tabRaw = one(query.tab);
  const initialTab = tabs.includes(tabRaw as (typeof tabs)[number])
    ? (tabRaw as (typeof tabs)[number])
    : "brand";

  return (
    <div className="h-dvh">
      <SiteDesk
        initial={site}
        initialTab={initialTab}
        developers={atlas.developers.map((developer) => ({
          id: developer.id,
          names: developer.names,
        }))}
      />
    </div>
  );
}
