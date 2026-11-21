import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomsFrame } from "@/components/rooms-frame";

export const instant = false;

export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });
  const lang = locale === "en" || locale === "ar" ? locale : "fa";

  return <RoomsFrame src={`/meet?lang=${lang}`} locale={lang} title={t("rooms")} retryLabel={t("rooms")} />;
}
