import type { Editor } from '@tiptap/core';

export type EditorImageUploadSnapshot = {
  pendingCount: number;
  progress: number;
};

const emptySnapshot: EditorImageUploadSnapshot = { pendingCount: 0, progress: 0 };

/** Aggregate in-flight paste/upload progress from image nodes in the editor doc. */
export function getEditorImageUploadSnapshot(editor: Editor | null): EditorImageUploadSnapshot {
  if (!editor || editor.isDestroyed) {
    return emptySnapshot;
  }

  const progresses: number[] = [];

  editor.state.doc.descendants((node) => {
    if (node.type.name !== 'imageWithCaption') return;
    if (!node.attrs.uploading) return;
    progresses.push(
      typeof node.attrs.uploadProgress === 'number' ? node.attrs.uploadProgress : 0,
    );
  });

  if (progresses.length === 0) {
    return emptySnapshot;
  }

  const totalProgress = progresses.reduce((sum, value) => sum + value, 0);
  return {
    pendingCount: progresses.length,
    progress: Math.round(totalProgress / progresses.length),
  };
}
