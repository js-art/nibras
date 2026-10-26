import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LeadForm } from "@/components/lead-form";
import { FALLBACK_IMAGE, fullAmount, pick, pickPlain } from "@/data/atlas";
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
  const project = atlas.projects.find((item) => item.id === slug);
  if (!project) return {};
  return pageMetadata(locale, {
    title: pick(project.names, locale),
    description: pickPlain(project.about, locale),
    image: project.image || FALLBACK_IMAGE,
    path: `/projects/${project.id}`,
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const project = atlas.projects.find((item) => item.id === slug);
  if (!project) notFound();
  const area = atlas.areas.find((item) => item.id === project.areaId);
  const developer = atlas.developers.find((item) => item.id === project.developerId);
  const city = atlas.cities.find((item) => item.id === area?.cityId);
  const currency = project.currency;
  const t = await getTranslations({ locale, namespace: "detail" });
  const projectText = await getTranslations({ locale, namespace: "projects" });
  const desk = await getTranslations({ locale, namespace: "desk" });
  const lead = await getTranslations({ locale, namespace: "lead" });
  const kind =
    project.kind === "villa"
      ? projectText("kindVilla")
      : project.kind === "townhouse"
        ? projectText("kindTownhouse")
        : projectText("kindApartment");

  return (
    <article className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:gap-12 lg:py-12">
      <div>
        <Link locale={locale} href="/projects" className="text-sm font-medium text-palm transition hover:text-palm-deep">
          {t("back")}
        </Link>
        <div className="mt-5 h-px w-12 bg-[#e4c27a]" />
        <p className="mt-4 text-sm text-mist">
          {area ? pick(area.names, locale) : ""}
          {developer ? ` · ${pick(developer.names, locale)}` : ""}
        </p>
        <h1 className="mt-2 font-display text-xl leading-[1.35] text-palm-deep sm:text-2xl">
          {pick(project.names, locale)}
        </h1>
        <span className="mt-6 block overflow-hidden rounded-2xl ring-1 ring-[#e4c27a]/70">
          <img src={project.image || FALLBACK_IMAGE} alt="" className="aspect-[16/10] h-auto w-full object-cover" />
        </span>
        <ProseHtml className="mt-6 max-w-2xl text-base leading-8 text-ink sm:text-lg" html={pick(project.about, locale)} />
        <dl className="mt-8 grid grid-cols-2 border-t border-[#e4c27a]/50 sm:grid-cols-4">
          {[
            [projectText("from"), fullAmount(project.startPrice, currency, locale)],
            [desk("kind"), kind],
            [projectText("handover"), project.handover],
            [desk("unitCount"), String(project.unitCount)],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[#e4c27a]/40 py-4 pe-3">
              <dt className="text-sm text-mist">{label}</dt>
              <dd className="mt-1 text-base font-medium text-palm-deep sm:text-lg">{value}</dd>
            </div>
          ))}
        </dl>
        {project.payment.length ? (
          <>
            <h2 className="mt-10 font-display text-xl leading-snug text-palm-deep sm:text-2xl">{desk("payment")}</h2>
            <ul className="mt-4 space-y-3 border-t border-[#d5dfd8]">
              {project.payment.map((step, index) => (
                <li key={`${step.percent}-${index}`} className="flex justify-between gap-4 border-b border-[#d5dfd8] py-3 text-sm">
                  <span>{pick(step.label, locale)}</span>
                  <span className="font-medium text-palm-deep">{step.percent}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div className="h-fit rounded-2xl border border-[#d5dfd8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(7,31,22,0.45)] lg:sticky lg:top-24">
        <p className="mb-4 text-sm font-medium text-palm">{t("agent")}</p>
        <LeadForm
          projectId={project.id}
          labels={{
            title: lead("title"),
            lede: lead("lede"),
            name: lead("name"),
            email: lead("email"),
            budget: lead("budget"),
            note: lead("note"),
            submit: lead("submit"),
            done: lead("done"),
          }}
        />
        {area ? (
          <Link
            locale={locale}
            href={`/map?area=${project.areaId}`}
            className="mt-4 inline-block text-sm font-medium text-palm transition hover:text-palm-deep"
          >
            {pick(area.names, locale)}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
