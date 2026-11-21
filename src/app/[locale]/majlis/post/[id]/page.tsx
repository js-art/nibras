import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CircleShell, PostCard } from "@/components/circle/circle-ui";
import { circleChrome } from "@/lib/circle/chrome";
import { getPost } from "@/lib/circle/store";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await connection();
  return pageMetadata(locale, {
    title: { en: "A majlis note", ar: "ملاحظة من المجلس", fa: "یک یادداشت مجلس" },
    description: {
      en: "One note from an agent or an investor, read next to the project.",
      ar: "ملاحظة واحدة من وكيل أو مستثمر، تُقرأ بجانب المشروع.",
      fa: "یک یادداشت از ایجنت یا سرمایه‌گذار، کنار پروژه.",
    },
    path: `/majlis/post/${id}`,
  });
}

export default async function CirclePostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await connection();
  const chrome = await circleChrome(locale);
  const post = await getPost(id, locale, chrome.viewer?.id);
  if (!post) notFound();
  const t = await getTranslations({ locale, namespace: "circle" });
  return (
    <CircleShell
      locale={locale}
      mode="post"
      trail={[
        { href: `/majlis/${post.author.handle}`, label: post.author.displayName },
        { label: t("kindNote") },
      ]}
      {...chrome}
    >
      <div className="c-stack">
        <PostCard locale={locale} viewer={chrome.viewer} post={post} />
      </div>
    </CircleShell>
  );
}
