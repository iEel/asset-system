import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import {
  buildLocationTree,
  checkLocationParent,
  locationDescendantIds,
  type LocationNodeInput,
  type LocationTreeNode,
} from "../src/lib/location-tree.ts"

// Page group 7 plan 3 Task 1 (spec §6.1, §6.2; rulings G7P3-R2, R5; Review Focus 1–3): the pure location rules and the
// API checks that use them. Sources are read CRLF-safe.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const row = (input: Partial<LocationNodeInput> & { id: string }): LocationNodeInput => ({
  code: input.id.toUpperCase(),
  name: input.id,
  locationType: "Room",
  branchId: "b1",
  parentId: null,
  isActive: true,
  ownAssetCount: 0,
  ...input,
})

// สำนักงานใหญ่ › อาคาร A › ชั้น 3 › ห้อง IT, plus a second branch.
const rows: LocationNodeInput[] = [
  row({ id: "hq", name: "สำนักงานใหญ่", locationType: "Site", ownAssetCount: 1 }),
  row({ id: "bldg", name: "อาคาร A", locationType: "Building", parentId: "hq" }),
  row({ id: "floor", name: "ชั้น 3", locationType: "Floor", parentId: "bldg", ownAssetCount: 2 }),
  row({ id: "room", name: "ห้อง IT", parentId: "floor", ownAssetCount: 5 }),
  row({ id: "store", name: "ห้องเก็บของ", parentId: "floor", ownAssetCount: 3 }),
  row({ id: "cm", name: "สาขาเชียงใหม่", branchId: "b2", locationType: "Site" }),
]

const find = (nodes: readonly LocationTreeNode[], id: string): LocationTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node
    const inner = find(node.children, id)
    if (inner) return inner
  }
  return undefined
}

test("the tree groups roots per branch with depth, the name path and the children", () => {
  const tree = buildLocationTree(rows)
  assert.deepEqual([...tree.keys()].sort(), ["b1", "b2"])
  assert.deepEqual(tree.get("b1")!.map((node) => node.id), ["hq"])
  assert.deepEqual(tree.get("b2")!.map((node) => node.id), ["cm"])
  const room = find(tree.get("b1")!, "room")!
  assert.equal(room.depth, 3)
  assert.deepEqual(room.path, ["สำนักงานใหญ่", "อาคาร A", "ชั้น 3", "ห้อง IT"])
  assert.equal(room.parentOtherBranch, false)
  assert.deepEqual(find(tree.get("b1")!, "floor")!.children.map((node) => node.id).sort(), ["room", "store"])
})

test("G7P3-R2 / Review Focus 3: the own count stays the node's own, the subtree count adds every descendant", () => {
  const tree = buildLocationTree(rows)
  const bldg = find(tree.get("b1")!, "bldg")!
  assert.equal(bldg.ownAssetCount, 0)
  assert.equal(bldg.subtreeAssetCount, 10)
  assert.equal(find(tree.get("b1")!, "hq")!.subtreeAssetCount, 11)
  assert.equal(find(tree.get("b1")!, "room")!.subtreeAssetCount, 5)
})

test("a node whose parent is missing or inactive is a root; a parent of another branch keeps the node under it, flagged", () => {
  const tree = buildLocationTree([
    row({ id: "gone", isActive: false }),
    row({ id: "orphan", parentId: "gone" }),
    row({ id: "lost", parentId: "missing" }),
    row({ id: "cm", branchId: "b2" }),
    row({ id: "cross", branchId: "b1", parentId: "cm", ownAssetCount: 4 }),
  ])
  const roots = tree.get("b1")!.map((node) => node.id)
  assert.ok(roots.includes("orphan"))
  assert.ok(roots.includes("lost"))
  const cross = find(tree.get("b2")!, "cross")!
  assert.equal(cross.parentOtherBranch, true)
  assert.equal(cross.depth, 1)
  assert.equal(find(tree.get("b2")!, "cm")!.subtreeAssetCount, 4)
})

