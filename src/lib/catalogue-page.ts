import {
  pick,
  textOf,
  type Area,
  type Atlas,
  type Developer,
  type Project,
} from "@/data/atlas";

export type CatalogueKind = "areas" | "developers" | "projects";

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

export function parsePage(value: string | string[] | undefined, fallback = 1) {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = Number(raw);
  return Number.isFinite(next) && next >= 1 ? Math.floor(next) : fallback;
}

export function parsePageSize(value: string | string[] | undefined, fallback = DEFAULT_PAGE_SIZE) {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = Number(raw);
  if (!Number.isFinite(next) || next < 1) return fallback;
  return Math.min(MAX_PAGE_SIZE, Math.floor(next));
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}

export function filterCatalogue(atlas: Atlas, kind: "areas", opts?: { q?: string; area?: string; developer?: string; locale?: string }): Area[];
export function filterCatalogue(atlas: Atlas, kind: "developers", opts?: { q?: string; area?: string; developer?: string; locale?: string }): Developer[];
export function filterCatalogue(atlas: Atlas, kind: "projects", opts?: { q?: string; area?: string; developer?: string; locale?: string }): Project[];
export function filterCatalogue(
  atlas: Atlas,
  kind: CatalogueKind,
  opts: { q?: string; area?: string; developer?: string; locale?: string } = {},
): Area[] | Developer[] | Project[] {
  const needle = (opts.q ?? "").trim().toLowerCase();
  if (kind === "areas") {
    return atlas.areas.filter((area) => {
      if (!needle) return true;
      return textOf(area.names).includes(needle) || textOf(area.about).includes(needle);
    });
  }
  if (kind === "developers") {
    return atlas.developers.filter((developer) => {
      if (!needle) return true;
      return textOf(developer.names).includes(needle) || textOf(developer.about).includes(needle);
    });
  }
  return atlas.projects.filter((project) => {
    if (opts.area && project.areaId !== opts.area) return false;
    if (opts.developer && project.developerId !== opts.developer) return false;
    if (!needle) return true;
    const area = atlas.areas.find((item) => item.id === project.areaId);
    const developer = atlas.developers.find((item) => item.id === project.developerId);
    const hay = [
      textOf(project.names),
      textOf(project.about),
      area ? textOf(area.names) : "",
      developer ? textOf(developer.names) : "",
      opts.locale && area ? pick(area.names, opts.locale).toLowerCase() : "",
    ].join(" ");
    return hay.includes(needle);
  });
}

type QueryOpts = {
  page?: number;
  pageSize?: number;
  q?: string;
  area?: string;
  developer?: string;
  locale?: string;
};

export function queryCatalogue(atlas: Atlas, kind: "areas", opts?: QueryOpts): PageResult<Area>;
export function queryCatalogue(atlas: Atlas, kind: "developers", opts?: QueryOpts): PageResult<Developer>;
export function queryCatalogue(atlas: Atlas, kind: "projects", opts?: QueryOpts): PageResult<Project>;
export function queryCatalogue(
  atlas: Atlas,
  kind: CatalogueKind,
  opts: QueryOpts = {},
): PageResult<Area> | PageResult<Developer> | PageResult<Project> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  if (kind === "areas") return paginate(filterCatalogue(atlas, "areas", opts), page, pageSize);
  if (kind === "developers") return paginate(filterCatalogue(atlas, "developers", opts), page, pageSize);
  return paginate(filterCatalogue(atlas, "projects", opts), page, pageSize);
}
