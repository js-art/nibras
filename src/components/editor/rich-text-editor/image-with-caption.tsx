'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { resolveMediaDisplayUrl } from '@/lib/uploads/upload-url';
import { UploadProgressOverlay } from '@/components/custom/upload/upload-progress-indicator';
import { useRegisterFormUpload } from '@/lib/uploads/form-upload-context';

export type ImageFrameFit = 'cover' | 'fill';
export type ImageFrameFocus = 'top' | 'center' | 'bottom';

export function readImageFrameFit(value: unknown): ImageFrameFit {
  return value === 'fill' ? 'fill' : 'cover';
}

export type ImageAlign = 'left' | 'center' | 'right';

export function readImageAlign(value: unknown): ImageAlign {
  if (value === 'left' || value === 'right') return value;
  return 'center';
}

export function imageAlignMargins(align: ImageAlign): { marginLeft: string; marginRight: string } {
  if (align === 'left') return { marginLeft: '0', marginRight: 'auto' };
  if (align === 'right') return { marginLeft: 'auto', marginRight: '0' };
  return { marginLeft: 'auto', marginRight: 'auto' };
}

export function readImageFrameFocus(value: unknown): ImageFrameFocus {
  if (value === 'top' || value === 'center top') return 'top';
  if (value === 'bottom' || value === 'center bottom') return 'bottom';
  return 'center';
}

export function frameFocusCss(focus: ImageFrameFocus): string {
  if (focus === 'top') return 'center top';
  if (focus === 'bottom') return 'center bottom';
  return 'center center';
}

export function selectedImageAlign(editor: { state: { selection: unknown } } | null | undefined): ImageAlign | null {
  const selection = editor?.state.selection;
  if (selection instanceof NodeSelection && selection.node.type.name === 'imageWithCaption') {
    return readImageAlign(selection.node.attrs.align);
  }
  return null;
}

export function setSelectedImageAlign(
  editor: { state: { selection: unknown; tr: { setNodeMarkup: Function } }; view: { dispatch: Function } } | null | undefined,
  align: ImageAlign,
): boolean {
  const selection = editor?.state.selection;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'imageWithCaption' || !editor) {
    return false;
  }
  const pos = selection.from;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, {
      ...selection.node.attrs,
      align,
    }),
  );
  if (imageEditPreview?.pos === pos) {
    setImageEditPreview({ ...imageEditPreview, align });
  }
  window.dispatchEvent(new CustomEvent('image-align-changed', { detail: { align } }));
  return true;
}

export type ImageEditPreview = {
  pos: number;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  objectFit: ImageFrameFit;
  objectPosition: ImageFrameFocus;
  align: ImageAlign;
};

/** Explicit phone layout. Null keeps the image’s normal width, capped to the screen. */
export function mobileLayoutFromSizes(sizes: unknown): 'full' | 'half' | 'fixed' | null {
  const value = String(sizes ?? '').replace(/\s+/g, '');
  if (!value) return null;
  if (value.includes('50vw')) return 'half';
  if (value === '(max-width:768px)100vw,60vw') return 'full';
  if (/\d+px/.test(value) && !value.includes('100vw')) return 'fixed';
  return null;
}

let imageEditPreview: ImageEditPreview | null = null;
const imageEditPreviewListeners = new Set<() => void>();

export function setImageEditPreview(preview: ImageEditPreview | null) {
  if (
    preview === imageEditPreview ||
    (preview &&
      imageEditPreview &&
      preview.pos === imageEditPreview.pos &&
      preview.alt === imageEditPreview.alt &&
      preview.caption === imageEditPreview.caption &&
      preview.width === imageEditPreview.width &&
      preview.height === imageEditPreview.height &&
      preview.objectFit === imageEditPreview.objectFit &&
      preview.objectPosition === imageEditPreview.objectPosition &&
      preview.align === imageEditPreview.align)
  ) {
    return;
  }

  imageEditPreview = preview;
  imageEditPreviewListeners.forEach((listener) => listener());
}

const FRAME_MIN = 40;
const FRAME_MAX = 1200;

