import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { AtlasMap } from "@/components/map/atlas-map";
import { hasAdminSession } from "@/lib/admin-auth";
import { readPublicAtlas } from "@/lib/atlas-store";
import { communityVoices } from "@/lib/circle/store";
import { pageMetadata } from "@/lib/seo";
import { readSite } from "@/lib/site-store";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await connection();
  const site = await readSite();
  return pageMetadata(locale, {
    title: site.pages.map.title,
    description: site.pages.map.description,
    path: "/map",
  });
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ area?: string | string[]; city?: string | string[]; note?: string | string[]; project?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  const [atlas, voices, isAdmin] = await Promise.all([readPublicAtlas(), communityVoices(), hasAdminSession()]);

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-hidden">
      <AtlasMap
        atlas={atlas}
        locale={locale}
        initialArea={one(query.area)}
        initialCity={one(query.city)}
        initialNote={one(query.note)}
        initialProject={one(query.project)}
        community={voices}
        isAdmin={isAdmin}
      />
    </div>
  );
}
