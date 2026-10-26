import { Table } from '@tiptap/extension-table';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const TABLE_BORDER_DEFAULT = '#bec9d6';

export type TableStripeRows = 'even' | 'odd' | 'off';

export function resolveTableStripeRows(attrs: {
  stripeRows?: unknown;
  striped?: unknown;
}): TableStripeRows {
  if (attrs.stripeRows === 'even' || attrs.stripeRows === 'odd' || attrs.stripeRows === 'off') {
    return attrs.stripeRows;
  }
  if (attrs.striped === false || attrs.striped === 'false') return 'off';
  return 'even';
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function sanitizeTableBorderColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : null;
}

function syncTableChrome(view: EditorView) {
  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return;
    const dom = view.nodeDOM(pos);
    const table =
      dom instanceof HTMLTableElement
        ? dom
        : dom instanceof HTMLElement
          ? dom.querySelector('table')
          : null;
    if (!table) return;

    const color = sanitizeTableBorderColor(node.attrs.borderColor);
    const current = table.style.getPropertyValue('--table-border');
    if (color) {
      if (current !== color) table.style.setProperty('--table-border', color);
      if (table.getAttribute('data-border-color') !== color) {
        table.setAttribute('data-border-color', color);
      }
    } else if (current || table.hasAttribute('data-border-color')) {
      table.style.removeProperty('--table-border');
      table.removeAttribute('data-border-color');
    }

    const stripe = resolveTableStripeRows(node.attrs);
    if (table.getAttribute('data-stripe') !== stripe) {
      table.setAttribute('data-stripe', stripe);
    }
    const striped = stripe === 'off' ? 'false' : 'true';
    if (table.getAttribute('data-striped') !== striped) {
      table.setAttribute('data-striped', striped);
    }
  });
}

export const EditorTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderColor: {
        default: null,
        parseHTML: (element) => sanitizeTableBorderColor(element.getAttribute('data-border-color')),
        renderHTML: (attributes) => {
          const color = sanitizeTableBorderColor(attributes.borderColor);
          if (!color) return {};
          return { 'data-border-color': color };
        },
      },
      striped: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-striped') !== 'false',
        renderHTML: () => ({}),
      },
      stripeRows: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-stripe');
          return raw === 'even' || raw === 'odd' || raw === 'off' ? raw : null;
        },
        renderHTML: (attributes) => {
          const stripe = resolveTableStripeRows(attributes);
          return {
            'data-stripe': stripe,
            'data-striped': stripe === 'off' ? 'false' : 'true',
          };
        },
      },
    };
  },

  renderHTML(props) {
    const rendered = this.parent?.(props) ?? ['table', {}, 0];
    const color = sanitizeTableBorderColor(props.node.attrs.borderColor);
    if (!color || !Array.isArray(rendered)) return rendered;

    const table = rendered[0] === 'div' ? rendered[2] : rendered;
    if (!Array.isArray(table) || table[0] !== 'table' || !table[1] || typeof table[1] !== 'object') {
      return rendered;
    }

    const attrs = table[1] as { style?: string };
    const style = typeof attrs.style === 'string' ? attrs.style.trim() : '';
    const declaration = `--table-border:${color}`;
    attrs.style = style
      ? `${style.replace(/;?\s*$/, ';')}${declaration}`
      : declaration;
    return rendered;
  },

  addProseMirrorPlugins() {
    const parent = this.parent?.() ?? [];
    return [
      ...parent,
      new Plugin({
        key: new PluginKey('editorTableChrome'),
        view: (editorView) => {
          const sync = () => syncTableChrome(editorView);
          queueMicrotask(sync);
          return { update: sync };
        },
      }),
    ];
  },
});
