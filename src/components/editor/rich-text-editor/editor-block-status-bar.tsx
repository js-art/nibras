'use client';

import type { Editor } from '@tiptap/core';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getEditorBlockLabel, getEditorBlockShortLabel, getEditorBlockTypeKey } from './editor-block-label';
import { useEditorSelection } from './use-editor-selection';

type EditorBlockStatusBarProps = {
  editor: Editor;
};

export function EditorBlockStatusBar({ editor }: EditorBlockStatusBarProps) {
  const t = useTranslations('common.editor');
  useEditorSelection(editor);

  const blockType = getEditorBlockTypeKey(editor);
  const shortLabel = getEditorBlockShortLabel(blockType);
  const label = getEditorBlockLabel(editor, t);
  const isHeading = blockType.startsWith('heading-');

  return (
    <div
      className="flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/90 px-3 py-1.5 text-xs"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={cn(
          'inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide',
          isHeading
            ? 'bg-indigo-100 text-indigo-700'
            : blockType === 'paragraph'
              ? 'bg-slate-200/80 text-slate-600'
              : 'bg-emerald-100 text-emerald-700',
        )}
      >
        {shortLabel}
      </span>
      <span className="text-slate-400">·</span>
      <span className="font-medium text-slate-600">{label}</span>
      <span className="ms-auto hidden text-[10px] text-slate-400 sm:inline">
        {t('blockStatusHint', { default: 'Block type follows cursor' })}
      </span>
    </div>
  );
}
