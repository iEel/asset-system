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
