export const MAP_STYLE_IDS = [
  "bright",
  "colorful",
  "natural",
  "liberty",
  "muted",
  "positron",
  "dark",
  "fiord",
] as const;

export type MapStyleId = (typeof MAP_STYLE_IDS)[number];

/** Soft light basemap — calm default for overlays. */
export const DEFAULT_MAP_STYLE: MapStyleId = "muted";

const STORAGE_KEY = "nibras.mapStyle";

export type MapStyleMeta = {
  id: MapStyleId;
  url: string;
  /** Rough land / water / road preview for the picker. */
  swatch: [string, string, string];
  group: "light" | "dark";
};

export const MAP_STYLES: MapStyleMeta[] = [
  {
    id: "bright",
    url: "https://tiles.openfreemap.org/styles/bright",
    swatch: ["#f4efe4", "#a8d4ef", "#f0c28a"],
    group: "light",
  },
  {
    id: "colorful",
    url: "https://tiles.versatiles.org/assets/styles/colorful/style.json",
    swatch: ["#eef6e8", "#6eb6e0", "#f2b86a"],
    group: "light",
  },
  {
    id: "natural",
    url: "https://tiles.versatiles.org/assets/styles/natural/style.json",
    swatch: ["#ebe4d4", "#7eb8c9", "#c4a574"],
    group: "light",
  },
  {
    id: "liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
    swatch: ["#f7f5ef", "#9ec9e8", "#e8b86d"],
    group: "light",
  },
  {
    id: "muted",
    url: "https://tiles.versatiles.org/assets/styles/muted/style.json",
    swatch: ["#f2f0ea", "#b7c9d4", "#d2c4a8"],
    group: "light",
  },
  {
    id: "positron",
    url: "https://tiles.openfreemap.org/styles/positron",
    swatch: ["#f0f0f0", "#d5d9dc", "#cfcfcf"],
    group: "light",
  },
  {
    id: "dark",
    url: "https://tiles.openfreemap.org/styles/dark",
    swatch: ["#1c1c1c", "#0f2a3a", "#3a3a3a"],
    group: "dark",
  },
  {
    id: "fiord",
    url: "https://tiles.openfreemap.org/styles/fiord",
    swatch: ["#1a2633", "#0d3a4f", "#2c3e50"],
    group: "dark",
  },
];

const STYLE_BY_ID = Object.fromEntries(MAP_STYLES.map((style) => [style.id, style])) as Record<
  MapStyleId,
  MapStyleMeta
>;

export function isMapStyleId(value: string | null | undefined): value is MapStyleId {
  return Boolean(value && (MAP_STYLE_IDS as readonly string[]).includes(value));
}

export function readMapStyle(): MapStyleId {
  if (typeof window === "undefined") return DEFAULT_MAP_STYLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isMapStyleId(raw) ? raw : DEFAULT_MAP_STYLE;
  } catch {
    return DEFAULT_MAP_STYLE;
  }
}

export function writeMapStyle(id: MapStyleId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function mapStyleMeta(id: MapStyleId = DEFAULT_MAP_STYLE) {
  return STYLE_BY_ID[id] ?? STYLE_BY_ID[DEFAULT_MAP_STYLE];
}

export function mapStyleUrl(id: MapStyleId = DEFAULT_MAP_STYLE) {
  return mapStyleMeta(id).url;
}
