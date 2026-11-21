import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleShell, PostList } from "@/components/circle/circle-ui";
import { circleChrome } from "@/lib/circle/chrome";
import { listSaved } from "@/lib/circle/store";
import { pageMetadata } from "@/lib/seo";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  return pageMetadata(locale, {
    title: { en: "Saved notes", ar: "ملاحظات محفوظة", fa: "یادداشت‌های ذخیره‌شده" },
    description: {
      en: "Notes you kept from the majlis.",
      ar: "ملاحظات أبقيتها من المجلس.",
      fa: "یادداشت‌هایی که از مجلس نگه داشته‌ای.",
    },
    path: "/majlis/saved",
  });
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const chrome = await circleChrome(locale);
  const t = await getTranslations({ locale, namespace: "circle" });
  const posts = chrome.viewer ? await listSaved(locale, chrome.viewer.id) : [];
  return (
    <CircleShell locale={locale} mode="saved" {...chrome}>
      <div className="c-stack">
        <PostList locale={locale} viewer={chrome.viewer} posts={posts} empty={chrome.viewer ? t("emptySaved") : t("signIn")} />
      </div>
    </CircleShell>
  );
}
