import { Link } from "@/i18n/navigation";

export function Pagination({
  locale,
  href,
  page,
  pageCount,
  prevLabel,
  nextLabel,
  pageLabel,
}: {
  locale: string;
  href: string;
  page: number;
  pageCount: number;
  prevLabel: string;
  nextLabel: string;
  pageLabel: (page: number, pageCount: number) => string;
}) {
  if (pageCount <= 1) return null;

  function path(next: number) {
    const base = href.split("?")[0] || href;
    const params = new URLSearchParams(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
    params.set("page", String(next));
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#d5dfd8] pt-6" aria-label="Pagination">
      {page > 1 ? (
        <Link
          locale={locale}
          href={path(page - 1)}
          className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm font-medium text-ink transition hover:border-palm"
        >
          {prevLabel}
        </Link>
      ) : (
        <span className="inline-flex h-11 items-center px-4 text-sm text-mist">{prevLabel}</span>
      )}
      <p className="text-sm text-mist">{pageLabel(page, pageCount)}</p>
      {page < pageCount ? (
        <Link
          locale={locale}
          href={path(page + 1)}
          className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm font-medium text-ink transition hover:border-palm"
        >
          {nextLabel}
        </Link>
      ) : (
        <span className="inline-flex h-11 items-center px-4 text-sm text-mist">{nextLabel}</span>
      )}
    </nav>
  );
}
