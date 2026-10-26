'use client';

import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
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
  Link,
  Highlighter,
  Subscript,
  Superscript,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditorFeature } from './types';

interface BubbleMenuProps {
  editor: Editor;
  enabledFeatures?: EditorFeature[];
  disabledFeatures?: EditorFeature[];
}

export function BubbleMenu({ editor, enabledFeatures, disabledFeatures }: BubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      const isEmpty = from === to;

      if (isEmpty) {
        setIsVisible(false);
        return;
      }

      const { view } = editor;
      const { state } = view;
      const { selection } = state;
      const { $from, $to } = selection;

      // Get the DOM coordinates
      const start = view.coordsAtPos($from.pos);
      const end = view.coordsAtPos($to.pos);

      // Calculate position - center above selection
      const left = (start.left + end.left) / 2;
      const top = Math.min(start.top, end.top) - 8;

      setPosition({ x: left, y: top });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const isFeatureEnabled = (feature: EditorFeature) => {
    if (disabledFeatures?.includes(feature)) return false;
    if (enabledFeatures && enabledFeatures.length > 0) {
      return enabledFeatures.includes(feature);
    }
    return true;
  };

  if (!isClient || !isVisible) return null;

  return (
    <div
      className="fixed z-[9999] flex items-center gap-0.5 p-1 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-lg shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
    >
      {isFeatureEnabled('bold') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Bold"
        >
          <Bold size={14} />
        </Button>
      )}

      {isFeatureEnabled('italic') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Italic"
        >
          <Italic size={14} />
        </Button>
      )}

      {isFeatureEnabled('underline') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleUnderline().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('underline') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Underline"
        >
          <Underline size={14} />
        </Button>
      )}

      {isFeatureEnabled('strike') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleStrike().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('strike') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </Button>
      )}

      {(isFeatureEnabled('code') || isFeatureEnabled('heading') || isFeatureEnabled('link') || isFeatureEnabled('highlight')) && (
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
      )}

      {isFeatureEnabled('code') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleCode().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('code') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Code"
        >
          <Code size={14} />
        </Button>
      )}

      {isFeatureEnabled('heading') && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 px-2 gap-1 hover:bg-gray-100 transition-colors ${
                editor.isActive('heading') ? 'bg-gray-100 text-gray-900' : ''
              }`}
            >
              <Heading1 size={14} />
              <span className="text-[10px] font-medium">
                {editor.isActive('heading', { level: 1 })
                  ? 'H1'
                  : editor.isActive('heading', { level: 2 })
                    ? 'H2'
                    : editor.isActive('heading', { level: 3 })
                      ? 'H3'
                      : editor.isActive('heading', { level: 4 })
                        ? 'H4'
                        : editor.isActive('heading', { level: 5 })
                          ? 'H5'
                          : editor.isActive('heading', { level: 6 })
                            ? 'H6'
                            : 'H'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setParagraph().run()}
              className={!editor.isActive('heading') ? 'bg-accent' : ''}
            >
              <span className="text-sm">Paragraph</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading1 size={16} />
                <span className="text-2xl font-bold">Heading 1</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading2 size={16} />
                <span className="text-xl font-bold">Heading 2</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading3 size={16} />
                <span className="text-lg font-bold">Heading 3</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 4 }).run()}
              className={editor.isActive('heading', { level: 4 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading4 size={16} />
                <span className="text-base font-bold">Heading 4</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 5 }).run()}
              className={editor.isActive('heading', { level: 5 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading5 size={16} />
                <span className="text-sm font-bold">Heading 5</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 6 }).run()}
              className={editor.isActive('heading', { level: 6 }) ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-2">
                <Heading6 size={16} />
                <span className="text-xs font-bold">Heading 6</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isFeatureEnabled('link') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus(undefined, { scrollIntoView: false }).setLink({ href: url }).run();
            }
          }}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('link') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Link"
        >
          <Link size={14} />
        </Button>
      )}

      {isFeatureEnabled('highlight') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHighlight().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('highlight') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Highlight"
        >
          <Highlighter size={14} />
        </Button>
      )}

      {(isFeatureEnabled('subscript') || isFeatureEnabled('superscript')) && (
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
      )}

      {isFeatureEnabled('subscript') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleSubscript().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('subscript') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Subscript"
        >
          <Subscript size={14} />
        </Button>
      )}

      {isFeatureEnabled('superscript') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleSuperscript().run()}
          className={`h-7 w-7 p-0 hover:bg-gray-100 transition-colors ${
            editor.isActive('superscript') ? 'bg-gray-100 text-gray-900' : ''
          }`}
          title="Superscript"
        >
          <Superscript size={14} />
        </Button>
      )}
    </div>
  );
}
