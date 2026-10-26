'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { EditorHighlight, EditorTextStyle, TypingPaint } from './typing-paint';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { EditorTable } from './editor-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { EditorSubscript, EditorSuperscript } from './script-marks';
import { common, createLowlight } from 'lowlight';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Toolbar } from './toolbar';
import { ImageUploadModalWrapper } from './image-upload-modal-wrapper';
import { ImageWithCaption, readImageAlign, readImageFrameFit, readImageFrameFocus, setImageEditPreview } from './image-with-caption';
import { PasteImageUploadExtension } from './paste-image-upload-extension';
import { BlockHighlightExtension } from './block-highlight-extension';
import { QuoteWithAuthor } from './quote-with-author';
import { BlockEdgeExtension } from './block-edge';
import { EditorBlockStatusBar } from './editor-block-status-bar';
import { EditorImageUploadBanner } from './editor-image-upload-banner';
import { useEditorImageUploads } from './use-editor-image-uploads';
import { TableEditDialog } from './table-edit-dialog';
import { ImageEditDialog } from './image-edit-dialog';
import { useOptionalEditorFullscreen } from '@/components/dashboard/editor-fullscreen-shell';
import { RichTextEditorProps, EditorFeature } from './types';
import { useLocale, useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Code, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, lineNumbers } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import sanitizeHtml from 'sanitize-html';
import { normalizeEditorImageHtml } from '@/lib/editor/normalize-editor-image-html';
import { useSiteSettings } from '@/lib/api/hooks/use-site-settings';
import { resolvePublicThemeFont } from '@/lib/auth/auth-theme-font';
import { lahzeh, pelak } from '@/lib/font';
import { buildEditorProseClass } from './build-editor-prose-class';
import { mergeEditorDomClassName } from './merge-editor-dom-class';
import './editor-styles.css';
import './editor-content-typography.css';

// Create lowlight instance for code block syntax highlighting
const lowlight = createLowlight(common);

// Sanitization configuration for TipTap editor content
// This ensures only safe HTML tags and attributes are allowed
const sanitizeEditorContent = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags: [
      // Text formatting
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'code',
      'pre',
      'mark',
      'sub',
      'sup',
      'small',
      'span',
      // Headings
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      // Lists
      'ul',
      'ol',
      'li',
      // Links
      'a',
      // Images and figures
      'img',
      'figure',
      'figcaption',
      // Tables
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'td',
      'th',
      'caption',
      // Block elements
      'blockquote',
      'cite',
      'div',
      'hr',
    ],
    allowedAttributes: {
      // Links - allow href, target, rel for security
      a: ['href', 'target', 'rel', 'title', 'class'],
      // Images - allow src, alt, width, height
      img: ['src', 'alt', 'title', 'width', 'height', 'class'],
      // Headings - allow class and style for text alignment
      h1: ['class', 'style'],
      h2: ['class', 'style'],
      h3: ['class', 'style'],
      h4: ['class', 'style'],
      h5: ['class', 'style'],
      h6: ['class', 'style'],
      // Paragraphs - allow class and style for text alignment
      p: ['class', 'style'],
      // Text formatting - allow class and style for colors, etc.
      span: ['class', 'style'],
      code: ['class', 'style'],
      pre: ['class'],
      strong: ['class'],
      em: ['class'],
      mark: ['class'],
      // Lists - allow data attributes for TipTap task lists
      ul: ['class', 'data-type'],
      ol: ['class'],
      li: ['class', 'data-type', 'data-checked'],
      // Tables - allow standard table attributes
      table: ['class', 'style'],
      thead: ['class'],
      tbody: ['class'],
      tfoot: ['class'],
      tr: ['class'],
      td: ['class', 'colspan', 'rowspan', 'style'],
      th: ['class', 'colspan', 'rowspan', 'scope', 'style'],
      // Block elements
      blockquote: ['class', 'data-author'],
      cite: ['class'],
      div: ['class', 'style'],
      figure: ['class', 'data-type', 'style'],
      figcaption: ['class'],
    },
    allowedStyles: {
      '*': {
        // Allow color values (hex, rgb, rgba, hsl, hsla)
        color: [/^#[0-9a-fA-F]{3,6}$/i, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^hsla\(/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/i, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^hsla\(/],
        // Allow text alignment
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        // Allow font size
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        // Allow font weight
        'font-weight': [/^\d+$/, /^normal$/, /^bold$/],
        // Allow text decoration
        'text-decoration': [/^none$/, /^underline$/, /^line-through$/],
      },
    },
    // Allow safe URL schemes
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      a: ['http', 'https', 'mailto', 'tel'],
    },
    // Remove all script tags and event handlers (onclick, onerror, etc.)
    disallowedTagsMode: 'discard',
    // Enforce rel="noopener noreferrer" on external links for security
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        if (attribs.href && attribs.href.startsWith('http')) {
          attribs.target = attribs.target || '_blank';
          attribs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs };
      },
    },
  });
};

