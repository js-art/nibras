import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const blockHighlightPluginKey = new PluginKey('editorBlockHighlight');

const outerBlockTypes = new Set([
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'taskList',
  'table',
]);

function findActiveBlock($from: { depth: number; before: (d: number) => number; node: (d: number) => { isBlock: boolean; type: { name: string }; nodeSize: number; attrs: Record<string, unknown> } }) {
  let fallback: { depth: number; blockType: string; nodeSize: number } | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!node.isBlock) continue;
    const name = node.type.name;
    if (name === 'doc' || name === 'listItem' || name === 'taskItem') continue;

    if (outerBlockTypes.has(name)) {
      return {
        from: $from.before(depth),
        to: $from.before(depth) + node.nodeSize,
        blockType: name,
      };
    }

    if (!fallback) {
      fallback = {
        depth,
        nodeSize: node.nodeSize,
        blockType:
          name === 'heading' && typeof node.attrs.level === 'number'
            ? `heading-${node.attrs.level}`
            : name,
      };
    }
  }

  if (!fallback) return null;

  return {
    from: $from.before(fallback.depth),
    to: $from.before(fallback.depth) + fallback.nodeSize,
    blockType: fallback.blockType,
  };
}

export const BlockHighlightExtension = Extension.create({
  name: 'blockHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockHighlightPluginKey,
        props: {
          decorations(state) {
            const { selection } = state;
            if (selection instanceof NodeSelection) {
              const from = selection.from;
              const node = selection.node;
              const blockType =
                node.type.name === 'heading' && typeof node.attrs.level === 'number'
                  ? `heading-${node.attrs.level}`
                  : node.type.name;
              return DecorationSet.create(state.doc, [
                Decoration.node(from, from + node.nodeSize, {
                  class: 'editor-block--active',
                  'data-block-type': blockType,
                }),
              ]);
            }

            const block = findActiveBlock(state.selection.$from);
            if (!block) return DecorationSet.empty;

            return DecorationSet.create(state.doc, [
              Decoration.node(block.from, block.to, {
                class: 'editor-block--active',
                'data-block-type': block.blockType,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
