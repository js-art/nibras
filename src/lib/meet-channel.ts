/** Ask the local talk server to keep one channel for this project. A down server does not block the page. */
export async function ensureProjectChannel(project: { id: string; name: string }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    await fetch("http://127.0.0.1:3010/meet/api/savat/ensure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: project.id, name: project.name }),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch {
    /* The channel is created again the next time the project page opens. */
  } finally {
    clearTimeout(timer);
  }
}
