/** Stable row key so page changes don't reuse checkbox state by row index. */
export function dataTableRowId(row: unknown, index: number): string {
  if (row && typeof row === 'object' && 'id' in row) {
    const id = (row as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  }
  return `row-${index}`;
}
