// Page group 7 plan 3 Task 2 (spec §6.2): the location form's parent picker. Pure, so tests and the form share it; the
// pages read every location once (inactive ones too, for the descendants) and the form builds the list in memory.
import { buildLocationTree, locationDescendantIds, type LocationNodeInput, type LocationTreeNode } from "./location-tree.ts"

// The columns the form needs: what the rules read, without the asset count.
export type LocationRuleRow = Omit<LocationNodeInput, "ownAssetCount">

export type LocationParentOption = {
  id: string
  code: string
  name: string
  locationType: string
  // Names from the root of the tree down to this location, itself included (the branch name is the form's to add).
  path: string[]
  // The parent it hangs under in the tree (null: a root of the branch), so the form can list a parent's children.
  parentId: string | null
  activeChildCount: number
  // The stored parent of the location being edited, outside the branch's list (existing data crossing branches, or an
  // inactive parent): kept so an unrelated edit does not drop it.
  kept?: true
}

function toOption(node: LocationTreeNode, parentId: string | null): LocationParentOption {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    locationType: node.locationType,
    path: node.path,
    parentId,
    activeChildCount: node.children.filter((child) => child.isActive).length,
  }
}

// The active locations of `branchId` in tree order (depth first, by code), each with its name path. On edit the location
// and every descendant (by stored parent, inactive rows included) are left out, so no choice makes a cycle. keepParentId
// adds the stored parent when the list does not hold it, unless it would make a cycle.
export function buildLocationParentOptions(
  rows: readonly LocationRuleRow[],
  { branchId, editingId, keepParentId }: { branchId: string; editingId: string | null; keepParentId?: string | null },
): LocationParentOption[] {
  const excluded = editingId ? locationDescendantIds(rows, editingId) : new Set<string>()
  if (editingId) excluded.add(editingId)
  const tree = buildLocationTree(rows.map((row) => ({ ...row, ownAssetCount: 0 })))

  const options: LocationParentOption[] = []
  const all = new Map<string, LocationParentOption>()
  const walk = (node: LocationTreeNode, parentId: string | null) => {
    const option = toOption(node, parentId)
    all.set(node.id, option)
    if (branchId && node.isActive && node.branchId === branchId && !excluded.has(node.id)) options.push(option)
    for (const child of node.children) walk(child, node.id)
  }
  // The branch's own roots first; a location of this branch under another branch's parent sits in that branch's tree.
  const roots = [...(tree.get(branchId) ?? []), ...[...tree.entries()].filter(([key]) => key !== branchId).flatMap(([, list]) => list)]
  for (const root of roots) walk(root, null)

  if (keepParentId && !excluded.has(keepParentId) && !options.some((option) => option.id === keepParentId)) {
    const kept = all.get(keepParentId)
    if (kept) options.push({ ...kept, kept: true })
  }
  return options
}

// The parent after the branch changes: kept when it is an active location of the new branch, cleared otherwise.
export function parentAfterBranchChange(rows: readonly LocationRuleRow[], parentId: string, branchId: string): string {
  if (!parentId) return ""
  const parent = rows.find((row) => row.id === parentId)
  return parent && parent.isActive && parent.branchId === branchId ? parentId : ""
}

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim() : "")

// "เพิ่มที่ตั้งในนี้" (Review Focus 5): ?branchId=&parentId= preset the create form. A branch that is not an active one is
// ignored with its parent; a parent that is not an active location of that branch is ignored alone.
export function resolveLocationFormPreset(
  search: { branchId?: string | string[]; parentId?: string | string[] },
  { branchIds, rows }: { branchIds: readonly string[]; rows: readonly LocationRuleRow[] },
): { branchId: string; parentId: string } {
  const branchId = single(search.branchId)
  if (!branchId || !branchIds.includes(branchId)) return { branchId: "", parentId: "" }
  return { branchId, parentId: parentAfterBranchChange(rows, single(search.parentId), branchId) }
}
