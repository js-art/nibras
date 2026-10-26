"use client";

export function useRegisterFormUpload(_uploading?: unknown, _progress?: unknown) {
  return { register: () => {}, unregister: () => {} };
}

export function FormUploadProvider({ children }: { children: React.ReactNode }) {
  return children;
}
