"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadFileWithProgress, type Upload } from "@/lib/uploads/upload-file-client";

export type { Upload };

type UploadsResponse = {
  data: Upload[];
  items: Upload[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export function useUploads(
  params?: { page?: number; limit?: number; search?: string },
  opts?: { enabled?: boolean; noCache?: boolean },
) {
  const enabled = opts?.enabled !== false;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 12;
  const search = params?.search ?? "";
  const noCache = opts?.noCache === true;

  const [data, setData] = useState<UploadsResponse>({ data: [], items: [] });
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/upload?${qs.toString()}`, {
        cache: noCache ? "no-store" : "default",
      });
      if (!response.ok) {
        setData({ data: [], items: [] });
        return;
      }
      const payload = (await response.json()) as UploadsResponse;
      const list = payload.data || payload.items || [];
      setData({
        ...payload,
        data: list,
        items: list,
      });
    } catch {
      setData({ data: [], items: [] });
    } finally {
      setIsLoading(false);
    }
  }, [enabled, page, limit, search, noCache]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, refetch };
}

export function useUploadFile() {
  const [isPending, setIsPending] = useState(false);

  return {
    isPending,
    mutateAsync: async (
      input: File | { file: File; folder?: string; onProgress?: (n: number) => void },
    ) => {
      setIsPending(true);
      try {
        const file = input instanceof File ? input : input.file;
        const folder = input instanceof File ? undefined : input.folder;
        const onProgress = input instanceof File ? undefined : input.onProgress;
        return await uploadFileWithProgress({ file, folder, onProgress });
      } finally {
        setIsPending(false);
      }
    },
  };
}
