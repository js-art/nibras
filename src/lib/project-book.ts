import { pick, pickPlain, type Atlas, type Project } from "@/data/atlas";

export type PriceBand = "any" | "ask" | "under" | "mid" | "high" | "top";
export type SortKey = "new" | "price-asc" | "price-desc" | "handover";
export type BookView = "grid" | "split" | "map";

export type BookQuery = {
  q: string;
  price: PriceBand;
  beds: string;
  handover: string;
  area: string;
  developer: string;
  sort: SortKey;
  view: BookView;
};

export const emptyBookQuery: BookQuery = {
  q: "",
  price: "any",
  beds: "any",
  handover: "any",
  area: "",
  developer: "",
  sort: "new",
  view: "split",
};

const prices = new Set<PriceBand>(["any", "ask", "under", "mid", "high", "top"]);
const sorts = new Set<SortKey>(["new", "price-asc", "price-desc", "handover"]);
const views = new Set<BookView>(["grid", "split", "map"]);

export function bookQueryFrom(params: URLSearchParams): BookQuery {
  const price = params.get("price") ?? "";
  const sort = params.get("sort") ?? "";
  const view = params.get("view") ?? "";
  const beds = params.get("beds") ?? "any";
  return {
    q: (params.get("q") ?? "").slice(0, 80),
    price: prices.has(price as PriceBand) ? (price as PriceBand) : "any",
    beds: beds === "studio" || beds === "1" || beds === "2" || beds === "3" || beds === "4" ? beds : "any",
    handover: (params.get("handover") ?? "any").slice(0, 12) || "any",
    area: (params.get("area") ?? "").slice(0, 80),
    developer: (params.get("developer") ?? "").slice(0, 80),
    sort: sorts.has(sort as SortKey) ? (sort as SortKey) : "new",
    view: views.has(view as BookView) ? (view as BookView) : "split",
  };
}

export function bookQueryToParams(query: BookQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.price !== "any") params.set("price", query.price);
  if (query.beds !== "any") params.set("beds", query.beds);
  if (query.handover !== "any") params.set("handover", query.handover);
  if (query.area) params.set("area", query.area);
  if (query.developer) params.set("developer", query.developer);
  if (query.sort !== "new") params.set("sort", query.sort);
  if (query.view !== "split") params.set("view", query.view);
  return params;
}

function priceMatches(price: number, band: PriceBand) {
  if (band === "any") return true;
  if (band === "ask") return price <= 0;
  if (price <= 0) return false;
  if (band === "under") return price < 750_000;
  if (band === "mid") return price >= 750_000 && price < 1_500_000;
  if (band === "high") return price >= 1_500_000 && price < 3_000_000;
  return price >= 3_000_000;
}

function haystack(atlas: Atlas, project: Project, locale: string) {
  const area = atlas.areas.find((item) => item.id === project.areaId);
  const developer = atlas.developers.find((item) => item.id === project.developerId);
  const city = atlas.cities.find((item) => item.id === area?.cityId);
  return [
    pick(project.names, locale),
    pickPlain(project.about, locale),
    pick(project.brochure.tagline, locale),
    pick(project.brochure.place, locale),
    area ? pick(area.names, locale) : "",
    city ? pick(city.names, locale) : "",
    developer ? pick(developer.names, locale) : "",
    project.handover,
    project.kind,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterProjects(atlas: Atlas, query: BookQuery, locale: string) {
  const needle = query.q.trim().toLowerCase();
  const items = atlas.projects.filter((project) => {
    if (query.area && project.areaId !== query.area) return false;
    if (query.developer && project.developerId !== query.developer) return false;
    if (query.handover !== "any" && project.handover !== query.handover) return false;
    if (query.beds !== "any" && !project.units.some((unit) => unit.beds === query.beds)) return false;
    if (!priceMatches(project.startPrice, query.price)) return false;
    if (needle && !haystack(atlas, project, locale).includes(needle)) return false;
    return true;
  });

  const sorted = [...items];
  sorted.sort((a, b) => {
    if (query.sort === "price-asc") return (a.startPrice || Number.MAX_SAFE_INTEGER) - (b.startPrice || Number.MAX_SAFE_INTEGER);
    if (query.sort === "price-desc") return b.startPrice - a.startPrice;
    if (query.sort === "handover") return a.handover.localeCompare(b.handover);
    return b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
  });
  return sorted;
}

export function handoverOptions(projects: Project[]) {
  return [...new Set(projects.map((project) => project.handover).filter(Boolean))].sort();
}

export function placeLabel(atlas: Atlas, project: Project, locale: string) {
  const area = atlas.areas.find((item) => item.id === project.areaId);
  const city = atlas.cities.find((item) => item.id === area?.cityId);
  const fine = pick(project.brochure.place, locale).trim();
  const areaName = area ? pick(area.names, locale) : "";
  const cityName = city ? pick(city.names, locale) : "";
  const where = fine || areaName;
  return [cityName, where].filter(Boolean).join(" · ");
}
