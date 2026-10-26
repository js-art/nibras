import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { EntityCard } from "@/components/catalogue/entity-card";
import { currencyOf, FALLBACK_IMAGE, fullAmount, pick, pickPlain} from "@/data/atlas"
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
  const developer = atlas.developers.find((item) => item.id === slug);
  if (!developer) return {};
  return pageMetadata(locale, {
    title: pick(developer.names, locale),
    description: pickPlain(developer.about, locale),
    image: developer.image || FALLBACK_IMAGE,
    path: `/developers/${developer.id}`,
  });
}

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const developer = atlas.developers.find((item) => item.id === slug);
  if (!developer) notFound();
  const t = await getTranslations({ locale, namespace: "developers" });
  const projectText = await getTranslations({ locale, namespace: "projects" });
  const list = atlas.projects.filter((item) => item.developerId === developer.id);

  return (
    <div>
      <header className="border-b border-[#d5dfd8] bg-[#e7f2ec]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <Link locale={locale} href="/developers" className="text-sm font-medium text-palm transition hover:text-palm-deep">
              {t("title")}
            </Link>
            <div className="mt-5 h-px w-12 bg-[#e4c27a]" />
            <h1 className="mt-4 font-display text-xl leading-[1.35] text-palm-deep sm:text-2xl">
              {pick(developer.names, locale)}
            </h1>
            <ProseHtml className="mt-3 max-w-xl text-base leading-7 text-mist" html={pick(developer.about, locale)} />
            <p className="mt-3 text-sm text-[#e4c27a]">
              {developer.delivered.toLocaleString(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-AE")}{" "}
              {t("delivered")}
            </p>
          </div>
          <span className="block overflow-hidden rounded-2xl ring-1 ring-[#e4c27a]/70">
            <img src={developer.image || FALLBACK_IMAGE} alt="" className="aspect-[16/10] h-auto w-full object-cover" />
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((project) => {
            const area = atlas.areas.find((item) => item.id === project.areaId);
            return (
              <li key={project.id}>
                <EntityCard
                  locale={locale}
                  href={`/projects/${project.id}`}
                  image={project.image}
                  title={pick(project.names, locale)}
                  meta={`${area ? pick(area.names, locale) : ""} · ${projectText("from")} ${fullAmount(project.startPrice, project.currency, locale)}`}
                  body={pickPlain(project.about, locale)}
                  cta={projectText("read")}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
