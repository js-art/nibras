export function resolveUploadDisplayUrl(url: string | null | undefined) {
  return url?.trim() || "";
}

export function resolveMediaDisplayUrl(url: string | null | undefined) {
  return resolveUploadDisplayUrl(url);
}
