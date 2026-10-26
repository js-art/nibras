import { type LocaleText } from "@/data/atlas";

export type PageSeo = {
  title: LocaleText;
  description: LocaleText;
};

export type LandingStep = {
  title: LocaleText;
  body: LocaleText;
};

export type JournalItem = {
  title: LocaleText;
  excerpt: LocaleText;
};

export type SiteContent = {
  brand: {
    /** Display name in header, footer, and desk chrome. */
    name: LocaleText;
    /** Public image URL; empty keeps the default mark. */
    logo: string;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  social: {
    instagram: string;
    linkedin: string;
    x: string;
    telegram: string;
  };
  seo: {
    siteName: LocaleText;
    defaultTitle: LocaleText;
    defaultDescription: LocaleText;
  };
  landing: {
    heroTitle: LocaleText;
    heroLede: LocaleText;
    projectsTitle: LocaleText;
    projectsLede: LocaleText;
    pathTitle: LocaleText;
    pathLede: LocaleText;
    steps: LandingStep[];
    journalTitle: LocaleText;
    journalItems: JournalItem[];
    pocketTitle: LocaleText;
    pocketLede: LocaleText;
    /** Developer ids shown on the home page, in order (max 4). */
    featuredDeveloperIds: string[];
  };
  pages: {
    home: PageSeo;
    map: PageSeo;
    areas: PageSeo;
    projects: PageSeo;
    developers: PageSeo;
  };
};

const tx = (en: string, ar: string, fa: string): LocaleText => ({ en, ar, fa });

function text(value: unknown): LocaleText {
  if (!value || typeof value !== "object") return { en: "", ar: "", fa: "" };
  const row = value as Partial<LocaleText>;
  return {
    en: String(row.en ?? ""),
    ar: String(row.ar ?? ""),
    fa: String(row.fa ?? ""),
  };
}

export const seedSite: SiteContent = {
  brand: {
    name: tx("Jolom", "جولوم", "جولوم"),
    logo: "",
  },
  contact: {
    phone: "+971 4 000 0000",
    whatsapp: "971500000000",
    email: "desk@jolom.ir",
  },
  social: {
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/",
    x: "https://x.com/",
    telegram: "https://t.me/",
  },
  seo: {
    siteName: tx("Jolom", "جولوم", "جولوم"),
    defaultTitle: tx(
      "Jolom — Off-plan investment map for the Emirates & Oman",
      "جولوم — خريطة الاستثمار في المشاريع على الخارطة في الإمارات وعُمان",
      "جولوم — نقشهٔ سرمایه‌گذاری پیش‌فروش در امارات و عمان",
    ),
    defaultDescription: tx(
      "Read neighbourhoods, starting prices, and project briefs on one map before you commit. Prices stay in local currency.",
      "اقرأ الأحياء وأسعار البداية وشروح المشاريع على خريطة واحدة قبل أن تلتزم. تبقى الأسعار بعملة السوق.",
      "محله‌ها، قیمت شروع و شرح پروژه‌ها را روی یک نقشه بخوانید؛ هر بازار با ارز خودش.",
    ),
  },
  landing: {
    heroTitle: tx(
      "Read the map before you commit.",
      "اقرأ الخريطة قبل أن تلتزم.",
      "پیش‌فروش را از روی نقشه بخوان.",
    ),
    heroLede: tx(
      "Browse off-plan projects across the Emirates and Oman by neighbourhood—starting price and a short brief, in place. Each market keeps its own currency.",
      "تصفّح مشاريع البيع على الخارطة في الإمارات وعُمان حياً بحي—سعر البداية وشرح موجز في مكانه. كل سوق يبقى بعملته.",
      "پروژه‌های امارات و عمان را محله‌به‌محله ببینید؛ قیمت شروع و شرح کوتاه همان‌جاست. هر کشور با ارز خودش.",
    ),
    projectsTitle: tx(
      "Featured projects, with place and price",
      "مشاريع مختارة، مع الحي والسعر",
      "پروژه‌های منتخب، با محله و قیمت",
    ),
    projectsLede: tx(
      "Open a card for the brief. Figures in this sample book are illustrative—not live market quotes.",
      "افتح البطاقة لتقرأ الشرح. أرقام هذا الدفتر توضيحية وليست أسعار السوق الحية.",
      "کارت را باز کنید تا شرح را بخوانید. رقم‌های این دفتر نمونه‌اند، نه قیمت زندهٔ بازار.",
    ),
    pathTitle: tx(
      "From the map to a decision",
      "من الخريطة إلى القرار",
      "از نقشه تا تصمیم",
    ),
    pathLede: tx(
      "Find the neighbourhood on the map, then read the project card before you contact the desk.",
      "اعثر على الحي على الخريطة، ثم اقرأ بطاقة المشروع قبل أن تتصل بالمكتب.",
      "محله را روی نقشه پیدا کنید؛ بعد کارت پروژه را بخوانید و سپس با دفتر تماس بگیرید.",
    ),
    steps: [
      {
        title: tx("Choose the market", "اختر السوق", "بازار را انتخاب کنید"),
        body: tx(
          "The Emirates display in dirham; Oman displays in rial. The map opens on the country you select.",
          "تُعرض الإمارات بالدرهم وعُمان بالريال. تفتح الخريطة على البلد الذي تختاره.",
          "امارات با درهم و عمان با ریال نمایش داده می‌شود. نقشه روی همان کشور باز می‌شود.",
        ),
      },
      {
        title: tx("Open a neighbourhood", "افتح حياً", "محله را باز کنید"),
        body: tx(
          "Select the coloured shape. Starting price, active projects, and the written brief appear together.",
          "اختر الشكل الملوّن. يظهر سعر البداية والمشاريع النشطة والشرح المكتوب معاً.",
          "شکل رنگی را انتخاب کنید. قیمت شروع، پروژه‌های فعال و شرح نوشتاری کنار هم می‌آید.",
        ),
      },
      {
        title: tx("Review the project", "راجع المشروع", "پروژه را بررسی کنید"),
        body: tx(
          "Payment plan, unit mix, size range, handover aim, and a direct line to the desk.",
          "خطة الدفع، مزيج الوحدات، نطاق المساحة، هدف التسليم، وخط مباشر إلى المكتب.",
          "برنامهٔ پرداخت، ترکیب واحدها، بازهٔ متراژ، هدف تحویل، و راه تماس مستقیم با دفتر.",
        ),
      },
    ],
    journalTitle: tx(
      "Three checks before you pay",
      "ثلاث مراجعات قبل أن تدفع",
      "سه بررسی پیش از پرداخت",
    ),
    journalItems: [
      {
        title: tx(
          "Handover year is a target, not a contract date",
          "سنة التسليم هدف وليست موعداً تعاقدياً",
          "سال تحویل هدف است، نه تاریخ قطعی قرارداد",
        ),
        excerpt: tx(
          "Ask what is already built on site and what remains on drawings. Treat the year on the card as the developer’s aim.",
          "اسأل عما بُني فعلاً في الموقع وما زال على المخططات. اعتبر السنة على البطاقة هدف المطوّر.",
          "بپرسید چه چیزی روی زمین ساخته شده و چه چیزی هنوز روی نقشه است. سال روی کارت را هدف سازنده بدانید.",
        ),
      },
      {
        title: tx(
          "Map colour separates places—it is not a rating",
          "لون الخريطة يفصل الأماكن—وليس تقييماً",
          "رنگ نقشه مکان‌ها را جدا می‌کند—امتیاز نیست",
        ),
        excerpt: tx(
          "Colours keep neighbourhoods distinct on the map. Open the card and read the brief before you compare places.",
          "الألوان تبقي الأحياء واضحة على الخريطة. افتح البطاقة واقرأ الشرح قبل أن تقارن الأماكن.",
          "رنگ‌ها محله‌ها را روی نقشه از هم جدا نگه می‌دارند. پیش از مقایسه، کارت را باز کنید و شرح را بخوانید.",
        ),
      },
      {
        title: tx(
          "Confirm these points with the agent",
          "أكّد هذه النقاط مع الوكيل",
          "این موارد را با نماینده قطعی کنید",
        ),
        excerpt: tx(
          "Service charge, escrow holder, what any yield figure assumes, and which units remain unsold.",
          "رسوم الخدمة، جهة الضمان، ما يفترضه أي رقم عائد، والوحدات التي لم تُبع بعد.",
          "شارژ خدمات، مسئول حساب امانی، فرض هر رقم بازده، و واحدهایی که هنوز فروخته نشده‌اند.",
        ),
      },
    ],
    pocketTitle: tx(
      "The same map, on your phone",
      "الخريطة نفسها على هاتفك",
      "همان نقشه، روی تلفن شما",
    ),
    pocketLede: tx(
      "Stand in the neighbourhood, open the project card on your phone, and read it there—no office visit required.",
      "قِف في الحي، وافتح بطاقة المشروع على هاتفك، واقرأها هناك—دون حاجة إلى زيارة مكتب.",
      "در محله بایستید، کارت پروژه را روی تلفن باز کنید و همان‌جا بخوانید—بدون مراجعه به دفتر.",
    ),
    featuredDeveloperIds: ["nahla", "lumen", "qasr", "safa-co"],
  },
  pages: {
    home: {
      title: tx(
        "Jolom — Off-plan map for the Emirates & Oman",
        "جولوم — خريطة المشاريع على الخارطة للإمارات وعُمان",
        "جولوم — نقشهٔ پیش‌فروش امارات و عمان",
      ),
      description: tx(
        "Explore off-plan neighbourhoods and projects with starting prices and written briefs.",
        "استكشف أحياء ومشاريع البيع على الخارطة مع أسعار البداية والشروح المكتوبة.",
        "محله‌ها و پروژه‌های پیش‌فروش را با قیمت شروع و شرح نوشتاری ببینید.",
      ),
    },
    map: {
      title: tx("Interactive off-plan map", "الخريطة التفاعلية", "نقشهٔ تعاملی پیش‌فروش"),
      description: tx(
        "Search areas, draw a boundary, and open project briefs on the Jolom map.",
        "ابحث عن المناطق، ارسم حدوداً، وافتح شروح المشاريع على خريطة جولوم.",
        "محله جستجو کنید، محدوده بکشید و شرح پروژه‌ها را روی نقشهٔ جولوم باز کنید.",
      ),
    },
    areas: {
      title: tx("Neighbourhoods", "الأحياء", "محله‌ها"),
      description: tx(
        "Browse Emirates and Oman neighbourhoods with starting prices and project counts.",
        "تصفّح أحياء الإمارات وعُمان مع أسعار البداية وعدد المشاريع.",
        "محله‌های امارات و عمان را با قیمت شروع و تعداد پروژه ببینید.",
      ),
    },
    projects: {
      title: tx("Off-plan projects", "مشاريع على الخارطة", "پروژه‌های پیش‌فروش"),
      description: tx(
        "Filter projects by area or developer. Read briefs, prices, and handover aims.",
        "صفِّ المشاريع حسب الحي أو المطوّر. اقرأ الشروح والأسعار وأهداف التسليم.",
        "پروژه‌ها را بر اساس محله یا سازنده صافی کنید. شرح، قیمت و هدف تحویل را بخوانید.",
      ),
    },
    developers: {
      title: tx("Developers", "المطوّرون", "سازنده‌ها"),
      description: tx(
        "Studios behind the projects on the Jolom book, with delivery counts and briefs.",
        "الاستوديوهات خلف مشاريع دفتر جولوم، مع أعداد التسليم والشروح.",
        "استودیوهای پشت پروژه‌های دفتر جولوم، با تعداد تحویل و شرح.",
      ),
    },
  },
};

export function normalizeSite(input: unknown): SiteContent | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SiteContent>;
  const brand = (raw.brand ?? {}) as Partial<SiteContent["brand"]>;
  const contact = (raw.contact ?? {}) as Partial<SiteContent["contact"]>;
  const social = (raw.social ?? {}) as Partial<SiteContent["social"]>;
  const seo = (raw.seo ?? {}) as Partial<SiteContent["seo"]>;
  const landing = (raw.landing ?? {}) as Partial<SiteContent["landing"]>;
  const pages = (raw.pages ?? {}) as Partial<SiteContent["pages"]>;

  const stepsRaw = Array.isArray(landing.steps) ? landing.steps : seedSite.landing.steps;
  const journalRaw = Array.isArray(landing.journalItems)
    ? landing.journalItems
    : seedSite.landing.journalItems;

  const brandName = text(brand.name ?? seo.siteName ?? seedSite.brand.name);

  return {
    brand: {
      name: brandName,
      logo: String(brand.logo ?? seedSite.brand.logo).trim(),
    },
    contact: {
      phone: String(contact.phone ?? seedSite.contact.phone),
      whatsapp: String(contact.whatsapp ?? seedSite.contact.whatsapp).replace(/[^\d]/g, ""),
      email: String(contact.email ?? seedSite.contact.email),
    },
    social: {
      instagram: String(social.instagram ?? seedSite.social.instagram),
      linkedin: String(social.linkedin ?? seedSite.social.linkedin),
      x: String(social.x ?? seedSite.social.x),
      telegram: String(social.telegram ?? seedSite.social.telegram),
    },
    seo: {
      siteName: text(seo.siteName ?? brandName),
      defaultTitle: text(seo.defaultTitle ?? seedSite.seo.defaultTitle),
      defaultDescription: text(seo.defaultDescription ?? seedSite.seo.defaultDescription),
    },
    landing: {
      heroTitle: text(landing.heroTitle ?? seedSite.landing.heroTitle),
      heroLede: text(landing.heroLede ?? seedSite.landing.heroLede),
      projectsTitle: text(landing.projectsTitle ?? seedSite.landing.projectsTitle),
      projectsLede: text(landing.projectsLede ?? seedSite.landing.projectsLede),
      pathTitle: text(landing.pathTitle ?? seedSite.landing.pathTitle),
      pathLede: text(landing.pathLede ?? seedSite.landing.pathLede),
      steps: stepsRaw.slice(0, 6).map((step, index) => ({
        title: text((step as LandingStep)?.title ?? seedSite.landing.steps[index]?.title),
        body: text((step as LandingStep)?.body ?? seedSite.landing.steps[index]?.body),
      })),
      journalTitle: text(landing.journalTitle ?? seedSite.landing.journalTitle),
      journalItems: journalRaw.slice(0, 6).map((item, index) => ({
        title: text((item as JournalItem)?.title ?? seedSite.landing.journalItems[index]?.title),
        excerpt: text((item as JournalItem)?.excerpt ?? seedSite.landing.journalItems[index]?.excerpt),
      })),
      pocketTitle: text(landing.pocketTitle ?? seedSite.landing.pocketTitle),
      pocketLede: text(landing.pocketLede ?? seedSite.landing.pocketLede),
      featuredDeveloperIds: Array.isArray(landing.featuredDeveloperIds)
        ? landing.featuredDeveloperIds.map(String).filter(Boolean).slice(0, 4)
        : [...seedSite.landing.featuredDeveloperIds],
    },
    pages: {
      home: {
        title: text(pages.home?.title ?? seedSite.pages.home.title),
        description: text(pages.home?.description ?? seedSite.pages.home.description),
      },
      map: {
        title: text(pages.map?.title ?? seedSite.pages.map.title),
        description: text(pages.map?.description ?? seedSite.pages.map.description),
      },
      areas: {
        title: text(pages.areas?.title ?? seedSite.pages.areas.title),
        description: text(pages.areas?.description ?? seedSite.pages.areas.description),
      },
      projects: {
        title: text(pages.projects?.title ?? seedSite.pages.projects.title),
        description: text(pages.projects?.description ?? seedSite.pages.projects.description),
      },
      developers: {
        title: text(pages.developers?.title ?? seedSite.pages.developers.title),
        description: text(pages.developers?.description ?? seedSite.pages.developers.description),
      },
    },
  };
}
