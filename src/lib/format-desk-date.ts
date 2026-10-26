/** Format a desk timestamp in the active UI locale (fa / ar / en). */
export function formatDeskDate(value: number | string | Date | null | undefined, locale: string) {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : typeof value === "string"
          ? Date.parse(value)
          : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return "—";

  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-GB";
  return new Intl.DateTimeFormat(tag, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}
