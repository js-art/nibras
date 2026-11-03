"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Select, controlClass } from "@/components/ui/controls";
import { BookMap, pinPrice } from "@/components/catalogue/book-map";
import {
  FALLBACK_IMAGE,
  fullAmount,
  pick,
  type Atlas,
  type Project,
} from "@/data/atlas";
import {
  bookQueryToParams,
  filterProjects,
  handoverOptions,
  placeLabel,
  type BookQuery,
} from "@/lib/project-book";

export function ProjectBook({ atlas, query }: { atlas: Atlas; query: BookQuery }) {
  const locale = useLocale();
  const t = useTranslations("book");
  const kindT = useTranslations("projects");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(query.q);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    setQ(query.q);
  }, [query.q]);

  function push(next: BookQuery) {
    const params = bookQueryToParams(next);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (q === queryRef.current.q) return;
    const timer = window.setTimeout(() => {
      const params = bookQueryToParams({ ...queryRef.current, q });
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, pathname, router]);

  const projects = useMemo(() => filterProjects(atlas, query, locale), [atlas, query, locale]);

  useEffect(() => {
    if (selectedId && !projects.some((project) => project.id === selectedId)) setSelectedId(null);
  }, [projects, selectedId]);

  const pins = useMemo(
    () =>
      projects.map((project) => ({
        project,
        label: pick(project.names, locale),
        place: placeLabel(atlas, project, locale),
        price: pinPrice(project, t("onRequest")),
        meta: [bedsLine(project, t), project.handover].filter(Boolean).join(" · "),
      })),
    [projects, atlas, locale, t],
  );

  const handovers = handoverOptions(atlas.projects);
  const [more, setMore] = useState(Boolean(query.area || query.developer));
  const showList = query.view !== "map";
  const showMap = query.view !== "grid";
  const split = query.view === "split";

  return (
    <div
      className={
        query.view === "map"
          ? "flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white"
          : query.view === "split"
            ? "bg-white lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-hidden"
            : "bg-white"
      }
    >
      <form
        className="shrink-0 border-b border-[#d5dfd8] bg-white"
        onSubmit={(event) => {
          event.preventDefault();
          push({ ...query, q });
        }}
      >
        <div className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:px-5">
          <div className="flex min-w-0 gap-2 lg:min-w-[18rem] lg:flex-1">
            <input
              className={`${controlClass} min-w-0 flex-1`}
              value={q}
              placeholder={t("search")}
              aria-label={t("search")}
              onChange={(event) => setQ(event.target.value)}
            />
            <button
              type="submit"
              aria-label={t("search")}
              className="inline-grid h-13 w-13 shrink-0 place-items-center rounded-full bg-palm-deep text-[#e7f2ec]"
            >
              <SearchIcon />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:contents [&::-webkit-scrollbar]:hidden">
          <div className="w-40 shrink-0">
            <Select
              value={query.price}
              onChange={(price) => push({ ...query, price: price as BookQuery["price"] })}
              options={[
                { value: "any", label: t("priceAny") },
                { value: "ask", label: t("priceAsk") },
                { value: "under", label: t("priceUnder") },
                { value: "mid", label: t("priceMid") },
                { value: "high", label: t("priceHigh") },
                { value: "top", label: t("priceTop") },
              ]}
            />
          </div>
          <div className="w-40 shrink-0">
            <Select
              value={query.beds}
              onChange={(beds) => push({ ...query, beds })}
              options={[
                { value: "any", label: t("bedsAny") },
                { value: "studio", label: t("studio") },
                { value: "1", label: t("bedCount", { count: "1" }) },
                { value: "2", label: t("bedCount", { count: "2" }) },
                { value: "3", label: t("bedCount", { count: "3" }) },
                { value: "4", label: t("bedCount", { count: "4" }) },
              ]}
            />
          </div>
          <div className="w-44 shrink-0">
            <Select
              value={query.handover}
              onChange={(handover) => push({ ...query, handover })}
              options={[{ value: "any", label: t("handoverAny") }, ...handovers.map((item) => ({ value: item, label: item }))]}
            />
          </div>
          <button
            type="button"
            aria-expanded={more}
            className={`inline-flex h-13 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${more ? "border-palm bg-[#e7f2ec] text-palm-deep" : "border-[#c5d0c9] bg-white text-ink"}`}
            onClick={() => setMore((open) => !open)}
          >
            <FilterIcon />
            {t("more")}
          </button>
          </div>
          <ViewSwitch view={query.view} onChange={(view) => push({ ...query, view })} />
        </div>
        {more ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#d5dfd8] px-4 py-3 lg:px-5">
            <div className="w-full sm:w-56">
              <Select
                value={query.area}
                onChange={(area) => push({ ...query, area })}
                options={[
                  { value: "", label: t("areaAny") },
                  ...atlas.areas.map((area) => ({ value: area.id, label: pick(area.names, locale) })),
                ]}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={query.developer}
                onChange={(developer) => push({ ...query, developer })}
                options={[
                  { value: "", label: t("developerAny") },
                  ...atlas.developers.map((developer) => ({ value: developer.id, label: pick(developer.names, locale) })),
                ]}
              />
            </div>
            <button type="button" className="text-sm font-medium text-palm" onClick={() => push({ ...query, ...cleared(query.view) })}>
              {t("clear")}
            </button>
          </div>
        ) : null}
      </form>

      <div
        className={
          split
            ? "flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:grid-rows-1"
            : query.view === "map"
              ? "min-h-0 flex-1"
              : ""
        }
      >
        {showList ? (
          <div className={`min-w-0 px-4 py-5 lg:px-5 ${split ? "lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto" : ""}`}>
            <h1 className="font-display text-xl leading-snug text-palm-deep sm:text-2xl">{t("heading")}</h1>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mist">{t("results", { count: projects.length })}</p>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-sm text-mist">{t("sortBy")}</span>
                <div className="w-40 min-w-0 sm:w-48">
                  <Select
                    value={query.sort}
                    onChange={(sort) => push({ ...query, sort: sort as BookQuery["sort"] })}
                    options={[
                      { value: "new", label: t("sortNew") },
                      { value: "price-asc", label: t("sortPriceAsc") },
                      { value: "price-desc", label: t("sortPriceDesc") },
                      { value: "handover", label: t("sortHandover") },
                    ]}
                  />
                </div>
              </div>
            </div>
            {projects.length === 0 ? (
              <p className="py-16 text-mist">{t("empty")}</p>
            ) : (
              <ul className={query.view === "grid" ? "mt-4 grid gap-4 sm:grid-cols-2" : "mt-4 space-y-4"}>
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    atlas={atlas}
                    project={project}
                    locale={locale}
                    layout={query.view === "grid" ? "grid" : "row"}
                    selected={selectedId === project.id}
                    onSelect={() => setSelectedId(project.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
        {showMap ? (
          <aside
            className={
              split
                ? "order-first h-64 shrink-0 border-b border-[#d5dfd8] lg:order-none lg:col-start-2 lg:row-start-1 lg:h-full lg:min-h-0 lg:border-b-0 lg:border-s"
                : "h-full min-h-0"
            }
          >
            <BookMap
              pins={pins}
              locale={locale}
              selectedId={selectedId}
              onSelect={setSelectedId}
              inView={(count) => t("inView", { count })}
              closeLabel={t("closePin")}
              prevLabel={t("prevPin")}
              nextLabel={t("nextPin")}
              readLabel={kindT("read")}
              className="h-full"
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function cleared(view: BookQuery["view"]): BookQuery {
  return { q: "", price: "any", beds: "any", handover: "any", area: "", developer: "", sort: "new", view };
}

function bedsLine(project: Project, t: (key: string, values?: Record<string, string>) => string) {
  if (!project.units.length) return "";
  return project.units
    .map((unit) => (unit.beds === "studio" ? t("studio") : t("bedCount", { count: unit.beds })))
    .join(" · ");
}

function ProjectRow({
  atlas,
  project,
  locale,
  layout,
  selected,
  onSelect,
}: {
  atlas: Atlas;
  project: Project;
  locale: string;
  layout: "row" | "grid";
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("book");
  const kindT = useTranslations("projects");
  const developer = atlas.developers.find((item) => item.id === project.developerId);
  const kind =
    project.kind === "villa" ? kindT("kindVilla") : project.kind === "townhouse" ? kindT("kindTownhouse") : kindT("kindApartment");
  const named = project.brochure.plans.map((plan) => pick(plan.title, locale)).filter(Boolean).join(" · ");
  const plans = named || (project.payment.length ? project.payment.map((step) => `${step.percent}%`).join(" · ") : "");
  const price = project.startPrice > 0 ? fullAmount(project.startPrice, project.currency, locale) : t("onRequest");
  const phone = project.phone.replace(/[^\d+]/g, "");
  const whatsapp = project.whatsapp.replace(/[^\d]/g, "");

  const facts = [
    [t("starting"), price],
    [t("payment"), plans || t("onRequest")],
    [t("handover"), project.handover || t("onRequest")],
  ];
  const three = Boolean(phone && whatsapp);
  const detailSpan = three ? "col-span-2 sm:col-span-1" : !phone && !whatsapp ? "col-span-2" : "";
  const actions = (
    <div className={`grid gap-2 ${three ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
      {phone ? (
        <a
          href={`tel:${phone}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#e7f2ec] text-sm font-medium text-palm-deep"
        >
          <PhoneIcon />
          {t("call")}
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#d7efe4] text-sm font-medium text-palm-deep"
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </a>
      ) : null}
      <Link
        locale={locale}
        href={`/projects/${project.id}`}
        onClick={(event) => event.stopPropagation()}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-palm bg-white text-sm font-medium text-palm-deep ${detailSpan}`}
      >
        {t("details")}
      </Link>
    </div>
  );

  return (
    <li>
      <article
        className={`rounded-xl border bg-white p-3 ${selected ? "border-palm ring-2 ring-palm/25" : "border-[#d5dfd8]"}`}
        onClick={onSelect}
      >
        <div className={layout === "row" ? "grid items-stretch gap-3 sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]" : ""}>
          <div className={layout === "row" ? "flex h-full min-h-0 flex-col gap-2" : ""}>
            <Link
              locale={locale}
              href={`/projects/${project.id}`}
              className={
                layout === "row"
                  ? "relative block aspect-[16/10] overflow-hidden rounded-lg sm:aspect-auto sm:min-h-40 sm:flex-1"
                  : "block overflow-hidden rounded-lg"
              }
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={project.image || FALLBACK_IMAGE}
                alt=""
                className={
                  layout === "row"
                    ? "h-full w-full object-cover object-center sm:absolute sm:inset-0"
                    : "aspect-[16/10] w-full object-cover object-center"
                }
              />
            </Link>
            {layout === "row" && !three ? <div className="max-sm:hidden">{actions}</div> : null}
          </div>
          <div className="flex min-w-0 flex-col py-1">
            <h2 className="font-display text-lg leading-snug">
              <Link
                locale={locale}
                href={`/projects/${project.id}`}
                className="text-palm-deep underline decoration-palm/40 underline-offset-4 hover:text-palm"
                onClick={(event) => event.stopPropagation()}
              >
                {pick(project.names, locale)}
              </Link>
            </h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-mist">
              <PinIcon />
              <span className="truncate">{placeLabel(atlas, project, locale)}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
              <HomeIcon />
              <span className="truncate">
                {kind}
                {bedsLine(project, t) ? ` · ${bedsLine(project, t)}` : ""}
              </span>
            </p>
            {developer ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-mist">
                {developer.image ? (
                  <img src={developer.image} alt="" className="size-7 rounded-md object-cover" />
                ) : null}
                <span className="truncate">{t("by", { name: pick(developer.names, locale) })}</span>
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {facts.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#d5dfd8] px-2 py-2 text-center">
                  <dt className="text-[11px] leading-4 text-mist">{label}</dt>
                  <dd className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-palm-deep">{value}</dd>
                </div>
              ))}
            </dl>
            {layout === "row" && !three ? <div className="mt-3 sm:hidden">{actions}</div> : null}
            {layout === "row" ? null : <div className="mt-3">{actions}</div>}
          </div>
        </div>
        {layout === "row" && three ? <div className="mt-3">{actions}</div> : null}
      </article>
    </li>
  );
}

function ViewSwitch({ view, onChange }: { view: BookQuery["view"]; onChange: (view: BookQuery["view"]) => void }) {
  const t = useTranslations("book");
  const items = [
    ["grid", t("viewGrid"), "grid"],
    ["split", t("viewSplit"), "split"],
    ["map", t("viewMap"), "map"],
  ] as const;
  return (
    <div className="flex w-full shrink-0 rounded-lg border border-[#d5dfd8] bg-white p-1 lg:w-auto">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm lg:flex-none ${view === id ? "bg-[#e7f2ec] font-medium text-palm-deep" : "text-mist"}`}
          onClick={() => onChange(id)}
        >
          {id === "grid" ? <GridIcon /> : id === "split" ? <SplitIcon /> : <MapIcon />}
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 3.5h11M4.5 8h7M6.5 12.5h3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="8" cy="8" r="5" />
      <path d="M12 12.5 15.5 16" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M7 12.5s4-3.3 4-6.2A4 4 0 0 0 3 6.3c0 2.9 4 6.2 4 6.2Z" />
      <circle cx="7" cy="6.2" r="1.2" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 6.2 7 2.2l5 4v5.3H2V6.2Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.2 2.8h2L7.4 5.6 6.1 6.7a8 8 0 0 0 3.2 3.2l1.1-1.3 2.8 1.2v2A1.2 1.2 0 0 1 12 13 9.2 9.2 0 0 1 3 4a1.2 1.2 0 0 1 1.2-1.2Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 1.6A6.3 6.3 0 0 0 2.2 11l-.7 2.6 2.7-.7A6.3 6.3 0 1 0 8 1.6Zm3.5 8.9c-.1.4-.7.7-1 .8-.3 0-.6.2-2-.4-1.7-.7-2.8-2.4-2.9-2.5-.1-.1-.7-.9-.7-1.7s.4-1.2.6-1.4c.2-.2.4-.2.5-.2h.4c.1 0 .3 0 .4.3.2.4.6 1.4.6 1.5.1.1 0 .3-.1.4l-.3.3c-.1.1-.2.2-.1.4.1.2.5.9 1.2 1.4.8.7 1.4.9 1.6 1 .2.1.3 0 .4-.1l.5-.6c.1-.2.3-.1.5-.1.2.1 1.2.6 1.4.7.2.1.3.1.4.2.1.2.1.6 0 1Z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="currentColor">
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="1" width="5" height="5" rx="1" />
      <rect x="1" y="8" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1" y="2" width="5" height="10" rx="1" />
      <rect x="8" y="2" width="5" height="10" rx="1" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M1.5 3.5 5 2l4 1.5L12.5 2v8.5L9 12 5 10.5 1.5 12V3.5Z" />
    </svg>
  );
}
