import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AreaMap } from "@/components/map/area-map";
import { HeroEntry, type HeroArea } from "@/components/landing/hero-entry";
import { Reveal } from "@/components/landing/reveal";
import { BuildingMark, SectionScene } from "@/components/landing/section-scene";
import { Thread } from "@/components/landing/thread";
import { Seam } from "@/components/landing/wave";
import { shortMillions } from "@/data/catalogue";
import { currencyOf, fullAmount, pick, shortAmount, type Atlas, pickPlain} from "@/data/atlas";
import { hasAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";
import { readAtlas } from "@/lib/atlas-store";
import { catalogueCopy } from "@/lib/copy-maps";
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
    title: site.pages.home.title,
    description: site.pages.home.description,
    path: "",
  });
}

function areaCards(atlas: Atlas, locale: string): HeroArea[] {
  const countryOf = new Map(atlas.cities.map((city) => [city.id, city.country]));
  return atlas.areas.map((area) => {
    const country = countryOf.get(area.cityId) === "om" ? "om" : "ae";
    const prices = atlas.projects.filter((item) => item.areaId === area.id).map((item) => item.startPrice);
    const min = prices.length ? Math.min(...prices) : 0;
    return {
      id: area.id,
      country,
      name: pick(area.names, locale),
      image: area.image,
      price: min ? shortAmount(min, currencyOf(country)) : "",
    };
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const site = await readSite();
  const admin = await hasAdminSession();
  const hero = await getTranslations({ locale, namespace: "hero" });
  const projectText = await getTranslations({ locale, namespace: "projects" });
  const developerText = await getTranslations({ locale, namespace: "developers" });
  const adminText = await getTranslations({ locale, namespace: "admin" });
  const mapLabels = await getTranslations({ locale, namespace: "map" });
  const copy = await catalogueCopy(locale);
  const landing = site.landing;
  const steps = landing.steps.map((step) => ({
    title: pick(step.title, locale),
    body: pick(step.body, locale),
  }));
  const notes = landing.journalItems.map((item) => ({
    title: pick(item.title, locale),
    excerpt: pick(item.excerpt, locale),
  }));
  const frames = atlas.projects.slice(0, 3);
  const featuredIds = landing.featuredDeveloperIds;
  const shownDevelopers = (
    featuredIds.length
      ? featuredIds
          .map((id) => atlas.developers.find((developer) => developer.id === id))
          .filter((developer): developer is (typeof atlas.developers)[number] => Boolean(developer))
      : atlas.developers
  ).slice(0, 4);
  const prices = atlas.projects.map((item) => item.startPrice);
  const priceFloor = prices.length ? Math.min(...prices) : 0;
  const priceCeil = prices.length ? Math.max(...prices) : 0;

  return (
    <Thread>
      {admin ? (
        <div className="bg-palm-deep px-4 py-2 text-center text-sm text-[#e7f2ec]">
          <Link locale={locale} href={`${DESK_PATH}/site`} className="font-medium text-[#e4c27a] underline-offset-2 hover:underline">
            {adminText("editLanding")}
          </Link>
        </div>
      ) : null}

      <HeroEntry
        poster="/video/hero-poster.jpg"
        areas={areaCards(atlas, locale)}
        title={pick(landing.heroTitle, locale)}
        lede={pick(landing.heroLede, locale)}
        map={
          <AreaMap
            locale={locale}
            mode="teaser"
            names={copy.areaNames}
            bodies={copy.areaBodies}
            projectNames={copy.projectNames}
            labels={{
              min: mapLabels("min"),
              max: mapLabels("max"),
              avg: mapLabels("avg"),
              count: mapLabels("count"),
              edit: mapLabels("edit"),
              done: mapLabels("done"),
              color: mapLabels("color"),
              story: mapLabels("story"),
              save: mapLabels("save"),
              reset: mapLabels("reset"),
              open: hero("mapCta"),
              pins: mapLabels("pins"),
              back: mapLabels("back"),
            }}
          />
        }
      />

      <Seam base="var(--palm-deep)" into="var(--palm-deep)" variant="a" />

      <section className="overflow-hidden bg-palm-deep text-[#e7f2ec]">
        <SectionScene film>
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <div className="flex items-start justify-between gap-10">
              <div className="min-w-0">
                <Reveal motion="rule" className="h-px w-16 bg-[#e4c27a]" />
                <Reveal motion="rise" className="max-w-2xl">
                  <h2 className="mt-6 font-display text-3xl leading-[1.3] sm:text-4xl">
                    {pick(landing.projectsTitle, locale)}
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-8 text-[#d5dfd8]">
                    {pick(landing.projectsLede, locale)}
                  </p>
                </Reveal>
                <Link locale={locale} href="/projects" className="mt-5 inline-block text-sm font-medium text-[#e4c27a]">
                  {projectText("all")}
                </Link>
              </div>
              <BuildingMark kind="tower" className="mt-2 hidden w-16 shrink-0 sm:block" />
            </div>
            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {frames.map((project, index) => {
                const area = atlas.areas.find((item) => item.id === project.areaId);
                return (
                  <li key={project.id}>
                    <Reveal motion="mask" delay={index * 90}>
                      <Link
                        locale={locale}
                        href={`/projects/${project.id}`}
                        className="group block overflow-hidden rounded-2xl ring-1 ring-[#e4c27a]/50 transition hover:ring-[#e4c27a]"
                      >
                        <span className="block overflow-hidden">
                          <img
                            src={project.image}
                            alt=""
                            className="aspect-[16/10] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
                          />
                        </span>
                        <span className="block bg-palm-deep/80 p-4">
                          <span className="block text-sm text-[#e4c27a]">{area ? pick(area.names, locale) : ""}</span>
                          <span className="mt-1 block font-display text-2xl leading-tight text-[#e7f2ec]">
                            {pick(project.names, locale)}
                          </span>
                          <span className="mt-1 block text-sm text-[#d5dfd8]">
                            {projectText("from")} {fullAmount(project.startPrice, project.currency, locale)}
                          </span>
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </SectionScene>
      </section>

      <Seam base="var(--palm-deep)" into="#e7f2ec" variant="b" />

      <section className="overflow-hidden bg-[#e7f2ec]">
        <SectionScene>
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 lg:grid-cols-2 lg:py-20">
            <div>
              <Reveal motion="rule" className="h-px w-16 bg-[#e4c27a]" />
              <Reveal motion="rise">
                <h2 className="mt-6 font-display text-3xl leading-[1.3] text-palm-deep sm:text-4xl">
                  {pick(landing.pathTitle, locale)}
                </h2>
                <p className="mt-4 max-w-md text-base leading-8 text-mist">{pick(landing.pathLede, locale)}</p>
              </Reveal>
              <ol className="mt-8 border-t border-[#e4c27a]">
                {steps.map((step, index) => (
                  <li key={step.title} className="border-b border-[#e4c27a]/70 py-5">
                    <Reveal motion="rail" delay={index * 70}>
                      <h3 className="font-display text-2xl leading-tight text-palm-deep">{step.title}</h3>
                      <p className="mt-2 text-base leading-7 text-ink">{step.body}</p>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <BuildingMark kind="pavilion" tone="palm" className="mb-8 hidden w-40 sm:block" />
              <Reveal motion="rule" className="h-px w-16 bg-palm" />
              <Reveal motion="rise">
                <h2 className="mt-6 font-display text-3xl leading-[1.3] text-palm-deep sm:text-4xl">
                  {pick(landing.journalTitle, locale)}
                </h2>
              </Reveal>
              <ul className="mt-8 border-t border-[#e4c27a]">
                {notes.map((note, index) => (
                  <li key={note.title} className="border-b border-[#e4c27a]/70 py-5">
                    <Reveal motion="settle" delay={index * 80}>
                      <h3 className="font-display text-2xl leading-tight text-palm-deep">{note.title}</h3>
                      <p className="mt-2 text-base leading-8 text-ink">{note.excerpt}</p>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionScene>
      </section>

      <section className="overflow-hidden bg-palm-deep text-[#e7f2ec]">
        <SectionScene>
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <div className="flex items-end justify-between gap-10">
              <div>
                <Reveal motion="rule" className="h-px w-16 bg-[#e4c27a]" />
                <Reveal motion="rise">
                  <h2 className="mt-6 font-display text-3xl leading-[1.3] sm:text-4xl">{developerText("title")}</h2>
                </Reveal>
              </div>
              <BuildingMark kind="slab" className="mb-1 hidden w-36 shrink-0 sm:block" />
            </div>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {shownDevelopers.map((developer, index) => (
                <li key={developer.id}>
                  <Reveal motion="wipe" delay={index * 70}>
                    <Link
                      locale={locale}
                      href={`/developers/${developer.id}`}
                      className="group flex h-full gap-4 overflow-hidden rounded-2xl ring-1 ring-[#e4c27a]/40 transition hover:ring-[#e4c27a]"
                    >
                      <span className="block w-28 shrink-0 overflow-hidden sm:w-32">
                        <img
                          src={developer.image}
                          alt=""
                          className="h-full min-h-28 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-center py-4 pe-4">
                        <span className="font-display text-2xl leading-tight">{pick(developer.names, locale)}</span>
                        <span className="mt-1 line-clamp-2 text-sm leading-6 text-[#d5dfd8]">
                          {pickPlain(developer.about, locale)}
                        </span>
                        <span className="mt-2 text-sm text-[#e4c27a]">
                          {developer.delivered.toLocaleString(
                            locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-AE",
                          )}{" "}
                          {developerText("delivered")}
                        </span>
                      </span>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </SectionScene>
      </section>

      <section className="overflow-hidden bg-palm-deep text-[#e7f2ec]">
        <SectionScene>
          <div className="mx-auto max-w-6xl px-4 py-20 lg:py-28">
            <Reveal motion="rule" className="h-px w-16 bg-[#e4c27a]" />
            <Reveal motion="rise">
              <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.25] sm:text-5xl">
                {pick(landing.pocketTitle, locale)}
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#d5dfd8]">{pick(landing.pocketLede, locale)}</p>
              <Link
                locale={locale}
                href="/map"
                className="mt-8 inline-flex h-13 items-center rounded-lg bg-[#e4c27a] px-5 text-sm font-semibold text-palm-deep transition hover:bg-white"
              >
                {hero("mapCta")}
              </Link>
            </Reveal>
            <p className="mt-10 text-sm text-[#d5dfd8]">
              {atlas.areas.length} · {atlas.projects.length}
              {priceFloor && priceCeil ? ` · ${shortMillions(priceFloor)}–${shortMillions(priceCeil)}` : ""}
            </p>
          </div>
        </SectionScene>
      </section>
    </Thread>
  );
}