export function RichTextEditor({
  content = '',
  contentKey,
  onChange,
  placeholder = 'Start typing...',
  enabledFeatures,
  disabledFeatures,
  className = '',
  height = '400px',
  editable = true,
  showToolbar = true,
  customToolbar,
  rtl,
  imageConfig = {},
  linkConfig = {},
  seoConfig = {},
  contentTypography = 'blog',
}: RichTextEditorProps) {
  const locale = useLocale();
  const isRtl = rtl ?? (locale === 'ar' || locale === 'fa');
  const { data: siteSettings } = useSiteSettings();
  const editorProseClass = useMemo(
    () => buildEditorProseClass(isRtl, contentTypography),
    [isRtl, contentTypography],
  );
  const storefrontFont = useMemo(
    () =>
      resolvePublicThemeFont({
        publicFontPreset: siteSettings?.publicFontPreset,
        activeThemeId: siteSettings?.activeThemeId,
      }),
    [siteSettings?.publicFontPreset, siteSettings?.activeThemeId],
  );
  const editorFontClassName = storefrontFont.useLahzeh ? lahzeh.className : pelak.className;
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableEditDialog, setShowTableEditDialog] = useState(false);
  const showTableEditDialogRef = useRef(false);
  showTableEditDialogRef.current = showTableEditDialog;
  const tableCaretRef = useRef<{ from: number; to: number } | null>(null);
  const restoringTableCaretRef = useRef(false);
  const [imageEdit, setImageEdit] = useState<{
    pos: number;
    src: string;
    alt: string;
    caption: string | null;
    width: number | null;
    height: number | null;
    sizes: string | null;
    objectFit: 'cover' | 'fill';
    objectPosition: 'top' | 'center' | 'bottom';
    align: 'left' | 'center' | 'right';
    focus: 'alt' | 'caption';
  } | null>(null);
  const showImageEditRef = useRef(false);
  showImageEditRef.current = imageEdit != null;
  const imagePosRef = useRef<number | null>(null);
  const restoringImageRef = useRef(false);
  const [showCodeView, setShowCodeView] = useState(false);
  const [codeViewContent, setCodeViewContent] = useState('');
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const pageFullscreen = useOptionalEditorFullscreen();
  const [codeEditorHeight, setCodeEditorHeight] = useState(400);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const codeEditorContainerRef = useRef<HTMLDivElement>(null);
  const suppressInitialChangeRef = useRef(true);
  const t = useTranslations('common');

  useEffect(() => {
    suppressInitialChangeRef.current = true;
  }, [contentKey]);

  useEffect(() => {
    return () => setImageEditPreview(null);
  }, []);

  const isFeatureEnabled = (feature: EditorFeature) => {
    if (disabledFeatures?.includes(feature)) return false;
    if (enabledFeatures && enabledFeatures.length > 0) {
      return enabledFeatures.includes(feature);
    }
    return true;
  };

  const extensions = [
    StarterKit.configure({
      heading: isFeatureEnabled('heading')
        ? {
            levels: [1, 2, 3, 4, 5, 6],
          }
        : false,
      bold: isFeatureEnabled('bold') ? {} : false,
      italic: isFeatureEnabled('italic') ? {} : false,
      strike: isFeatureEnabled('strike') ? {} : false,
      code: isFeatureEnabled('code') ? {} : false,
      codeBlock: false,
      bulletList: isFeatureEnabled('bulletList') ? {} : false,
      orderedList: isFeatureEnabled('orderedList') ? {} : false,
      blockquote: false,
      horizontalRule: isFeatureEnabled('horizontalRule') ? {} : false,
      underline: isFeatureEnabled('underline') ? {} : false,
      link: isFeatureEnabled('link')
        ? {
            openOnClick: false,
            HTMLAttributes: {
              target: linkConfig.openInNewTab ? '_blank' : undefined,
              rel: linkConfig.noFollow ? 'nofollow' : undefined,
            },
          }
        : false,
    }),
  ] as any[];

  if (isFeatureEnabled('blockquote')) {
    extensions.push(
      QuoteWithAuthor.configure({
        authorPlaceholder: isRtl ? 'نام نویسنده' : 'Author',
      }),
    );
  }

  // Add history extension if undo/redo is enabled
  if (isFeatureEnabled('undo') || isFeatureEnabled('redo')) {
    // History is included in StarterKit by default, no need to add separately
  }

  if (isFeatureEnabled('image')) {
    extensions.push(
      ImageWithCaption.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      PasteImageUploadExtension,
    );
  }

  if (isFeatureEnabled('textAlign')) {
    extensions.push(
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: isRtl ? 'right' : 'left',
      }),
    );
  }

  if (isFeatureEnabled('color') || isFeatureEnabled('highlight')) {
    extensions.push(EditorTextStyle);
    extensions.push(Color);
    extensions.push(TypingPaint);
  }

  if (isFeatureEnabled('highlight')) {
    extensions.push(EditorHighlight.configure({ multicolor: true }));
  }

  if (isFeatureEnabled('codeBlock')) {
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'editor-code-block',
          dir: 'ltr',
        },
      }),
    );
  }

  // Table extension
  if (isFeatureEnabled('table')) {
    extensions.push(
      EditorTable.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border border-slate-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 bg-slate-50 px-4 py-2 font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 px-4 py-2',
        },
      }),
    );
  }

  // Task list extension
  if (isFeatureEnabled('taskList')) {
    extensions.push(
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none pl-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
    );
  }

  // Subscript and Superscript
  if (isFeatureEnabled('subscript')) {
    extensions.push(EditorSubscript);
  }

  if (isFeatureEnabled('superscript')) {
    extensions.push(EditorSuperscript);
  }

  extensions.push(
    Placeholder.configure({
      placeholder,
    }),
  );

  extensions.push(BlockHighlightExtension);
  extensions.push(BlockEdgeExtension);

  const editor = useEditor(
    {
      extensions,
      content: normalizeEditorImageHtml(content || '<p></p>') || '<p></p>',
      editable,
      immediatelyRender: false,
      // Toolbar and dialogs subscribe themselves. Re-rendering this tree on every
      // table transaction (resize, cell selection) was rebuilding the chrome.
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: editorProseClass,
          dir: isRtl ? 'rtl' : 'ltr',
        },
        // TipTap's focus() scrolls every ancestor, including the dashboard page.
        // Keep the caret in the editor scroller and leave the page where it is.
        handleScrollToSelection(view) {
          const selectionPos = Math.max(0, Math.min(view.state.selection.from, view.state.doc.content.size));
          let coords: { top: number; bottom: number };
          try {
            coords = view.coordsAtPos(selectionPos);
          } catch {
            return true;
          }
          const scroller = view.dom.parentElement;
          if (scroller instanceof HTMLElement) {
            const box = scroller.getBoundingClientRect();
            const padding = 16;
            if (coords.top < box.top + padding) {
              scroller.scrollTop -= box.top + padding - coords.top;
            } else if (coords.bottom > box.bottom - padding) {
              scroller.scrollTop += coords.bottom - (box.bottom - padding);
            }
          }
          return true;
        },
      },
      onUpdate: ({ editor }) => {
        if (suppressInitialChangeRef.current) return;

        const html = editor.getHTML();
        const json = editor.getJSON();
        onChange?.(html, json);
      },
      onCreate: () => {
        suppressInitialChangeRef.current = false;
      },
    },
    // Recreate the editor when the paint schema changes. useEditor keeps the
    // first extension set, so an already-open post would otherwise keep the
    // inclusive color mark and ignore reset.
    [contentKey, editorProseClass, isRtl, 3],
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dom.className = mergeEditorDomClassName(
      editor.view.dom.className,
      editorProseClass,
    );
    editor.view.dom.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  }, [editor, editorProseClass, isRtl]);

  const editorImageUploads = useEditorImageUploads(editor);

  // Update editor content when content prop changes (for edit forms).
  // Defer TipTap updates — setContent uses flushSync and must not run during useEffect.
  useEffect(() => {
    if (!editor) return;

    const incoming = content || '<p></p>';
    const normalized = normalizeEditorImageHtml(incoming) || incoming;
    const current = editor.getHTML();
    if (current === incoming || current === normalized) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed) return;
      const latest = editor.getHTML();
      if (latest === incoming || latest === normalized) return;
      editor.commands.setContent(normalized, { emitUpdate: false });
    });

    return () => {
      cancelled = true;
    };
  }, [content, editor, contentKey]);

  // Calculate and set CodeMirror height when dialog opens
  useEffect(() => {
    if (showCodeView && codeEditorContainerRef.current) {
      const updateHeight = () => {
        if (codeEditorContainerRef.current) {
          const rect = codeEditorContainerRef.current.getBoundingClientRect();
          const availableHeight = Math.min(window.innerHeight * 0.6, rect.height || 400);
          setCodeEditorHeight(Math.max(400, availableHeight));
        }
      };

      // Initial calculation with delay to ensure dialog is rendered
      const timeoutId = setTimeout(updateHeight, 100);

      // Recalculate on window resize
      window.addEventListener('resize', updateHeight);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updateHeight);
      };
    }
  }, [showCodeView]);

  const handleImageSelect = (url: string, altText?: string) => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'imageWithCaption',
          attrs: {
            src: url,
            alt: altText || '',
            caption: '',
            width: 300, // Default to 300px width
          },
        })
        .run();
    }
  };


  // Track selection changes to update sheets dynamically.
  // Opening the table sheet moves focus out of the editor. That used to look
  // like the user left the table, so the sheet closed on the same click.
  useEffect(() => {
    if (!editor) return;

    const nodeNameAt = (depth: number) => editor.state.selection.$from.node(depth).type.name;

    const handleSelectionUpdate = () => {
      if (restoringTableCaretRef.current || restoringImageRef.current) return;
      const { selection } = editor.state;
      const { $from } = selection;
      let foundTable = false;
      let foundImage = false;
      if (selection instanceof NodeSelection && selection.node.type.name === 'imageWithCaption') {
        foundImage = true;
        imagePosRef.current = selection.from;
      }
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const name = nodeNameAt(depth);
        if (name === 'table') {
          foundTable = true;
          break;
        }
        if (name === 'imageWithCaption') {
          foundImage = true;
          imagePosRef.current = $from.before(depth);
          break;
        }
      }

      if (foundTable) {
        const { from, to } = editor.state.selection;
        tableCaretRef.current = { from, to };
        return;
      }

      if (foundImage) {
        setShowTableEditDialog(false);
        return;
      }

      // The sheet took focus and the browser dropped the caret. Put it back
      // in the table instead of closing the sheet.
      if (showTableEditDialogRef.current && !editor.view.hasFocus() && tableCaretRef.current) {
        const saved = tableCaretRef.current;
        const doc = editor.state.doc;
        if (saved.from >= 1 && saved.to <= doc.content.size && saved.from <= saved.to) {
          restoringTableCaretRef.current = true;
          try {
            editor.view.dispatch(
              editor.state.tr.setSelection(TextSelection.create(doc, saved.from, saved.to)),
            );
          } catch {
            tableCaretRef.current = null;
          } finally {
            restoringTableCaretRef.current = false;
          }
        }
        return;
      }

      if (showImageEditRef.current && !editor.view.hasFocus() && imagePosRef.current != null) {
        const pos = imagePosRef.current;
        const node = editor.state.doc.nodeAt(pos);
        if (node?.type.name === 'imageWithCaption') {
          restoringImageRef.current = true;
          try {
            editor.view.dispatch(
              editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)),
            );
          } catch {
            imagePosRef.current = null;
          } finally {
            restoringImageRef.current = false;
          }
        }
        return;
      }

      if (!editor.view.hasFocus()) return;

      setShowTableEditDialog(false);
      showImageEditRef.current = false;
      setImageEdit(null);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Listen for table edit dialog open event
  useEffect(() => {
    if (!editor) return;
    const handleOpenTableDialog = () => {
      const { from, to } = editor.state.selection;
      tableCaretRef.current = { from, to };
      setShowTableEditDialog(true);
    };

    window.addEventListener('open-table-edit-dialog', handleOpenTableDialog);
    return () => {
      window.removeEventListener('open-table-edit-dialog', handleOpenTableDialog);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleOpenImageDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ pos?: number; focus?: 'alt' | 'caption' }>).detail;
      const pos = detail?.pos;
      if (typeof pos !== 'number') return;
      const node = editor.state.doc.nodeAt(pos);
      if (!node || node.type.name !== 'imageWithCaption') return;

      imagePosRef.current = pos;
      showImageEditRef.current = true;
      try {
        const selected = editor.state.selection;
        const alreadySelected =
          selected instanceof NodeSelection &&
          selected.from === pos &&
          selected.node.type.name === 'imageWithCaption';
        if (!alreadySelected) {
          editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
        }
      } catch {
        showImageEditRef.current = false;
        return;
      }

      setShowTableEditDialog(false);
      setImageEdit({
        pos,
        src: typeof node.attrs.src === 'string' ? node.attrs.src : '',
        alt: typeof node.attrs.alt === 'string' ? node.attrs.alt : '',
        caption: typeof node.attrs.caption === 'string' ? node.attrs.caption : null,
        width: typeof node.attrs.width === 'number' ? node.attrs.width : null,
        height: typeof node.attrs.height === 'number' ? node.attrs.height : null,
        sizes: typeof node.attrs.sizes === 'string' ? node.attrs.sizes : null,
        objectFit: readImageFrameFit(node.attrs.objectFit),
        objectPosition: readImageFrameFocus(node.attrs.objectPosition),
        align: readImageAlign(node.attrs.align),
        focus: detail.focus === 'caption' ? 'caption' : 'alt',
      });
    };

    window.addEventListener('open-image-edit-dialog', handleOpenImageDialog);
    return () => {
      window.removeEventListener('open-image-edit-dialog', handleOpenImageDialog);
    };
  }, [editor]);

  const handleOpenCodeView = () => {
    if (editor) {
      const html = editor.getHTML();
      setCodeViewContent(html);
      setShowCodeView(true);
    }
  };

  const toggleEditorFullscreen = useCallback(() => {
    setIsEditorFullscreen((v) => !v);
  }, []);

  const scrollViewportToTopForFullscreen = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    let node = editorWrapperRef.current?.parentElement ?? null;
    while (node) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        node.scrollTo({ top: 0, behavior: 'smooth' });
      }
      node = node.parentElement;
    }
  }, []);

  useEffect(() => {
    if (!isEditorFullscreen) return;
    scrollViewportToTopForFullscreen();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsEditorFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditorFullscreen, scrollViewportToTopForFullscreen]);

  const handleApplyCodeView = () => {
    if (editor && codeViewContent.trim()) {
      // Sanitize the HTML content before applying it to the editor
      const sanitizedContent = sanitizeEditorContent(codeViewContent);
      const normalizedContent = normalizeEditorImageHtml(sanitizedContent) || sanitizedContent;

      // Apply sanitized content to editor
      editor.commands.setContent(normalizedContent);

      // Notify parent component with sanitized content
      onChange?.(sanitizedContent, editor.getJSON());
    }
    setShowCodeView(false);
  };

  const formatHTML = (html: string): string => {
    try {
      // Simple HTML formatter - adds indentation
      let formatted = '';
      let indent = 0;
      const tab = '  ';

      // Remove existing whitespace between tags but preserve text content
      html = html.replace(/>\s+</g, '><');

      // Split by tags while preserving them
      const tokens = html.split(/(<[^>]*>)/);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token.trim()) continue;

        if (token.startsWith('</')) {
          // Closing tag - decrease indent before adding
          indent = Math.max(0, indent - 1);
          formatted += tab.repeat(indent) + token + '\n';
        } else if (token.startsWith('<')) {
          // Opening tag or self-closing tag
          const isSelfClosing =
            token.endsWith('/>') ||
            /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i.test(token);

          formatted += tab.repeat(indent) + token + '\n';

          // Increase indent for non-self-closing tags
          if (!isSelfClosing && !token.startsWith('</')) {
            indent++;
          }
        } else {
          // Text content
          const trimmed = token.trim();
          if (trimmed) {
            formatted += tab.repeat(indent) + trimmed + '\n';
          }
        }
      }

      return formatted.trim();
    } catch (e) {
      return html; // Return original if formatting fails
    }
  };

  const minifyHTML = (html: string): string => {
    try {
      // Remove comments
      html = html.replace(/<!--[\s\S]*?-->/g, '');
      // Remove whitespace between tags
      html = html.replace(/>\s+</g, '><');
      // Remove leading/trailing whitespace
      html = html.replace(/^\s+|\s+$/g, '');
      // Replace multiple spaces with single space
      html = html.replace(/\s+/g, ' ');
      // Remove spaces around tags
      html = html.replace(/\s*>\s*/g, '>');
      html = html.replace(/\s*<\s*/g, '<');
      return html.trim();
    } catch (e) {
      return html; // Return original if minification fails
    }
  };

  const handleFormatCode = () => {
    const formatted = formatHTML(codeViewContent);
    setCodeViewContent(formatted);
  };

  const handleMinifyCode = () => {
    const minified = minifyHTML(codeViewContent);
    setCodeViewContent(minified);
  };

  // CodeMirror extensions configuration
  const codeMirrorExtensions = [
    html(),
    lineNumbers(),
    autocompletion(),
    EditorView.theme({
      '&': {
        fontSize: '14px',
      },
      '.cm-editor': {
        height: '100%',
        direction: 'ltr',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        direction: 'ltr',
        textAlign: 'left',
      },
      '.cm-content': {
        direction: 'ltr',
        textAlign: 'left',
      },
      '.cm-lineNumbers': {
        minWidth: '3ch',
      },
    }),
  ];

  if (!editor) {
    return null;
  }

  const editorSurfaceHeight = isEditorFullscreen
    ? 'calc(100dvh - 11rem)'
    : typeof height === 'number'
      ? `${height}px`
      : height;

  return (
    <div
      className={cn(
        'border border-slate-200/60 rounded-lg bg-white shadow-sm font-sans',
        isEditorFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col overflow-hidden rounded-none border-0 animate-in fade-in duration-200'
          : 'overflow-hidden',
        editorFontClassName,
        className,
      )}
      style={storefrontFont.fontFamily ? { fontFamily: storefrontFont.fontFamily } : undefined}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {showToolbar && (
        <div className="border-b border-slate-200/60 shrink-0">
          {customToolbar || (
            <Toolbar
              editor={editor}
              enabledFeatures={enabledFeatures}
              disabledFeatures={disabledFeatures}
              onImageSelect={isFeatureEnabled('image') ? () => setShowImageModal(true) : undefined}
              onCodeView={handleOpenCodeView}
              isFullscreen={isEditorFullscreen}
              onToggleFullscreen={toggleEditorFullscreen}
            />
          )}
        </div>
      )}
      {isFeatureEnabled('image') ? <EditorImageUploadBanner snapshot={editorImageUploads} /> : null}
      {editor && isFeatureEnabled('heading') ? <EditorBlockStatusBar editor={editor} /> : null}
      <div
        ref={editorWrapperRef}
        className={cn(
          'rich-text-editor-wrapper relative min-h-0',
          isEditorFullscreen && 'flex-1',
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <EditorContent
          editor={editor}
          style={{ height: editorSurfaceHeight }}
          className="overflow-y-auto"
        />
      </div>
      {showImageModal && (
        <ImageUploadModalWrapper
          onSelect={handleImageSelect}
          onClose={() => setShowImageModal(false)}
          enableLibrary={imageConfig.enableLibrary ?? true}
          enableUpload={imageConfig.enableUpload ?? true}
          maxSize={imageConfig.maxSize}
        />
      )}
      {showTableEditDialog && editor && (
        <TableEditDialog
          open={showTableEditDialog}
          onOpenChange={setShowTableEditDialog}
          editor={editor}
          aboveFullscreen={isEditorFullscreen || Boolean(pageFullscreen?.isFullscreen)}
        />
      )}
      {imageEdit && editor ? (
        <ImageEditDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setImageEditPreview(null);
              showImageEditRef.current = false;
              setImageEdit(null);
            }
          }}
          src={imageEdit.src}
          alt={imageEdit.alt}
          caption={imageEdit.caption}
          width={imageEdit.width}
          height={imageEdit.height}
          sizes={imageEdit.sizes}
          objectFit={imageEdit.objectFit}
          objectPosition={imageEdit.objectPosition}
          align={imageEdit.align}
          initialFocus={imageEdit.focus}
          aboveFullscreen={isEditorFullscreen || Boolean(pageFullscreen?.isFullscreen)}
          onPreview={(data) => {
            const pos = imagePosRef.current ?? imageEdit.pos;
            setImageEditPreview({
              pos,
              alt: data.alt,
              caption: data.caption || null,
              width: typeof data.width === 'number' ? data.width : null,
              height: typeof data.height === 'number' ? data.height : null,
              objectFit: data.objectFit,
              objectPosition: data.objectPosition,
              align: data.align,
            });
          }}
          onImageEdited={(url) => {
            const pos = imagePosRef.current ?? imageEdit.pos;
            const node = editor.state.doc.nodeAt(pos);
            if (!node || node.type.name !== 'imageWithCaption') return;
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                src: url,
              }),
            );
            setImageEdit((current) => (current ? { ...current, src: url } : current));
          }}
          onSave={(data) => {
            const pos = imagePosRef.current ?? imageEdit.pos;
            const node = editor.state.doc.nodeAt(pos);
            if (!node || node.type.name !== 'imageWithCaption') return;
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                alt: data.alt,
                caption: data.caption || null,
                width: data.width || null,
                height: data.height || null,
                sizes: data.sizes || null,
                objectFit: data.objectFit,
                objectPosition: data.objectPosition,
                align: data.align,
              }),
            );
            setImageEditPreview(null);
          }}
        />
      ) : null}

      {/* Code View Dialog */}
      <Dialog open={showCodeView} onOpenChange={setShowCodeView}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('editor.codeView')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 mb-2 border-b pb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFormatCode}
                className="h-8"
              >
                <Code size={14} className="mr-2" />
                {t('editor.format') || 'Format'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMinifyCode}
                className="h-8"
              >
                <Minimize2 size={14} className="mr-2" />
                {t('editor.minify') || 'Minify'}
              </Button>
            </div>
            <div
              ref={codeEditorContainerRef}
              className="flex-1 min-h-[400px] max-h-[60vh] border rounded-md"
              dir="ltr"
            >
              <CodeMirror
                value={codeViewContent}
                height={`${codeEditorHeight}px`}
                theme={oneDark}
                extensions={codeMirrorExtensions}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  highlightSelectionMatches: true,
                }}
                placeholder={t('editor.codeViewPlaceholder')}
                onChange={(value) => setCodeViewContent(value)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('editor.codeViewHint')}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCodeView(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" onClick={handleApplyCodeView}>
              {t('actions.ok') || t('actions.save') || 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RichTextEditor;
