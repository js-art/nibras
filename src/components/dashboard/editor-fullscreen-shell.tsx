"use client";

export function useOptionalEditorFullscreen() {
  return { isFullscreen: false, setFullscreen: (_value: boolean) => undefined };
}

export function EditorFullscreenProvider({ children }: { children: React.ReactNode }) {
  return children;
}