type ResizeEdge = 'n' | 'e' | 's' | 'w';

function clampFrame(value: number) {
  return Math.min(FRAME_MAX, Math.max(FRAME_MIN, Math.round(value)));
}

function resizeFromEdge(
  edge: ResizeEdge,
  start: { width: number; height: number },
  dx: number,
  dy: number,
) {
  if (edge === 'e') return { width: clampFrame(start.width + dx), height: clampFrame(start.height) };
  if (edge === 'w') return { width: clampFrame(start.width - dx), height: clampFrame(start.height) };
  if (edge === 's') return { width: clampFrame(start.width), height: clampFrame(start.height + dy) };
  return { width: clampFrame(start.width), height: clampFrame(start.height - dy) };
}

function useImageEditPreview(getPos: () => number | undefined) {
  const getPosRef = React.useRef(getPos);
  getPosRef.current = getPos;
  const [preview, setPreview] = React.useState<ImageEditPreview | null>(null);

  React.useEffect(() => {
    const sync = () => {
      const next = imageEditPreview;
      let pos: number | undefined;
      try {
        pos = getPosRef.current?.();
      } catch {
        pos = undefined;
      }
      const matches = next && next.pos === pos ? next : null;
      setPreview((current) => {
        if (
          current?.pos === matches?.pos &&
          current?.alt === matches?.alt &&
          current?.caption === matches?.caption &&
          current?.width === matches?.width &&
          current?.height === matches?.height &&
          current?.objectFit === matches?.objectFit &&
          current?.objectPosition === matches?.objectPosition &&
          current?.align === matches?.align
        ) {
          return current;
        }
        return matches;
      });
    };

    imageEditPreviewListeners.add(sync);
    sync();
    return () => {
      imageEditPreviewListeners.delete(sync);
    };
  }, []);

  return preview;
}

