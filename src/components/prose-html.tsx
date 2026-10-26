import { sanitizeProse } from "@/lib/html";

export function ProseHtml({
  html,
  className = "prose-html text-base leading-8 text-ink",
}: {
  html: string;
  className?: string;
}) {
  const safe = sanitizeProse(html);
  if (!safe.trim()) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
