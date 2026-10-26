import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { EntityCard } from "@/components/catalogue/entity-card";
import { Pagination } from "@/components/catalogue/pagination";
import { fullAmount, pick, pickPlain } from "@/data/atlas";
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
    title: site.pages.projects.title,
    description: site.pages.projects.description,
    path: "/projects",
  });
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[]; area?: string | string[]; developer?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "projects" });
  const atlas = await readAtlas();
  const area = one(query.area);
  const developer = one(query.developer);
  const result = queryCatalogue(atlas, "projects", {
    page: parsePage(query.page),
    pageSize: DEFAULT_PAGE_SIZE,
    area,
    developer,
  });

  function listHref(next?: { area?: string; developer?: string }) {
    const params = new URLSearchParams();
    if (next?.area) params.set("area", next.area);
    if (next?.developer) params.set("developer", next.developer);
    const q = params.toString();
    return q ? `/projects?${q}` : "/projects";
  }

  return (
    <div>
      <PageHeader title={t("title")} kicker={t("kicker")} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap gap-2">
          <Link
            locale={locale}
            href="/projects"
            className={`rounded-lg px-3 py-2 text-sm transition ${
              !area && !developer
                ? "bg-palm-deep text-[#e7f2ec]"
                : "border border-[#c5d0c9] bg-white text-ink hover:border-palm"
            }`}
          >
            {t("all")}
          </Link>
          {atlas.areas.map((item) => (
            <Link
              locale={locale}
              key={item.id}
              href={listHref({ area: item.id })}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                area === item.id
                  ? "bg-palm-deep text-[#e7f2ec]"
                  : "border border-[#c5d0c9] bg-white text-ink hover:border-palm"
              }`}
            >
              {pick(item.names, locale)}
            </Link>
          ))}
          {atlas.developers.map((item) => (
            <Link
              locale={locale}
              key={item.id}
              href={listHref({ developer: item.id })}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                developer === item.id
                  ? "bg-palm-deep text-[#e7f2ec]"
                  : "border border-[#c5d0c9] bg-white text-ink hover:border-palm"
              }`}
            >
              {pick(item.names, locale)}
            </Link>
          ))}
        </div>

        {result.total === 0 ? (
          <p className="mt-8 text-mist">{t("empty")}</p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((project) => {
              const home = atlas.areas.find((item) => item.id === project.areaId);
              const kind =
                project.kind === "villa"
                  ? t("kindVilla")
                  : project.kind === "townhouse"
                    ? t("kindTownhouse")
                    : t("kindApartment");
              return (
                <li key={project.id}>
                  <EntityCard
                    locale={locale}
                    href={`/projects/${project.id}`}
                    image={project.image}
                    title={pick(project.names, locale)}
                    meta={`${kind} · ${home ? pick(home.names, locale) : ""} · ${t("from")} ${fullAmount(project.startPrice, project.currency, locale)}`}
                    body={pickPlain(project.about, locale)}
                    cta={t("read")}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <Pagination
          locale={locale}
          href={listHref({ area, developer })}
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
