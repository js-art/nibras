import { Extension } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Mark, type MarkType, type Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';

type PaintFlags = {
  /** Color applied to text typed after the caret. Null does not force a color. */
  color: string | null;
  highlight: string | null;
  /** Drop inherited text color from newly typed characters. */
  colorStopped: boolean;
  highlightStopped: boolean;
};

const initialFlags: PaintFlags = {
  color: null,
  highlight: null,
  // A chosen color paints the selection only. Letters typed afterward stay plain.
  colorStopped: true,
  highlightStopped: true,
};

export const typingPaintKey = new PluginKey<PaintFlags>('typingPaint');

/**
 * The stock text-style mark is inclusive, so the caret at the end of colored
 * text stays inside the span and every new letter keeps that color. Reset
 * cannot leave that span. An exclusive mark keeps the caret outside it.
 */
export const EditorTextStyle = TextStyle.extend({
  inclusive: false,
});

export const EditorHighlight = Highlight.extend({
  inclusive: false,
});

function otherAttrs(attrs: Record<string, unknown>, ignore: string) {
  return Object.entries(attrs).some(
    ([key, value]) => key !== ignore && value != null && value !== false && value !== '',
  );
}

function withoutColor(marks: readonly Mark[], type: MarkType | undefined) {
  if (!type) return marks.slice();
  const next: Mark[] = [];
  for (const mark of marks) {
    if (mark.type !== type) {
      next.push(mark);
      continue;
    }
    if (!mark.attrs.color) {
      next.push(mark);
      continue;
    }
    const attrs = { ...mark.attrs, color: null };
    if (otherAttrs(attrs, 'color')) next.push(type.create(attrs));
  }
  return next;
}

function withColor(marks: readonly Mark[], type: MarkType, color: string) {
  let found = false;
  const next = marks.map((mark) => {
    if (mark.type !== type) return mark;
    found = true;
    return type.create({ ...mark.attrs, color });
  });
  if (!found) next.push(type.create({ color }));
  return next;
}

function stripColor(tr: Transaction, doc: PMNode, from: number, to: number) {
  const type = doc.type.schema.marks.textStyle;
  if (!type || from >= to) return;
  const restore: { from: number; to: number; attrs: Record<string, unknown> }[] = [];
  let colored = false;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const mark = type.isInSet(node.marks);
    if (!mark) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (end <= start) return;
    if (mark.attrs.color) colored = true;
    const attrs = { ...mark.attrs, color: null };
    if (otherAttrs(attrs, 'color')) restore.push({ from: start, to: end, attrs });
  });
  if (!colored) return;
  tr.removeMark(from, to, type);
  for (const item of restore) tr.addMark(item.from, item.to, type.create(item.attrs));
}

function applyColor(tr: Transaction, doc: PMNode, from: number, to: number, color: string) {
  const type = doc.type.schema.marks.textStyle;
  if (!type || from >= to) return;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const mark = type.isInSet(node.marks);
    if (mark?.attrs.color === color) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (end <= start) return;
    if (mark) tr.removeMark(start, end, type);
    tr.addMark(start, end, type.create({ ...mark?.attrs, color }));
  });
}

function stripHighlight(tr: Transaction, doc: PMNode, from: number, to: number) {
  const type = doc.type.schema.marks.highlight;
  if (!type || from >= to) return;
  tr.removeMark(from, to, type);
}

function applyHighlight(tr: Transaction, doc: PMNode, from: number, to: number, color: string) {
  const type = doc.type.schema.marks.highlight;
  if (!type || from >= to) return;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const mark = type.isInSet(node.marks);
    if (mark?.attrs.color === color) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (end <= start) return;
    tr.addMark(start, end, type.create({ color }));
  });
}

function clampRange(doc: PMNode, from: number, to: number) {
  const max = doc.content.size;
  const start = Math.max(0, Math.min(from, max));
  const end = Math.max(start, Math.min(to, max));
  return { from: start, to: end };
}

/**
 * Stop text color or highlight from sticking to the next characters.
 * `range` is the text the user selected, including a selection the popover
 * collapsed before this transaction ran. A collapsed caret keeps text that
 * was already written and only stops later typing.
 */
/**
 * The text to clear when Reset is pressed. A click on the popover can move the
 * caret into the block above before the button runs, so a saved selection wins
 * over that caret.
 */
export function paintResetRange(input: {
  saved: { from: number; to: number } | null;
  liveFrom: number;
  liveTo: number;
  dom: { from: number; to: number } | null;
}) {
  if (input.saved && input.saved.from !== input.saved.to) {
    return { from: input.saved.from, to: input.saved.to };
  }
  if (input.liveFrom !== input.liveTo) return { from: input.liveFrom, to: input.liveTo };
  if (input.dom && input.dom.from !== input.dom.to) return input.dom;
  return { from: input.liveFrom, to: input.liveTo };
}

export function resetTypingPaint(
  state: EditorState,
  kind: 'color' | 'highlight',
  range?: { from: number; to: number } | null,
): Transaction {
  const tr = state.tr;
  const picked = range ?? state.selection;
  const { from, to } = clampRange(state.doc, picked.from, picked.to);
  const base = state.storedMarks || state.selection.$from.marks();

  if (kind === 'color') {
    const type = state.schema.marks.textStyle;
    if (from !== to) stripColor(tr, state.doc, from, to);
    rememberRange(tr, from, to);
    tr.setStoredMarks(withoutColor(base, type));
    tr.setMeta(typingPaintKey, { color: null, colorStopped: true });
    return tr;
  }

  const type = state.schema.marks.highlight;
  if (from !== to && type) stripHighlight(tr, state.doc, from, to);
  rememberRange(tr, from, to);
  tr.setStoredMarks(type ? base.filter((mark) => mark.type !== type) : base.slice());
  tr.setMeta(typingPaintKey, { highlight: null, highlightStopped: true });
  return tr;
}

