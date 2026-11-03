import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { ProjectBook } from "@/components/catalogue/project-book";
import { readAtlas } from "@/lib/atlas-store";
import { bookQueryFrom } from "@/lib/project-book";
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
    title: site.pages.projects.title,
    description: site.pages.projects.description,
    path: "/projects",
  });
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const one = Array.isArray(value) ? value[0] : value;
    if (one) url.set(key, one);
  }

  return <ProjectBook atlas={atlas} query={bookQueryFrom(url)} />;
}
