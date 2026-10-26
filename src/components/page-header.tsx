import { Link } from "@/i18n/navigation";

export function PageHeader({
  title,
  lede,
  kicker,
  back,
}: {
  title: string;
  lede?: string;
  kicker?: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="border-b border-[#d5dfd8] bg-[#e7f2ec]">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:py-8">
        {back ? (
          <Link href={back.href} className="text-sm font-medium text-palm transition hover:text-palm-deep">
            {back.label}
          </Link>
        ) : null}
        <div className={`${back ? "mt-4" : ""} h-px w-12 bg-[#e4c27a]`} />
        {kicker ? <p className="mt-3 text-sm font-medium text-palm">{kicker}</p> : null}
        <h1
          className={`${kicker ? "mt-1.5" : "mt-3"} max-w-xl font-display text-xl leading-[1.35] text-palm-deep sm:text-2xl sm:leading-[1.3]`}
        >
          {title}
        </h1>
        {lede ? <p className="mt-2.5 max-w-[58ch] text-base leading-7 text-mist">{lede}</p> : null}
      </div>
    </header>
  );
}
