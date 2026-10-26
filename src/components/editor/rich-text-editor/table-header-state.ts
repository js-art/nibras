import type { Editor } from '@tiptap/core';
import { columnIsHeader, rowIsHeader, selectedRect, tableNodeTypes } from '@tiptap/pm/tables';

export type TableHeaderSnapshot = {
  inTable: boolean;
  headerRow: boolean;
  headerColumn: boolean;
  headerLastColumn: boolean;
  headerCell: boolean;
};

const idle: TableHeaderSnapshot = {
  inTable: false,
  headerRow: false,
  headerColumn: false,
  headerLastColumn: false,
  headerCell: false,
};

/** First row, first column, and last column header flags. TipTap only toggles column 0. */
export function readTableHeaderSnapshot(editor: Editor): TableHeaderSnapshot {
  try {
    const rect = selectedRect(editor.state);
    const { map, table } = rect;
    if (map.width < 1 || map.height < 1) return idle;

    const cellPos = map.map[rect.top * map.width + rect.left];
    const cell = table.nodeAt(cellPos);
    const lastCol = map.width - 1;

    return {
      inTable: true,
      headerRow: rowIsHeader(map, table, 0),
      headerColumn: columnIsHeader(map, table, 0),
      headerLastColumn: columnIsHeader(map, table, lastCol),
      headerCell: cell?.type.spec.tableRole === 'header_cell',
    };
  } catch {
    return idle;
  }
}

/** TipTap's toggleHeaderColumn only changes column 0. This toggles the last column the same way. */
export function toggleLastHeaderColumn(editor: Editor): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      let rect;
      try {
        rect = selectedRect(state);
      } catch {
        return false;
      }
      const { map, table, tableStart } = rect;
      const col = map.width - 1;
      if (col < 0) return false;
      const types = tableNodeTypes(state.schema);
      const nextType = columnIsHeader(map, table, col) ? types.cell : types.header_cell;
      const seen = new Set<number>();
      let changed = false;
      for (let row = 0; row < map.height; row++) {
        const rel = map.map[col + row * map.width];
        if (rel == null || seen.has(rel)) continue;
        seen.add(rel);
        const cell = table.nodeAt(rel);
        if (!cell || cell.type === nextType) continue;
        tr.setNodeMarkup(tableStart + rel, nextType, cell.attrs);
        changed = true;
      }
      return changed;
    })
    .run();
}
