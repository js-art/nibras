import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import {
  needsEditorImageRehost,
  rehostEditorImage,
} from '@/lib/editor/editor-image-upload';

const pluginKey = new PluginKey('pasteImageUpload');

type ImageCandidate = {
  pos: number;
  src: string;
  alt: string | null;
};

const pendingByEditor = new WeakMap<Editor, Set<string>>();

function getPending(editor: Editor): Set<string> {
  const existing = pendingByEditor.get(editor);
  if (existing) return existing;
  const created = new Set<string>();
  pendingByEditor.set(editor, created);
  return created;
}

function findImagePositionBySrc(editor: Editor, src: string): number | null {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'imageWithCaption') return;
    if (node.attrs.src === src) {
      found = pos;
      return false;
    }
  });
  return found;
}

function updateImageAttrs(
  editor: Editor,
  pos: number,
  attrs: Record<string, unknown>,
) {
  if (editor.isDestroyed) return;

  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'imageWithCaption') return;

  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      ...attrs,
    }),
  );
}

function findRehostCandidates(editor: Editor): ImageCandidate[] {
  const pending = getPending(editor);
  const results: ImageCandidate[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'imageWithCaption') return;

    const src = String(node.attrs.src || '').trim();
    if (!needsEditorImageRehost(src)) return;
    if (node.attrs.uploading) return;
    if (pending.has(src)) return;

    results.push({
      pos,
      src,
      alt: node.attrs.alt ?? null,
    });
  });

  return results;
}

async function rehostImageAtPosition(
  editor: Editor,
  pos: number,
  src: string,
  alt: string | null,
) {
  const pending = getPending(editor);
  pending.add(src);

  updateImageAttrs(editor, pos, { uploading: true, uploadProgress: 4 });

  try {
    const upload = await rehostEditorImage(src, (progress) => {
      const currentPos = findImagePositionBySrc(editor, src);
      if (currentPos === null) return;
      updateImageAttrs(editor, currentPos, { uploadProgress: progress });
    });

    const targetPos = findImagePositionBySrc(editor, src);
    if (targetPos === null) return;

    updateImageAttrs(editor, targetPos, {
      src: upload.url,
      alt: alt || upload.altText || upload.title || '',
      uploading: false,
      uploadProgress: 100,
    });

    if (src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  } catch (error) {
    console.error('Editor paste image upload failed:', error);
    const targetPos = findImagePositionBySrc(editor, src);
    if (targetPos !== null) {
      updateImageAttrs(editor, targetPos, { uploading: false, uploadProgress: 0 });
    }
  } finally {
    pending.delete(src);
  }
}

function scheduleRehostScan(editor: Editor) {
  queueMicrotask(() => {
    if (editor.isDestroyed) return;

    for (const candidate of findRehostCandidates(editor)) {
      void rehostImageAtPosition(editor, candidate.pos, candidate.src, candidate.alt);
    }
  });
}

export const PasteImageUploadExtension = Extension.create({
  name: 'pasteImageUpload',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handlePaste(_view, event) {
            const html = event.clipboardData?.getData('text/html') ?? '';
            const hasRichHtml =
              html.includes('<img') || html.replace(/<[^>]+>/g, '').trim().length > 0;

            const clipboardItems = event.clipboardData?.items;
            const imageFiles: File[] = [];

            if (clipboardItems) {
              for (const item of clipboardItems) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (file) imageFiles.push(file);
                }
              }
            }

            if (imageFiles.length > 0 && !hasRichHtml) {
              event.preventDefault();

              for (const file of imageFiles) {
                const blobUrl = URL.createObjectURL(file);
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'imageWithCaption',
                    attrs: {
                      src: blobUrl,
                      alt: '',
                      caption: '',
                      width: 300,
                      uploading: true,
                      uploadProgress: 0,
                    },
                  })
                  .run();
              }

              scheduleRehostScan(editor);
              return true;
            }

            window.setTimeout(() => scheduleRehostScan(editor), 0);
            return false;
          },
        },
      }),
    ];
  },
});
