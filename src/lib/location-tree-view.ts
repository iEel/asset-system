// Page group 7 plan 3 Task 3 (spec §6.1): what blocks "ปิดใช้งาน" on a location. Pure, so the page, the client
// components and node tests share it.

export type LocationDeactivateCounts = {
  currentAssets: number
  homeAssets: number
  activeChildren: number
  auditRounds: number
}

export type LocationDeactivateBlocker = { key: keyof LocationDeactivateCounts; count: number }

// DELETE /api/locations/[id] refuses while any of these remains (getLocationDeleteBlockReason); the confirm names them in
// the same order with their counts, and offers no deactivate button while the list is not empty (Review Focus 4).
export function locationDeactivateBlockers(counts: LocationDeactivateCounts): LocationDeactivateBlocker[] {
  const order: (keyof LocationDeactivateCounts)[] = ["currentAssets", "homeAssets", "activeChildren", "auditRounds"]
  return order.filter((key) => counts[key] > 0).map((key) => ({ key, count: counts[key] }))
}

// Performance (final review 5): a branch can hold thousands of roots, so one level of the tree shows at most this many
// nodes at a time; "แสดงอีก {n} รายการ" shows the next ones. Children render only while their parent is expanded.
export const LOCATION_TREE_LEVEL_PAGE = 100

// The nodes of one level to show, given how many the person has asked for (undefined: the first page), and how many
// the "แสดงอีก" button adds (0: none left, no button).
export function locationTreeLevelSlice<T>(items: readonly T[], shown: number | undefined): { visible: readonly T[]; nextCount: number } {
  const limit = Math.max(LOCATION_TREE_LEVEL_PAGE, shown ?? 0)
  const visible = items.slice(0, limit)
  return { visible, nextCount: Math.min(LOCATION_TREE_LEVEL_PAGE, items.length - visible.length) }
}
