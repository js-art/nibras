/**
 * Post text stays plain in the database. Hashtags, mentions, and links become
 * navigation at render time. Tokenizer is the Dinka one: what is linked is
 * what the indexer stored.
 */

export type Token =
  | { type: "text"; value: string }
  | { type: "tag"; value: string; raw: string }
  | { type: "mention"; value: string; raw: string }
  | { type: "link"; value: string; raw: string };

const PATTERN =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)|#([\p{L}\p{N}_]{1,64})|@([a-zA-Z0-9_.]{2,32})/gu;

export function tokenize(input: string): Token[] {
  const src = input ?? "";
  const out: Token[] = [];
  let last = 0;

  for (const match of src.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ type: "text", value: src.slice(last, at) });

    if (match[1]) {
      out.push({ type: "link", value: match[1], raw: match[0] });
    } else if (match[2]) {
      out.push({ type: "tag", value: match[2].toLowerCase(), raw: match[0] });
    } else if (match[3]) {
      const handle = match[3].replace(/\.+$/, "");
      if (handle.length >= 2) out.push({ type: "mention", value: handle.toLowerCase(), raw: `@${handle}` });
      else out.push({ type: "text", value: match[0] });
    }
    last = at + match[0].length;
  }

  if (last < src.length) out.push({ type: "text", value: src.slice(last) });
  return out;
}

export function extractTags(input: string, limit = 12): string[] {
  const seen = new Set<string>();
  for (const token of tokenize(input)) {
    if (token.type === "tag" && !seen.has(token.value)) seen.add(token.value);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function extractMentions(input: string, limit = 12): string[] {
  const seen = new Set<string>();
  for (const token of tokenize(input)) {
    if (token.type === "mention" && !seen.has(token.value)) seen.add(token.value);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function hrefFor(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}
