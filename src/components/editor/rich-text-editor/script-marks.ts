import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';

const stackedScriptKey = new PluginKey('stackedScriptMarks');

/** Superscript and subscript cannot share the same characters. Keep superscript. */
function unstackScriptMarks(state: EditorState): Transaction | null {
  const superscript = state.schema.marks.superscript;
  const subscript = state.schema.marks.subscript;
  if (!superscript || !subscript) return null;

  let tr = state.tr;
  let changed = false;
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (!superscript.isInSet(node.marks) || !subscript.isInSet(node.marks)) return;
    tr = tr.removeMark(pos, pos + node.nodeSize, subscript);
    changed = true;
  });
  return changed ? tr : null;
}

function exclusiveToggle(name: 'superscript' | 'subscript', other: 'superscript' | 'subscript') {
  return () =>
    ({
      editor,
      commands,
    }: {
      editor: {
        isActive: (mark: string) => boolean;
        schema: { marks: Record<string, unknown> };
      };
      commands: {
        unsetMark: (mark: string) => boolean;
        setMark: (mark: string) => boolean;
      };
    }) => {
      const hasThis = editor.isActive(name);
      const hasOther = editor.isActive(other);
      if (hasThis && !hasOther) return commands.unsetMark(name);
      if (editor.schema.marks[other]) commands.unsetMark(other);
      return commands.setMark(name);
    };
}

export const EditorSuperscript = Superscript.extend({
  excludes: 'subscript',
  addCommands() {
    return {
      ...this.parent?.(),
      setSuperscript:
        () =>
        ({ editor, commands }) => {
          if (editor.schema.marks.subscript) commands.unsetMark('subscript');
          return commands.setMark(this.name);
        },
      toggleSuperscript: exclusiveToggle('superscript', 'subscript'),
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: stackedScriptKey,
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          return unstackScriptMarks(state);
        },
      }),
    ];
  },
  onCreate() {
    queueMicrotask(() => {
      if (this.editor.isDestroyed) return;
      const tr = unstackScriptMarks(this.editor.state);
      if (tr) this.editor.view.dispatch(tr);
    });
  },
});

export const EditorSubscript = Subscript.extend({
  excludes: 'superscript',
  addCommands() {
    return {
      ...this.parent?.(),
      setSubscript:
        () =>
        ({ editor, commands }) => {
          if (editor.schema.marks.superscript) commands.unsetMark('superscript');
          return commands.setMark(this.name);
        },
      toggleSubscript: exclusiveToggle('subscript', 'superscript'),
    };
  },
});
