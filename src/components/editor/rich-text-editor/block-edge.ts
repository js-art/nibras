import { Extension } from '@tiptap/core';
import { Fragment, type Node as ProseNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

const blockEdgePluginKey = new PluginKey('blockEdge');

/** Clicks in the margin around a trapped block, not deep in the empty editor. */
const EDGE_GAP_PX = 64;

const trappedTypes = new Set(['codeBlock', 'blockquote']);

export type BlockEdgeAction =
  | { type: 'insert-before' }
  | { type: 'insert-after' }
  | { type: 'insert-above'; index: number }
  | { type: 'insert-below'; index: number }
  | { type: 'move-prev'; index: number }
  | { type: 'move-next'; index: number }
  | { type: 'move-block'; index: number; direction: -1 | 1 };

type ArrowInput = {
  empty: boolean;
  parentType: string;
  parentOffset: number;
  parentContentSize: number;
  text: string;
  depth: number;
  childCount: number;
  topType: string | null;
  topIndex: number;
  topChildCount: number;
  indexInTop: number;
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

export function blockEdgeArrowAction(input: ArrowInput): BlockEdgeAction | null {
  if (input.altKey && !input.shiftKey && !input.metaKey && !input.ctrlKey && input.empty) {
    if (input.key === 'ArrowUp' && input.topIndex > 0) {
      return { type: 'move-block', index: input.topIndex, direction: -1 };
    }
    if (input.key === 'ArrowDown' && input.topIndex < input.childCount - 1) {
      return { type: 'move-block', index: input.topIndex, direction: 1 };
    }
    return null;
  }

  if (!input.empty || input.shiftKey || input.metaKey || input.ctrlKey) return null;
  if (!input.topType || !trappedTypes.has(input.topType)) return null;

  if (input.topType === 'codeBlock') {
    const before = input.text.slice(0, input.parentOffset);
    const after = input.text.slice(input.parentOffset);
    if (input.key === 'ArrowUp' && !before.includes('\n')) {
      if (input.topIndex === 0) return { type: 'insert-before' };
      return { type: 'move-prev', index: input.topIndex };
    }
    if (input.key === 'ArrowDown' && !after.includes('\n')) {
      if (input.topIndex === input.childCount - 1) return { type: 'insert-after' };
      return { type: 'move-next', index: input.topIndex };
    }
    return null;
  }

  if (input.key === 'ArrowUp' && input.indexInTop === 0 && input.parentOffset === 0) {
    if (input.topIndex === 0) return { type: 'insert-before' };
    return { type: 'move-prev', index: input.topIndex };
  }
  if (
    input.key === 'ArrowDown' &&
    input.indexInTop === input.topChildCount - 1 &&
    input.parentOffset === input.parentContentSize
  ) {
    if (input.topIndex === input.childCount - 1) return { type: 'insert-after' };
    return { type: 'move-next', index: input.topIndex };
  }
  return null;
}

export function blockEdgePointerAction(input: {
  blocks: { index: number; top: number; bottom: number; isEdge: boolean }[];
  childCount: number;
  clientY: number;
}): BlockEdgeAction | null {
  const { blocks, clientY, childCount } = input;
  if (blocks.some((block) => clientY >= block.top && clientY <= block.bottom)) return null;

  let best: { dist: number; action: BlockEdgeAction } | null = null;
  for (const block of blocks) {
    if (!block.isEdge) continue;
    if (clientY > block.bottom) {
      const dist = clientY - block.bottom;
      if (dist > EDGE_GAP_PX) continue;
      const action: BlockEdgeAction =
        block.index === childCount - 1
          ? { type: 'insert-after' }
          : { type: 'move-next', index: block.index };
      if (!best || dist < best.dist) best = { dist, action };
    } else if (clientY < block.top) {
      const dist = block.top - clientY;
      if (dist > EDGE_GAP_PX) continue;
      const action: BlockEdgeAction =
        block.index === 0 ? { type: 'insert-before' } : { type: 'move-prev', index: block.index };
      if (!best || dist < best.dist) best = { dist, action };
    }
  }
  return best?.action ?? null;
}

function childPos(view: EditorView, index: number) {
  let pos = 0;
  for (let i = 0; i < index; i += 1) pos += view.state.doc.child(i).nodeSize;
  return pos;
}

function selectionInsideTable(view: EditorView, tablePos: number) {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'table' && $from.before(depth) === tablePos) return true;
  }
  return false;
}

