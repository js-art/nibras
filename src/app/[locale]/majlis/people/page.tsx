import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { CirclePeople, CircleShell } from "@/components/circle/circle-ui";
import { circleChrome } from "@/lib/circle/chrome";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  return pageMetadata(locale, {
    title: { en: "People in the majlis", ar: "ناس المجلس", fa: "اهل مجلس" },
    description: {
      en: "Agents and investors on the same desk.",
      ar: "وكلاء ومستثمرون على المكتب نفسه.",
      fa: "ایجنت‌ها و سرمایه‌گذارها روی یک میز.",
    },
    path: "/majlis/people",
  });
}

export default async function CirclePeoplePage({
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
  const q = typeof query.q === "string" ? query.q : "";
  return (
    <CircleShell locale={locale} mode="people" {...chrome}>
      <CirclePeople people={chrome.people} initialQuery={q} />
    </CircleShell>
  );
}
