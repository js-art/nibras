import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale, locale: override }) => {
  let candidate = override ?? (await requestLocale);

  if (!hasLocale(routing.locales, candidate)) {
    try {
      const rootParams = await import("next/root-params");
      const fromParam = await rootParams.locale();
      if (hasLocale(routing.locales, fromParam)) candidate = fromParam;
    } catch {
      // root-params unavailable outside a locale segment
    }
  }

  const locale = hasLocale(routing.locales, candidate)
    ? candidate
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