function keepSelectionInTable(view: EditorView, index: number) {
  const pos = childPos(view, index);
  if (selectionInsideTable(view, pos)) return;
  const table = view.state.doc.child(index);
  let cellPos = pos + 2;
  table.descendants((node, offset) => {
    if (!node.isTextblock) return true;
    cellPos = pos + 1 + offset + 1;
    return false;
  });
  const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, cellPos));
  view.dispatch(tr);
}

function deleteTopLevelBlock(view: EditorView, index: number) {
  const { doc, schema } = view.state;
  if (index < 0 || index >= doc.childCount) return;
  const pos = childPos(view, index);
  const node = doc.child(index);
  const tr = view.state.tr.delete(pos, pos + node.nodeSize);
  if (tr.doc.content.size === 0) {
    const paragraph = schema.nodes.paragraph?.create();
    if (paragraph) tr.insert(0, paragraph);
  }
  focusInside(view, tr, pos + 1);
}

function focusInside(view: EditorView, tr: typeof view.state.tr, pos: number) {
  const selection = TextSelection.near(tr.doc.resolve(Math.max(1, Math.min(pos, tr.doc.content.size - 1))));
  view.dispatch(tr.setSelection(selection).scrollIntoView());
  view.focus();
}

export function applyBlockEdgeAction(view: EditorView, action: BlockEdgeAction) {
  const { doc, schema } = view.state;
  const paragraph = schema.nodes.paragraph?.create();

  if (action.type === 'insert-before' || action.type === 'insert-above' || action.type === 'insert-after' || action.type === 'insert-below') {
    if (!paragraph) return;
    let insertAt = 0;
    if (action.type === 'insert-before') insertAt = 0;
    else if (action.type === 'insert-after') insertAt = doc.content.size;
    else if (action.type === 'insert-above') insertAt = childPos(view, action.index);
    else insertAt = childPos(view, action.index) + doc.child(action.index).nodeSize;
    const tr = view.state.tr.insert(insertAt, paragraph);
    focusInside(view, tr, insertAt + 1);
    return;
  }

  if (action.type === 'move-prev' || action.type === 'move-next') {
    const targetIndex = action.type === 'move-next' ? action.index + 1 : action.index - 1;
    if (targetIndex < 0 || targetIndex >= doc.childCount) return;
    const pos = childPos(view, targetIndex);
    const node = doc.child(targetIndex);
    const inside = action.type === 'move-next' ? pos + 1 : pos + node.nodeSize - 1;
    focusInside(view, view.state.tr, inside);
    return;
  }

  const next = action.index + action.direction;
  if (next < 0 || next >= doc.childCount) return;
  const nodes: ProseNode[] = [];
  doc.forEach((node) => nodes.push(node));
  const [moved] = nodes.splice(action.index, 1);
  if (!moved) return;
  nodes.splice(next, 0, moved);
  let pos = 0;
  for (let i = 0; i < next; i += 1) pos += nodes[i].nodeSize;
  const tr = view.state.tr.replaceWith(0, doc.content.size, Fragment.from(nodes));
  focusInside(view, tr, pos + 1);
}

function slotElement(edge: 'before' | 'after') {
  const el = document.createElement('div');
  el.className = 'editor-block-edge-slot';
  el.dataset.blockEdge = edge;
  el.contentEditable = 'false';
  return el;
}

function svgIcon(path: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('d', path);
  shape.setAttribute('fill', 'none');
  shape.setAttribute('stroke', 'currentColor');
  shape.setAttribute('stroke-width', '1.75');
  shape.setAttribute('stroke-linecap', 'round');
  shape.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(shape);
  return svg;
}

