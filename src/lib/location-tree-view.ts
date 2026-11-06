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
