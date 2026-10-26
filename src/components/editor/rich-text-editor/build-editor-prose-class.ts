import { cn } from '@/lib/utils';

export type EditorContentTypography = 'blog' | 'product';

export function buildEditorProseClass(
  isRtl: boolean,
  contentTypography: EditorContentTypography,
): string {
  return cn(
    'ProseMirror rich-text-editor-content editor-typography',
    contentTypography === 'product' ? 'editor-typography--product' : 'editor-typography--blog',
    'focus:outline-none min-h-[200px] max-w-none py-4 pe-4 ps-11 text-foreground',
    isRtl ? 'rtl' : 'ltr',
  );
}