function actionButton(action: string, label: string, disabled: boolean, path: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.blockAction = action;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  button.appendChild(svgIcon(path));
  return button;
}

function controlsElement(view: EditorView, index: number) {
  const rtl = view.dom.getAttribute('dir') === 'rtl';
  const copy = rtl
    ? {
        above: 'خط جدید بالا',
        below: 'خط جدید پایین',
        up: 'انتقال به بالا',
        down: 'انتقال به پایین',
        remove: 'حذف',
        editTable: 'ویرایش جدول',
        editImage: 'ویرایش تصویر',
      }
    : {
        above: 'New line above',
        below: 'New line below',
        up: 'Move up',
        down: 'Move down',
        remove: 'Delete',
        editTable: 'Edit table',
        editImage: 'Edit image',
      };
  const last = index >= view.state.doc.childCount - 1;
  const blockType = view.state.doc.child(index).type.name;
  const isTable = blockType === 'table';
  const isImage = blockType === 'imageWithCaption';
  const editButton = isTable
    ? actionButton('edit-table', copy.editTable, false, 'M3.2 12.8 L5.1 10.1 L11.6 3.6 L13.1 5.1 L6.6 11.6 L4.4 12.8 Z')
    : isImage
      ? actionButton('edit-image', copy.editImage, false, 'M3.2 12.8 L5.1 10.1 L11.6 3.6 L13.1 5.1 L6.6 11.6 L4.4 12.8 Z')
      : null;
  const el = document.createElement('div');
  el.className = 'editor-block-controls';
  el.contentEditable = 'false';
  el.dataset.blockPos = String(childPos(view, index));

  const above = document.createElement('div');
  above.className = 'editor-block-controls__row editor-block-controls__row--above';
  above.append(
    actionButton('move-up', copy.up, index === 0, 'M4 10 L8 6 L12 10'),
    actionButton('insert-above', copy.above, false, 'M8 3.5 V12.5 M3.5 8 H12.5'),
    ...(editButton ? [editButton] : []),
    actionButton('delete', copy.remove, false, 'M3.2 4.4 H12.8 M6.1 4.4 V3.3 H9.9 V4.4 M4.6 4.4 L5.3 12.6 H10.7 L11.4 4.4'),
  );

  const below = document.createElement('div');
  below.className = 'editor-block-controls__row editor-block-controls__row--below';
  below.append(
    actionButton('insert-below', copy.below, false, 'M8 3.5 V12.5 M3.5 8 H12.5'),
    actionButton('move-down', copy.down, last, 'M4 6 L8 10 L12 6'),
  );

  el.append(above, below);
  el.querySelectorAll('button').forEach((button) => {
    const run = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.type !== 'pointerdown' || button.disabled) return;
      const name = button.dataset.blockAction;
      if (name === 'insert-above') applyBlockEdgeAction(view, { type: 'insert-above', index });
      else if (name === 'insert-below') applyBlockEdgeAction(view, { type: 'insert-below', index });
      else if (name === 'move-up') applyBlockEdgeAction(view, { type: 'move-block', index, direction: -1 });
      else if (name === 'move-down') applyBlockEdgeAction(view, { type: 'move-block', index, direction: 1 });
      else if (name === 'delete') deleteTopLevelBlock(view, index);
      else if (name === 'edit-table') {
        keepSelectionInTable(view, index);
        window.dispatchEvent(new CustomEvent('open-table-edit-dialog'));
      } else if (name === 'edit-image') {
        const pos = childPos(view, index);
        window.dispatchEvent(
          new CustomEvent('open-image-edit-dialog', { detail: { pos, focus: 'alt' } }),
        );
      }
    };
    button.addEventListener('pointerdown', run);
    button.addEventListener('mousedown', run);
    button.addEventListener('click', run);
  });
  return el;
}

function activeBlockIndex(state: EditorView['state']) {
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.$from.depth === 0) {
    return selection.$from.index();
  }
  if (selection.$from.depth < 1) return null;
  return selection.$from.index(0);
}

