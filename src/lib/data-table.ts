import { type Column } from "@tanstack/react-table"

export function getCommonPinningStyles<TData>({
  column,
}: {
  column: Column<TData>
  isRtl?: boolean
}): React.CSSProperties {
  const isPinned = column.getIsPinned()
  const columnId = column.id
  const isSelectOrActions = columnId === "select" || columnId === "actions"

  // Prefer explicit sizes for leading utility columns so sticky/reorder layouts don't collapse.
  const preferredWidth =
    columnId === "select" ? 48 : columnId === "actions" ? 140 : column.getSize()


  if (!isPinned) {
    return {
      position: "relative",
      opacity: 1,
      width: preferredWidth,
      minWidth: isSelectOrActions ? preferredWidth : undefined,
      zIndex: 0,
    }
  }

  const isLeft = isPinned === "left"
  const offset = isLeft ? column.getStart("left") : column.getAfter("right")
  const isEdge =
    (isLeft && column.getIsLastColumn("left")) ||
    (!isLeft && column.getIsFirstColumn("right"))

  return {
    boxShadow: isEdge
      ? isLeft
        ? "-5px 0 8px -6px hsl(var(--border) / 0.7) inset"
        : "5px 0 8px -6px hsl(var(--border) / 0.7) inset"
      : undefined,
    left: isLeft ? `${offset}px` : undefined,
    right: !isLeft ? `${offset}px` : undefined,
    opacity: 1,
    position: "sticky",
    background: "hsl(var(--background))",
    width: preferredWidth,
    minWidth: preferredWidth,
    zIndex: 3,
  }
}
