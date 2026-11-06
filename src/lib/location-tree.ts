// Page group 7 plan 3 (spec §6.1, §6.2): the location tree, the name path, the descendants of a location and the parent
// check. Pure, so tests, the page and the API share it. A branch holds hundreds of locations, so callers read the rows
// once and everything here works in memory.

export type LocationNodeInput = {
  id: string
  code: string
  name: string
  locationType: string
  branchId: string
  parentId: string | null
  isActive: boolean
  // Active assets whose current location is this one (G7P3-R2 adds them up over the subtree).
  ownAssetCount: number
}

export type LocationTreeNode = LocationNodeInput & {
  depth: number
  // Names from the root down to this node, the node included ("สำนักงานใหญ่ › อาคาร A › ชั้น 3 › ห้อง IT").
  path: string[]
  // G7P3-R2: own assets plus those of every descendant in the tree.
  subtreeAssetCount: number
  children: LocationTreeNode[]
  // Existing data whose parent is in another branch: shown under the parent with a warning, never rewritten (spec §6.2).
  parentOtherBranch: boolean
}

// The columns the rules read; callers add ownAssetCount (0 where only the parent rule runs).
export const locationRuleSelect = { id: true, code: true, name: true, locationType: true, branchId: true, parentId: true, isActive: true } as const

export type LocationParentRefusal = "LOCATION_PARENT_OTHER_BRANCH" | "LOCATION_PARENT_CYCLE" | "LOCATION_BRANCH_IN_USE"

const byCode = (a: LocationNodeInput, b: LocationNodeInput) =>
  a.code.localeCompare(b.code) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)

// The parent a node hangs under in the tree: an active row other than itself, or none (a root). A cycle in stored data
// is broken at the first node of the cycle in code order, so no node is lost.
function effectiveParents(rows: readonly LocationNodeInput[]): Map<string, string | null> {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const parentOf = new Map<string, string | null>()
  for (const row of rows) {
    const parent = row.parentId ? byId.get(row.parentId) : undefined
    parentOf.set(row.id, parent && parent.isActive && parent.id !== row.id ? parent.id : null)
  }

  const settled = new Set<string>()
  for (const row of [...rows].sort(byCode)) {
    const trail: string[] = []
    const onTrail = new Set<string>()
    let current: string | null = row.id
    while (current && !settled.has(current)) {
      if (onTrail.has(current)) {
        // The loop runs from the first visit of `current` to the end of the trail; cut it at its smallest code.
        const loop = trail.slice(trail.indexOf(current)).map((id) => byId.get(id)!).sort(byCode)
        parentOf.set(loop[0].id, null)
        break
      }
      trail.push(current)
      onTrail.add(current)
      current = parentOf.get(current) ?? null
    }
    for (const id of trail) settled.add(id)
  }
  return parentOf
}

// Roots per branch (the root's own branch). A node whose parent is missing or inactive is a root.
export function buildLocationTree(rows: readonly LocationNodeInput[]): Map<string, LocationTreeNode[]> {
  const parentOf = effectiveParents(rows)
  const byId = new Map(rows.map((row) => [row.id, row]))
  const childrenOf = new Map<string, LocationNodeInput[]>()
  const roots: LocationNodeInput[] = []
  for (const row of rows) {
    const parentId = parentOf.get(row.id) ?? null
    if (parentId === null) {
      roots.push(row)
    } else {
      const list = childrenOf.get(parentId) ?? []
      list.push(row)
      childrenOf.set(parentId, list)
    }
  }

  const build = (row: LocationNodeInput, depth: number, parentPath: string[]): LocationTreeNode => {
    const path = [...parentPath, row.name]
    const children = (childrenOf.get(row.id) ?? []).sort(byCode).map((child) => build(child, depth + 1, path))
    const parentId = parentOf.get(row.id) ?? null
    const parent = parentId ? byId.get(parentId) : undefined
    return {
      ...row,
      depth,
      path,
      subtreeAssetCount: row.ownAssetCount + children.reduce((sum, child) => sum + child.subtreeAssetCount, 0),
      children,
      parentOtherBranch: Boolean(parent && parent.branchId !== row.branchId),
    }
  }

  const tree = new Map<string, LocationTreeNode[]>()
  for (const root of roots.sort(byCode)) {
    const list = tree.get(root.branchId) ?? []
    list.push(build(root, 0, []))
    tree.set(root.branchId, list)
  }
  return tree
}

