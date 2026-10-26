import type { Metadata } from "next";
import { pick, type LocaleText } from "@/data/atlas";
import { readSite } from "@/lib/site-store";

function clip(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export async function pageMetadata(
  locale: string,
  input: { title: LocaleText | string; description: LocaleText | string; image?: string; path?: string },
): Promise<Metadata> {
  const site = await readSite();
  const title = typeof input.title === "string" ? input.title : pick(input.title, locale);
  const description = clip(
    typeof input.description === "string" ? input.description : pick(input.description, locale),
  );
  const siteName = pick(site.seo.siteName, locale);
  const absolute = `${title} · ${siteName}`;
  return {
    title: absolute,
    description,
    openGraph: {
      title: absolute,
      description,
      locale,
      siteName,
      type: "website",
      ...(input.image ? { images: [{ url: input.image }] } : {}),
    },
    twitter: {
      card: input.image ? "summary_large_image" : "summary",
      title: absolute,
      description,
      ...(input.image ? { images: [input.image] } : {}),
    },
    alternates: input.path
      ? {
          languages: {
            en: `/en${input.path}`,
            ar: `/ar${input.path}`,
            fa: `/fa${input.path}`,
          },
        }
      : undefined,
  };
}

export async function defaultMetadata(locale: string): Promise<Metadata> {
  const site = await readSite();
  return pageMetadata(locale, {
    title: site.seo.defaultTitle,
    description: site.seo.defaultDescription,
    path: "",
  });
}
