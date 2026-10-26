'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  getEditorImageUploadSnapshot,
  type EditorImageUploadSnapshot,
} from '@/lib/editor/editor-image-upload-state';

export function useEditorImageUploads(editor: Editor | null): EditorImageUploadSnapshot {
  const [snapshot, setSnapshot] = useState<EditorImageUploadSnapshot>(() =>
    getEditorImageUploadSnapshot(editor),
  );

  useEffect(() => {
    if (!editor) {
      setSnapshot({ pendingCount: 0, progress: 0 });
      return;
    }

    const sync = () => {
      setSnapshot(getEditorImageUploadSnapshot(editor));
    };

    sync();
    editor.on('update', sync);
    editor.on('selectionUpdate', sync);

    return () => {
      editor.off('update', sync);
      editor.off('selectionUpdate', sync);
    };
  }, [editor]);

  return snapshot;
}
