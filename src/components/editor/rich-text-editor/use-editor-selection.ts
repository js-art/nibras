'use client';

import type { Editor } from '@tiptap/core';
import { useEffect, useState } from 'react';

/** Re-render host when cursor/selection or document changes. */
export function useEditorSelection(editor: Editor | null) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const bump = () => setRevision((value) => value + 1);

    editor.on('selectionUpdate', bump);
    editor.on('update', bump);

    return () => {
      editor.off('selectionUpdate', bump);
      editor.off('update', bump);
    };
  }, [editor]);
}
