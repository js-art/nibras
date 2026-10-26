import { Link } from "@/i18n/navigation";
import { FALLBACK_IMAGE } from "@/data/atlas";

export function EntityCard({
  locale,
  href,
  image,
  title,
  meta,
  body,
  accent,
  cta,
}: {
  locale: string;
  href: string;
  image?: string;
  title: string;
  meta?: string;
  body?: string;
  accent?: string;
  cta?: string;
}) {
  return (
    <Link
      locale={locale}
      href={href}
      className="group relative block aspect-[4/5] overflow-hidden rounded-xl shadow-[0_18px_40px_-22px_rgba(6,36,33,0.7)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_28px_50px_-20px_rgba(6,36,33,0.75)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-palm sm:aspect-[3/4]"
    >
      <img
        src={image || FALLBACK_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[var(--palm-deep)] from-25% via-[var(--palm-deep)]/55 via-55% to-transparent" />
      {accent ? (
        <span
          className="absolute end-3 top-3 size-2 rounded-full ring-2 ring-white/90"
          style={{ background: accent }}
          aria-hidden
        />
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 sm:p-5">
        {meta ? (
          <span className="text-xs font-medium leading-snug text-[#e4c27a] [text-shadow:0_1px_2px_rgba(6,36,33,0.85)] sm:text-sm">
            {meta}
          </span>
        ) : null}
        <span className="font-display text-xl leading-snug tracking-tight text-[#e7f2ec] [text-shadow:0_1px_3px_rgba(6,36,33,0.7)] sm:text-2xl">
          {title}
        </span>
        {body ? <span className="line-clamp-2 text-sm leading-6 text-[#d5dfd8]">{body}</span> : null}
        {cta ? (
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#e4c27a] [text-shadow:0_1px_2px_rgba(6,36,33,0.85)]">
            {cta}
            <span aria-hidden className="transition duration-300 ease-out group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              →
            </span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}
