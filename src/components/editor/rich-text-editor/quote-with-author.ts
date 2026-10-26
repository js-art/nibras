import { mergeAttributes } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import type { Node as ProseNode, Schema } from '@tiptap/pm/model';
import { NodeSelection, TextSelection, type Transaction } from '@tiptap/pm/state';

export interface QuoteWithAuthorOptions {
  HTMLAttributes: Record<string, unknown>;
  authorPlaceholder: string;
}

function readAuthor(element: HTMLElement): string {
  const cite = element.querySelector(':scope > cite');
  const raw = element.getAttribute('data-author') || cite?.textContent || '';
  return raw.replace(/^[\s\-–—]+/, '').trim();
}

/**
 * A toolbar popover is painted on top of a quote. Clicks on it must not be
 * treated as the author row just because the coordinates overlap the quote.
 * `null` means the caller may still accept the padding band under the field.
 */
export function authorGestureOwnsTarget(input: {
  blockControl: boolean;
  inQuoteBody: boolean;
  inQuote: boolean;
  inEditor: boolean;
}): boolean | null {
  if (input.blockControl || input.inQuoteBody) return false;
  if (input.inQuote) return true;
  if (!input.inEditor) return false;
  return null;
}

export function quoteDeleteAction(input: {
  key: 'Backspace' | 'Delete';
  emptyQuote: boolean;
  atStart: boolean;
  atEnd: boolean;
  selectionCoversQuote: boolean;
}): 'remove' | 'unwrap' | null {
  if (input.selectionCoversQuote || input.emptyQuote) return 'remove';
  if (input.key === 'Backspace' && input.atStart) return 'unwrap';
  if (input.key === 'Delete' && input.atEnd) return 'unwrap';
  return null;
}

function placeCaret(tr: Transaction, pos: number) {
  const clamped = Math.max(1, Math.min(pos, Math.max(1, tr.doc.content.size)));
  tr.setSelection(TextSelection.near(tr.doc.resolve(clamped))).scrollIntoView();
}

function unwrapQuote(tr: Transaction, from: number, node: ProseNode) {
  tr.replaceWith(from, from + node.nodeSize, node.content);
  placeCaret(tr, from + 1);
}

function removeQuote(tr: Transaction, from: number, node: ProseNode, schema: Schema) {
  tr.delete(from, from + node.nodeSize);
  if (tr.doc.content.size === 0) {
    const paragraph = schema.nodes.paragraph?.create();
    if (paragraph) tr.insert(0, paragraph);
  }
  placeCaret(tr, from + 1);
}

function quoteContentElement(element: HTMLElement): HTMLElement {
  const body = element.querySelector(':scope > .quote-body');
  if (body instanceof HTMLElement) return body;

  const cite = element.querySelector(':scope > cite');
  if (!cite) return element;

  const holder = document.createElement('div');
  element.childNodes.forEach((child) => {
    if (child !== cite) holder.appendChild(child.cloneNode(true));
  });
  if (!holder.childNodes.length) holder.appendChild(document.createElement('p'));
  return holder;
}

