import { uploadFileWithProgress, type Upload } from "@/lib/uploads/upload-file-client";

export type { Upload };

export function needsEditorImageRehost(src: string | null | undefined): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return true;
  if (trimmed.startsWith("/uploads/")) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return false;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://example.com";
    const url = new URL(trimmed, base);
    if (typeof window !== "undefined" && url.origin === window.location.origin) return false;
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function uploadEditorImageFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Upload> {
  return uploadFileWithProgress({ file, onProgress });
}

export async function importEditorImageFromUrl(
  url: string,
  onProgress?: (percent: number) => void,
): Promise<Upload> {
  onProgress?.(20);
  const response = await fetch(url);
  if (!response.ok) throw new Error("import_failed");
  const blob = await response.blob();
  const file = new File([blob], "imported-image.jpg", { type: blob.type || "image/jpeg" });
  return uploadEditorImageFile(file, onProgress);
}

export async function rehostEditorImage(
  src: string,
  onProgress?: (percent: number) => void,
): Promise<Upload> {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    const response = await fetch(src);
    const blob = await response.blob();
    const file = new File([blob], "pasted-image.jpg", { type: blob.type || "image/jpeg" });
    return uploadEditorImageFile(file, onProgress);
  }
  return importEditorImageFromUrl(src, onProgress);
}
