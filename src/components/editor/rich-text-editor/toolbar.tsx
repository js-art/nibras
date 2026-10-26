'use client';

import { Editor } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  Quote,
  Link,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Minus,
  Palette,
  Highlighter,
  Eraser,
  Subscript,
  Superscript,
  Indent,
  Outdent,
  Type,
  Hash,
  Table,
  Table2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Columns,
  Rows,
  FileCode,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/custom/inputs';
import { EditorFeature } from './types';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toPersianDigits, toArabicDigits } from '@/lib/digits';
import { getMarkRange } from '@tiptap/core';
import { useEditorSelection } from './use-editor-selection';
import { readTableHeaderSnapshot, toggleLastHeaderColumn } from './table-header-state';
import { getEditorBlockLabel, getEditorBlockShortLabel, getEditorBlockTypeKey } from './editor-block-label';
import { selectedImageAlign, setSelectedImageAlign } from './image-with-caption';
import { paintResetRange, resetTypingPaint, typingPaintKey } from './typing-paint';

interface ToolbarProps {
  editor: Editor;
  enabledFeatures?: EditorFeature[];
  disabledFeatures?: EditorFeature[];
  onImageSelect?: () => void;
  onCodeView?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const match = withHash.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}

// Hovering a portaled menu item focuses it and blurs the editor. The browser
// then drops the caret at the end of the document. Keep the pointer on the
// item without moving focus, so the block the user clicked stays selected.
function keepEditorMenuFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function EditorMenuItem({
  className,
  onPointerMove,
  onPointerLeave,
  onMouseDown,
  ...props
}: ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      {...props}
      className={['hover:bg-accent hover:text-accent-foreground', className].filter(Boolean).join(' ')}
      onPointerMove={(event) => {
        keepEditorMenuFocus(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        keepEditorMenuFocus(event);
        onPointerLeave?.(event);
      }}
      onMouseDown={(event) => {
        keepEditorMenuFocus(event);
        onMouseDown?.(event);
      }}
    />
  );
}