test("a cycle in stored data does not lose its nodes", () => {
  const tree = buildLocationTree([row({ id: "a", parentId: "b" }), row({ id: "b", parentId: "a" })])
  const all = [...tree.values()].flat()
  assert.ok(find(all, "a"))
  assert.ok(find(all, "b"))
})

test("descendants cover every level, inactive rows included, and never the node itself", () => {
  const withInactive = rows.map((item) => (item.id === "floor" ? { ...item, isActive: false } : item))
  assert.deepEqual([...locationDescendantIds(withInactive, "bldg")].sort(), ["floor", "room", "store"])
  assert.deepEqual([...locationDescendantIds(withInactive, "room")], [])
  assert.deepEqual([...locationDescendantIds([row({ id: "a", parentId: "b" }), row({ id: "b", parentId: "a" })], "a")], ["b"])
})

test("Review Focus 1: a child or grandchild as the parent is a cycle, even through an inactive middle node", () => {
  const withInactive = rows.map((item) => (item.id === "floor" ? { ...item, isActive: false } : item))
  const previous = { branchId: "b1", parentId: "hq" }
  assert.equal(checkLocationParent({ id: "bldg", branchId: "b1", parentId: "room", previous }, withInactive), "LOCATION_PARENT_CYCLE")
  assert.equal(checkLocationParent({ id: "bldg", branchId: "b1", parentId: "floor", previous }, withInactive), "LOCATION_PARENT_CYCLE")
  assert.equal(checkLocationParent({ id: "bldg", branchId: "b1", parentId: "bldg", previous }, withInactive), "LOCATION_PARENT_CYCLE")
  assert.equal(checkLocationParent({ id: "room", branchId: "b1", parentId: "hq", previous: { branchId: "b1", parentId: "floor" } }, rows), null)
})

test("Review Focus 2: a parent of another branch is refused on create and on a change; unchanged cross-branch data saves", () => {
  assert.equal(checkLocationParent({ branchId: "b1", parentId: "cm" }, rows), "LOCATION_PARENT_OTHER_BRANCH")
  assert.equal(checkLocationParent({ branchId: "b1", parentId: "floor" }, rows), null)
  assert.equal(checkLocationParent({ branchId: "b1", parentId: null }, rows), null)
  assert.equal(
    checkLocationParent({ id: "room", branchId: "b1", parentId: "cm", previous: { branchId: "b1", parentId: "floor" } }, rows),
    "LOCATION_PARENT_OTHER_BRANCH",
  )
  const crossRows = [...rows, row({ id: "cross", branchId: "b1", parentId: "cm" })]
  assert.equal(checkLocationParent({ id: "cross", branchId: "b1", parentId: "cm", previous: { branchId: "b1", parentId: "cm" } }, crossRows), null)
})

test("G7P3-R5: a branch change is refused while active children, current assets or home assets remain", () => {
  const previous = { branchId: "b1", parentId: null }
  const input = { id: "hq", branchId: "b2", parentId: null, previous }
  const none = { activeChildren: 0, currentAssets: 0, homeAssets: 0 }
  assert.equal(checkLocationParent(input, rows, { ...none, activeChildren: 1 }), "LOCATION_BRANCH_IN_USE")
  assert.equal(checkLocationParent(input, rows, { ...none, currentAssets: 1 }), "LOCATION_BRANCH_IN_USE")
  assert.equal(checkLocationParent(input, rows, { ...none, homeAssets: 1 }), "LOCATION_BRANCH_IN_USE")
  assert.equal(checkLocationParent(input, rows, none), null)
  // The same usage does not matter while the branch stays.
  assert.equal(checkLocationParent({ id: "hq", branchId: "b1", parentId: null, previous }, rows, { ...none, activeChildren: 3 }), null)
})

// --- the routes ---------------------------------------------------------------------------------------------------
// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__locationTree.prisma[model][method].
const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__locationTree?.prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
        : new Proxy({}, { get: (_, method) => call(model, method) }),
    })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => {
  ;(globalThis as { __locationTree?: unknown }).__locationTree = { prisma }
}
const jsonRequest = (method: string, body: unknown) =>
  new Request("http://localhost/api/locations", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })
