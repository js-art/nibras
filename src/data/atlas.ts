import { stripHtml } from "@/lib/html";
import { neighborhood } from "@/lib/shape";

export type LocaleText = { en: string; ar: string; fa: string };

export type CountryId = "ae" | "om";
export type Currency = "AED" | "OMR" | "USD";
export const CURRENCIES: Currency[] = ["AED", "OMR", "USD"];
export type LngLat = [number, number];
export type Beds = "studio" | "1" | "2" | "3" | "4";
export type Kind = "apartment" | "villa" | "townhouse";
export type SuggestionKind = "city" | "area" | "project";

export type City = {
  id: string;
  country: CountryId;
  center: LngLat;
  zoom: number;
  names: LocaleText;
  /** Epoch ms — last create/edit; desk lists sort newest first. */
  updatedAt: number;
};

export type Area = {
  id: string;
  cityId: string;
  color: string;
  center: LngLat;
  ring: LngLat[];
  image: string;
  names: LocaleText;
  about: LocaleText;
  updatedAt: number;
};

export type Developer = {
  id: string;
  names: LocaleText;
  about: LocaleText;
  delivered: number;
  image: string;
  updatedAt: number;
};

export type UnitBand = {
  id: string;
  beds: Beds;
  priceFrom: number;
  sizeMin: number;
  sizeMax: number;
};

export type PaymentStep = {
  percent: number;
  label: LocaleText;
};

export type Project = {
  id: string;
  areaId: string;
  developerId: string;
  kind: Kind;
  handover: string;
  startPrice: number;
  sizeMin: number;
  sizeMax: number;
  unitCount: number;
  currency: Currency;
  point: LngLat;
  ring: LngLat[];
  image: string;
  names: LocaleText;
  about: LocaleText;
  whatsapp: string;
  phone: string;
  units: UnitBand[];
  payment: PaymentStep[];
  updatedAt: number;
};

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  targetId: string;
  order: number;
  updatedAt: number;
};

export type Atlas = {
  cities: City[];
  areas: Area[];
  developers: Developer[];
  projects: Project[];
  suggestions: Suggestion[];
};

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=70";

const tx = (en: string, ar: string, fa: string): LocaleText => ({ en, ar, fa });

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;

function ring(lng: number, lat: number, dx: number, dy: number, profile = 0): LngLat[] {
  return neighborhood(lng, lat, dx, dy, profile);
}

function plot(lng: number, lat: number): LngLat[] {
  const dx = 0.0034;
  const dy = 0.0025;
  const pts: LngLat[] = [
    [lng - dx, lat - dy],
    [lng + dx * 0.85, lat - dy * 0.55],
    [lng + dx, lat + dy * 0.75],
    [lng - dx * 0.35, lat + dy],
  ];
  pts.push(pts[0]);
  return pts;
}

const pay: PaymentStep[] = [
  { percent: 20, label: tx("On booking", "عند الحجز", "پیش‌پرداخت") },
  { percent: 55, label: tx("During construction", "أثناء الإنشاء", "در حین ساخت") },
  { percent: 25, label: tx("On handover", "عند تسليم المفتاح", "در زمان تحویل کلید") },
];

function bands(start: number, kind: Kind): UnitBand[] {
  if (kind === "villa") {
    return [{ id: "4", beds: "4", priceFrom: start, sizeMin: 2800, sizeMax: 4600 }];
  }
  if (kind === "townhouse") {
    return [{ id: "3", beds: "3", priceFrom: start, sizeMin: 1600, sizeMax: 2300 }];
  }
  return [
    { id: "studio", beds: "studio", priceFrom: start, sizeMin: 420, sizeMax: 540 },
    { id: "1", beds: "1", priceFrom: Math.round(start * 1.28), sizeMin: 650, sizeMax: 920 },
    { id: "2", beds: "2", priceFrom: Math.round(start * 1.72), sizeMin: 980, sizeMax: 1450 },
  ];
}

function project(input: {
  id: string;
  areaId: string;
  developerId: string;
  kind: Kind;
  handover: string;
  startPrice: number;
  sizeMin: number;
  sizeMax: number;
  unitCount: number;
  point: LngLat;
  image: string;
  names: LocaleText;
  about: LocaleText;
  whatsapp: string;
  phone: string;
  currency?: Currency;
  units?: UnitBand[];
}): Project {
  return {
    ...input,
    currency: input.currency ?? "AED",
    ring: plot(input.point[0], input.point[1]),
    units: input.units ?? bands(input.startPrice, input.kind),
    payment: pay.map((step) => ({ ...step, label: { ...step.label } })),
    updatedAt: 0,
  };
}

export function pick(text: LocaleText, locale: string) {
  if (locale === "ar" && text.ar.trim()) return text.ar;
  if (locale === "fa" && text.fa.trim()) return text.fa;
  return text.en || text.ar || text.fa;
}

/** Locale string with HTML tags removed (cards, search, meta). */
export function pickPlain(text: LocaleText, locale: string) {
  return stripHtml(pick(text, locale));
}

export function currencyOf(country: CountryId): Currency {
  return country === "om" ? "OMR" : "AED";
}

export function parseCurrency(value: unknown, fallback: Currency = "AED"): Currency {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : fallback;
}

export function moneyUnit(currency: Currency, locale: string) {
  if (currency === "OMR") return locale === "en" ? "OMR" : "ر.ع.";
  if (currency === "USD") return locale === "en" ? "USD" : "$";
  return locale === "en" ? "AED" : "درهم";
}

export function shortAmount(amount: number, currency: Currency) {
  if (currency === "OMR") {
    if (amount < 1_000) return String(Math.round(amount));
    const value = amount / 1_000;
    const digits = value >= 10 ? 0 : 1;
    return `${value.toFixed(digits).replace(/\.0$/, "")}K`;
  }
  const unit = amount >= 1_000_000 ? 1_000_000 : 1_000;
  const suffix = amount >= 1_000_000 ? "M" : "K";
  const value = amount / unit;
  const digits = value >= 10 || (suffix === "K" && value >= 100) ? 0 : 1;
  const text = value.toFixed(digits).replace(/\.0$/, "");
  return `${text}${suffix}`;
}