function EditorMenuCheckboxItem({
  className,
  onPointerMove,
  onPointerLeave,
  onMouseDown,
  ...props
}: ComponentProps<typeof DropdownMenuCheckboxItem>) {
  return (
    <DropdownMenuCheckboxItem
      {...props}
      className={['hover:bg-accent hover:text-accent-foreground', className].filter(Boolean).join(' ')}
      onPointerMove={(event) => {
        keepEditorMenuFocus(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        keepEditorMenuFocus(event);
        onPointerLeave?.(event);
      }}
      onMouseDown={(event) => {
        keepEditorMenuFocus(event);
        onMouseDown?.(event);
      }}
    />
  );
}

export function Toolbar({
  editor,
  enabledFeatures,
  disabledFeatures,
  onImageSelect,
  onCodeView,
  isFullscreen = false,
  onToggleFullscreen,
}: ToolbarProps) {
  const t = useTranslations('common.editor');
  const locale = useLocale();
  const isRTL = locale === 'fa' || locale === 'ar';
  const tableHeaders = readTableHeaderSnapshot(editor);
  useEditorSelection(editor);
  const [linkUrl, setLinkUrl] = useState('');
  
  // Helper function to format numbers based on locale
  const formatNumber = (num: number): string => {
    if (locale === 'fa') {
      return toPersianDigits(String(num));
    } else if (locale === 'ar') {
      return toArabicDigits(String(num));
    }
    return String(num);
  };
  const [linkText, setLinkText] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const paintSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const suppressPaint = useRef(false);
  // A click on the popover collapses the editor selection. Keep the range the
  // user had selected so reset still clears that text.
  const outsidePointer = useRef(false);
  const paintPopoverOpen = useRef(0);
  const resetPaintRef = useRef<(kind: 'color' | 'highlight') => void>(() => {});

  const blockSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const editorFocused = () => {
    try {
      return editor.view.hasFocus();
    } catch {
      return false;
    }
  };

  const rememberPaintSelection = () => {
    const selection = editor.state.selection;
    const saved = paintSelectionRef.current;
    if (
      selection.empty &&
      saved &&
      saved.from !== saved.to &&
      (outsidePointer.current || !editorFocused() || paintPopoverOpen.current > 0)
    ) {
      return;
    }
    paintSelectionRef.current = { from: selection.from, to: selection.to };
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      let inside = false;
      try {
        inside = target instanceof Node && editor.view.dom.contains(target);
      } catch {
        inside = false;
      }
      outsidePointer.current = !inside;
    };
    const onPointerUp = () => {
      requestAnimationFrame(() => {
        outsidePointer.current = false;
      });
    };
    const syncPaintSelection = () => {
      const { from, to, empty } = editor.state.selection;
      const saved = paintSelectionRef.current;
      // Focus leaving the editor collapses the selection. Keep the range so
      // reset still clears the text the user highlighted.
      if (
        empty &&
        saved &&
        saved.from !== saved.to &&
        (outsidePointer.current || !editorFocused() || paintPopoverOpen.current > 0)
      ) {
        return;
      }
      paintSelectionRef.current = { from, to };
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    editor.on('selectionUpdate', syncPaintSelection);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      editor.off('selectionUpdate', syncPaintSelection);
    };
  }, [editor]);

  const rememberBlockSelection = () => {
    const { from, to } = editor.state.selection;
    blockSelectionRef.current = { from, to };
  };

  // A selection that ends on the next block's boundary must not convert that
  // next line. Stay inside the text block the user actually selected.
  const blockSpan = (from: number, to: number) => {
    const doc = editor.state.doc;
    const end = to > from && doc.resolve(to).parentOffset === 0 ? to - 1 : to;
    const $from = doc.resolve(Math.min(from, end));
    const $to = doc.resolve(Math.max(from, end));
    if (!$from.parent.isTextblock) return { from, to: end };
    return {
      from: $from.start(),
      to: $to.parent.isTextblock ? $to.end() : $from.end(),
    };
  };

  const applyTextBlock = (kind: 'paragraph' | number) => {
    const saved = blockSelectionRef.current;
    const live = editor.state.selection;
    const from = saved ? saved.from : live.from;
    const to = saved ? saved.to : live.to;
    const schema = editor.state.schema;
    const docSize = editor.state.doc.content.size;
    const $at = editor.state.doc.resolve(Math.max(1, Math.min(from, docSize)));
    const sameHeading = typeof kind === 'number' && $at.parent.type.name === 'heading' && $at.parent.attrs.level === kind;
    const type = kind === 'paragraph' || sameHeading ? schema.nodes.paragraph : schema.nodes.heading;
    if (!type) return;
    const span = blockSpan(from, to);
    const tr = editor.state.tr.setBlockType(
      span.from,
      span.to,
      type,
      kind === 'paragraph' || sameHeading ? null : { level: kind },
    );
    const start = tr.mapping.map(span.from);
    const end = Math.max(start, tr.mapping.map(span.to, -1));
    const selFrom = Math.max(start, Math.min(tr.mapping.map(from), end));
    const selTo = Math.max(selFrom, Math.min(tr.mapping.map(to, -1), end));
    tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
    applyingBlock.current = true;
    try {
      editor.view.dispatch(tr);
    } finally {
      applyingBlock.current = false;
    }
    blockSelectionRef.current = { from: selFrom, to: selTo };
    editor.view.focus();
  };

  const menuOpenCount = useRef(0);
  const restoringSelection = useRef(false);
  const applyingBlock = useRef(false);
  const onToolbarMenuOpenChange = (open: boolean) => {
    if (open) {
      menuOpenCount.current += 1;
      return;
    }
    menuOpenCount.current = Math.max(0, menuOpenCount.current - 1);
  };

  useEffect(() => {
    const holdSelection = ({ transaction }: { transaction?: { docChanged: boolean } }) => {
      if (restoringSelection.current || applyingBlock.current || menuOpenCount.current === 0) return;
      // Inserting a table (or any real edit) must keep the selection that command
      // just set. Restoring the pre-command caret drops it onto the paragraph
      // beside the new table.
      if (transaction?.docChanged) {
        const { from, to } = editor.state.selection;
        blockSelectionRef.current = { from, to };
        return;
      }
      const saved = blockSelectionRef.current;
      if (!saved) return;
      const { from, to } = editor.state.selection;
      if (from === saved.from && to === saved.to) return;
      const doc = editor.state.doc;
      if (saved.from < 1 || saved.to > doc.content.size || saved.from > saved.to) return;
      restoringSelection.current = true;
      try {
        editor.view.dispatch(
          editor.state.tr.setSelection(TextSelection.create(doc, saved.from, saved.to)),
        );
      } catch {
        blockSelectionRef.current = null;
      } finally {
        restoringSelection.current = false;
      }
    };
    editor.on('selectionUpdate', holdSelection);
    return () => {
      editor.off('selectionUpdate', holdSelection);
    };
  }, [editor]);

  const editorChain = () => editor.chain().focus(undefined, { scrollIntoView: false });

  const selectionInsideTable = () => {
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'table') return true;
    }
    return false;
  };

  const insertEditorTable = (rows: number, cols: number) => {
    applyingBlock.current = true;
    try {
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (!selectionInsideTable()) {
        const { doc, selection } = editor.state;
        const index = selection.$from.index(0);
        if (index >= 1 && doc.child(index - 1).type.name === 'table') {
          let tablePos = 0;
          for (let i = 0; i < index - 1; i += 1) tablePos += doc.child(i).nodeSize;
          const table = doc.child(index - 1);
          let cellPos = tablePos + 2;
          table.descendants((node, offset) => {
            if (!node.isTextblock) return true;
            cellPos = tablePos + 1 + offset + 1;
            return false;
          });
          editor.view.dispatch(
            editor.state.tr.setSelection(TextSelection.create(editor.state.doc, cellPos)),
          );
        }
      }
    } finally {
      applyingBlock.current = false;
    }
    const { from, to } = editor.state.selection;
    blockSelectionRef.current = { from, to };
  };

  const toggleInlineMark = (mark: string) => {
    const { from, to, empty } = editor.state.selection;
    const chain = editorChain();
    if (!empty) chain.setTextSelection({ from, to });
    // Code excludes every other mark. toggleCode is the command that used to
    // stick; extendEmptyMarkRange was clearing the span instead of applying it.
    if (mark === 'code') chain.toggleCode();
    else chain.toggleMark(mark, {}, { extendEmptyMarkRange: true });
    chain.run();
  };

  const domPaintRange = () => {
    if (typeof window === 'undefined') return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    if (!selection.anchorNode || !editor.view.dom.contains(selection.anchorNode)) return null;
    try {
      const anchor = editor.view.posAtDOM(selection.anchorNode, selection.anchorOffset);
      const head = selection.focusNode
        ? editor.view.posAtDOM(selection.focusNode, selection.focusOffset)
        : anchor;
      const max = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(Math.min(anchor, head), max));
      const to = Math.max(from, Math.min(Math.max(anchor, head), max));
      return to > from ? { from, to } : null;
    } catch {
      return null;
    }
  };

  const currentPaintRange = () => {
    const live = editor.state.selection;
    if (!live.empty) return { from: live.from, to: live.to };
    const dom = domPaintRange();
    if (dom) return dom;
    const saved = paintSelectionRef.current;
    if (saved && saved.from !== saved.to) {
      const max = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(saved.from, max));
      const to = Math.max(from, Math.min(saved.to, max));
      if (to > from) return { from, to };
    }
    return { from: live.from, to: live.to };
  };

  const applyPaint = (kind: 'color' | 'highlight', color: string) => {
    if (suppressPaint.current) return;
    const { from, to } = currentPaintRange();
    if (kind === 'color') setTextColor(color);
    else setHighlightColor(color);
    // A caret must not store the color, or every following letter keeps it.
    if (from === to) return;
    const chain = editorChain();
    chain.setTextSelection({ from, to });
    if (kind === 'color') chain.setMark('textStyle', { color });
    else chain.setHighlight({ color });
    chain.command(({ tr }) => {
      const base = tr.storedMarks || tr.selection.$from.marks();
      tr.setStoredMarks(
        base.filter((mark) => {
          if (kind === 'color' && mark.type.name === 'textStyle' && mark.attrs.color) return false;
          if (kind === 'highlight' && mark.type.name === 'highlight') return false;
          return true;
        }),
      );
      tr.setMeta(
        typingPaintKey,
        kind === 'color'
          ? { color: null, colorStopped: true }
          : { highlight: null, highlightStopped: true },
      );
      return true;
    });
    chain.run();
  };

  const isFeatureEnabled = (feature: EditorFeature) => {
    if (disabledFeatures?.includes(feature)) return false;
    if (enabledFeatures && enabledFeatures.length > 0) {
      return enabledFeatures.includes(feature);
    }
    return true;
  };

  const handleSetLink = () => {
    const url = linkUrl.trim();
    const text = linkText.trim();
    if (!url) return;

    const selectionEmpty = editor.state.selection.empty;
    const insideLink = editor.isActive('link');

    if (!selectionEmpty) {
      editorChain().setLink({ href: url }).run();
    } else if (insideLink && !text) {
      editorChain().extendMarkRange('link').setLink({ href: url }).run();
    } else if (text) {
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .insertContent({
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run();
    } else {
      return;
    }

    setLinkUrl('');
    setLinkText('');
    setIsLinkPopoverOpen(false);
  };

  const handleUnsetLink = () => {
    editorChain().unsetLink().run();
    setIsLinkPopoverOpen(false);
  };

  const handleSetColor = (color: string) => {
    applyPaint('color', color);
  };

  const handleSetHighlight = (color: string) => {
    applyPaint('highlight', color);
  };

  const markAroundCaret = (kind: 'color' | 'highlight', pos: number) => {
    const type = kind === 'color' ? editor.schema.marks.textStyle : editor.schema.marks.highlight;
    if (!type) return null;
    const doc = editor.state.doc;
    let $pos;
    try {
      $pos = doc.resolve(Math.max(1, Math.min(pos, doc.content.size)));
    } catch {
      return null;
    }
    const found = getMarkRange($pos, type);
    if (!found || !$pos.sameParent(doc.resolve(found.from))) return null;
    if (kind === 'highlight') return found;
    let colored = false;
    doc.nodesBetween(found.from, found.to, (node) => {
      if (colored || !node.isText) return;
      if (type.isInSet(node.marks)?.attrs.color) colored = true;
    });
    return colored ? found : null;
  };

  const resolveResetRange = (kind: 'color' | 'highlight') => {
    const live = editor.state.selection;
    const range = paintResetRange({
      saved: paintSelectionRef.current,
      liveFrom: live.from,
      liveTo: live.to,
      dom: domPaintRange(),
    });
    if (range.from !== range.to) return range;
    return markAroundCaret(kind, range.from) ?? range;
  };

  const handleResetPaint = (kind: 'color' | 'highlight') => {
    // Stay blocked until the user picks a color again. Updating the picker
    // value fires its change event and would turn the color straight back on.
    suppressPaint.current = true;
    const range = resolveResetRange(kind);
    editor.view.dispatch(resetTypingPaint(editor.state, kind, range));
    paintSelectionRef.current = range;
    if (kind === 'color') setTextColor('#000000');
    else setHighlightColor('#FFFF00');
    const restoreFrom = range.from;
    const restoreTo = range.to;
    // A later mousedown can still drop the caret into the quote above.
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      const sel = editor.state.selection;
      if (sel.from === restoreFrom && sel.to === restoreTo) return;
      const size = editor.state.doc.content.size;
      if (restoreFrom < 0 || restoreTo > size || restoreFrom > restoreTo) return;
      try {
        const putBack = editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, restoreFrom, restoreTo),
        );
        putBack.setStoredMarks([]);
        editor.view.dispatch(putBack);
      } catch {
        // The document moved; leave the caret where it is.
      }
    });
  };
  resetPaintRef.current = handleResetPaint;

  useEffect(() => {
    // Window capture runs before the quote author listener, which otherwise
    // treats a click on Reset as a click on the quote underneath and moves
    // the caret there before this button ever sees the event.
    const claimReset = (event: Event) => {
      const target = event.target;
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      if (!element) return;
      const kind = element.closest('[data-paint-reset]')?.getAttribute('data-paint-reset');
      if (kind !== 'color' && kind !== 'highlight') return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'pointerdown') resetPaintRef.current(kind);
    };
    window.addEventListener('pointerdown', claimReset, true);
    window.addEventListener('mousedown', claimReset, true);
    return () => {
      window.removeEventListener('pointerdown', claimReset, true);
      window.removeEventListener('mousedown', claimReset, true);
    };
  }, []);

  const allowPaint = () => {
    suppressPaint.current = false;
  };

  const clearFormatting = (range?: { from: number; to: number }, focus = true) => {
    const live = editor.state.selection;
    const from = range?.from ?? live.from;
    const to = range?.to ?? live.to;
    const empty = from === to;
    const chain = focus ? editorChain() : editor.chain();
    if (range && !empty) chain.setTextSelection({ from, to });
    if (empty) {
      chain.command(({ tr, state }) => {
        const $from = state.selection.$from;
        for (const type of Object.values(state.schema.marks)) {
          const markRange = getMarkRange($from, type);
          if (markRange) tr.removeMark(markRange.from, markRange.to, type);
          tr.removeStoredMark(type);
        }
        tr.setStoredMarks([]);
        return true;
      });
    } else {
      chain.unsetAllMarks();
    }
    chain.clearNodes().run();
  };

  const presetColors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#FFFFFF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  ];

  const highlightColors = [
    '#FFFFFF',
    '#FEF08A', '#FDE047', '#FCD34D', '#FBBF24', '#F59E0B',
    '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C',
    '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626',
    '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6',
    '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981',
  ];

  // Current block type (paragraph, heading, list, …)
  const currentBlockLabel = getEditorBlockLabel(editor, t);
  const currentBlockType = getEditorBlockTypeKey(editor);
  const currentBlockShort = getEditorBlockShortLabel(currentBlockType);
  const isParagraphActive =
    !editor.isActive('heading') &&
    !editor.isActive('blockquote') &&
    !editor.isActive('codeBlock') &&
    !editor.isActive('bulletList') &&
    !editor.isActive('orderedList') &&
    !editor.isActive('taskList');
  const currentLink = editor.getAttributes('link');
  const linkSelectionEmpty = editor.state.selection.empty;
  const canInsertLink =
    linkUrl.trim().length > 0 &&
    (!linkSelectionEmpty || linkText.trim().length > 0 || editor.isActive('link'));
  const resetLabel = isRTL ? 'ریست' : 'Reset';
  const fullscreenLabel = t.has('fullscreen')
    ? t('fullscreen')
    : isRTL
      ? 'تمام‌صفحه'
      : 'Fullscreen';
  const exitFullscreenLabel = t.has('exitFullscreen')
    ? t('exitFullscreen')
    : isRTL
      ? 'خروج از تمام‌صفحه'
      : 'Exit fullscreen';

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex flex-wrap items-center justify-center gap-1 p-3 border-b bg-gradient-to-br from-white/90 via-white/85 to-slate-50/70 backdrop-blur-2xl shadow-sm border-slate-200/60 rounded-t-xl relative overflow-visible"
        onMouseDown={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
          event.preventDefault();
        }}
      >
      {/* Enhanced glassmorphism overlay with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-50/30 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
      
      {/* Text Formatting Group */}
      <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {isFeatureEnabled('bold') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('bold') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleInlineMark('bold')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Bold size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('boldShortcut')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('italic') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('italic') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleInlineMark('italic')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Italic size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('italicShortcut')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('underline') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('underline') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleInlineMark('underline')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Underline size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('underlineShortcut')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('strike') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('strike') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleInlineMark('strike')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Strikethrough size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('strikethrough')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('code') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('code') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleInlineMark('code')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Code size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('inlineCode')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Paragraph Button */}
      {isFeatureEnabled('heading') && (
        <div className="relative flex items-center justify-center bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isParagraphActive ? 'default' : 'ghost'}
                size="sm"
                onPointerDown={rememberBlockSelection}
                onClick={() => applyTextBlock('paragraph')}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <FileText size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('paragraph')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Heading Dropdown */}
      {isFeatureEnabled('heading') && (
        <div className="relative flex items-center justify-center bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <DropdownMenu modal={false} onOpenChange={onToolbarMenuOpenChange}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('heading') ? 'default' : 'ghost'}
                    size="sm"
                    onPointerDown={rememberBlockSelection}
                    className="h-9 min-w-[5.5rem] px-3 gap-2 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                  >
                    <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded bg-indigo-100 px-1 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                      {editor.isActive('heading') ? currentBlockShort : 'H'}
                    </span>
                    <span className="text-xs font-semibold truncate max-w-[7rem]">
                      {editor.isActive('heading') ? currentBlockLabel : t('headings')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('headings')}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="start"
              className="w-56"
              onCloseAutoFocus={keepEditorMenuFocus}
              onMouseDown={keepEditorMenuFocus}
            >
              <EditorMenuItem
                onClick={() => applyTextBlock('paragraph')}
                className={isParagraphActive ? 'bg-accent' : ''}
              >
                <Type size={16} className="mr-2" />
                <span className="text-sm">{t('paragraph')}</span>
              </EditorMenuItem>
              <DropdownMenuSeparator />
              <EditorMenuItem
                onClick={() => applyTextBlock(1)}
                className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading1 size={16} />
                  <span className="text-2xl font-bold">{t('heading1')}</span>
                </div>
              </EditorMenuItem>
              <EditorMenuItem
                onClick={() => applyTextBlock(2)}
                className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading2 size={16} />
                  <span className="text-xl font-bold">{t('heading2')}</span>
                </div>
              </EditorMenuItem>
              <EditorMenuItem
                onClick={() => applyTextBlock(3)}
                className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading3 size={16} />
                  <span className="text-lg font-bold">{t('heading3')}</span>
                </div>
              </EditorMenuItem>
              <EditorMenuItem
                onClick={() => applyTextBlock(4)}
                className={editor.isActive('heading', { level: 4 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading4 size={16} />
                  <span className="text-base font-bold">{t('heading4')}</span>
                </div>
              </EditorMenuItem>
              <EditorMenuItem
                onClick={() => applyTextBlock(5)}
                className={editor.isActive('heading', { level: 5 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading5 size={16} />
                  <span className="text-sm font-bold">{t('heading5')}</span>
                </div>
              </EditorMenuItem>
              <EditorMenuItem
                onClick={() => applyTextBlock(6)}
                className={editor.isActive('heading', { level: 6 }) ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2">
                  <Heading6 size={16} />
                  <span className="text-xs font-bold">{t('heading6')}</span>
                </div>
              </EditorMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Lists Group */}
      <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {isFeatureEnabled('bulletList') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().toggleBulletList().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <List size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('bulletList')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('orderedList') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().toggleOrderedList().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <ListOrdered size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('numberedList')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('blockquote') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().toggleBlockquote().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Quote size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('quote')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('codeBlock') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().toggleCodeBlock().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Hash size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('codeBlock')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('taskList') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('taskList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().toggleTaskList().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <CheckSquare size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('taskList')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Subscript/Superscript */}
      {(isFeatureEnabled('subscript') || isFeatureEnabled('superscript')) && (
        <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {isFeatureEnabled('subscript') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={editor.isActive('subscript') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleInlineMark('subscript')}
                  className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                >
                  <Subscript size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('subscript')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isFeatureEnabled('superscript') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={editor.isActive('superscript') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleInlineMark('superscript')}
                  className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                >
                  <Superscript size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('superscript')}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {(isFeatureEnabled('subscript') || isFeatureEnabled('superscript')) && (
        <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />
      )}

      {/* Alignment Group */}
      {isFeatureEnabled('textAlign') && (
        <div dir="ltr" className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={(selectedImageAlign(editor) ? selectedImageAlign(editor) === 'left' : editor.isActive({ textAlign: 'left' })) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (!setSelectedImageAlign(editor, 'left')) editorChain().setTextAlign('left').run();
                }}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <AlignLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('alignLeft')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={(selectedImageAlign(editor) ? selectedImageAlign(editor) === 'center' : editor.isActive({ textAlign: 'center' })) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (!setSelectedImageAlign(editor, 'center')) editorChain().setTextAlign('center').run();
                }}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <AlignCenter size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('alignCenter')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={(selectedImageAlign(editor) ? selectedImageAlign(editor) === 'right' : editor.isActive({ textAlign: 'right' })) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (!setSelectedImageAlign(editor, 'right')) editorChain().setTextAlign('right').run();
                }}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <AlignRight size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('alignRight')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editorChain().setTextAlign('justify').run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <AlignJustify size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('justify')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Colors & Highlight */}
      {(isFeatureEnabled('color') || isFeatureEnabled('highlight')) && (
        <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {isFeatureEnabled('color') && (
            <Popover
              onOpenChange={(open) => {
                paintPopoverOpen.current = Math.max(0, paintPopoverOpen.current + (open ? 1 : -1));
                if (open) rememberPaintSelection();
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        rememberPaintSelection();
                      }}
                      className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                    >
                      <Palette size={16} />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('textColor')}</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-64 p-3"
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  rememberPaintSelection();
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
                onFocusOutside={(event) => event.preventDefault()}
                onMouseDown={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('input, textarea, select')) return;
                  event.preventDefault();
                }}
              >
                <div className="space-y-3">
                  <div className="text-sm font-medium">{t('textColor')}</div>
                  <div className="grid grid-cols-8 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          allowPaint();
                        }}
                        onClick={() => handleSetColor(color)}
                        className="w-8 h-8 rounded border-2 border-slate-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2" dir="ltr">
                    <Input
                      type="color"
                      value={normalizeHex(textColor) ?? '#000000'}
                      onMouseDown={() => {
                        allowPaint();
                        rememberPaintSelection();
                      }}
                      onChange={(e) => {
                        if (suppressPaint.current) return;
                        handleSetColor(e.target.value);
                      }}
                      className="h-8 w-16"
                    />
                    <Input
                      type="text"
                      dir="ltr"
                      value={textColor}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        allowPaint();
                      }}
                      onClick={(event) => event.currentTarget.focus()}
                      onChange={(e) => {
                        if (suppressPaint.current) return;
                        const next = e.target.value;
                        setTextColor(next);
                        const valid = normalizeHex(next);
                        if (valid) applyPaint('color', valid);
                      }}
                      placeholder="#000000"
                      className="h-8 flex-1 text-left font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full"
                    data-paint-reset="color"
                  >
                    {resetLabel}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {isFeatureEnabled('highlight') && (
            <Popover
              onOpenChange={(open) => {
                paintPopoverOpen.current = Math.max(0, paintPopoverOpen.current + (open ? 1 : -1));
                if (open) rememberPaintSelection();
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={editor.isActive('highlight') ? 'default' : 'ghost'}
                      size="sm"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        rememberPaintSelection();
                      }}
                      className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                    >
                      <Highlighter size={16} />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('highlight')}</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-64 p-3"
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  rememberPaintSelection();
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
                onFocusOutside={(event) => event.preventDefault()}
                onMouseDown={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('input, textarea, select')) return;
                  event.preventDefault();
                }}
              >
                <div className="space-y-3">
                  <div className="text-sm font-medium">{t('highlight')}</div>
                  <div className="grid grid-cols-5 gap-2">
                    {highlightColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          allowPaint();
                        }}
                        onClick={() => handleSetHighlight(color)}
                        className="h-8 w-8 rounded border-2 border-slate-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2" dir="ltr">
                    <Input
                      type="color"
                      value={normalizeHex(highlightColor) ?? '#FFFF00'}
                      onMouseDown={() => {
                        allowPaint();
                        rememberPaintSelection();
                      }}
                      onChange={(e) => {
                        if (suppressPaint.current) return;
                        handleSetHighlight(e.target.value);
                      }}
                      className="h-8 w-16"
                    />
                    <Input
                      type="text"
                      dir="ltr"
                      value={highlightColor}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        allowPaint();
                      }}
                      onClick={(event) => event.currentTarget.focus()}
                      onChange={(e) => {
                        if (suppressPaint.current) return;
                        const next = e.target.value;
                        setHighlightColor(next);
                        const valid = normalizeHex(next);
                        if (valid) applyPaint('highlight', valid);
                      }}
                      placeholder="#FFFF00"
                      className="h-8 flex-1 text-left font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full"
                    data-paint-reset="highlight"
                  >
                    {resetLabel}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Image */}
      {isFeatureEnabled('image') && onImageSelect && (
        <div className="relative flex items-center justify-center bg-white/70 backdrop-blur-md rounded-xl p-1.5 border border-white/50 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/80">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onImageSelect}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <ImageIcon size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('insertImage')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {isFeatureEnabled('image') && onImageSelect && (
        <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />
      )}

      {/* Link */}
      {isFeatureEnabled('link') && (
        <div className="relative flex items-center justify-center bg-white/70 backdrop-blur-md rounded-xl p-1.5 border border-white/50 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/80">
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('link') ? 'default' : 'ghost'}
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                    onClick={() => {
                      const url = editor.getAttributes('link').href;
                      setLinkUrl(url || '');
                    }}
                  >
                    <Link size={16} />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('link')}</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              className="w-80 p-4"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onMouseDown={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest('input, textarea, select, button')) return;
                event.preventDefault();
              }}
            >
              <div className="space-y-3">
                <div className="text-sm font-medium">{t('insertLink')}</div>
                <Input
                  type="url"
                  dir="ltr"
                  placeholder={t('linkUrl')}
                  value={linkUrl}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => event.currentTarget.focus()}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canInsertLink) {
                      handleSetLink();
                    }
                  }}
                  className="h-9 text-left"
                />
                <Input
                  type="text"
                  placeholder={t('linkText')}
                  value={linkText}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => event.currentTarget.focus()}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canInsertLink) {
                      handleSetLink();
                    }
                  }}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleSetLink}
                    className="flex-1 h-9"
                    disabled={!canInsertLink}
                  >
                    {currentLink?.href ? t('update') : t('insert')}
                  </Button>
                  {currentLink?.href && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleUnsetLink}
                      className="h-9"
                    >
                      {t('remove')}
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Table Controls */}
      {isFeatureEnabled('table') && (
        <>
          <div className="relative flex items-center justify-center bg-white/70 backdrop-blur-md rounded-xl p-1.5 border border-white/50 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/80">
            <DropdownMenu modal={false} onOpenChange={onToolbarMenuOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant={editor.isActive('table') ? 'default' : 'ghost'}
                      size="sm"
                      onPointerDown={rememberBlockSelection}
                      className="h-9 px-3 gap-2 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                    >
                      <Table2 size={16} />
                      <span className="text-xs font-medium">{t('table')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('table')}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align={isRTL ? "end" : "start"}
                className={`w-80 p-0 ${isRTL ? 'rtl' : 'ltr'}`}
                onCloseAutoFocus={keepEditorMenuFocus}
                onMouseDown={keepEditorMenuFocus}
              >
                <Tabs defaultValue="insert" className="w-full">
                  <TabsList className="w-full h-10 rounded-none border-b border-slate-200 bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm p-0.5 gap-0.5">
                    <TabsTrigger 
                      value="insert" 
                      className={`flex-1 h-full rounded-t-md text-xs font-semibold transition-all duration-200 ${
                        isRTL ? 'data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(34_197_94)]' : 'data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(34_197_94)]'
                      } data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=inactive]:text-slate-500 hover:text-slate-700`}
                    >
                      {t('insertTable')}
                    </TabsTrigger>
                    {editor.isActive('table') && (
                      <TabsTrigger 
                        value="edit" 
                        className={`flex-1 h-full rounded-t-md text-xs font-semibold transition-all duration-200 ${
                          isRTL ? 'data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(34_197_94)]' : 'data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(34_197_94)]'
                        } data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=inactive]:text-slate-500 hover:text-slate-700`}
                      >
                        {t('editTable')}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="insert" className="p-3 m-0 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
                    {/* Quick presets */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { rows: 2, cols: 2 },
                        { rows: 3, cols: 3 },
                        { rows: 4, cols: 4 },
                      ].map((preset) => (
                        <button
                          key={`${preset.rows}x${preset.cols}`}
                          type="button"
                          onClick={() => {
                            insertEditorTable(preset.rows, preset.cols);
                          }}
                          className="h-12 px-3 text-sm font-medium bg-white/90 hover:bg-gradient-to-br hover:from-green-50 hover:to-white border border-slate-200 hover:border-green-400 rounded-lg transition-all hover:scale-105 hover:shadow-md flex flex-col items-center justify-center gap-1"
                        >
                          {/* Visual grid representation */}
                          <div className="grid gap-[2px] p-1 bg-slate-100 rounded" style={{ gridTemplateColumns: `repeat(${preset.cols}, 6px)`, gridTemplateRows: `repeat(${preset.rows}, 6px)` }}>
                            {Array.from({ length: preset.rows * preset.cols }).map((_, idx) => (
                              <div key={idx} className="w-[6px] h-[6px] bg-green-500 rounded-[1px]" />
                            ))}
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {formatNumber(preset.rows)}×{formatNumber(preset.cols)}
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Scrollable grid */}
                    <div className="max-h-48 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({ length: 60 }).map((_, i) => {
                          const rows = Math.floor(i / 6) + 1;
                          const cols = (i % 6) + 1;
                          const maxPreviewRows = Math.min(rows, 3);
                          const maxPreviewCols = Math.min(cols, 3);
                          return (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    insertEditorTable(rows, cols);
                                  }}
                                  className="group relative h-12 w-full border border-slate-200 hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50/50 hover:to-white rounded-md transition-all hover:scale-105 hover:shadow-sm flex flex-col items-center justify-center gap-1 p-1.5"
                                >
                                  {/* Visual grid representation */}
                                  <div className="grid gap-[1px] p-0.5 bg-slate-100 group-hover:bg-green-100 rounded" style={{ gridTemplateColumns: `repeat(${maxPreviewCols}, 4px)`, gridTemplateRows: `repeat(${maxPreviewRows}, 4px)` }}>
                                    {Array.from({ length: maxPreviewRows * maxPreviewCols }).map((_, cellIdx) => (
                                      <div key={cellIdx} className="w-[4px] h-[4px] bg-green-500 group-hover:bg-green-600 rounded-[1px] transition-colors" />
                                    ))}
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-700 group-hover:text-green-600 transition-colors leading-tight">
                                    {formatNumber(rows)}×{formatNumber(cols)}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatNumber(rows)}×{formatNumber(cols)} {t('table')}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  {editor.isActive('table') && (
                    <TabsContent value="edit" className="p-2 m-0 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
                      <div className={`space-y-1 ${isRTL ? 'rtl' : 'ltr'}`}>
                        <div className="px-2 py-1.5">
                          <div className={`text-xs font-semibold text-slate-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('columns')}</div>
                          <div className="space-y-0.5">
                            <EditorMenuItem
                              onClick={() => editorChain().addColumnBefore().run()}
                              disabled={!editor.can().addColumnBefore()}
                              className={`px-2 py-1.5 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Columns size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('addColumnBefore')}</span>
                            </EditorMenuItem>
                            <EditorMenuItem
                              onClick={() => editorChain().addColumnAfter().run()}
                              disabled={!editor.can().addColumnAfter()}
                              className={`px-2 py-1.5 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Columns size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('addColumnAfter')}</span>
                            </EditorMenuItem>
                            <EditorMenuItem
                              onClick={() => editorChain().deleteColumn().run()}
                              disabled={!editor.can().deleteColumn()}
                              className={`px-2 py-1.5 text-red-600 focus:text-red-600 focus:bg-red-50 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Trash2 size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('deleteColumn')}</span>
                            </EditorMenuItem>
                          </div>
                        </div>

                        <div className="px-2 py-1.5 border-t border-slate-100">
                          <div className={`text-xs font-semibold text-slate-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('rows')}</div>
                          <div className="space-y-0.5">
                            <EditorMenuItem
                              onClick={() => editorChain().addRowBefore().run()}
                              disabled={!editor.can().addRowBefore()}
                              className={`px-2 py-1.5 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Rows size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('addRowBefore')}</span>
                            </EditorMenuItem>
                            <EditorMenuItem
                              onClick={() => editorChain().addRowAfter().run()}
                              disabled={!editor.can().addRowAfter()}
                              className={`px-2 py-1.5 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Rows size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('addRowAfter')}</span>
                            </EditorMenuItem>
                            <EditorMenuItem
                              onClick={() => editorChain().deleteRow().run()}
                              disabled={!editor.can().deleteRow()}
                              className={`px-2 py-1.5 text-red-600 focus:text-red-600 focus:bg-red-50 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <Trash2 size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                              <span className="text-sm">{t('deleteRow')}</span>
                            </EditorMenuItem>
                          </div>
                        </div>

                        <div className="px-2 py-1.5 border-t border-slate-100">
                          <div className={`text-xs font-semibold text-slate-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('headers')}</div>
                          <div className="space-y-0.5">
                            <EditorMenuCheckboxItem
                              checked={tableHeaders.headerRow}
                              onCheckedChange={() => editorChain().toggleHeaderRow().run()}
                              disabled={!editor.can().toggleHeaderRow()}
                              className="rounded-md"
                            >
                              <span className="text-sm">{t('headerRowSwitch')}</span>
                            </EditorMenuCheckboxItem>
                            <EditorMenuCheckboxItem
                              checked={tableHeaders.headerColumn}
                              onCheckedChange={() => editorChain().toggleHeaderColumn().run()}
                              disabled={!editor.can().toggleHeaderColumn()}
                              className="rounded-md"
                            >
                              <span className="text-sm">{t('headerColumnSwitch')}</span>
                            </EditorMenuCheckboxItem>
                            <EditorMenuCheckboxItem
                              checked={tableHeaders.headerLastColumn}
                              onCheckedChange={() => toggleLastHeaderColumn(editor)}
                              disabled={!tableHeaders.inTable}
                              className="rounded-md"
                            >
                              <span className="text-sm">{t('headerLastColumnSwitch')}</span>
                            </EditorMenuCheckboxItem>
                            <EditorMenuCheckboxItem
                              checked={tableHeaders.headerCell}
                              onCheckedChange={() => editorChain().toggleHeaderCell().run()}
                              disabled={!editor.can().toggleHeaderCell()}
                              className="rounded-md"
                            >
                              <span className="text-sm">{t('headerCellSwitch')}</span>
                            </EditorMenuCheckboxItem>
                          </div>
                        </div>

                        <div className="px-2 py-1.5 border-t border-slate-100">
                          <EditorMenuItem
                            onClick={() => editorChain().deleteTable().run()}
                            disabled={!editor.can().deleteTable()}
                            className={`px-2 py-1.5 text-red-600 focus:text-red-600 focus:bg-red-50 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Trash2 size={14} className={isRTL ? 'ml-2' : 'mr-2'} />
                            <span className="text-sm font-medium">{t('deleteTable')}</span>
                          </EditorMenuItem>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />
        </>
      )}

      {/* Other Actions */}
      <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {isFeatureEnabled('horizontalRule') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editorChain().setHorizontalRule().run()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Minus size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('horizontalLine')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('clearFormatting') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => clearFormatting()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <Eraser size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('clearFormatting')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />

      {/* Code View */}
      {onCodeView && (
        <div className="relative flex items-center justify-center bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCodeView}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
              >
                <FileCode size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('codeView')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {onToggleFullscreen && (
        <div className="relative flex items-center justify-center bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isFullscreen ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleFullscreen}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md relative z-10"
                aria-pressed={isFullscreen}
                aria-label={isFullscreen ? exitFullscreenLabel : fullscreenLabel}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? exitFullscreenLabel : fullscreenLabel}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {(onCodeView || onToggleFullscreen) && (
        <Separator orientation="vertical" className="h-9 mx-0.5 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent w-px" />
      )}

      {/* History */}
      <div className="relative flex items-center justify-center gap-0.5 bg-white/80 backdrop-blur-lg rounded-2xl p-1 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90 hover:border-white/80 hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {isFeatureEnabled('undo') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editorChain().undo().run()}
                disabled={!editor.can().undo()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md disabled:opacity-40 disabled:hover:scale-100 relative z-10"
              >
                <Undo size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('undoShortcut')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isFeatureEnabled('redo') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editorChain().redo().run()}
                disabled={!editor.can().redo()}
                className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-white/80 hover:to-slate-50/60 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md disabled:opacity-40 disabled:hover:scale-100 relative z-10"
              >
                <Redo size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('redoShortcut')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
