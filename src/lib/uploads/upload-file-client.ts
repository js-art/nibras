export type Upload = {
  id: string;
  url: string;
  name?: string;
  title?: string;
  altText?: string;
};

export async function uploadFileWithProgress(input: {
  file: File;
  folder?: string;
  onProgress?: (percent: number) => void;
}): Promise<Upload> {
  input.onProgress?.(10);
  const body = new FormData();
  body.append("file", input.file);
  if (input.folder) body.append("folder", input.folder);
  const response = await fetch("/api/upload", { method: "POST", body });
  input.onProgress?.(90);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "upload_failed");
  }
  const payload = (await response.json()) as {
    url: string;
    id?: string;
    name?: string;
    title?: string;
    altText?: string;
  };
  input.onProgress?.(100);
  return {
    id: payload.id || payload.url,
    url: payload.url,
    name: payload.name || input.file.name,
    title: payload.title || input.file.name,
    altText: payload.altText || input.file.name,
  };
}
