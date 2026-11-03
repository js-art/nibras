import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LeadForm } from "@/components/lead-form";
import { ProseHtml } from "@/components/prose-html";
import { FALLBACK_IMAGE, fullAmount, pick, type Atlas, type Project } from "@/data/atlas";
import { DESK_PATH } from "@/lib/desk";
import { placeLabel } from "@/lib/project-book";

export async function ProjectSheet({
  locale,
  atlas,
  project,
  admin = false,
}: {
  locale: string;
  atlas: Atlas;
  project: Project;
  /** Signed-in desk session. Shows the edit control for this project only. */
  admin?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "book" });
  const adminText = await getTranslations({ locale, namespace: "admin" });
  const projectText = await getTranslations({ locale, namespace: "projects" });
  const detail = await getTranslations({ locale, namespace: "detail" });
  const lead = await getTranslations({ locale, namespace: "lead" });
  const area = atlas.areas.find((item) => item.id === project.areaId);
  const developer = atlas.developers.find((item) => item.id === project.developerId);
  const kind =
    project.kind === "villa"
      ? projectText("kindVilla")
      : project.kind === "townhouse"
        ? projectText("kindTownhouse")
        : projectText("kindApartment");
  const price = project.startPrice > 0 ? fullAmount(project.startPrice, project.currency, locale) : t("onRequest");
  const phone = project.phone.replace(/[^\d+]/g, "");
  const whatsapp = project.whatsapp.replace(/[^\d]/g, "");
  const plans = project.brochure.plans.length
    ? project.brochure.plans
    : project.payment.length
      ? [{ id: "payment", title: { en: "", ar: "", fa: "" }, note: { en: "", ar: "", fa: "" }, steps: project.payment }]
      : [];
  const similar = atlas.projects
    .filter((item) => item.id !== project.id && (item.areaId === project.areaId || item.developerId === project.developerId))
    .slice(0, 3);

  return (
    <article>
      <header className="border-b border-[#d5dfd8] bg-[#e7f2ec]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between gap-3">
            <Link locale={locale} href="/projects" className="text-sm font-medium text-palm">
              {detail("back")}
            </Link>
            {admin ? (
              <Link
                locale={locale}
                href={`${DESK_PATH}?section=projects&id=${encodeURIComponent(project.id)}`}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-[#e4c27a] px-3 text-sm font-semibold text-palm-deep transition hover:bg-[#f0d49a]"
              >
                {adminText("editProject")}
              </Link>
            ) : null}
          </div>
          <div className="mt-5 h-px w-12 bg-[#e4c27a]" />
          <p className="mt-4 text-sm text-mist">{placeLabel(atlas, project, locale)}</p>
          <h1 className="mt-2 font-display text-xl leading-[1.35] text-palm-deep sm:text-2xl">{pick(project.names, locale)}</h1>
          {pick(project.brochure.tagline, locale).trim() ? (
            <p className="mt-2 max-w-2xl text-base leading-7 text-ink">{pick(project.brochure.tagline, locale)}</p>
          ) : null}
          <div className="mt-6 overflow-hidden rounded-lg">
            <img src={project.image || FALLBACK_IMAGE} alt="" className="aspect-[16/8] h-auto w-full object-cover" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div>
          <dl className="grid grid-cols-2 border-t border-[#d5dfd8] sm:grid-cols-4">
            {[
              [t("starting"), price],
              [t("kind"), kind],
              [t("handover"), project.handover || t("onRequest")],
              [t("structure"), project.brochure.structure || t("onRequest")],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-[#d5dfd8] py-4 pe-3">
                <dt className="text-sm text-mist">{label}</dt>
                <dd className="mt-1 text-base font-medium text-palm-deep">{value}</dd>
              </div>
            ))}
          </dl>

          {developer ? (
            <p className="mt-4 text-sm text-mist">
              <Link locale={locale} href={`/developers/${developer.id}`} className="font-medium text-palm">
                {pick(developer.names, locale)}
              </Link>
              {area ? (
                <>
                  {" · "}
                  <Link locale={locale} href={`/areas/${area.id}`} className="font-medium text-palm">
                    {pick(area.names, locale)}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {phone ? (
              <a href={`tel:${phone}`} className="inline-flex h-11 items-center rounded-lg bg-palm-deep px-4 text-sm font-medium text-[#e7f2ec]">
                {t("call")}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm font-medium text-palm-deep"
              >
                {t("whatsapp")}
              </a>
            ) : null}
            {project.brochure.mapUrl ? (
              <a
                href={project.brochure.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm font-medium text-palm-deep"
              >
                {t("openMap")}
              </a>
            ) : null}
          </div>

          {project.brochure.highlights.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("highlights")}</h2>
              <ul className="mt-4 divide-y divide-[#d5dfd8] border-t border-[#d5dfd8]">
                {project.brochure.highlights.map((key) => (
                  <li key={key} className="py-3 text-sm text-ink">
                    {t(`highlight.${key}`)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ProseHtml className="mt-8 max-w-2xl text-base leading-8 text-ink" html={pick(project.about, locale)} />

          {project.units.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("homes")}</h2>
              <ul className="mt-4 divide-y divide-[#d5dfd8] border-t border-[#d5dfd8]">
                {project.units.map((unit) => (
                  <li key={unit.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3 text-sm">
                    <span>{unit.beds === "studio" ? t("studio") : t("bedCount", { count: unit.beds })}</span>
                    <span className="font-medium text-palm-deep">
                      {unit.priceFrom > 0 ? fullAmount(unit.priceFrom, project.currency, locale) : t("onRequest")}
                      {unit.sizeMax > 0 ? ` · ${unit.sizeMin}–${unit.sizeMax} sq ft` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {plans.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("plans")}</h2>
              <div className="mt-4 space-y-8">
                {plans.map((plan) => (
                  <div key={plan.id}>
                    {pick(plan.title, locale).trim() ? (
                      <h3 className="text-base font-medium text-palm-deep">{pick(plan.title, locale)}</h3>
                    ) : null}
                    {pick(plan.note, locale).trim() ? (
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-mist">{pick(plan.note, locale)}</p>
                    ) : null}
                    <ul className="mt-3 border-t border-[#d5dfd8]">
                      {plan.steps.map((step, index) => (
                        <li key={`${plan.id}-${index}`} className="flex justify-between gap-4 border-b border-[#d5dfd8] py-3 text-sm">
                          <span>{pick(step.label, locale)}</span>
                          <span className="font-medium text-palm-deep">{step.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {project.brochure.amenities.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("amenities")}</h2>
              <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
                {project.brochure.amenities.map((key) => (
                  <li key={key} className="border-b border-[#d5dfd8] py-3 text-sm text-ink">
                    {t(`amenity.${key}`)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {project.brochure.files.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("downloads")}</h2>
              <ul className="mt-4 border-t border-[#d5dfd8]">
                {project.brochure.files.map((file) => (
                  <li key={file.id} className="border-b border-[#d5dfd8] py-3">
                    <a href={file.url} className="text-sm font-medium text-palm" download>
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {similar.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl leading-snug text-palm-deep">{t("similar")}</h2>
              <ul className="mt-4 divide-y divide-[#d5dfd8] border-t border-[#d5dfd8]">
                {similar.map((item) => (
                  <li key={item.id} className="py-3">
                    <Link locale={locale} href={`/projects/${item.id}`} className="text-sm font-medium text-palm-deep">
                      {pick(item.names, locale)}
                    </Link>
                    <p className="mt-1 text-sm text-mist">{placeLabel(atlas, item, locale)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="h-fit rounded-lg border border-[#d5dfd8] bg-white p-5 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
          <p className="mb-3 text-sm font-medium text-palm">{detail("agent")}</p>
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
            <Link locale={locale} href={`/map?area=${project.areaId}`} className="mt-4 inline-block text-sm font-medium text-palm">
              {t("areaOnMap")}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
