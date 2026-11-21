import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CircleProfileView, CircleShell } from "@/components/circle/circle-ui";
import { circleChrome } from "@/lib/circle/chrome";
import { getProfile, listProjects, viewerBlocked } from "@/lib/circle/store";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  await connection();
  return pageMetadata(locale, {
    title: `@${handle}`,
    description: {
      en: "A desk in the majlis of agents and investors.",
      ar: "مكتب في مجلس الوكلاء والمستثمرين.",
      fa: "یک میز در مجلس ایجنت و سرمایه‌گذار.",
    },
    path: `/majlis/${handle}`,
  });
}

export default async function CircleProfilePage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  await connection();
  const chrome = await circleChrome(locale);
  const profile = await getProfile(handle, locale, chrome.viewer?.id);
  if (!profile) notFound();
  const blockedByMe = chrome.viewer ? await viewerBlocked(chrome.viewer.id, profile.person.handle) : false;
  const mine = chrome.viewer?.id === profile.person.id;
  const canAnswer = profile.person.role === "agent" || profile.person.role === "seller";
  const projects = mine && canAnswer ? await listProjects(locale) : [];
  return (
    <CircleShell locale={locale} mode="profile" trail={[{ label: profile.person.displayName }]} {...chrome}>
      <CircleProfileView
        locale={locale}
        viewer={chrome.viewer}
        person={profile.person}
        posts={profile.posts}
        desks={profile.desks}
        projects={projects}
        blocked={profile.blocked}
        blockedByMe={blockedByMe}
      />
    </CircleShell>
  );
}