type Create = { POST(request: Request): Promise<Response> }
type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const dbRows = rows.map((item) => ({ id: item.id, code: item.code, name: item.name, locationType: item.locationType, branchId: item.branchId, parentId: item.parentId, isActive: item.isActive }))
const place = { code: "L1", name: "Store", locationType: "Room", description: "", isActive: true }

const expectBody = async (response: Response, status: number, body: unknown) => {
  assert.equal(response.status, status)
  assert.deepEqual(await response.json(), body)
}

test("POST refuses a parent of another branch with 409 under parentId", async () => {
  const routes = await load<Create>("src/app/api/locations/route.ts")
  let created = false
  stubDb({ location: { findMany: () => dbRows, create: () => ((created = true), { id: "new" }) } })
  await expectBody(await routes.POST(jsonRequest("POST", { ...place, branchId: "b1", parentId: "cm" })), 409, {
    error: "LOCATION_PARENT_OTHER_BRANCH", code: "LOCATION_PARENT_OTHER_BRANCH", fieldErrors: { parentId: "locationParentOtherBranch" },
  })
  assert.equal(created, false)
  const ok = await routes.POST(jsonRequest("POST", { ...place, branchId: "b1", parentId: "floor" }))
  assert.equal(ok.status, 201)
  assert.equal(created, true)
})

test("PUT refuses a descendant through an inactive middle node, and a branch change while in use", async () => {
  const routes = await load<Update>("src/app/api/locations/[id]/route.ts")
  const withInactive = dbRows.map((item) => (item.id === "floor" ? { ...item, isActive: false } : item))
  const existing = (id: string) => ({ ...withInactive.find((item) => item.id === id)!, _count: { currentAssets: 0, homeAssets: 2, children: 0 } })
  let updated = false
  stubDb({ location: { findFirst: () => existing("bldg"), findMany: () => withInactive, update: () => ((updated = true), { id: "bldg" }) } })
  await expectBody(await routes.PUT(jsonRequest("PUT", { ...place, branchId: "b1", parentId: "room" }), params("bldg")), 409, {
    error: "LOCATION_PARENT_CYCLE", code: "LOCATION_PARENT_CYCLE", fieldErrors: { parentId: "locationParentCycle" },
  })
  assert.equal(updated, false)

  stubDb({ location: { findFirst: () => existing("room"), findMany: () => withInactive, update: () => ((updated = true), { id: "room" }) } })
  await expectBody(await routes.PUT(jsonRequest("PUT", { ...place, branchId: "b2", parentId: null }), params("room")), 409, {
    error: "LOCATION_BRANCH_IN_USE", code: "LOCATION_BRANCH_IN_USE", fieldErrors: { branchId: "locationBranchInUse" },
  })
  assert.equal(updated, false)
})

test("PUT saves a location already under another branch's parent when neither parent nor branch changes", async () => {
  const routes = await load<Update>("src/app/api/locations/[id]/route.ts")
  const cross = { id: "cross", code: "CROSS", name: "cross", locationType: "Room", branchId: "b1", parentId: "cm", isActive: true }
  let updated = false
  stubDb({ location: { findFirst: () => cross, findMany: () => [...dbRows, cross], update: () => ((updated = true), cross) } })
  const response = await routes.PUT(jsonRequest("PUT", { ...place, branchId: "b1", parentId: "cm" }), params("cross"))
  assert.equal(response.status, 200)
  assert.equal(updated, true)
})

test("the three codes have catalog keys and Thai and English messages", () => {
  const catalog = read("src/lib/api-error-catalog.ts")
  const th = JSON.parse(read("messages/th.json")).apiErrors
  const en = JSON.parse(read("messages/en.json")).apiErrors
  for (const [code, key] of [
    ["LOCATION_PARENT_OTHER_BRANCH", "locationParentOtherBranch"],
    ["LOCATION_PARENT_CYCLE", "locationParentCycle"],
    ["LOCATION_BRANCH_IN_USE", "locationBranchInUse"],
  ]) {
    assert.match(catalog, new RegExp(`"${code}": "${key}"`))
    assert.equal(typeof th[key], "string", key)
    assert.equal(typeof en[key], "string", key)
  }
})
