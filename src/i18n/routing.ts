import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar", "fa"],
  defaultLocale: "en",
  localePrefix: "always",
  // URL is the source of truth; do not flip language on refresh via cookie/Accept-Language.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function direction(locale: string) {
  return locale === "en" ? "ltr" : "rtl";
}