export function fullAmount(amount: number, currency: Currency, locale: string) {
  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-AE";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Latin slug for URLs. Empty when nothing usable remains (e.g. Persian-only input). */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** First free slug from a name; prefers English-friendly input. */
export function uniqueSlug(source: string, isTaken: (id: string) => boolean) {
  const root = slugify(source) || "item";
  if (!isTaken(root)) return root;
  let n = 2;
  while (isTaken(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

export function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 3) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export function centroid(ring: LngLat[]): LngLat {
  const unique =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  if (!unique.length) return [55.27, 25.2];
  const lng = unique.reduce((sum, point) => sum + point[0], 0) / unique.length;
  const lat = unique.reduce((sum, point) => sum + point[1], 0) / unique.length;
  return [lng, lat];
}

export function pointInRing(point: LngLat, ring: LngLat[]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function projectRing(project: Project): LngLat[] {
  if (project.ring.length >= 4) return closeRing(project.ring);
  return plot(project.point[0], project.point[1]);
}

export function areaStats(atlas: Atlas, areaId: string, currency: Currency | "all" = "all") {
  const list = atlas.projects.filter(
    (item) => item.areaId === areaId && (currency === "all" || item.currency === currency),
  );
  if (!list.length) return { min: 0, avg: 0, count: 0, currency: null as Currency | null, mixed: false };
  const currencies = [...new Set(list.map((item) => item.currency))];
  if (currencies.length > 1) {
    return { min: 0, avg: 0, count: list.length, currency: null, mixed: true };
  }
  const min = Math.min(...list.map((item) => item.startPrice));
  const avg = list.reduce((sum, item) => sum + item.startPrice, 0) / list.length;
  return { min, avg, count: list.length, currency: currencies[0], mixed: false };
}

export function currenciesInCountry(atlas: Atlas, country: CountryId): Currency[] {
  const cityIds = new Set(atlas.cities.filter((city) => city.country === country).map((city) => city.id));
  const areaIds = new Set(atlas.areas.filter((area) => cityIds.has(area.cityId)).map((area) => area.id));
  const found = new Set<Currency>();
  for (const project of atlas.projects) {
    if (areaIds.has(project.areaId)) found.add(project.currency);
  }
  return CURRENCIES.filter((item) => found.has(item));
}

export function textOf(text: LocaleText) {
  return `${stripHtml(text.en)} ${stripHtml(text.ar)} ${stripHtml(text.fa)}`.toLowerCase();
}

function stamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string" || value instanceof Date) {
    const n = new Date(value).getTime();
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function num(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function text(value: unknown): LocaleText {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    en: String(record.en ?? "").slice(0, 2000),
    ar: String(record.ar ?? "").slice(0, 2000),
    fa: String(record.fa ?? "").slice(0, 2000),
  };
}

function point(value: unknown, fallback: LngLat): LngLat {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  const lng = num(value[0], Number.NaN);
  const lat = num(value[1], Number.NaN);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return fallback;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return fallback;
  return [lng, lat];
}

function ringOf(value: unknown): LngLat[] {
  if (!Array.isArray(value)) return [];
  const pts = value
    .map((item) => point(item, [Number.NaN, Number.NaN]))
    .filter((item) => Number.isFinite(item[0]) && Number.isFinite(item[1]));
  return pts.length >= 4 ? closeRing(pts.slice(0, 80)) : [];
}

const beds: Beds[] = ["studio", "1", "2", "3", "4"];
const kinds: Kind[] = ["apartment", "villa", "townhouse"];

export function normalizeAtlas(input: unknown): Atlas | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<Atlas>;
  const cities: City[] = [];
  for (const item of Array.isArray(raw.cities) ? raw.cities : []) {
    if (!item || typeof item !== "object") continue;
    const city = item as Partial<City>;
    const id = slugify(String(city.id ?? ""));
    if (!id || cities.some((entry) => entry.id === id)) continue;
    const country: CountryId = city.country === "om" ? "om" : "ae";
    cities.push({
      id,
      country,
      center: point(city.center, country === "om" ? [58.41, 23.59] : [55.27, 25.2]),
      zoom: Math.min(16, Math.max(3, num(city.zoom, 11))),
      names: text(city.names),
      updatedAt: stamp(city.updatedAt),
    });
  }
  if (!cities.length) return null;

  const areas: Area[] = [];
  for (const item of Array.isArray(raw.areas) ? raw.areas : []) {
    if (!item || typeof item !== "object") continue;
    const area = item as Partial<Area>;
    const id = slugify(String(area.id ?? ""));
    const cityId = String(area.cityId ?? "");
    if (!id || areas.some((entry) => entry.id === id) || !cities.some((city) => city.id === cityId)) {
      continue;
    }
    const boundary = ringOf(area.ring);
    areas.push({
      id,
      cityId,
      color: /^#[0-9a-fA-F]{6}$/.test(String(area.color)) ? String(area.color) : "#e7a0a0",
      center: boundary.length ? centroid(boundary) : point(area.center, cities[0].center),
      ring: boundary,
      image: String(area.image ?? "").slice(0, 500),
      names: text(area.names),
      about: text(area.about),
      updatedAt: stamp(area.updatedAt),
    });
  }

  const developers: Developer[] = [];
  for (const item of Array.isArray(raw.developers) ? raw.developers : []) {
    if (!item || typeof item !== "object") continue;
    const developer = item as Partial<Developer>;
    const id = slugify(String(developer.id ?? ""));
    if (!id || developers.some((entry) => entry.id === id)) continue;
    developers.push({
      id,
      names: text(developer.names),
      about: text(developer.about),
      delivered: Math.max(0, Math.round(num(developer.delivered))),
      image: String(developer.image ?? "").slice(0, 500),
      updatedAt: stamp(developer.updatedAt),
    });
  }

  const projects: Project[] = [];
  for (const item of Array.isArray(raw.projects) ? raw.projects : []) {
    if (!item || typeof item !== "object") continue;
    const project = item as Partial<Project>;
    const id = slugify(String(project.id ?? ""));
    const areaId = String(project.areaId ?? "");
    const developerId = String(project.developerId ?? "");
    if (
      !id ||
      projects.some((entry) => entry.id === id) ||
      !areas.some((area) => area.id === areaId) ||
      !developers.some((developer) => developer.id === developerId)
    ) {
      continue;
    }
    const units = (Array.isArray(project.units) ? project.units : [])
      .slice(0, 8)
      .map((unit, index) => {
        const row = unit as Partial<UnitBand>;
        const bed = beds.includes(row.beds as Beds) ? (row.beds as Beds) : "1";
        return {
          id: slugify(String(row.id || bed || index)),
          beds: bed,
          priceFrom: Math.max(0, num(row.priceFrom)),
          sizeMin: Math.max(0, num(row.sizeMin)),
          sizeMax: Math.max(0, num(row.sizeMax)),
        };
      });
    const payment = (Array.isArray(project.payment) ? project.payment : [])
      .slice(0, 8)
      .map((step) => {
        const row = step as Partial<PaymentStep>;
        return {
          percent: Math.min(100, Math.max(0, num(row.percent))),
          label: text(row.label),
        };
      });
    const kind = kinds.includes(project.kind as Kind) ? (project.kind as Kind) : "apartment";
    const area = areas.find((entry) => entry.id === areaId)!;
    const city = cities.find((entry) => entry.id === area.cityId);
    const fallbackCurrency = currencyOf(city?.country ?? "ae");
    projects.push({
      id,
      areaId,
      developerId,
      kind,
      handover: String(project.handover ?? "").slice(0, 12),
      startPrice: Math.max(0, num(project.startPrice)),
      sizeMin: Math.max(0, num(project.sizeMin)),
      sizeMax: Math.max(0, num(project.sizeMax)),
      unitCount: Math.max(0, Math.round(num(project.unitCount))),
      currency: parseCurrency(project.currency, fallbackCurrency),
      point: point(project.point, area.center),
      ring: ringOf(project.ring),
      image: String(project.image ?? "").slice(0, 500),
      names: text(project.names),
      about: text(project.about),
      whatsapp: String(project.whatsapp ?? "").replace(/[^\d+]/g, "").slice(0, 18),
      phone: String(project.phone ?? "").replace(/[^\d+]/g, "").slice(0, 18),
      units,
      payment,
      updatedAt: stamp(project.updatedAt),
    });
  }

  const suggestions: Suggestion[] = [];
  for (const item of Array.isArray(raw.suggestions) ? raw.suggestions : []) {
    if (!item || typeof item !== "object") continue;
    const suggestion = item as Partial<Suggestion>;
    const id = slugify(String(suggestion.id ?? ""));
    const kind: SuggestionKind =
      suggestion.kind === "area" || suggestion.kind === "project" ? suggestion.kind : "city";
    const targetId = String(suggestion.targetId ?? "");
    const exists =
      (kind === "city" && cities.some((city) => city.id === targetId)) ||
      (kind === "area" && areas.some((area) => area.id === targetId)) ||
      (kind === "project" && projects.some((project) => project.id === targetId));
    if (!id || suggestions.some((entry) => entry.id === id) || !exists) continue;
    suggestions.push({
      id,
      kind,
      targetId,
      order: num(suggestion.order, suggestions.length),
      updatedAt: stamp(suggestion.updatedAt),
    });
  }

  return { cities, areas, developers, projects, suggestions };
}

const rawSeedAtlas = {
  cities: [
    { id: "dubai", country: "ae", center: [55.27, 25.15], zoom: 10.4, names: tx("Dubai", "دبي", "دبی") },
    { id: "sharjah", country: "ae", center: [55.42, 25.34], zoom: 11.2, names: tx("Sharjah", "الشارقة", "شارجه") },
    { id: "abu-dhabi", country: "ae", center: [54.48, 24.48], zoom: 10.6, names: tx("Abu Dhabi", "أبوظبي", "ابوظبی") },
    { id: "ras-al-khaimah", country: "ae", center: [55.94, 25.76], zoom: 11, names: tx("Ras Al Khaimah", "رأس الخيمة", "راس‌الخیمه") },
    { id: "muscat", country: "om", center: [58.45, 23.6], zoom: 11, names: tx("Muscat", "مسقط", "مسقط") },
    { id: "salalah", country: "om", center: [54.09, 17.02], zoom: 12, names: tx("Salalah", "صلالة", "صلاله") },
    { id: "sohar", country: "om", center: [56.71, 24.36], zoom: 12, names: tx("Sohar", "صحار", "صحار") },
  ],
  developers: [
    {
      id: "nahla",
      names: tx("Nahla", "نهلة", "نهلا"),
      about: tx(
        "A Dubai studio that builds family houses and mid-rise courtyards. In this book they hold Safa Court and Walk Residences.",
        "استوديو دبي يبني بيوت العائلات وأفنية متوسطة الارتفاع. في هذا الدفتر يحمل ساحة الصفا ومساكن الممشى.",
        "استودیوی دبی که خانه‌های خانوادگی و حیاط‌های میان‌مرتبه می‌سازد. در این دفتر حیاط صفا و اقامتگاه‌های پیاده‌راه را دارد.",
      ),
      delivered: 4200,
      image: photo("photo-1486406146926-c627a92ad1ab"),
    },
    {
      id: "lumen",
      names: tx("Lumen Harbour", "لومن هاربر", "لومن هاربر"),
      about: tx(
        "Waterfront apartments. Creek Atelier and Southlight House are their two entries here, at opposite ends of the price book.",
        "شقق الواجهة المائية. مشغل الخور وبيت الضوء الجنوبي هما مدخلان هنا، في طرفي دفتر الأسعار.",
        "آپارتمان لب آب. کارگاه خور و خانهٔ نور جنوب دو ورود آن‌ها اینجاست، در دو سر دفتر قیمت.",
      ),
      delivered: 2800,
      image: photo("photo-1545324418-cc1a3fa10c00"),
    },
    {
      id: "qasr",
      names: tx("Qasr", "قصر", "قصر"),
      about: tx(
        "Villas, slowly. Palm Shade and Landline Villas are the two they have placed with Jolom.",
        "فلل، على مهل. ظل النخلة وفلل خط الأرض هما ما أودعه لدى جولوم.",
        "ویلا، آهسته. سایهٔ نخل و ویلاهای خط زمین همان دو پروژه‌ای است که نزد جولوم گذاشته.",
      ),
      delivered: 1600,
      image: photo("photo-1600585154340-be6161a56a0c"),
    },
    {
      id: "safa-co",
      names: tx("Safa & Co", "الصفا وشركاه", "صفا و همکاران"),
      about: tx(
        "Canal and marina apartments for investors who want a rental brief. Quarter Nine and Marina Loom are theirs.",
        "شقق القناة والمرسى لمن يريد شرح إيجار. الربع التاسع ونول المرسى لهما.",
        "آپارتمان کانال و مارینا برای کسی که شرح اجاره می‌خواهد. ربع نهم و دار مارینا مال اوست.",
      ),
      delivered: 3100,
      image: photo("photo-1512453979798-5ea266f8880c"),
    },
    {
      id: "bahr",
      names: tx("Bahr House", "بيت البحر", "خانهٔ بحر"),
      about: tx(
        "Omani coast work. A quieter book than Dubai, priced in rial and read for longer holds.",
        "أعمال الساحل العماني. دفتر أهدأ من دبي، مسعّر بالريال ويُقرأ للاحتفاظ الأطول.",
        "کار ساحل عمان. دفتری آرام‌تر از دبی، به ریال قیمت‌گذاری و برای نگه‌داشت بلندتر.",
      ),
      delivered: 900,
      image: photo("photo-1502005229762-cf1b2da7c5d6"),
    },
  ],
  areas: [
    {
      id: "dubai-hills",
      cityId: "dubai",
      color: "#7dcea0",
      center: [55.245, 25.104],
      ring: ring(55.245, 25.104, 0.028, 0.02, 0),
      image: photo("photo-1600585154340-be6161a56a0c"),
      names: tx("Dubai Hills", "دبي هيلز", "دبی هیلز"),
      about: tx(
        "A park and a golf course, with villas on the quiet streets and apartments along the green. Read it as a family hold, not a quick flip.",
        "حديقة وملعب غولف، فلل في الشوارع الهادئة وشقق على حافة الخضرة. يُقرأ كاحتفاظ عائلي لا كانقلاب سريع.",
        "پارک و زمین گلف؛ ویلا در خیابان‌های آرام و آپارتمان لبهٔ سبز. آن را نگه‌داشت خانوادگی بخوان، نه خرید و فروش سریع.",
      ),
    },
    {
      id: "business-bay",
      cityId: "dubai",
      color: "#f4d35e",
      center: [55.264, 25.186],
      ring: ring(55.264, 25.186, 0.018, 0.016, 1),
      image: photo("photo-1486406146926-c627a92ad1ab"),
      names: tx("Business Bay", "الخليج التجاري", "بیزینس بی"),
      about: tx(
        "Towers along the canal, a short walk from Downtown. The book here is mostly apartments meant to rent from handover.",
        "أبراج على القناة، على مسافة مشي قصيرة من وسط المدينة. السجل هنا شقق في الغالب، معدة للإيجار من التسليم.",
        "برج‌ها کنار کانال، نزدیک داون‌تاون. دفتر اینجا بیشتر آپارتمان است، برای اجاره از روز تحویل.",
      ),
    },
    {
      id: "jvc",
      cityId: "dubai",
      color: "#f0a3a0",
      center: [55.209, 25.056],
      ring: ring(55.209, 25.056, 0.026, 0.018, 2),
      image: photo("photo-1600607687939-ce8a6c25118c"),
      names: tx("Jumeirah Village Circle", "قرية جميرا الدائرية", "جمیرا ویلیج سیرکل"),
      about: tx(
        "A ring of mid-rise homes around parks. Entry prices sit below the coast, which is why a first allocation often starts here.",
        "حلقة من المساكن المتوسطة حول الحدائق. أسعار الدخول أدنى من الساحل، ولذلك يبدأ التخصيص الأول هنا كثيراً.",
        "حلقه‌ای از خانه‌های میان‌مرتبه دور پارک‌ها. قیمت ورود از ساحل پایین‌تر است و خیلی از تخصیص‌های اول از اینجا شروع می‌شود.",
      ),
    },
    {
      id: "creek-harbour",
      cityId: "dubai",
      color: "#85c1e9",
      center: [55.346, 25.204],
      ring: ring(55.346, 25.204, 0.022, 0.016, 3),
      image: photo("photo-1582407947304-fd86f028f716"),
      names: tx("Dubai Creek Harbour", "ميناء خور دبي", "دبی کریک هاربر"),
      about: tx(
        "Water on one side and a young skyline on the other. The street is still arriving, so the brief matters more than a finished promenade.",
        "الماء في جانب وأفق حديث في الآخر. الشارع لم يكتمل، فالشرح أهم من ممشى منجز.",
        "آب یک سو و خط آسمانی جوان سوی دیگر. خیابان هنوز در راه است؛ شرح از پیاده‌راه تمام‌شده مهم‌تر است.",
      ),
    },
    {
      id: "palm-jumeirah",
      cityId: "dubai",
      color: "#f0b27a",
      center: [55.138, 25.112],
      ring: ring(55.138, 25.112, 0.03, 0.014, 4),
      image: photo("photo-1518684079-3c830dcef090"),
      names: tx("Palm Jumeirah", "نخلة جميرا", "پالم جمیرا"),
      about: tx(
        "Fronds and trunk. Villas take the water; apartments take the trunk road. Price follows the view more than the plan.",
        "سعف وجذع. الفلل تأخذ الماء والشقق تأخذ طريق الجذع. السعر يتبع الإطلالة أكثر من المخطط.",
        "شاخه و تنه. ویلاها آب را می‌گیرند و آپارتمان‌ها جادهٔ تنه را. قیمت بیشتر تابع منظر است تا پلان.",
      ),
    },
    {
      id: "dubai-marina",
      cityId: "dubai",
      color: "#d7bde2",
      center: [55.14, 25.08],
      ring: ring(55.14, 25.08, 0.016, 0.014, 5),
      image: photo("photo-1578895101408-1a36b834405b"),
      names: tx("Dubai Marina", "مرسى دبي", "دبی مارینا"),
      about: tx(
        "A finished canal city. What remains off-plan is a last plot, not a new district.",
        "مدينة قناة مكتملة. ما بقي على الخارطة قطعة أخيرة لا حي جديد.",
        "شهر کانالی تمام‌شده. آنچه پیش‌فروش مانده یک قطعهٔ آخر است، نه محله‌ای تازه.",
      ),
    },
    {
      id: "dubai-south",
      cityId: "dubai",
      color: "#82e0aa",
      center: [55.161, 24.896],
      ring: ring(55.161, 24.896, 0.04, 0.024, 6),
      image: photo("photo-1545324418-cc1a3fa10c00"),
      names: tx("Dubai South", "دبي الجنوب", "دبی ساوث"),
      about: tx(
        "Near the airport and the exhibition grounds. Prices are the gentlest in the Emirates book, and street life is the longest wait.",
        "قرب المطار وأرض المعارض. الأسعار الأهدأ في سجل الإمارات، وحياة الشارع أطول انتظار.",
        "نزدیک فرودگاه و زمین نمایشگاه. قیمت‌ها آرام‌ترین در دفتر امارات است و زندگی خیابان طولانی‌ترین انتظار.",
      ),
    },
    {
      id: "dubai-land",
      cityId: "dubai",
      color: "#f5cba7",
      center: [55.372, 25.078],
      ring: ring(55.372, 25.078, 0.034, 0.02, 7),
      image: photo("photo-1613490493576-7fde63acd811"),
      names: tx("Dubailand", "دبي لاند", "دبی‌لند"),
      about: tx(
        "Villa communities east of the city. The pitch is a garden, a wider plot, and a handover that still has years on it.",
        "مجتمعات فلل شرق المدينة. العرض حديقة وقطعة أوسع وتسليم ما زالت عليه سنوات.",
        "محله‌های ویلایی شرق شهر. حرفش باغ، قطعهٔ پهن‌تر، و تحویلی است که هنوز سال دارد.",
      ),
    },
    {
      id: "aljada",
      cityId: "sharjah",
      color: "#f5b041",
      center: [55.47, 25.298],
      ring: ring(55.47, 25.298, 0.02, 0.014, 8),
      image: photo("photo-1464146072230-91cabc968266"),
      names: tx("Aljada", "الجادة", "الجاده"),
      about: tx(
        "Sharjah’s new central district: a grid of homes around a boulevard. Read the service charge before the render.",
        "الحي المركزي الجديد في الشارقة: شبكة مساكن حول جادة. اقرأ رسوم الخدمة قبل الصورة.",
        "محلهٔ مرکزی تازهٔ شارجه: شبکه‌ای از خانه‌ها دور یک بلوار. شارژ خدمات را پیش از رندر بخوان.",
      ),
    },
    {
      id: "muwaileh",
      cityId: "sharjah",
      color: "#f5b7b1",
      center: [55.435, 25.318],
      ring: ring(55.435, 25.318, 0.016, 0.012, 9),
      image: photo("photo-1502005229762-cf1b2da7c5d6"),
      names: tx("Muwaileh", "مويلح", "مویله"),
      about: tx(
        "Low blocks and university traffic. Entry prices are written for a first home more than a trophy.",
        "كتل منخفضة وحركة الجامعة. أسعار الدخول مكتوبة لمنزل أول لا لكأس.",
        "بلوک‌های کوتاه و رفت‌وآمد دانشگاه. قیمت ورود برای خانهٔ اول نوشته شده، نه برای ویترین.",
      ),
    },
    {
      id: "yas-island",
      cityId: "abu-dhabi",
      color: "#7fb3d5",
      center: [54.602, 24.488],
      ring: ring(54.602, 24.488, 0.03, 0.016, 10),
      image: photo("photo-1512453979798-5ea266f8880c"),
      names: tx("Yas Island", "جزيرة ياس", "جزیره یاس"),
      about: tx(
        "Circuit, marina, and entertainment on one island. Apartments here are priced against weekends, not against a metro stop.",
        "حلبة ومرسى وترفيه في جزيرة واحدة. الشقق هنا تُسعَّر مقابل عطلة نهاية الأسبوع لا مقابل محطة مترو.",
        "پیست، مارینا و تفریح روی یک جزیره. آپارتمان اینجا مقابل آخر هفته قیمت می‌خورد، نه مقابل ایستگاه مترو.",
      ),
    },
    {
      id: "saadiyat",
      cityId: "abu-dhabi",
      color: "#d4ac0d",
      center: [54.434, 24.546],
      ring: ring(54.434, 24.546, 0.028, 0.014, 11),
      image: photo("photo-1600585154526-990dced4db0d"),
      names: tx("Saadiyat", "السعديات", "سعدیات"),
      about: tx(
        "Museums, beach, and a slow villa book. The number on the card is a beachfront hold, not a studio rental.",
        "متاحف وشاطئ وسجل فلل بطيء. الرقم على البطاقة احتفاظ على الشاطئ لا إيجار استوديو.",
        "موزه، ساحل، و دفتر ویلایی آهسته. رقم روی کارت نگه‌داشت لب ساحل است، نه اجارهٔ استودیو.",
      ),
    },
    {
      id: "al-marjan",
      cityId: "ras-al-khaimah",
      color: "#76d7c4",
      center: [55.728, 25.688],
      ring: ring(55.728, 25.688, 0.022, 0.012, 12),
      image: photo("photo-1507525428034-b723cf961d3e"),
      names: tx("Al Marjan Island", "جزيرة المرجان", "جزیره المرجان"),
      about: tx(
        "A man-made island off Ras Al Khaimah. The brief is sea and a longer drive, not a downtown lunch.",
        "جزيرة اصطناعية قبالة رأس الخيمة. الشرح بحر وقيادة أطول، لا غداء في وسط المدينة.",
        "جزیره‌ای ساختگی روبروی راس‌الخیمه. شرحش دریا و راه طولانی‌تر است، نه ناهار داون‌تاون.",
      ),
    },
    {
      id: "al-mouj",
      cityId: "muscat",
      color: "#85c1e9",
      center: [58.365, 23.628],
      ring: ring(58.365, 23.628, 0.018, 0.012, 13),
      image: photo("photo-1469796466635-455ede028aca"),
      names: tx("Al Mouj", "الموج", "الموج"),
      about: tx(
        "Muscat’s marina district: a golf edge, a marina walk, and apartments priced in Omani rial. Read the service charge in rial, not dirham.",
        "حي المرسى في مسقط: حافة غولف وممشى مرسى وشقق بالريال العماني. اقرأ رسوم الخدمة بالريال لا بالدرهم.",
        "محلهٔ مارینای مسقط: لبهٔ گلف، پیاده‌راه مارینا، و آپارتمان به ریال عمان. شارژ را به ریال بخوان، نه درهم.",
      ),
    },
    {
      id: "qurum",
      cityId: "muscat",
      color: "#f5cba7",
      center: [58.49, 23.598],
      ring: ring(58.49, 23.598, 0.014, 0.01, 14),
      image: photo("photo-1449824913935-59a10b8d2000"),
      names: tx("Qurum", "القرم", "قرم"),
      about: tx(
        "An established Muscat beach neighbourhood. Off-plan here is an infill plot between finished streets.",
        "حي شاطئ قائم في مسقط. البيع على الخارطة هنا قطعة بين شوارع منجزة.",
        "محلهٔ ساحلی جاافتادهٔ مسقط. پیش‌فروش اینجا یک قطعه میان خیابان‌های تمام‌شده است.",
      ),
    },
    {
      id: "dahariz",
      cityId: "salalah",
      color: "#82e0aa",
      center: [54.12, 17.005],
      ring: ring(54.12, 17.005, 0.016, 0.01, 15),
      image: photo("photo-1501785888041-af3ef285b470"),
      names: tx("Dahariz", "الدهاريز", "دهاریز"),
      about: tx(
        "Salalah’s beach strip. The khareef is the season that fills it; the brief should say what the building does in the dry months.",
        "شريط شاطئ صلالة. الخريف هو الموسم الذي يملؤه، وينبغي أن يقول الشرح ماذا يفعل المبنى في الأشهر الجافة.",
        "نوار ساحلی صلاله. خریف فصلی است که آن را پر می‌کند؛ شرح باید بگوید ساختمان در ماه‌های خشک چه می‌کند.",
      ),
    },
    {
      id: "al-tareef",
      cityId: "sohar",
      color: "#f0b27a",
      center: [56.65, 24.355],
      ring: ring(56.65, 24.355, 0.016, 0.011, 16),
      image: photo("photo-1564013799919-ab600027ffc6"),
      names: tx("Al Tareef", "الطريف", "الطریف"),
      about: tx(
        "A residential edge of Sohar, between the port city and the new roads. Townhouses here are a family plan, not a marina story.",
        "طرف سكني من صحار، بين مدينة الميناء والطرق الجديدة. البيوت المتصلة هنا خطة عائلية لا حكاية مرسى.",
        "لبهٔ مسکونی صحار، میان شهر بندری و جاده‌های تازه. تاون‌هاوس اینجا برنامهٔ خانواده است، نه قصهٔ مارینا.",
      ),
    },
  ],
  projects: [
    project({
      id: "courtline",
      areaId: "jvc",
      developerId: "nahla",
      kind: "apartment",
      handover: "2028",
      startPrice: 748_000,
      sizeMin: 416,
      sizeMax: 2121,
      unitCount: 499,
      point: [55.2, 25.062],
      image: photo("photo-1545324418-cc1a3fa10c00"),
      names: tx("Courtline Residences", "كورتلاين", "کورت‌لاین"),
      about: tx(
        "A mid-rise court on the JVC ring. Studios open the book at 748,000 dirhams; larger homes climb toward two thousand square feet. The plan is a walk to the park, not a sea view.",
        "مبنى متوسط على حلقة قرية جميرا. الاستوديو يفتح السجل عند ٧٤٨ ألف درهم، والمساكن الأكبر تقترب من ألفي قدم. الخطة مشي إلى الحديقة لا إطلالة بحر.",
        "میان‌مرتبه‌ای روی حلقهٔ جی‌وی‌سی. استودیو دفتر را از ۷۴۸ هزار درهم باز می‌کند و خانه‌های بزرگ‌تر به دو هزار فوت نزدیک می‌شوند. برنامه پیاده‌روی تا پارک است، نه دید دریا.",
      ),
      whatsapp: "971500000111",
      phone: "+971500000111",
      units: [
        { id: "studio", beds: "studio", priceFrom: 748_000, sizeMin: 416, sizeMax: 480 },
        { id: "1", beds: "1", priceFrom: 980_000, sizeMin: 640, sizeMax: 890 },
        { id: "2", beds: "2", priceFrom: 1_350_000, sizeMin: 980, sizeMax: 2121 },
      ],
    }),
    project({
      id: "walk-residences",
      areaId: "jvc",
      developerId: "nahla",
      kind: "apartment",
      handover: "2028",
      startPrice: 890_000,
      sizeMin: 450,
      sizeMax: 1400,
      unitCount: 320,
      point: [55.214, 25.052],
      image: photo("photo-1600607687939-ce8a6c25118c"),
      names: tx("Walk Residences", "مساكن الممشى", "خانه‌های پیاده‌رو"),
      about: tx(
        "Courtyard apartments on the circle, priced as a first allocation. The walk is the amenity.",
        "شقق فناء على الدائرة، بسعر تخصيص أول. الممشى هو الخدمة.",
        "آپارتمان حیاط‌دار روی دایره، به قیمت یک تخصیص اول. پیاده‌رو همان امکان است.",
      ),
      whatsapp: "971500000111",
      phone: "+971500000111",
    }),
    project({
      id: "ring-atelier",
      areaId: "jvc",
      developerId: "lumen",
      kind: "apartment",
      handover: "2029",
      startPrice: 1_120_000,
      sizeMin: 520,
      sizeMax: 1600,
      unitCount: 280,
      point: [55.218, 25.048],
      image: photo("photo-1464146072230-91cabc968266"),
      names: tx("Ring Atelier", "مشغل الحلقة", "کارگاه حلقه"),
      about: tx(
        "A slimmer tower on the south of the circle, with deeper balconies than the courtyard blocks beside it.",
        "برج أنحف جنوب الدائرة، بشرفات أعمق من كتل الفناء المجاورة.",
        "برجی باریک‌تر جنوب دایره، با بالکن عمیق‌تر از بلوک‌های حیاط کناری.",
      ),
      whatsapp: "971500000222",
      phone: "+971500000222",
    }),
    project({
      id: "safa-court",
      areaId: "dubai-hills",
      developerId: "nahla",
      kind: "villa",
      handover: "2028",
      startPrice: 5_400_000,
      sizeMin: 2800,
      sizeMax: 4600,
      unitCount: 86,
      point: [55.249, 25.108],
      image: photo("photo-1613490493576-7fde63acd811"),
      names: tx("Safa Court", "ساحة الصفا", "حیاط صفا"),
      about: tx(
        "Courtyard villas on the park side of Dubai Hills. Shade and a short walk to the lake carry the brief.",
        "فلل فناء على جانب الحديقة في دبي هيلز. الظل ومشي قصير إلى البحيرة يحملان الشرح.",
        "ویلاهای حیاط‌دار سمت پارک دبی هیلز. سایه و راه کوتاه تا دریاچه شرح را نگه می‌دارند.",
      ),
      whatsapp: "971500000111",
      phone: "+971500000111",
    }),
    project({
      id: "quarter-nine",
      areaId: "business-bay",
      developerId: "safa-co",
      kind: "apartment",
      handover: "2027",
      startPrice: 2_100_000,
      sizeMin: 480,
      sizeMax: 1500,
      unitCount: 410,
      point: [55.268, 25.184],
      image: photo("photo-1486406146926-c627a92ad1ab"),
      names: tx("Quarter Nine", "الربع التاسع", "ربع نهم"),
      about: tx(
        "Canal apartments aimed at a rental from the day of handover. Ask who holds escrow before the payment line.",
        "شقق القناة معدة لإيجار من يوم التسليم. اسأل من يمسك الضمان قبل سطر الدفع.",
        "آپارتمان کانال برای اجاره از روز تحویل. پیش از سطر پرداخت بپرس امانت دست کیست.",
      ),
      whatsapp: "971500000333",
      phone: "+971500000333",
    }),
    project({
      id: "marina-loom",
      areaId: "dubai-marina",
      developerId: "safa-co",
      kind: "apartment",
      handover: "2026",
      startPrice: 2_400_000,
      sizeMin: 510,
      sizeMax: 1700,
      unitCount: 190,
      point: [55.144, 25.078],
      image: photo("photo-1578895101408-1a36b834405b"),
      names: tx("Marina Loom", "نول المرسى", "دار مارینا"),
      about: tx(
        "One of the last off-plan plots on the marina edge. Handover is the nearest in the Dubai book.",
        "من آخر قطع البيع على الخارطة على حافة المرسى. التسليم الأقرب في سجل دبي.",
        "یکی از آخرین قطعه‌های پیش‌فروش لبهٔ مارینا. تحویل، نزدیک‌ترین در دفتر دبی است.",
      ),
      whatsapp: "971500000333",
      phone: "+971500000333",
    }),
    project({
      id: "creek-atelier",
      areaId: "creek-harbour",
      developerId: "lumen",
      kind: "apartment",
      handover: "2027",
      currency: "USD",
      startPrice: 520_000,
      sizeMin: 490,
      sizeMax: 1800,
      unitCount: 360,
      point: [55.349, 25.207],
      image: photo("photo-1582407947304-fd86f028f716"),
      names: tx("Creek Atelier", "مشغل الخور", "کارگاه خور"),
      about: tx(
        "A slim tower on the creek with deeper balconies than the neighbouring plots.",
        "برج نحيف على الخور بشرفات أعمق من القطع المجاورة.",
        "برجی باریک روی خور با بالکن عمیق‌تر از قطعه‌های همسایه.",
      ),
      whatsapp: "971500000222",
      phone: "+971500000222",
    }),
    project({
      id: "palm-shade",
      areaId: "palm-jumeirah",
      developerId: "qasr",
      kind: "villa",
      handover: "2029",
      startPrice: 9_200_000,
      sizeMin: 3200,
      sizeMax: 5400,
      unitCount: 42,
      point: [55.132, 25.116],
      image: photo("photo-1518684079-3c830dcef090"),
      names: tx("Palm Shade", "ظل النخلة", "سایهٔ نخل"),
      about: tx(
        "Garden villas on an inner frond. Light is the strength; the beach road is a walk, not a view from every room.",
        "فلل حديقة على سعفة داخلية. الضوء هو القوة، وطريق الشاطئ مشي لا إطلالة من كل غرفة.",
        "ویلاهای باغی روی یک شاخهٔ درونی. نور نقطهٔ قوت است؛ جادهٔ ساحل پیاده‌روی است، نه منظر هر اتاق.",
      ),
      whatsapp: "971500000444",
      phone: "+971500000444",
    }),
    project({
      id: "southlight",
      areaId: "dubai-south",
      developerId: "lumen",
      kind: "apartment",
      handover: "2028",
      startPrice: 720_000,
      sizeMin: 400,
      sizeMax: 1200,
      unitCount: 540,
      point: [55.168, 24.9],
      image: photo("photo-1545324418-cc1a3fa10c00"),
      names: tx("Southlight House", "بيت الضوء الجنوبي", "خانهٔ نور جنوب"),
      about: tx(
        "Compact apartments beside the exhibition grounds. The price is gentle and the wait for a street is not.",
        "شقق مدمجة بجانب أرض المعارض. السعر هادئ والانتظار لشارع ليس كذلك.",
        "آپارتمان جمع‌وجور کنار زمین نمایشگاه. قیمت آرام است و انتظار برای خیابان نه.",
      ),
      whatsapp: "971500000222",
      phone: "+971500000222",
    }),
    project({
      id: "landline-villas",
      areaId: "dubai-land",
      developerId: "qasr",
      kind: "villa",
      handover: "2028",
      startPrice: 3_600_000,
      sizeMin: 2400,
      sizeMax: 3900,
      unitCount: 120,
      point: [55.378, 25.082],
      image: photo("photo-1600585154340-be6161a56a0c"),
      names: tx("Landline Villas", "فلل خط الأرض", "ویلاهای خط زمین"),
      about: tx(
        "A villa row with wider plots than the coastal stock. The garden is the room they are selling.",
        "صف فلل بقطع أوسع من مخزون الساحل. الحديقة هي الغرفة التي يبيعونها.",
        "ردیفی از ویلا با قطعه پهن‌تر از موجودی ساحل. باغ همان اتاقی است که می‌فروشند.",
      ),
      whatsapp: "971500000444",
      phone: "+971500000444",
    }),
    project({
      id: "mashrabiya",
      areaId: "aljada",
      developerId: "lumen",
      kind: "apartment",
      handover: "2028",
      startPrice: 620_000,
      sizeMin: 430,
      sizeMax: 1350,
      unitCount: 380,
      point: [55.474, 25.3],
      image: photo("photo-1464146072230-91cabc968266"),
      names: tx("Mashrabiya House", "بيت المشربية", "خانهٔ مشربیه"),
      about: tx(
        "Screened balconies on Aljada’s boulevard. Sharjah entry, with a payment line that should be read in dirhams and in years.",
        "شرفات مشربية على جادة الجادة. دخول الشارقة، وسطر دفع ينبغي أن يُقرأ بالدرهم وبالسنوات.",
        "بالکن‌های مشبک روی بلوار الجاده. ورود شارجه، با سطر پرداختی که باید به درهم و به سال خوانده شود.",
      ),
      whatsapp: "971500000222",
      phone: "+971500000222",
    }),
    project({
      id: "west-court",
      areaId: "muwaileh",
      developerId: "nahla",
      kind: "apartment",
      handover: "2027",
      startPrice: 540_000,
      sizeMin: 400,
      sizeMax: 1100,
      unitCount: 260,
      point: [55.438, 25.316],
      image: photo("photo-1502005229762-cf1b2da7c5d6"),
      names: tx("West Court", "الفناء الغربي", "حیاط غربی"),
      about: tx(
        "A low court near the university roads. The brief is a first home in Sharjah, not a waterfront.",
        "فناء منخفض قرب طرق الجامعة. الشرح منزل أول في الشارقة لا واجهة ماء.",
        "حیاطی کوتاه نزدیک جاده‌های دانشگاه. شرح، خانهٔ اول در شارجه است نه لبهٔ آب.",
      ),
      whatsapp: "971500000111",
      phone: "+971500000111",
    }),
    project({
      id: "yas-lantern",
      areaId: "yas-island",
      developerId: "qasr",
      kind: "apartment",
      handover: "2028",
      startPrice: 1_800_000,
      sizeMin: 560,
      sizeMax: 1900,
      unitCount: 300,
      point: [54.608, 24.49],
      image: photo("photo-1512453979798-5ea266f8880c"),
      names: tx("Yas Lantern", "فانوس ياس", "فانوس یاس"),
      about: tx(
        "Apartments between the marina and the circuit. Weekend demand is the story; the weekday rent is the question.",
        "شقق بين المرسى والحلبة. طلب نهاية الأسبوع هو الحكاية، وإيجار أيام الأسبوع هو السؤال.",
        "آپارتمان میان مارینا و پیست. تقاضای آخر هفته قصه است و اجارهٔ روزهای هفته سؤال.",
      ),
      whatsapp: "971500000444",
      phone: "+971500000444",
    }),
    project({
      id: "gallery-villas",
      areaId: "saadiyat",
      developerId: "qasr",
      kind: "villa",
      handover: "2029",
      startPrice: 4_200_000,
      sizeMin: 3000,
      sizeMax: 5200,
      unitCount: 48,
      point: [54.43, 24.548],
      image: photo("photo-1600585154526-990dced4db0d"),
      names: tx("Gallery Villas", "فلل المعرض", "ویلاهای گالری"),
      about: tx(
        "Beach villas a short drive from the museums. The price is an Abu Dhabi hold, not a Dubai studio comparison.",
        "فلل شاطئ على مسافة قصيرة من المتاحف. السعر احتفاظ في أبوظبي لا مقارنة باستوديو دبي.",
        "ویلاهای ساحلی نزدیک موزه‌ها. قیمت، نگه‌داشت ابوظبی است نه مقایسه با استودیوی دبی.",
      ),
      whatsapp: "971500000444",
      phone: "+971500000444",
    }),
    project({
      id: "marjan-shade",
      areaId: "al-marjan",
      developerId: "lumen",
      kind: "apartment",
      handover: "2028",
      startPrice: 980_000,
      sizeMin: 470,
      sizeMax: 1500,
      unitCount: 340,
      point: [55.732, 25.686],
      image: photo("photo-1507525428034-b723cf961d3e"),
      names: tx("Marjan Shade", "ظل المرجان", "سایهٔ المرجان"),
      about: tx(
        "Sea-facing apartments on the island. The drive back to Dubai is part of the price, even if it is not on the card.",
        "شقق تطل على البحر في الجزيرة. القيادة عائداً إلى دبي جزء من السعر وإن لم تكن على البطاقة.",
        "آپارتمان رو به دریا روی جزیره. راه برگشت به دبی بخشی از قیمت است، حتی اگر روی کارت نباشد.",
      ),
      whatsapp: "971500000222",
      phone: "+971500000222",
    }),
    project({
      id: "bahr-house",
      areaId: "al-mouj",
      developerId: "bahr",
      kind: "apartment",
      handover: "2028",
      startPrice: 95_000,
      sizeMin: 540,
      sizeMax: 1800,
      unitCount: 210,
      point: [58.368, 23.63],
      image: photo("photo-1469796466635-455ede028aca"),
      names: tx("Bahr House", "بيت البحر", "خانهٔ بحر"),
      about: tx(
        "Marina apartments at Al Mouj, priced in Omani rial. A one-bed sits above the studio; ask what the service charge does to the rial yield.",
        "شقق المرسى في الموج، بالريال العماني. غرفة نوم واحدة فوق الاستوديو؛ اسأل ماذا تفعل رسوم الخدمة بعائد الريال.",
        "آپارتمان مارینا در الموج، به ریال عمان. یک‌خوابه بالای استودیو می‌نشیند؛ بپرس شارژ خدمات با بازده ریال چه می‌کند.",
      ),
      whatsapp: "96890000011",
      phone: "+96890000011",
      units: [
        { id: "studio", beds: "studio", priceFrom: 95_000, sizeMin: 540, sizeMax: 620 },
        { id: "1", beds: "1", priceFrom: 125_000, sizeMin: 780, sizeMax: 980 },
        { id: "2", beds: "2", priceFrom: 168_000, sizeMin: 1100, sizeMax: 1800 },
      ],
    }),
    project({
      id: "mouj-walk",
      areaId: "al-mouj",
      developerId: "bahr",
      kind: "apartment",
      handover: "2027",
      startPrice: 78_000,
      sizeMin: 480,
      sizeMax: 1400,
      unitCount: 160,
      point: [58.36, 23.624],
      image: photo("photo-1449824913935-59a10b8d2000"),
      names: tx("Mouj Walk", "ممشى الموج", "پیاده‌راه الموج"),
      about: tx(
        "Lower blocks along the marina walk. Handover is a year sooner than Bahr House, and the rial price is the gentler of the two.",
        "كتل أدنى على ممشى المرسى. التسليم أبكر بسنة من بيت البحر، وسعر الريال الأهدأ بينهما.",
        "بلوک‌های کوتاه‌تر روی پیاده‌راه مارینا. تحویل یک سال زودتر از خانهٔ بحر است و قیمت ریالی آرام‌ترِ این دو.",
      ),
      whatsapp: "96890000011",
      phone: "+96890000011",
    }),
    project({
      id: "qurum-light",
      areaId: "qurum",
      developerId: "lumen",
      kind: "apartment",
      handover: "2028",
      startPrice: 120_000,
      sizeMin: 700,
      sizeMax: 2100,
      unitCount: 90,
      point: [58.492, 23.6],
      image: photo("photo-1502005229762-cf1b2da7c5d6"),
      names: tx("Qurum Light", "ضوء القرم", "نور قرم"),
      about: tx(
        "An infill building on a finished Qurum street. You are buying the neighbourhood that is already there.",
        "مبنى بين شارع منجز في القرم. تشتري الحي الموجود أصلاً.",
        "ساختمانی میان یک خیابان تمام‌شده در قرم. محله‌ای را می‌خری که همین حالا هست.",
      ),
      whatsapp: "96890000022",
      phone: "+96890000022",
    }),
    project({
      id: "frankincense",
      areaId: "dahariz",
      developerId: "bahr",
      kind: "villa",
      handover: "2029",
      startPrice: 145_000,
      sizeMin: 2200,
      sizeMax: 3400,
      unitCount: 36,
      point: [54.124, 17.004],
      image: photo("photo-1501785888041-af3ef285b470"),
      names: tx("Frankincense Court", "فناء اللبان", "حیاط کندر"),
      about: tx(
        "Beach villas in Dahariz. The khareef fills the season; the brief should say who stays the rest of the year.",
        "فلل شاطئ في الدهاريز. الخريف يملأ الموسم، وينبغي أن يقول الشرح من يبقى بقية السنة.",
        "ویلاهای ساحلی دهاریز. خریف فصل را پر می‌کند؛ شرح باید بگوید بقیهٔ سال چه کسی می‌ماند.",
      ),
      whatsapp: "96890000011",
      phone: "+96890000011",
    }),
    project({
      id: "sohar-yard",
      areaId: "al-tareef",
      developerId: "nahla",
      kind: "townhouse",
      handover: "2028",
      startPrice: 62_000,
      sizeMin: 1600,
      sizeMax: 2300,
      unitCount: 74,
      point: [56.653, 24.353],
      image: photo("photo-1564013799919-ab600027ffc6"),
      names: tx("Sohar Yard", "باحة صحار", "حیاط صحار"),
      about: tx(
        "Townhouses on the residential edge of Sohar. A family plan in rial, with the port as work and the yard as the amenity.",
        "بيوت متصلة على الطرف السكني من صحار. خطة عائلية بالريال، الميناء عمل والباحة هي الخدمة.",
        "تاون‌هاوس لبهٔ مسکونی صحار. برنامهٔ خانواده به ریال؛ بندر کار است و حیاط همان امکان.",
      ),
      whatsapp: "96890000033",
      phone: "+96890000033",
    }),
  ],
  suggestions: [
    { id: "sug-dubai", kind: "city", targetId: "dubai", order: 1 },
    { id: "sug-abu-dhabi", kind: "city", targetId: "abu-dhabi", order: 2 },
    { id: "sug-sharjah", kind: "city", targetId: "sharjah", order: 3 },
    { id: "sug-rak", kind: "city", targetId: "ras-al-khaimah", order: 4 },
    { id: "sug-muscat", kind: "city", targetId: "muscat", order: 5 },
    { id: "sug-salalah", kind: "city", targetId: "salalah", order: 6 },
    { id: "sug-sohar", kind: "city", targetId: "sohar", order: 7 },
    { id: "sug-jvc", kind: "area", targetId: "jvc", order: 8 },
    { id: "sug-palm", kind: "area", targetId: "palm-jumeirah", order: 9 },
    { id: "sug-marina", kind: "area", targetId: "dubai-marina", order: 10 },
    { id: "sug-bay", kind: "area", targetId: "business-bay", order: 11 },
    { id: "sug-mouj", kind: "area", targetId: "al-mouj", order: 12 },
    { id: "sug-yas", kind: "area", targetId: "yas-island", order: 13 },
  ],
};

function withProjectCurrencies<T extends { areas: { id: string; cityId: string }[]; cities: { id: string; country: string }[]; projects: { areaId: string; currency?: string }[] }>(
  atlas: T,
): T {
  return {
    ...atlas,
    projects: atlas.projects.map((project) => {
      if (project.currency && project.currency !== "AED") return project;
      const area = atlas.areas.find((item) => item.id === project.areaId);
      const city = atlas.cities.find((item) => item.id === area?.cityId);
      return { ...project, currency: currencyOf((city?.country as CountryId) ?? "ae") };
    }),
  };
}

export const seedAtlas: Atlas = normalizeAtlas(withProjectCurrencies(rawSeedAtlas))!;
