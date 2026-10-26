import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { EntityCard } from "@/components/catalogue/entity-card";
import { areaStats, currencyOf, FALLBACK_IMAGE, fullAmount, pick, pickPlain} from "@/data/atlas"
import { ProseHtml } from "@/components/prose-html";
import { readAtlas } from "@/lib/atlas-store";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await connection();
  const atlas = await readAtlas();
  const area = atlas.areas.find((item) => item.id === slug);
  if (!area) return {};
  return pageMetadata(locale, {
    title: pick(area.names, locale),
    description: pickPlain(area.about, locale),
    image: area.image || FALLBACK_IMAGE,
    path: `/areas/${area.id}`,
  });
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const area = atlas.areas.find((item) => item.id === slug);
  if (!area) notFound();
  const t = await getTranslations({ locale, namespace: "areas" });
  const projectText = await getTranslations({ locale, namespace: "projects" });
  const city = atlas.cities.find((item) => item.id === area.cityId);
  const stats = areaStats(atlas, area.id);
  const list = atlas.projects.filter((item) => item.areaId === area.id);
  const statsCurrency = stats.currency ?? currencyOf(city?.country ?? "ae");

  return (
    <div>
      <header className="border-b border-[#d5dfd8] bg-[#e7f2ec]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <Link locale={locale} href="/areas" className="text-sm font-medium text-palm transition hover:text-palm-deep">
              {t("title")}
            </Link>
            <div className="mt-5 h-px w-12 bg-[#e4c27a]" />
            <div className="mt-4 flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: area.color }} aria-hidden />
              <h1 className="font-display text-xl leading-[1.35] text-palm-deep sm:text-2xl">
                {pick(area.names, locale)}
              </h1>
            </div>
            <ProseHtml className="mt-3 max-w-xl text-base leading-7 text-mist" html={pick(area.about, locale)} />
            {stats.count && stats.currency && !stats.mixed ? (
              <p className="mt-4 text-sm text-palm-deep">
                {t("avg")} {fullAmount(stats.avg, statsCurrency, locale)}
              </p>
            ) : null}
            <Link
              locale={locale}
              href={`/map?area=${area.id}`}
              className="mt-5 inline-flex h-13 items-center rounded-lg bg-palm-deep px-5 text-sm font-semibold text-[#e7f2ec] transition hover:bg-palm"
            >
              {t("open")}
            </Link>
          </div>
          <span className="block overflow-hidden rounded-2xl ring-1 ring-[#e4c27a]/70">
            <img src={area.image || FALLBACK_IMAGE} alt="" className="aspect-[16/10] h-auto w-full object-cover" />
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((project) => (
            <li key={project.id}>
              <EntityCard
                locale={locale}
                href={`/projects/${project.id}`}
                image={project.image}
                title={pick(project.names, locale)}
                meta={`${projectText("from")} ${fullAmount(project.startPrice, project.currency, locale)}`}
                body={pickPlain(project.about, locale)}
                cta={projectText("read")}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