// Every location below `id` by stored parentId, inactive rows included, `id` itself left out.
export function locationDescendantIds(rows: readonly Pick<LocationNodeInput, "id" | "parentId">[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.parentId) continue
    const list = childrenOf.get(row.parentId) ?? []
    list.push(row.id)
    childrenOf.set(row.parentId, list)
  }
  const found = new Set<string>()
  const queue = [...(childrenOf.get(id) ?? [])]
  while (queue.length > 0) {
    const next = queue.shift()!
    if (next === id || found.has(next)) continue
    found.add(next)
    queue.push(...(childrenOf.get(next) ?? []))
  }
  return found
}

// The server's parent rule (spec §6.2). It runs only when the save changes the parent or the branch (always on create),
// so existing data that already crosses branches is not refused on an unrelated edit.
// - LOCATION_PARENT_CYCLE (parentId): the location itself or any descendant, inactive rows included.
// - LOCATION_BRANCH_IN_USE (branchId, G7P3-R5): a branch change while active children, current or home assets remain.
// - LOCATION_PARENT_OTHER_BRANCH (parentId): a parent of another branch.
export function checkLocationParent(
  input: { id?: string; branchId: string; parentId: string | null; previous?: { branchId: string; parentId: string | null } },
  rows: readonly LocationNodeInput[],
  usage?: { activeChildren: number; currentAssets: number; homeAssets: number },
): LocationParentRefusal | null {
  const { id, branchId, parentId, previous } = input
  const branchChanged = previous !== undefined && previous.branchId !== branchId
  const parentChanged = previous === undefined || (previous.parentId ?? null) !== (parentId ?? null)
  if (!branchChanged && !parentChanged) return null

  if (parentId && id && (parentId === id || locationDescendantIds(rows, id).has(parentId))) return "LOCATION_PARENT_CYCLE"

  if (branchChanged && usage && (usage.activeChildren > 0 || usage.currentAssets > 0 || usage.homeAssets > 0)) {
    return "LOCATION_BRANCH_IN_USE"
  }

  if (parentId) {
    const parent = rows.find((row) => row.id === parentId)
    if (parent && parent.branchId !== branchId) return "LOCATION_PARENT_OTHER_BRANCH"
  }
  return null
}

// The 409 body of a refusal: the code, and the field it is about with its apiErrors key, so the form shows it there.
export function locationParentRefusalBody(code: LocationParentRefusal) {
  const field = code === "LOCATION_BRANCH_IN_USE" ? "branchId" : "parentId"
  const key = {
    LOCATION_PARENT_OTHER_BRANCH: "locationParentOtherBranch",
    LOCATION_PARENT_CYCLE: "locationParentCycle",
    LOCATION_BRANCH_IN_USE: "locationBranchInUse",
  }[code]
  return { error: code, code, fieldErrors: { [field]: key } }
}

// Task 4 (spec §7): the location and its ancestors, nearest first, read one row at a time up the stored parentId, so a
// name path needs only its own chain rather than every location. Stops at a missing parent, a cycle in old data or a
// depth no building has.
export async function readLocationAncestry<T extends { id: string; parentId: string | null }>(
  id: string,
  readOne: (id: string) => Promise<T | null>,
  maxDepth = 64,
): Promise<T[]> {
  const chain: T[] = []
  const seen = new Set<string>()
  let next: string | null = id
  while (next && !seen.has(next) && chain.length < maxDepth) {
    seen.add(next)
    const found: T | null = await readOne(next)
    if (!found) break
    chain.push(found)
    next = found.parentId
  }
  return chain
}

// One branch's tree (the page's branch filter): only that branch's rows, so a location of the branch whose stored
// parent is in another branch (existing data) is a root of this branch's group, still flagged parentOtherBranch, and its
// subtree stays with it. `allRows` names the branch of each stored parent (the rows may be filtered by status).
export function buildBranchLocationTree(
  rows: readonly LocationNodeInput[],
  branchId: string,
  allRows: readonly Pick<LocationNodeInput, "id" | "branchId">[] = rows,
): LocationTreeNode[] {
  const branchOf = new Map(allRows.map((row) => [row.id, row.branchId]))
  const roots = buildLocationTree(rows.filter((row) => row.branchId === branchId)).get(branchId) ?? []
  return roots.map((root) => {
    const parentBranch = root.parentId ? branchOf.get(root.parentId) : undefined
    return parentBranch !== undefined && parentBranch !== branchId ? { ...root, parentOtherBranch: true } : root
  })
}

// The name path of one location as the tree writes it (root first, the location last), from rows holding at least its
// chain; undefined when the location is not among them. The path runs through inactive parents, as the locations page
// writes it (every row is given to the builder as active), so an inactive building still starts its room's path.
export function locationNamePath(rows: readonly LocationNodeInput[], id: string): string[] | undefined {
  const stack = [...buildLocationTree(rows.map((row) => ({ ...row, isActive: true }))).values()].flat()
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.id === id) return node.path
    stack.push(...node.children)
  }
  return undefined
}
