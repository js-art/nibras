import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProjectSheet } from "@/components/catalogue/project-sheet";
import { FALLBACK_IMAGE, pick, pickPlain } from "@/data/atlas";
import { hasAdminSession } from "@/lib/admin-auth";
import { readAtlas } from "@/lib/atlas-store";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await connection();
  const atlas = await readAtlas();
  const project = atlas.projects.find((item) => item.id === slug);
  if (!project) return {};
  return pageMetadata(locale, {
    title: pick(project.names, locale),
    description: pickPlain(project.about, locale),
    image: project.image || FALLBACK_IMAGE,
    path: `/projects/${project.id}`,
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connection();
  const atlas = await readAtlas();
  const project = atlas.projects.find((item) => item.id === slug);
  if (!project) notFound();
  const admin = await hasAdminSession();
  return <ProjectSheet locale={locale} atlas={atlas} project={project} admin={admin} />;
}
