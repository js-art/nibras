import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { EntityCard } from "@/components/catalogue/entity-card";
import { Pagination } from "@/components/catalogue/pagination";
import { pick, pickPlain} from "@/data/atlas";
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
    title: site.pages.developers.title,
    description: site.pages.developers.description,
    path: "/developers",
  });
}

export default async function DevelopersPage({
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
  const t = await getTranslations({ locale, namespace: "developers" });
  const atlas = await readAtlas();
  const result = queryCatalogue(atlas, "developers", {
    page: parsePage(query.page),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div>
      <PageHeader title={t("title")} kicker={t("kicker")} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((developer) => (
            <li key={developer.id}>
              <EntityCard
                locale={locale}
                href={`/developers/${developer.id}`}
                image={developer.image}
                title={pick(developer.names, locale)}
                meta={`${developer.delivered.toLocaleString(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-AE")} ${t("delivered")}`}
                body={pickPlain(developer.about, locale)}
                cta={t("open")}
              />
            </li>
          ))}
        </ul>
        <Pagination
          locale={locale}
          href="/developers"
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
