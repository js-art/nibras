import { neighborhood } from "@/lib/shape";
export type AreaId =
  | "dubai-hills"
  | "business-bay"
  | "jvc"
  | "creek-harbour"
  | "palm-jumeirah"
  | "dubai-marina"
  | "dubai-south"
  | "dubai-land";

export type ProjectId =
  | "safa-court"
  | "creek-atelier"
  | "palm-shade"
  | "quarter-nine"
  | "walk-residences"
  | "southlight"
  | "landline-villas"
  | "marina-loom";

export type DeveloperId = "nahla" | "lumen" | "qasr" | "safa-co";

export type Area = {
  id: AreaId;
  color: string;
  center: [number, number];
  ring: [number, number][];
  image: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
};

export type Project = {
  id: ProjectId;
  areaId: AreaId;
  developerId: DeveloperId;
  kind: "apartment" | "villa";
  handover: string;
  startPrice: number;
  roi: number;
  score: number;
  point: [number, number];
  image: string;
  parts: {
    site: number;
    water: number;
    energy: number;
    air: number;
    light: number;
  };
};

export type Developer = {
  id: DeveloperId;
  delivered: string;
};

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;

function ring(
  lng: number,
  lat: number,
  dx: number,
  dy: number,
  profile = 0,
): [number, number][] {
  return neighborhood(lng, lat, dx, dy, profile);
}

export const areas: Area[] = [
  {
    id: "dubai-hills",
    color: "#7dcea0",
    center: [55.245, 25.104],
    ring: ring(55.245, 25.104, 0.028, 0.02, 0),
    image: photo("photo-1600585154340-be6161a56a0c"),
    minPrice: 1_900_000,
    maxPrice: 14_200_000,
    avgPrice: 4_800_000,
  },
  {
    id: "business-bay",
    color: "#f4d35e",
    center: [55.264, 25.186],
    ring: ring(55.264, 25.186, 0.018, 0.016, 1),
    image: photo("photo-1512453979798-5ea266f8880c"),
    minPrice: 980_000,
    maxPrice: 9_400_000,
    avgPrice: 2_350_000,
  },
  {
    id: "jvc",
    color: "#f5b7b1",
    center: [55.209, 25.056],
    ring: ring(55.209, 25.056, 0.026, 0.018, 2),
    image: photo("photo-1600607687939-ce8a6c25118c"),
    minPrice: 620_000,
    maxPrice: 2_800_000,
    avgPrice: 1_150_000,
  },
  {
    id: "creek-harbour",
    color: "#85c1e9",
    center: [55.346, 25.204],
    ring: ring(55.346, 25.204, 0.022, 0.016, 3),
    image: photo("photo-1582407947304-fd86f028f716"),
    minPrice: 1_200_000,
    maxPrice: 11_000_000,
    avgPrice: 2_900_000,
  },
  {
    id: "palm-jumeirah",
    color: "#f0b27a",
    center: [55.138, 25.112],
    ring: ring(55.138, 25.112, 0.03, 0.014, 4),
    image: photo("photo-1518684079-3c830dcef090"),
    minPrice: 2_400_000,
    maxPrice: 48_000_000,
    avgPrice: 8_600_000,
  },
  {
    id: "dubai-marina",
    color: "#d7bde2",
    center: [55.14, 25.08],
    ring: ring(55.14, 25.08, 0.016, 0.014, 5),
    image: photo("photo-1578895101408-1a36b834405b"),
    minPrice: 1_100_000,
    maxPrice: 18_000_000,
    avgPrice: 3_200_000,
  },
  {
    id: "dubai-south",
    color: "#82e0aa",
    center: [55.161, 24.896],
    ring: ring(55.161, 24.896, 0.04, 0.024, 6),
    image: photo("photo-1545324418-cc1a3fa10c00"),
    minPrice: 540_000,
    maxPrice: 3_400_000,
    avgPrice: 980_000,
  },
  {
    id: "dubai-land",
    color: "#f5cba7",
    center: [55.372, 25.078],
    ring: ring(55.372, 25.078, 0.034, 0.02, 7),
    image: photo("photo-1613490493576-7fde63acd811"),
    minPrice: 1_600_000,
    maxPrice: 9_800_000,
    avgPrice: 3_600_000,
  },
];

export const developers: Developer[] = [
  { id: "nahla", delivered: "4,200" },
  { id: "lumen", delivered: "2,800" },
  { id: "qasr", delivered: "1,600" },
  { id: "safa-co", delivered: "3,100" },
];

