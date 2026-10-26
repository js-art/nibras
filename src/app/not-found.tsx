import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { direction, routing } from "@/i18n/routing";
import { Shell } from "@/components/shell";
import { LostPage } from "@/components/lost-page";
import "./globals.css";

export const instant = false;

export default async function RootNotFound() {
  const locale = routing.defaultLocale;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} dir={direction(locale)} className="h-full antialiased">
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Shell locale={locale}>
            <LostPage />
          </Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
