import sanitizeHtml from "sanitize-html";

const TAG = /<\/?[a-z][\s\S]*>/i;

export function notePlain(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function noteHtml(value: string) {
  const text = value.trim();
  if (!TAG.test(text)) return text;
  return sanitizeHtml(text, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote"],
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer", target: "_blank" }),
    },
  }).trim();
}
