// Page group 7 plan 3 Task 3 (spec §6.1): what the locations tree opens with and what blocks "ปิดใช้งาน". Pure, so the
// page, the client components and node tests share it.
import type { LocationTreeNode } from "./location-tree.ts"

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

// G7P3-R1: with no search the tree opens one level (each branch's roots shown, every location closed). A search (any
// case, on the name, the code or the type's label) opens the ancestors of every match and returns the matches to mark.
export function locationTreeOpenState(
  roots: readonly LocationTreeNode[],
  search: string,
  typeLabel: (type: string) => string,
): { expanded: string[]; matches: string[] } {
  const needle = search.trim().toLocaleLowerCase()
  if (!needle) return { expanded: [], matches: [] }

  const expanded = new Set<string>()
  const matches: string[] = []
  const visit = (node: LocationTreeNode, ancestors: readonly string[]) => {
    const haystack = [node.name, node.code, typeLabel(node.locationType)].map((value) => value.toLocaleLowerCase())
    if (haystack.some((value) => value.includes(needle))) {
      matches.push(node.id)
      for (const id of ancestors) expanded.add(id)
    }
    for (const child of node.children) visit(child, [...ancestors, node.id])
  }
  for (const root of roots) visit(root, [])
  return { expanded: [...expanded], matches }
}
