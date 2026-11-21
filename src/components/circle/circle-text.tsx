import { Link } from "@/i18n/navigation";
import { noteHtml } from "@/lib/circle/html";
import { hrefFor, tokenize } from "@/lib/circle/richtext";

export function HallMark({ sign, value }: { sign: "#" | "@"; value: string }) {
  const rtl = /[\u0590-\u08FF]/.test(value);
  return (
    <bdi dir={rtl ? "rtl" : "ltr"} className="c-token">
      {sign}
      {value}
    </bdi>
  );
}

const MARKUP = /<\/?[a-z][\s\S]*>/i;

export function CircleBody({ text, className }: { text: string; className?: string }) {
  if (!MARKUP.test(text)) return <CircleText text={text} className={className} />;
  return <div className={`c-note ${className ?? ""}`.trim()} dangerouslySetInnerHTML={{ __html: noteHtml(text) }} />;
}

export function CircleText({ text, className }: { text: string; className?: string }) {
  const tokens = tokenize(text);
  return (
    <p className={className ?? "whitespace-pre-wrap text-base leading-7 text-ink"}>
      {tokens.map((token, index) => {
        if (token.type === "tag") {
          return (
            <Link key={index} href={`/majlis?tag=${encodeURIComponent(token.value)}`} className="font-medium text-palm">
              <HallMark sign="#" value={token.value} />
            </Link>
          );
        }
        if (token.type === "mention") {
          return (
            <Link key={index} href={`/majlis/${token.value}`} className="font-medium text-palm">
              <HallMark sign="@" value={token.value} />
            </Link>
          );
        }
        if (token.type === "link") {
          return (
            <a key={index} href={hrefFor(token.value)} className="text-palm underline" rel="noreferrer">
              <bdi dir="ltr" className="c-token">
                {token.raw}
              </bdi>
            </a>
          );
        }
        return <span key={index}>{token.value}</span>;
      })}
    </p>
  );
}
