import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { EntityCard } from "@/components/catalogue/entity-card";
import { Pagination } from "@/components/catalogue/pagination";
import { areaStats, currencyOf, fullAmount, pick, pickPlain} from "@/data/atlas";
import { readAtlas } from "@/lib/atlas-store";
import { DEFAULT_PAGE_SIZE, parsePage, queryCatalogue } from "@/lib/catalogue-page";
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
    title: site.pages.areas.title,
    description: site.pages.areas.description,
    path: "/areas",
  });
}

export default async function AreasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "areas" });
  const atlas = await readAtlas();
  const result = queryCatalogue(atlas, "areas", {
    page: parsePage(query.page),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div>
      <PageHeader title={t("title")} kicker={t("kicker")} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((area) => {
            const city = atlas.cities.find((item) => item.id === area.cityId);
            const stats = areaStats(atlas, area.id);
            const statsCurrency = stats.currency ?? currencyOf(city?.country ?? "ae");
            return (
              <li key={area.id}>
                <EntityCard
                  locale={locale}
                  href={`/areas/${area.id}`}
                  image={area.image}
                  accent={area.color}
                  title={pick(area.names, locale)}
                  meta={
                    stats.count
                      ? stats.currency && !stats.mixed
                        ? `${stats.count} ${t("projects")} · ${t("avg")} ${fullAmount(stats.avg, statsCurrency, locale)}`
                        : `${stats.count} ${t("projects")}`
                      : undefined
                  }
                  body={pickPlain(area.about, locale)}
                  cta={t("read")}
                />
              </li>
            );
          })}
        </ul>
        <Pagination
          locale={locale}
          href="/areas"
          page={result.page}
          pageCount={result.pageCount}
          prevLabel={t("prev")}
          nextLabel={t("next")}
          pageLabel={(page, pages) => t("pageOf", { page, pages })}
        />
      </div>
    </div>
  );
}
