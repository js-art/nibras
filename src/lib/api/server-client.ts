const base = () => process.env.NEXT_PUBLIC_API_URL || "/api/v1";

/** Server-side helper for calling the local /api/v1 routes (same pattern as app-multi). */
export async function serverApiCall<T>(
  path: string,
  init?: RequestInit & { locale?: string },
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}${base()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (init?.locale) headers.set("x-locale", init.locale);
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`);
  }
  return (await response.json()) as T;
}
