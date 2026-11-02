// Rules for a parent's component links (group 4 plan 4). Pure, so the page, the API and node --test share them.

/**
 * "ส่วนควบของเครื่องนี้" counts installed links only (the detail tab's rule); an outstanding link is not counted,
 * so removing it leaves the count as it is.
 */
export function componentCountAfterRemoval(link: { status: "installed" | "outstanding" }, installedCount: number): number {
  return link.status === "installed" ? Math.max(0, installedCount - 1) : installedCount
}

/** The latest removal date per component; rows that were never removed are skipped. */
export function lastRemovalByComponent(rows: Array<{ componentAssetId: string; removedAt: Date | null }>): Map<string, Date> {
  const latest = new Map<string, Date>()
  for (const row of rows) {
    if (!row.removedAt) continue
    const current = latest.get(row.componentAssetId)
    if (!current || row.removedAt.getTime() > current.getTime()) latest.set(row.componentAssetId, row.removedAt)
  }
  return latest
}

/**
 * After a removal, focus goes to the ⋯ of the current row that followed the removed one, else the one before it
 * (final review of group 4 plan 4); null when no other current row is left, so the caller falls back.
 */
export function componentFocusAfterRemoval(currentIds: readonly string[], removedId: string): string | null {
  const index = currentIds.indexOf(removedId)
  if (index === -1) return null
  return currentIds[index + 1] ?? currentIds[index - 1] ?? null
}