export const projects: Project[] = [
  {
    id: "safa-court",
    areaId: "dubai-hills",
    developerId: "nahla",
    kind: "villa",
    handover: "2028",
    startPrice: 5_400_000,
    roi: 6.2,
    score: 78,
    point: [55.249, 25.108],
    image: photo("photo-1613490493576-7fde63acd811"),
    parts: { site: 8.4, water: 7.6, energy: 7.1, air: 8.0, light: 8.6 },
  },
  {
    id: "creek-atelier",
    areaId: "creek-harbour",
    developerId: "lumen",
    kind: "apartment",
    handover: "2027",
    startPrice: 1_850_000,
    roi: 6.8,
    score: 84,
    point: [55.349, 25.207],
    image: photo("photo-1582407947304-fd86f028f716"),
    parts: { site: 8.8, water: 8.1, energy: 7.9, air: 8.2, light: 8.4 },
  },
  {
    id: "palm-shade",
    areaId: "palm-jumeirah",
    developerId: "qasr",
    kind: "villa",
    handover: "2029",
    startPrice: 9_200_000,
    roi: 5.4,
    score: 71,
    point: [55.132, 25.116],
    image: photo("photo-1518684079-3c830dcef090"),
    parts: { site: 7.2, water: 6.4, energy: 6.1, air: 7.8, light: 8.9 },
  },
  {
    id: "quarter-nine",
    areaId: "business-bay",
    developerId: "safa-co",
    kind: "apartment",
    handover: "2027",
    startPrice: 2_100_000,
    roi: 7.1,
    score: 80,
    point: [55.268, 25.184],
    image: photo("photo-1512453979798-5ea266f8880c"),
    parts: { site: 8.1, water: 7.2, energy: 7.4, air: 7.0, light: 7.6 },
  },
  {
    id: "walk-residences",
    areaId: "jvc",
    developerId: "nahla",
    kind: "apartment",
    handover: "2028",
    startPrice: 890_000,
    roi: 6.4,
    score: 74,
    point: [55.214, 25.052],
    image: photo("photo-1600607687939-ce8a6c25118c"),
    parts: { site: 7.4, water: 7.0, energy: 6.8, air: 7.1, light: 7.3 },
  },
  {
    id: "southlight",
    areaId: "dubai-south",
    developerId: "lumen",
    kind: "apartment",
    handover: "2028",
    startPrice: 720_000,
    roi: 7.4,
    score: 69,
    point: [55.168, 24.9],
    image: photo("photo-1545324418-cc1a3fa10c00"),
    parts: { site: 6.8, water: 6.2, energy: 7.5, air: 6.9, light: 7.0 },
  },
  {
    id: "landline-villas",
    areaId: "dubai-land",
    developerId: "qasr",
    kind: "villa",
    handover: "2028",
    startPrice: 3_600_000,
    roi: 6.1,
    score: 73,
    point: [55.378, 25.082],
    image: photo("photo-1600585154340-be6161a56a0c"),
    parts: { site: 7.6, water: 7.8, energy: 6.6, air: 7.9, light: 7.4 },
  },
  {
    id: "marina-loom",
    areaId: "dubai-marina",
    developerId: "safa-co",
    kind: "apartment",
    handover: "2026",
    startPrice: 2_400_000,
    roi: 5.9,
    score: 76,
    point: [55.144, 25.078],
    image: photo("photo-1578895101408-1a36b834405b"),
    parts: { site: 7.9, water: 6.9, energy: 6.7, air: 6.8, light: 8.1 },
  },
];

export function areaById(id: string) {
  return areas.find((area) => area.id === id);
}

export function projectById(id: string) {
  return projects.find((project) => project.id === id);
}

export function developerById(id: string) {
  return developers.find((developer) => developer.id === id);
}

export function projectsInArea(areaId: string) {
  return projects.filter((project) => project.areaId === areaId);
}

export function projectsByDeveloper(developerId: string) {
  return projects.filter((project) => project.developerId === developerId);
}

export function areasGeoJson(
  colors: Partial<Record<AreaId, string>> = {},
) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((area) => ({
      type: "Feature" as const,
      properties: {
        id: area.id,
        color: colors[area.id] ?? area.color,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [area.ring],
      },
    })),
  };
}

export function shortMillions(amount: number) {
  const millions = amount / 1_000_000;
  if (millions >= 1) {
    const value = millions >= 10 ? millions.toFixed(0) : millions.toFixed(1);
    return `${value.replace(/\.0$/, "")}M`;
  }
  return `${Math.round(amount / 1_000)}K`;
}

export function money(amount: number, locale: string) {
  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-AE";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}