function showControls(state: EditorView['state'], index: number | null) {
  if (index == null) return false;
  const onlyBlankParagraph =
    state.doc.childCount === 1 &&
    state.doc.firstChild?.type.name === 'paragraph' &&
    state.doc.firstChild.content.size === 0;
  return !onlyBlankParagraph;
}

function arrowInput(state: EditorView['state'], key: string, event: KeyboardEvent): ArrowInput {
  const { selection, doc } = state;
  const { $from, empty } = selection;
  let topType: string | null = null;
  let topIndex = 0;
  let topChildCount = 0;
  let indexInTop = 0;
  if (selection instanceof NodeSelection && selection.$from.depth === 0) {
    topIndex = selection.$from.index();
    topType = selection.node.type.name;
  } else if ($from.depth >= 1) {
    topType = $from.node(1).type.name;
    topIndex = $from.index(0);
    topChildCount = $from.node(1).childCount;
    if ($from.depth >= 2) indexInTop = $from.index(1);
  }
  return {
    empty,
    parentType: $from.parent.type.name,
    parentOffset: $from.parentOffset,
    parentContentSize: $from.parent.content.size,
    text: $from.parent.type.name === 'codeBlock' ? $from.parent.textContent : '',
    depth: $from.depth,
    childCount: doc.childCount,
    topType,
    topIndex,
    topChildCount,
    indexInTop,
    key,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
  };
}

function blocksFromView(view: EditorView) {
  const blocks: { index: number; top: number; bottom: number; isEdge: boolean }[] = [];
  view.state.doc.forEach((node, offset, index) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();
    blocks.push({
      index,
      top: rect.top,
      bottom: rect.bottom,
      isEdge: trappedTypes.has(node.type.name),
    });
  });
  return blocks;
}

function isEdgeBlock(node: { type: { name: string } } | null | undefined) {
  return !!node && trappedTypes.has(node.type.name);
}

/** The widget sits before the block, so nodeDOM can miss the outer box after React paints a caption. */
function blockBoxElement(view: EditorView, controls: HTMLElement): HTMLElement | null {
  const next = controls.nextElementSibling;
  if (
    next instanceof HTMLElement &&
    !next.classList.contains('editor-block-controls') &&
    !next.classList.contains('editor-block-edge-slot')
  ) {
    return next;
  }
  const pos = Number(controls.dataset.blockPos);
  const dom = Number.isFinite(pos) ? view.nodeDOM(pos) : null;
  if (!(dom instanceof HTMLElement)) return null;
  let el: HTMLElement | null = dom;
  while (el && el.parentElement !== view.dom) el = el.parentElement;
  return el;
}

function paintedEdge(dom: HTMLElement) {
  let top = dom.getBoundingClientRect().top;
  let bottom = dom.getBoundingClientRect().bottom;
  const hosts = [
    dom,
    dom.closest('.react-renderer'),
    dom.closest('[data-node-view-wrapper]'),
    dom.closest('figure'),
  ];
  for (const host of hosts) {
    if (!(host instanceof HTMLElement)) continue;
    const box = host.getBoundingClientRect();
    if (box.height > 0) {
      top = Math.min(top, box.top);
      bottom = Math.max(bottom, box.bottom);
    }
    host.querySelectorAll('figcaption').forEach((caption) => {
      if (!(caption instanceof HTMLElement)) return;
      const captionBox = caption.getBoundingClientRect();
      if (captionBox.height <= 0) return;
      bottom = Math.max(bottom, captionBox.bottom);
    });
  }
  return { top, bottom };
}

function placeBlockControls(view: EditorView) {
  const controls = view.dom.querySelector(':scope > .editor-block-controls');
  if (!(controls instanceof HTMLElement)) return;
  const dom = blockBoxElement(view, controls);
  if (!dom) return;
  const origin = controls.getBoundingClientRect().top;
  const edge = paintedEdge(dom);
  controls.style.setProperty('--block-top', `${Math.max(0, edge.top - origin)}px`);
  controls.style.setProperty('--block-bottom', `${Math.max(0, edge.bottom - origin)}px`);
  return dom;
}