function rememberRange(tr: Transaction, from: number, to: number) {
  if (from === to) return;
  try {
    tr.setSelection(TextSelection.create(tr.doc, from, to));
  } catch {
    // A range on a node boundary still loses its paint; the caret can stay.
  }
}

function mapInserted(from: number, to: number, tr: Transaction, stepIndex: number, transactions: readonly Transaction[], trIndex: number) {
  let start = from;
  let end = to;
  for (let index = stepIndex + 1; index < tr.steps.length; index += 1) {
    const map = tr.steps[index].getMap();
    start = map.map(start, -1);
    end = map.map(end, 1);
  }
  for (let index = trIndex + 1; index < transactions.length; index += 1) {
    start = transactions[index].mapping.map(start, -1);
    end = transactions[index].mapping.map(end, 1);
  }
  return end > start ? { from: start, to: end } : null;
}

/** Text a transaction actually added. Unchanged characters in a replaced span stay put. */
function collectInsertedRanges(transactions: readonly Transaction[]) {
  if (transactions.some((tr) => tr.getMeta('paste') || tr.getMeta('uiEvent') === 'paste')) {
    return [];
  }
  const ranges: { from: number; to: number }[] = [];
  transactions.forEach((tr, trIndex) => {
    tr.steps.forEach((step, stepIndex) => {
      if (!(step instanceof ReplaceStep) || step.slice.size === 0) return;
      const before = tr.docs[stepIndex];
      if (!before || (step.from === 0 && step.to === before.content.size)) return;
      const oldText = before.textBetween(step.from, step.to, '\n', '\n');
      const newText = step.slice.content.textBetween(0, step.slice.content.size, '\n', '\n');
      let localFrom = step.from;
      let localTo = step.from + step.slice.size;
      if (oldText.length === step.to - step.from && newText.length === step.slice.size) {
        let prefix = 0;
        const maxPrefix = Math.min(oldText.length, newText.length);
        while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix += 1;
        let suffix = 0;
        while (
          suffix < oldText.length - prefix &&
          suffix < newText.length - prefix &&
          oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
        ) {
          suffix += 1;
        }
        if (newText.length - prefix - suffix <= 0) return;
        localFrom = step.from + prefix;
        localTo = step.from + newText.length - suffix;
      }
      const mapped = mapInserted(localFrom, localTo, tr, stepIndex, transactions, trIndex);
      if (mapped) ranges.push(mapped);
    });
  });
  return ranges;
}

export const TypingPaint = Extension.create({
  name: 'typingPaint',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: typingPaintKey,
        state: {
          init: () => initialFlags,
          apply(tr, value) {
            const meta = tr.getMeta(typingPaintKey) as Partial<PaintFlags> | undefined;
            const prev = value ?? initialFlags;
            if (!meta) return prev;
            return { ...prev, ...meta };
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (view.composing) return false;
            const flags = typingPaintKey.getState(view.state) ?? initialFlags;
            if (!flags.colorStopped && !flags.highlightStopped) return false;

            const textStyle = view.state.schema.marks.textStyle;
            const highlightType = view.state.schema.marks.highlight;
            const base = view.state.storedMarks || view.state.doc.resolve(from).marks();
            let stored = base.slice();
            if (flags.colorStopped) stored = withoutColor(stored, textStyle);
            if (flags.highlightStopped && highlightType) {
              stored = stored.filter((mark) => mark.type !== highlightType);
            }

            const tr = view.state.tr;
            tr.setStoredMarks(stored);
            tr.insertText(text, from, to);
            const end = from + text.length;
            if (flags.colorStopped) stripColor(tr, tr.doc, from, end);
            if (flags.highlightStopped) stripHighlight(tr, tr.doc, from, end);
            tr.setStoredMarks(stored);
            view.dispatch(tr);
            return true;
          },
        },
        appendTransaction(transactions, _oldState, newState) {
          const flags = typingPaintKey.getState(newState) ?? initialFlags;
          const forcing = Boolean(flags.color || flags.highlight);
          const stopping = flags.colorStopped || flags.highlightStopped;
          if (!forcing && !stopping) return null;

          const tr = newState.tr;
          if (transactions.some((item) => item.docChanged)) {
            for (const range of collectInsertedRanges(transactions)) {
              if (flags.colorStopped) stripColor(tr, tr.doc, range.from, range.to);
              else if (flags.color) applyColor(tr, tr.doc, range.from, range.to, flags.color);
              if (flags.highlightStopped) stripHighlight(tr, tr.doc, range.from, range.to);
              else if (flags.highlight) applyHighlight(tr, tr.doc, range.from, range.to, flags.highlight);
            }
          }

          const textStyle = newState.schema.marks.textStyle;
          const highlight = newState.schema.marks.highlight;
          const at = tr.selection.$from.marks();
          let stored = (tr.storedMarks ?? newState.storedMarks ?? at).slice();
          if (flags.colorStopped && textStyle) stored = withoutColor(stored, textStyle);
          else if (flags.color && textStyle) stored = withColor(stored, textStyle, flags.color);
          if (flags.highlightStopped && highlight) stored = stored.filter((mark) => mark.type !== highlight);
          else if (flags.highlight && highlight) {
            stored = stored.filter((mark) => mark.type !== highlight);
            stored.push(highlight.create({ color: flags.highlight }));
          }
          const active = tr.storedMarks ?? newState.storedMarks ?? at;
          if (!Mark.sameSet(active, stored)) tr.setStoredMarks(stored);
          return tr.steps.length || tr.storedMarksSet ? tr : null;
        },
      }),
    ];
  },
});