const ImageWithCaptionComponent = ({ node, selected, getPos, editor }: any) => {
  const t = useTranslations('common');
  const preview = useImageEditPreview(getPos);
  const alt = preview ? preview.alt : node.attrs.alt || '';
  const caption = preview ? preview.caption || '' : node.attrs.caption || '';
  const width = preview ? preview.width : node.attrs.width || null;
  const height = preview
    ? preview.height
    : typeof node.attrs.height === 'number' && node.attrs.height > 0
      ? node.attrs.height
      : null;
  const frameFit = preview ? preview.objectFit : readImageFrameFit(node.attrs.objectFit);
  const frameFocus = preview ? preview.objectPosition : readImageFrameFocus(node.attrs.objectPosition);
  const focusCss = frameFocusCss(frameFocus);
  const align = preview ? preview.align : readImageAlign(node.attrs.align);
  const alignMargins = imageAlignMargins(align);
  const [dragSize, setDragSize] = React.useState<{ width: number; height: number } | null>(null);
  const dragSizeRef = React.useRef<{ width: number; height: number } | null>(null);
  const stopDragRef = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => stopDragRef.current?.(), []);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const editorRef = React.useRef(editor);
  editorRef.current = editor;
  const getPosRef = React.useRef(getPos);
  getPosRef.current = getPos;
  const shownWidth = dragSize?.width ?? width;
  const shownHeight = dragSize?.height ?? height;
  const shownFit: ImageFrameFit = dragSize && height == null ? 'fill' : frameFit;
  const uploading = Boolean(node.attrs.uploading);
  const uploadProgress = typeof node.attrs.uploadProgress === 'number' ? node.attrs.uploadProgress : 0;

  useRegisterFormUpload(uploading, uploadProgress);

  const openCaptionSettings = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof pos !== 'number') return;
    window.dispatchEvent(
      new CustomEvent('open-image-edit-dialog', {
        detail: { pos, focus: 'caption' },
      }),
    );
  };

  const displayWidth = shownWidth ? `${shownWidth}px` : '300px';
  const imageSrc = resolveMediaDisplayUrl(node.attrs.src);

  const commitFrameSize = (size: { width: number; height: number }) => {
    const pos = typeof getPosRef.current === 'function' ? getPosRef.current() : undefined;
    const view = editorRef.current?.view;
    if (typeof pos !== 'number' || !view) return;
    const current = view.state.doc.nodeAt(pos);
    if (!current || current.type.name !== 'imageWithCaption') return;
    const previewForNode = imageEditPreview?.pos === pos ? imageEditPreview : null;
    const hadFixedHeight =
      (previewForNode != null && typeof previewForNode.height === 'number') ||
      (typeof current.attrs.height === 'number' && current.attrs.height > 0);
    const fit: ImageFrameFit = hadFixedHeight
      ? previewForNode
        ? previewForNode.objectFit
        : readImageFrameFit(current.attrs.objectFit)
      : 'fill';
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        ...current.attrs,
        width: size.width,
        height: size.height,
        objectFit: fit,
      }),
    );
    if (previewForNode) {
      setImageEditPreview({
        ...previewForNode,
        width: size.width,
        height: size.height,
        objectFit: fit,
      });
    }
    window.dispatchEvent(
      new CustomEvent('image-frame-resized', {
        detail: { width: size.width, height: size.height, objectFit: fit },
      }),
    );
  };

  const startEdgeDrag = (edge: ResizeEdge, event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || uploading) return;
    event.preventDefault();
    event.stopPropagation();
    stopDragRef.current?.();
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const session = {
      pointerId: event.pointerId,
      edge,
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== session.pointerId) return;
      ev.preventDefault();
      const next = resizeFromEdge(session.edge, session, ev.clientX - session.x, ev.clientY - session.y);
      dragSizeRef.current = next;
      setDragSize(next);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== session.pointerId) return;
      stop();
      const size = dragSizeRef.current;
      dragSizeRef.current = null;
      setDragSize(null);
      if (size) commitFrameSize(size);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (stopDragRef.current === stop) stopDragRef.current = null;
    };
    stopDragRef.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const selectImage = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, textarea')) return;
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof pos !== 'number' || !editor?.view) return;
    const current = editor.state.selection;
    if (current instanceof NodeSelection && current.from === pos) return;
    event.preventDefault();
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
    editor.view.focus();
  };

  return (
    <NodeViewWrapper
      className="relative mt-6 mb-10 flex w-full select-none flex-col items-stretch first:mt-6 last:mb-10"
      data-align={align}
      onMouseDown={selectImage}
    >
      {selected && imageSrc && !uploading ? (
        <div dir="ltr" className="mb-2 flex w-full justify-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {(
              [
                ['left', 'imageAlignLeft'],
                ['center', 'imageAlignCenter'],
                ['right', 'imageAlignRight'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-align-active={align === value ? 'true' : 'false'}
                className={`h-7 select-none rounded-md px-2.5 text-xs ${
                  align === value ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                style={align === value ? { color: '#fff', backgroundColor: '#0f172a' } : undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedImageAlign(editor, value);
                }}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <figure
        data-align={align}
        className="image-with-caption relative flex max-w-full flex-col"
        style={{
          width: displayWidth,
          marginLeft: alignMargins.marginLeft,
          marginRight: alignMargins.marginRight,
          transition: preview && !dragSize ? 'width 120ms linear' : undefined,
        }}
      >
        <div ref={frameRef} className={`relative w-full ${selected ? 'z-10' : ''}`}>
          <div
            className={`relative w-full overflow-hidden border border-border/70 bg-card ${
              caption || selected ? 'rounded-t-lg border-b-0' : 'rounded-lg'
            } ${uploading ? 'opacity-90' : ''}`}
          >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={alt}
              referrerPolicy="no-referrer"
              draggable={false}
              className={`block w-full max-w-full ${shownHeight ? '' : 'h-auto object-contain'} ${uploading ? 'blur-[1px]' : ''}`}
              style={
                shownHeight
                  ? {
                      height: `${shownHeight}px`,
                      objectFit: shownFit,
                      objectPosition: focusCss,
                      transition: preview && !dragSize ? 'height 120ms linear' : undefined,
                    }
                  : preview && !dragSize
                    ? { transition: 'height 120ms linear' }
                    : undefined
              }
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              {uploading ? t('uploading') : t('imageMissing', { default: 'Image unavailable' })}
            </div>
          )}
          {uploading ? <UploadProgressOverlay progress={uploadProgress} /> : null}
          </div>
          {selected && imageSrc && !uploading
            ? (
              [
                ['n', 'left-1/2 top-0 h-2 w-8 -translate-x-1/2 -translate-y-1/2', 'ns-resize'],
                ['s', 'bottom-0 left-1/2 h-2 w-8 -translate-x-1/2 translate-y-1/2', 'ns-resize'],
                ['e', 'right-0 top-1/2 h-8 w-2 translate-x-1/2 -translate-y-1/2', 'ew-resize'],
                ['w', 'left-0 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2', 'ew-resize'],
              ] as const
            ).map(([edge, place, cursor]) => (
              <button
                key={edge}
                type="button"
                aria-label={t('imageResizeEdge')}
                draggable={false}
                onPointerDown={(event) => startEdgeDrag(edge, event)}
                onMouseDown={(event) => event.stopPropagation()}
                className={`absolute z-10 rounded-full border-2 border-white bg-sky-600 shadow-sm ${place}`}
                style={{ cursor, touchAction: 'none' }}
              />
            ))
            : null}
        </div>

        {(caption || selected) && (
          <figcaption className="w-full border border-t-0 border-border/70 rounded-b-lg bg-card">
            <button
              type="button"
              onClick={openCaptionSettings}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  openCaptionSettings(event);
                }
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              className={`w-full select-none px-2 py-1.5 text-center transition-colors ${
                caption
                  ? 'hover:bg-muted/40'
                  : 'border-t border-dashed border-border/60 hover:border-primary/40 cursor-pointer'
              }`}
            >
              <p
                className={`text-xs font-normal leading-snug not-italic ${
                  caption ? 'text-muted-foreground' : 'text-muted-foreground/70 italic'
                }`}
              >
                {caption || (selected ? t('clickToAddCaption') : '')}
              </p>
            </button>
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
};

export const ImageWithCaption = Node.create({
  name: 'imageWithCaption',
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
          return img?.getAttribute('src')?.trim() || null;
        },
        renderHTML: (attributes) => (attributes.src ? { src: attributes.src } : {}),
      },
      alt: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
          return img?.getAttribute('alt');
        },
      },
      caption: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return el.querySelector('figcaption')?.textContent?.trim() || null;
        },
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
          const widthAttr = img?.getAttribute('width') || img?.getAttribute('data-width');
          const parsed = widthAttr ? parseInt(widthAttr, 10) : NaN;
          return Number.isFinite(parsed) ? parsed : null;
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
          const heightAttr = img?.getAttribute('height') || img?.getAttribute('data-height');
          const parsed = heightAttr ? parseInt(heightAttr, 10) : NaN;
          return Number.isFinite(parsed) ? parsed : null;
        },
      },
      objectFit: {
        default: 'cover',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? el : el.querySelector('img');
          return readImageFrameFit(img?.getAttribute('data-object-fit'));
        },
      },
      objectPosition: {
        default: 'center',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? el : el.querySelector('img');
          return readImageFrameFocus(img?.getAttribute('data-object-position'));
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return readImageAlign(el.getAttribute('data-align'));
        },
      },
      // Next.js Image compatible attributes
      sizes: {
        default: '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
          return img?.getAttribute('sizes') || null;
        },
      },
      quality: {
        default: 90,
      },
      uploading: {
        default: false,
        rendered: false,
      },
      uploadProgress: {
        default: 0,
        rendered: false,
      },
    };
  },

  parseHTML() {
    const readImageAttrs = (
      img: HTMLImageElement | null,
      figcaption: Element | null,
      host?: HTMLElement | null,
    ) => {
      if (!img) return false;
      const src = img.getAttribute('src')?.trim();
      if (!src) return false;

      const widthAttr = img.getAttribute('width') || img.getAttribute('data-width');
      const heightAttr = img.getAttribute('height') || img.getAttribute('data-height');
      const parsedWidth = widthAttr ? parseInt(widthAttr, 10) : NaN;
      const parsedHeight = heightAttr ? parseInt(heightAttr, 10) : NaN;

      return {
        src,
        alt: img.getAttribute('alt'),
        caption: figcaption?.textContent?.trim() || null,
        width: Number.isFinite(parsedWidth) ? parsedWidth : null,
        height: Number.isFinite(parsedHeight) ? parsedHeight : null,
        objectFit: readImageFrameFit(img.getAttribute('data-object-fit')),
        objectPosition: readImageFrameFocus(img.getAttribute('data-object-position')),
        align: readImageAlign(host?.getAttribute('data-align')),
      };
    };

    return [
      {
        tag: 'figure[data-type="image"]',
        priority: 60,
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const el = element as HTMLElement;
          return readImageAttrs(
            el.querySelector('img'),
            el.querySelector('figcaption'),
            el,
          );
        },
      },
      {
        tag: 'figure',
        priority: 55,
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const el = element as HTMLElement;
          if (!el.querySelector('img')) return false;
          return readImageAttrs(
            el.querySelector('img'),
            el.querySelector('figcaption'),
            el,
          );
        },
      },
      {
        tag: 'img[src]',
        priority: 50,
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return readImageAttrs(element as HTMLImageElement, null);
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { caption, width, height, sizes, quality, objectFit, objectPosition, align, ...imgAttrs } = HTMLAttributes;
    const imageCaption = caption || node.attrs.caption;
    const frameFit = readImageFrameFit(objectFit ?? node.attrs.objectFit);
    const frameFocus = readImageFrameFocus(objectPosition ?? node.attrs.objectPosition);
    const imageAlign = readImageAlign(align ?? node.attrs.align);
    const alignMargins = imageAlignMargins(imageAlign);

    const imgAttributes: Record<string, unknown> = mergeAttributes(
      this.options.HTMLAttributes,
      imgAttrs,
    );

    imgAttributes.loading = 'lazy';
    if (sizes) imgAttributes.sizes = sizes;
    if (quality) imgAttributes['data-quality'] = quality;
    imgAttributes['data-next-image'] = 'true';

    if (width && typeof width === 'number') {
      imgAttributes.width = width;
      imgAttributes['data-width'] = width;
    }
    if (height && typeof height === 'number') {
      imgAttributes.height = height;
      imgAttributes['data-height'] = height;
      imgAttributes['data-object-fit'] = frameFit;
      imgAttributes['data-object-position'] = frameFocus;
      const focusCss = frameFocusCss(frameFocus);
      imgAttributes.style = `--editor-image-height: ${height}px; --editor-image-fit: ${frameFit}; --editor-image-focus: ${focusCss}; height: ${height}px; object-fit: ${frameFit}; object-position: ${focusCss};`;
    } else {
      imgAttributes['data-height-auto'] = 'true';
    }

    const figureStyle = [
      width && typeof width === 'number' ? `width: ${width}px` : null,
      'max-width: 100%',
      `margin-left: ${alignMargins.marginLeft}`,
      `margin-right: ${alignMargins.marginRight}`,
    ]
      .filter(Boolean)
      .join('; ');
    const mobileFit = mobileLayoutFromSizes(sizes);

    const figureAttrs: Record<string, string | undefined> = {
      'data-type': 'image',
      class: 'image-with-caption',
      'data-align': imageAlign,
      style: figureStyle,
    };
    if (mobileFit) figureAttrs['data-mobile-fit'] = mobileFit;

    const children: Array<string | [string, Record<string, unknown>, ...unknown[]]> = [
      ['img', imgAttributes],
    ];

    if (imageCaption) {
      children.push(['figcaption', {}, imageCaption]);
    }

    return ['figure', figureAttrs, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageWithCaptionComponent);
  },

  addCommands() {
    return {
      setImageWithCaption:
        (options: {
          src: string;
          alt?: string;
          caption?: string;
          width?: number;
          height?: number;
        }) =>
        ({ chain }: { chain: any }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: options,
            })
            .run();
        },
    } as any;
  },
});