export const BlockEdgeExtension = Extension.create({
  name: 'blockEdge',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: blockEdgePluginKey,
        view() {
          let observer: ResizeObserver | null = null;
          let observed: HTMLElement | null = null;
          let frame = 0;

          const sync = (view: EditorView) => {
            const dom = placeBlockControls(view);
            if (dom === observed) return;
            observer?.disconnect();
            observed = dom ?? null;
            if (!dom || typeof ResizeObserver === 'undefined') return;
            observer = new ResizeObserver(() => placeBlockControls(view));
            const host = dom.closest('.react-renderer') ?? dom;
            observer.observe(host);
            host.querySelectorAll('figcaption, [data-node-view-wrapper], figure').forEach((node) => {
              if (node instanceof HTMLElement) observer?.observe(node);
            });
          };

          return {
            update(view) {
              sync(view);
              // The caption row is painted by React after this selection update.
              cancelAnimationFrame(frame);
              frame = requestAnimationFrame(() => {
                frame = requestAnimationFrame(() => sync(view));
              });
            },
            destroy() {
              cancelAnimationFrame(frame);
              observer?.disconnect();
            },
          };
        },
        props: {
          decorations(state) {
            if (!editor.isEditable) return DecorationSet.empty;
            const { doc } = state;
            const widgets: Decoration[] = [];
            if (isEdgeBlock(doc.firstChild)) {
              widgets.push(
                Decoration.widget(0, () => slotElement('before'), {
                  side: -1,
                  ignoreSelection: true,
                  key: 'block-edge-before',
                }),
              );
            }
            if (isEdgeBlock(doc.lastChild)) {
              widgets.push(
                Decoration.widget(doc.content.size, () => slotElement('after'), {
                  side: 1,
                  ignoreSelection: true,
                  key: 'block-edge-after',
                }),
              );
            }
            const index = activeBlockIndex(state);
            if (showControls(state, index) && index != null) {
              const pos = (() => {
                let cursor = 0;
                for (let i = 0; i < index; i += 1) cursor += doc.child(i).nodeSize;
                return cursor;
              })();
              widgets.push(
                Decoration.widget(pos, (view) => controlsElement(view, index), {
                  side: -1,
                  ignoreSelection: true,
                  key: `block-controls-${index}-${doc.childCount}`,
                  stopEvent: (event) => {
                    const target = event.target;
                    return target instanceof Element && !!target.closest('.editor-block-controls');
                  },
                }),
              );
            }
            if (widgets.length === 0) return DecorationSet.empty;
            return DecorationSet.create(doc, widgets);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              if (event.button !== 0 || !view.editable) return false;
              const target = event.target;
              if (target instanceof Element && target.closest('.quote-author-field, .quote-author-input')) return true;
              // Padding under the author line is still the quote, not the next block.
              if (
                target instanceof Element &&
                target.closest('blockquote') &&
                !target.closest('.quote-body')
              ) {
                return true;
              }
              if (target instanceof Element && target.closest('.editor-block-controls')) return true;
              if (target instanceof Element) {
                const edge = target.closest('[data-block-edge]')?.getAttribute('data-block-edge');
                if (edge === 'before') {
                  event.preventDefault();
                  applyBlockEdgeAction(view, { type: 'insert-before' });
                  return true;
                }
                if (edge === 'after') {
                  event.preventDefault();
                  applyBlockEdgeAction(view, { type: 'insert-after' });
                  return true;
                }
              }
              const action = blockEdgePointerAction({
                blocks: blocksFromView(view),
                childCount: view.state.doc.childCount,
                clientY: event.clientY,
              });
              if (!action) return false;
              event.preventDefault();
              applyBlockEdgeAction(view, action);
              return true;
            },
          },
          handleKeyDown(view, event) {
            if (!view.editable) return false;
            const action = blockEdgeArrowAction(arrowInput(view.state, event.key, event));
            if (!action) return false;
            event.preventDefault();
            applyBlockEdgeAction(view, action);
            return true;
          },
        },
      }),
    ];
  },
});
