import type { Editor } from '@tiptap/core';

type TranslateFn = (key: string, options?: { default?: string }) => string;

export function getEditorBlockTypeKey(editor: Editor): string {
  const levels = [1, 2, 3, 4, 5, 6] as const;
  for (const level of levels) {
    if (editor.isActive('heading', { level })) return `heading-${level}`;
  }
  if (editor.isActive('blockquote')) return 'blockquote';
  if (editor.isActive('codeBlock')) return 'codeBlock';
  if (editor.isActive('bulletList')) return 'bulletList';
  if (editor.isActive('orderedList')) return 'orderedList';
  if (editor.isActive('taskList')) return 'taskList';
  return 'paragraph';
}

const SHORT_LABELS: Record<string, string> = {
  paragraph: 'P',
  'heading-1': 'H1',
  'heading-2': 'H2',
  'heading-3': 'H3',
  'heading-4': 'H4',
  'heading-5': 'H5',
  'heading-6': 'H6',
  blockquote: '❝',
  codeBlock: '</>',
  bulletList: '•',
  orderedList: '1.',
  taskList: '☑',
};

export function getEditorBlockShortLabel(blockType: string): string {
  return SHORT_LABELS[blockType] ?? '¶';
}

export function getEditorBlockLabel(
  editor: Editor,
  t: TranslateFn,
  returnKey = false,
): string {
  const key = getEditorBlockTypeKey(editor);
  if (returnKey) return key;

  if (key.startsWith('heading-')) {
    const level = Number(key.split('-')[1]);
    return t(`heading${level}` as 'heading1', { default: `Heading ${level}` });
  }

  switch (key) {
    case 'blockquote':
      return t('quote', { default: 'Quote' });
    case 'codeBlock':
      return t('codeBlock', { default: 'Code block' });
    case 'bulletList':
      return t('bulletList', { default: 'Bullet list' });
    case 'orderedList':
      return t('numberedList', { default: 'Numbered list' });
    case 'taskList':
      return t('taskList', { default: 'Task list' });
    default:
      return t('paragraph', { default: 'Paragraph' });
  }
}