export const QuoteWithAuthor = Blockquote.extend<QuoteWithAuthorOptions>({
  addOptions(): QuoteWithAuthorOptions {
    const parent = this.parent?.();
    const options: QuoteWithAuthorOptions = {
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      authorPlaceholder: 'Author',
    };
    return options;
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      author: {
        default: '',
        parseHTML: (element) => readAuthor(element as HTMLElement),
        renderHTML: (attributes) => {
          const author = String(attributes.author || '').trim();
          if (!author) return {};
          return { 'data-author': author };
        },
      },
    };
  },

  addKeyboardShortcuts() {
    const onDeleteKey = (key: 'Backspace' | 'Delete') => () =>
      this.editor.commands.command(({ state, tr, dispatch }) => {
        const { selection, schema } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === 'blockquote') {
          if (dispatch) removeQuote(tr, selection.from, selection.node, schema);
          if (dispatch) dispatch(tr);
          return true;
        }

        let depth = 0;
        for (let current = selection.$from.depth; current > 0; current -= 1) {
          if (selection.$from.node(current).type.name === 'blockquote') {
            depth = current;
            break;
          }
        }
        if (!depth) return false;

        const quote = selection.$from.node(depth);
        const from = selection.$from.before(depth);
        const action = quoteDeleteAction({
          key,
          emptyQuote: quote.textContent.trim() === '',
          atStart: selection.empty && selection.$from.parentOffset === 0 && selection.$from.index(depth) === 0,
          atEnd:
            selection.empty &&
            selection.$from.parentOffset === selection.$from.parent.content.size &&
            selection.$from.index(depth) === quote.childCount - 1,
          selectionCoversQuote:
            !selection.empty &&
            selection.from <= selection.$from.start(depth) &&
            selection.to >= selection.$from.end(depth),
        });
        if (!action) return false;
        if (dispatch) {
          if (action === 'remove') removeQuote(tr, from, quote, schema);
          else unwrapQuote(tr, from, quote);
          dispatch(tr);
        }
        return true;
      });

    return {
      ...this.parent?.(),
      Backspace: onDeleteKey('Backspace'),
      Delete: onDeleteKey('Delete'),
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote',
        contentElement: (element) => quoteContentElement(element as HTMLElement),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const author = String(node.attrs.author || '').trim();
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    const body: ['div', { class: string }, 0] = ['div', { class: 'quote-body' }, 0];
    if (!author) return ['blockquote', attrs, body];
    return ['blockquote', attrs, body, ['cite', { class: 'quote-author' }, author]];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('blockquote');
      const contentDOM = document.createElement('div');
      contentDOM.className = 'quote-body';

      const field = document.createElement('div');
      field.className = 'quote-author-field';
      field.contentEditable = 'false';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'quote-author-input';
      input.placeholder = this.options.authorPlaceholder;
      input.setAttribute('aria-label', this.options.authorPlaceholder);
      input.autocomplete = 'off';
      input.dir = 'auto';
      const syncDir = () => {
        try {
          const dir = editor.view.dom.getAttribute('dir');
          if (dir === 'ltr' || dir === 'rtl') input.dir = dir;
        } catch {
          // The editor view can still be mounting when the node view is created.
        }
      };
      syncDir();
      input.value = String(node.attrs.author || '');
      if (input.value.trim()) input.classList.add('has-author');
      field.append(input);

      let editingAuthor = false;
      // True from the click that opens the field until the user points outside it.
      // Saving on each keystroke dispatches a transaction, and that dispatch moves
      // the caret back into the quote. The name is written once, when the field closes.
      let authorSession = false;
      // True until the opening click finishes. A dispatch that puts the caret back
      // into the quote focuses the editor and blurs this input, so the gesture is
      // swallowed instead of repaired with a transaction.
      let armingAuthor = false;
      let focusTimer = 0;
      let armTimer = 0;
      let refocuses = 0;

      const writeAuthor = (value: string) => {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const latest = editor.state.doc.nodeAt(pos);
        if (!latest || latest.type.name !== 'blockquote') return;
        if (String(latest.attrs.author || '') === value) return;
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...latest.attrs, author: value });
        editor.view.dispatch(tr);
      };

      const syncAuthorClass = () => {
        input.classList.toggle('has-author', Boolean(input.value.trim()));
      };

      const authorIsEditing = () =>
        authorSession || editingAuthor || document.activeElement === input;

      // An empty quote's paragraph is only a trailing break. Focusing this
      // input blurs the editor, and Chrome deletes that break. ProseMirror
      // then reads the caret onto the next block and the quote frame closes.
      const keepEmptyQuoteBreak = () => {
        contentDOM.querySelectorAll('p').forEach((paragraph) => {
          if (paragraph.childNodes.length > 0) return;
          const br = document.createElement('br');
          br.className = 'ProseMirror-trailingBreak';
          paragraph.appendChild(br);
        });
      };

      const holdAuthorOpen = () => {
        editingAuthor = true;
        dom.classList.add('quote-author-open');
      };
      const releaseAuthorOpen = () => {
        if (document.activeElement === input) return;
        editingAuthor = false;
        dom.classList.remove('quote-author-open');
      };

      const focusAuthor = (moveCaretToEnd: boolean) => {
        holdAuthorOpen();
        input.focus({ preventScroll: true });
        if (!moveCaretToEnd || document.activeElement !== input) return;
        const end = input.value.length;
        input.setSelectionRange(end, end);
      };

      const eventInAuthorField = (target: EventTarget | null) =>
        target === field || target === input || (target instanceof Node && field.contains(target));

      // The placeholder sits on the bottom edge of the quote. A click on the
      // green padding under the text, or a few pixels below it, is not the
      // input — ProseMirror then puts the caret on the next block and the
      // quote loses its frame. Anything in the quote except the quote body,
      // plus a short band under the field, is the author control.
      const pointerHitsAuthor = (event: Event) => {
        const target = event.target;
        const editorRoot = dom.closest('.ProseMirror');
        const owns = authorGestureOwnsTarget({
          blockControl: target instanceof Element && !!target.closest('.editor-block-controls button'),
          inQuoteBody: target instanceof Node && contentDOM.contains(target),
          inQuote: target instanceof Node && dom.contains(target),
          inEditor: target instanceof Node && !!editorRoot?.contains(target),
        });
        if (owns === false) return false;
        if (owns === true) return true;
        if (!(event instanceof MouseEvent)) return false;
        const rect = field.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return false;
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top - 4 &&
          event.clientY <= rect.bottom + 20
        );
      };

      // Focusing during mousedown is discarded: the contenteditable takes the
      // caret back when the click finishes and the author row disappears.
      const scheduleAuthorFocus = () => {
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => {
          if (!dom.isConnected || !authorSession || document.activeElement === input) return;
          focusAuthor(true);
        }, 0);
      };

      // Capture on document runs before ProseMirror and before the block
      // buttons that sit on this row. Claiming the gesture here keeps the
      // quote from losing selection.
      const onDocumentPointerDown = (event: Event) => {
        if (!pointerHitsAuthor(event)) {
          authorSession = false;
          armingAuthor = false;
          return;
        }
        authorSession = true;
        holdAuthorOpen();
        if (document.activeElement === input) return;
        armingAuthor = true;
        refocuses = 0;
        event.preventDefault();
        event.stopPropagation();
        scheduleAuthorFocus();
        window.clearTimeout(armTimer);
        armTimer = window.setTimeout(() => {
          armingAuthor = false;
        }, 400);
      };
      // pointerdown's preventDefault does not cancel the separate mousedown.
      // ProseMirror places the caret from that mousedown, which closes the quote.
      const onDocumentMouseDown = (event: Event) => {
        if (!pointerHitsAuthor(event) || document.activeElement === input) return;
        authorSession = true;
        holdAuthorOpen();
        armingAuthor = true;
        event.preventDefault();
        event.stopPropagation();
        scheduleAuthorFocus();
      };
      const swallowOpeningGesture = (event: Event) => {
        if (!armingAuthor) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'click') armingAuthor = false;
        scheduleAuthorFocus();
      };
      // Once the input is focused, these still stop the event from reaching
      // the editor, without preventDefault, so the caret can move in the field.
      const keepPointerInField = (event: Event) => {
        event.stopPropagation();
      };
      field.addEventListener('pointerdown', keepPointerInField);
      field.addEventListener('mousedown', keepPointerInField);
      field.addEventListener('pointerup', keepPointerInField);
      field.addEventListener('mouseup', keepPointerInField);
      field.addEventListener('click', keepPointerInField);
      document.addEventListener('pointerdown', onDocumentPointerDown, true);
      document.addEventListener('mousedown', onDocumentMouseDown, true);
      document.addEventListener('pointerup', swallowOpeningGesture, true);
      document.addEventListener('mouseup', swallowOpeningGesture, true);
      document.addEventListener('click', swallowOpeningGesture, true);
      const keepKeyInField = (event: Event) => {
        event.stopPropagation();
      };
      input.addEventListener('focus', holdAuthorOpen);
      input.addEventListener('beforeinput', keepKeyInField);
      input.addEventListener('input', (event) => {
        keepKeyInField(event);
        syncAuthorClass();
      });
      input.addEventListener('compositionstart', keepKeyInField);
      input.addEventListener('compositionupdate', keepKeyInField);
      input.addEventListener('compositionend', keepKeyInField);
      input.addEventListener('blur', () => {
        if (authorSession && refocuses < 4) {
          refocuses += 1;
          window.setTimeout(() => {
            if (!dom.isConnected || !authorSession || document.activeElement === input) return;
            focusAuthor(false);
          }, 0);
          return;
        }
        keepEmptyQuoteBreak();
        const trimmed = input.value.trim();
        if (trimmed !== input.value) input.value = trimmed;
        syncAuthorClass();
        writeAuthor(trimmed);
        window.setTimeout(releaseAuthorOpen, 0);
      });
      input.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          authorSession = false;
          input.blur();
          return;
        }
        if ((event.key === 'Backspace' || event.key === 'Delete') && input.value === '') {
          event.preventDefault();
          authorSession = false;
          const pos = getPos();
          if (typeof pos !== 'number') return;
          editor.commands.command(({ tr, state, dispatch }) => {
            const current = tr.doc.nodeAt(pos);
            if (!current || current.type.name !== 'blockquote') return false;
            if (dispatch) {
              removeQuote(tr, pos, current, state.schema);
              dispatch(tr);
            }
            return true;
          });
        }
      });

      dom.append(contentDOM, field);

      return {
        dom,
        contentDOM,
        stopEvent: (event) => eventInAuthorField(event.target),
        ignoreMutation: (mutation) => {
          const target = mutation.target;
          if (!(target instanceof Node)) return true;
          if (eventInAuthorField(target)) return true;
          // The author field is not document content. Reading mutations on
          // the quote chrome recreates the node and drops the open field.
          if (target !== contentDOM && !contentDOM.contains(target)) return true;
          if (!authorIsEditing()) return false;
          keepEmptyQuoteBreak();
          return true;
        },
        update: (updated) => {
          if (updated.type.name !== 'blockquote') return false;
          syncDir();
          if (editingAuthor || document.activeElement === input) {
            dom.classList.add('quote-author-open');
            return true;
          }
          input.value = String(updated.attrs.author || '');
          syncAuthorClass();
          return true;
        },
        destroy: () => {
          window.clearTimeout(focusTimer);
          window.clearTimeout(armTimer);
          document.removeEventListener('pointerdown', onDocumentPointerDown, true);
          document.removeEventListener('mousedown', onDocumentMouseDown, true);
          document.removeEventListener('pointerup', swallowOpeningGesture, true);
          document.removeEventListener('mouseup', swallowOpeningGesture, true);
          document.removeEventListener('click', swallowOpeningGesture, true);
        },
      };
    };
  },
});
