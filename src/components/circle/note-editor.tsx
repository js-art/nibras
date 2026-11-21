"use client";

import { useState } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Link2, Undo2, Redo2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function NoteEditor({
  resetKey,
  placeholder,
  rtl,
  labelledBy,
  initial = "",
  onChange,
}: {
  resetKey: number | string;
  placeholder: string;
  rtl: boolean;
  labelledBy: string;
  initial?: string;
  onChange: (html: string) => void;
}) {
  const t = useTranslations("circle");
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          horizontalRule: false,
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noreferrer", target: "_blank" } },
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: initial,
      editorProps: {
        attributes: {
          dir: rtl ? "rtl" : "ltr",
          class: "c-note-input",
          "aria-labelledby": labelledBy,
        },
      },
      onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    },
    [resetKey, placeholder, rtl, labelledBy, initial],
  );
  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        bullet: current.isActive("bulletList"),
        ordered: current.isActive("orderedList"),
        quote: current.isActive("blockquote"),
        link: current.isActive("link"),
      };
    },
  });

  function mark(name: "bold" | "italic" | "underline" | "bulletList" | "orderedList" | "blockquote") {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (name === "bold") chain.toggleBold().run();
    else if (name === "italic") chain.toggleItalic().run();
    else if (name === "underline") chain.toggleUnderline().run();
    else if (name === "bulletList") chain.toggleBulletList().run();
    else if (name === "orderedList") chain.toggleOrderedList().run();
    else chain.toggleBlockquote().run();
  }

  function applyLink() {
    if (!editor) return;
    const href = url.trim();
    if (!href) editor.chain().focus().unsetLink().run();
    else {
      const safe = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
    }
    setUrl("");
    setLinkOpen(false);
  }

  const tools = [
    { name: "bold" as const, label: t("editorBold"), icon: Bold, on: marks?.bold },
    { name: "italic" as const, label: t("editorItalic"), icon: Italic, on: marks?.italic },
    { name: "underline" as const, label: t("editorUnderline"), icon: UnderlineIcon, on: marks?.underline },
    { name: "bulletList" as const, label: t("editorList"), icon: List, on: marks?.bullet },
    { name: "orderedList" as const, label: t("editorNumbers"), icon: ListOrdered, on: marks?.ordered },
    { name: "blockquote" as const, label: t("editorQuote"), icon: Quote, on: marks?.quote },
  ];

  return (
    <div className="c-editor">
      <div className="c-editor-bar" role="toolbar" aria-label={t("write")}>
        {tools.map((tool) => (
          <button
            key={tool.name}
            type="button"
            className="c-quiet c-press"
            aria-label={tool.label}
            aria-pressed={Boolean(tool.on)}
            onClick={() => mark(tool.name)}
          >
            <tool.icon size={18} />
          </button>
        ))}
        <button
          type="button"
          className="c-quiet c-press"
          aria-label={t("editorLink")}
          aria-pressed={linkOpen || Boolean(marks?.link)}
          onClick={() => {
            if (!editor) return;
            if (linkOpen) {
              setLinkOpen(false);
              return;
            }
            const current = editor.getAttributes("link").href;
            setUrl(typeof current === "string" ? current : "");
            setLinkOpen(true);
          }}
        >
          <Link2 size={18} />
        </button>
        <button type="button" className="c-quiet c-press" aria-label={t("editorUndo")} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={18} />
        </button>
        <button type="button" className="c-quiet c-press" aria-label={t("editorRedo")} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={18} />
        </button>
      </div>
      <div className="c-editor-surface">
        {linkOpen ? (
          <form
            className="c-editor-link"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="c-editor-link-input"
              dir="ltr"
              inputMode="url"
              aria-label={t("editorLink")}
              autoFocus
            />
            <button type="submit" className="c-pill c-press">
              {t("editorLink")}
            </button>
          </form>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
