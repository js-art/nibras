import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { CircleFeed, CircleShell } from "@/components/circle/circle-ui";
import { circleChrome } from "@/lib/circle/chrome";
import { listFeed, listNeighbourhoods, listProjectDesk, listProjects, projectFacts, projectVoice } from "@/lib/circle/store";
import type { FeedScope } from "@/lib/circle/types";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

const scopes = new Set<FeedScope>(["circle", "following", "agents", "investors", "buyers", "sellers"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  return pageMetadata(locale, {
    title: { en: "Forum", ar: "المنتدى", fa: "انجمن" },
    description: {
      en: "Agents and investors write readings next to a project. Sample desks are labeled. A figure is a reading, not a yield.",
      ar: "وكلاء ومستثمرون يكتبون قراءات بجانب المشروع. المكاتب النموذجية موسومة. الرقم قراءة لا عائداً.",
      fa: "ایجنت‌ها و سرمایه‌گذارها خوانش را کنار پروژه می‌نویسند. میزهای نمونه برچسب دارند. عدد خوانش است، نه بازده.",
    },
    path: "/majlis",
  });
}

export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  const chrome = await circleChrome(locale);
  const scopeRaw = typeof query.scope === "string" ? query.scope : "circle";
  const scope: FeedScope = scopes.has(scopeRaw as FeedScope) ? (scopeRaw as FeedScope) : "circle";
  const tag = typeof query.tag === "string" ? query.tag : undefined;
  const projectId = typeof query.project === "string" ? query.project : undefined;
  const [posts, projects, neighbourhoods, desks, voice, facts] = await Promise.all([
    listFeed({ locale, viewerId: chrome.viewer?.id, scope, tag, projectId }),
    listProjects(locale),
    listNeighbourhoods(locale),
    projectId ? listProjectDesk(projectId) : Promise.resolve([]),
    projectId ? projectVoice(projectId) : Promise.resolve(null),
    projectId ? projectFacts(projectId) : Promise.resolve(null),
  ]);
  const openProject = projectId ? projects.find((item) => item.id === projectId) : undefined;
  const speaker = voice && !voice.banned ? voice : null;

  return (
    <CircleShell
      locale={locale}
      mode="feed"
      trail={
        openProject
          ? speaker
            ? [{ href: `/majlis/${speaker.handle}`, label: speaker.displayName }, { label: openProject.name }]
            : [{ label: openProject.name }]
          : tag
            ? [{ label: `#${tag}` }]
            : undefined
      }
      {...chrome}
    >
      <CircleFeed
        locale={locale}
        viewer={chrome.viewer}
        posts={posts}
        projects={projects}
        neighbourhoods={neighbourhoods}
        desks={desks}
        scope={scope}
        tag={tag}
        projectId={projectId}
        voice={speaker}
        facts={speaker ? facts : null}
      />
    </CircleShell>
  );
}
