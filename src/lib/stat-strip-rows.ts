// Rows of at most `most` StatStrip cells, as even as they split: 8 → 4 + 4, 7 → 4 + 3, 6 → 3 + 3, 5 → 3 + 2, none → no
// row. StatStrip is one row from lg, so more numbers than four go in rows (the work center, the dashboard).
export function splitStatRows<T>(items: readonly T[], most = 4): T[][] {
  const rowCount = Math.ceil(items.length / most)
  const perRow = Math.ceil(items.length / rowCount)
  return Array.from({ length: rowCount }, (_, index) => items.slice(index * perRow, (index + 1) * perRow))
}
