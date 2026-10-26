import { cn } from '@/lib/utils';

/** TipTap / ProseMirror classes that must survive our prose-class sync. */
export function isProseMirrorRuntimeClass(className: string): boolean {
  return className === 'ProseMirror' || className.startsWith('ProseMirror-');
}

/**
 * Replace editor typography utilities without wiping TipTap's runtime classes.
 * Assigning `dom.className = proseClass` in production dropped `ProseMirror`,
 * so heading sizes, gutter labels, and the active-block chip all stopped matching.
 */
export function mergeEditorDomClassName(
  currentClassName: string | null | undefined,
  editorProseClass: string,
): string {
  const keep = (currentClassName ?? '')
    .split(/\s+/)
    .filter((className) => className && isProseMirrorRuntimeClass(className));

  return cn('ProseMirror', ...keep, editorProseClass);
}
