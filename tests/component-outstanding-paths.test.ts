import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { installedOrOutstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import { assetMissingResponsibilityWhere } from "../src/lib/asset-ownership.ts"
import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"

type Row = Record<string, unknown>
type Args = { where?: Record<string, unknown>; data?: unknown }
const db: { calls: Array<{ call: string; args: Args }>; answers: Record<string, unknown> } = { calls: [], answers: {} }
Object.assign(globalThis, { __fakeDb: db })

const FAKE_DB = `
  const db = () => globalThis.__fakeDb
  function model(name) {
    return new Proxy({}, { get(_target, method) { return async (args) => {
      const call = name + "." + String(method)
      db().calls.push({ call, args })
      const answer = db().answers[call]
      if (typeof answer === "function") return answer(args)
      if (answer !== undefined) return answer
      if (method === "findMany") return []
      if (method === "count") return 0
      if (method === "updateMany" || method === "createMany") return { count: 1 }
      if (method === "findFirst" || method === "findUnique") return null
      return { id: name + "-new", ...(args?.data ?? {}) }
    } } })
  }
  const client = new Proxy({}, { get(_target, key) { return key === "$transaction" ? async (callback) => callback(client) : model(String(key)) } })
  export const prisma = client
`
const mocks = new Map<string, string>([
  ["next/server", `export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }`],
  ["@/lib/auth-utils", `export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasRole() {}
    export function hasPermission() { return true }
    export function requirePermission() {}`],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-evidence", `export function optionalFormFile() { return null }
    export function optionalFormText() { return null }
    export async function saveComponentEvidenceFile() { return null }`],
  ["@/lib/db", FAKE_DB],
])
const registerHooks = (nodeModule as unknown as { registerHooks(options: { resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks
registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mocks.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const args = (call: string) => db.calls.filter((entry) => entry.call === call).map((entry) => entry.args)

const { assertCanInstallComponent } = await import(pathToFileURL("src/lib/asset-components.ts").href)
const candidates = await import(pathToFileURL("src/app/api/assets/component-candidates/route.ts").href)
const removal = await import(pathToFileURL("src/app/api/assets/[id]/components/[componentId]/route.ts").href)
const read = (file: string) => readFileSync(file, "utf8")
const LINK_UPDATED_AT = new Date("2026-10-20T04:00:00Z")
const link = (status: string, reference: Row = { referenceType: "checkin", referenceId: "checkin-1" }) => ({ id: "link-1", parentAssetId: "parent-1", componentAssetId: "comp-1", status, removedAt: null, reason: null, ...reference, updatedAt: LINK_UPDATED_AT, componentRole: "RAM", slotNo: null, parentAsset: { assetTag: "GRL-COM-26-0100", name: "Notebook" }, componentAsset: { id: "comp-1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB" } })
const remove = () => removal.DELETE(
  new Request("http://localhost/api/assets/parent-1/components/link-1", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "ไม่ได้คืน" }) }),
  { params: Promise.resolve({ id: "parent-1", componentId: "link-1" }) },
)
beforeEach(() => { db.calls = []; db.answers = { "asset.findFirst": { id: "found" } } })

test("installing an outstanding component anywhere is refused with its own words; an installed one keeps today's refusal (spec §8.5)", async () => {
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.componentAssetId ? { id: "link-9", status: "outstanding", removedAt: null, parentAsset: { assetTag: "GRL-COM-26-0100" } } : null)
  await assert.rejects(assertCanInstallComponent("parent-2", "comp-1", null), { message: "ASSET_COMPONENT_OUTSTANDING" })
  assert.deepEqual(args("assetComponent.findFirst")[0].where, { componentAssetId: "comp-1", ...installedOrOutstandingLinkWhere })
  assert.deepEqual(args("assetComponent.findMany")[0].where, { parentAssetId: "comp-1", ...installedOrOutstandingLinkWhere }, "the cycle walk counts an outstanding child, so a re-attach cannot close a cycle")
  assert.notEqual(getApiErrorKey("ASSET_COMPONENT_OUTSTANDING"), null, "T4 catalogued it")
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.componentAssetId ? { id: "link-8", status: "installed", removedAt: null, parentAsset: { assetTag: "GRL-COM-26-0100" } } : null)
  await assert.rejects(assertCanInstallComponent("parent-2", "comp-1", null), { message: "Component is already installed in GRL-COM-26-0100" })
})

test("the slot an outstanding component left stays taken (spec §8.5)", async () => {
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.slotNo ? { id: "link-9" } : null)
  await assert.rejects(assertCanInstallComponent("parent-1", "comp-2", " A1 "), { message: "This parent asset already has a component in the same slot" })
  assert.deepEqual(args("assetComponent.findFirst").find((a) => a.where?.slotNo)?.where, { parentAssetId: "parent-1", slotNo: "A1", ...installedOrOutstandingLinkWhere })
})

test("the candidate list leaves an outstanding component out (spec §8.5)", async () => {
  const url = "http://localhost/api/assets/component-candidates?parentAssetId=parent-1&search=RAM"
  assert.equal((await candidates.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }))).status, 200)
  assert.deepEqual(args("asset.findMany")[0].where?.installedInLinks, { none: installedOrOutstandingLinkWhere })
})

test("ถอดออก ends an outstanding link with a guarded write on the status and updatedAt it read, under its own reference, not the RT- (spec §8.5, P2-R17, GP G15, final review server-2, journeys-2)", async () => {
  db.answers["assetComponent.findFirst"] = link("outstanding")
  db.answers["assetComponent.findUnique"] = { ...link("removed"), removedAt: new Date() }
  assert.equal((await remove()).status, 200)
  assert.deepEqual(args("assetComponent.findFirst")[0].where, { id: "link-1", parentAssetId: "parent-1", ...installedOrOutstandingLinkWhere })
  const [write] = args("assetComponent.updateMany")
  assert.deepEqual(write.where, { id: "link-1", parentAssetId: "parent-1", ...installedOrOutstandingLinkWhere, status: "outstanding", updatedAt: LINK_UPDATED_AT })
  const written = write.data as Row
  assert.ok(written.removedAt instanceof Date)
  assert.deepEqual([written.status, written.reason, written.referenceType, written.referenceId, written.updatedBy], ["removed", "ไม่ได้คืน", "asset_component", "link-1", "user-1"], "the components tab reads a manual removal, as the movements do")
  assert.equal(args("assetComponent.update").length, 0, "no unguarded write")
  const rows = args("assetMovement.createMany")[0].data as Row[]
  assert.deepEqual(rows.map((row) => [row.movementType, row.referenceType, row.referenceId]), [["component_remove", "asset_component", "link-1"], ["removed_from_parent", "asset_component", "link-1"]])
})

test("ถอดออก of a link a late return re-attached also writes its own reference; a link with any other reference keeps it (final review journeys-2)", async () => {
  db.answers["assetComponent.findFirst"] = link("installed")
  db.answers["assetComponent.findUnique"] = { ...link("removed"), removedAt: new Date() }
  assert.equal((await remove()).status, 200)
  const reattached = args("assetComponent.updateMany")[0]
  assert.deepEqual([reattached.where?.status, (reattached.data as Row).referenceType, (reattached.data as Row).referenceId], ["installed", "asset_component", "link-1"])
  db.calls = []
  db.answers["assetComponent.findFirst"] = link("installed", { referenceType: "maintenance", referenceId: "ticket-1" })
  assert.equal((await remove()).status, 200)
  const repaired = args("assetComponent.updateMany")[0].data as Row
  assert.deepEqual([repaired.referenceType, repaired.referenceId], ["maintenance", "ticket-1"])
})

test("a late return that re-attached the link between the read and the write is refused 409: the guard pins the status it read (final review server-2)", async () => {
  db.answers["assetComponent.findFirst"] = link("outstanding")
  db.answers["assetComponent.findUnique"] = { ...link("removed"), removedAt: new Date() }
  // The link is installed again now: a write guarded on "outstanding" matches nothing, one on installed-or-outstanding would.
  const nowInstalled = (status: unknown) => (typeof status === "string" ? status === "installed" : (status as { in: string[] }).in.includes("installed"))
  db.answers["assetComponent.updateMany"] = (a: Args) => ({ count: nowInstalled(a.where?.status) ? 1 : 0 })
  const response = await remove()
  assert.deepEqual([response.status, await response.json()], [409, { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }])
  assert.deepEqual([args("assetMovement.createMany").length, args("attachment.create").length], [0, 0])
})

test("a link that changed between the read and the write (a late return, another ถอดออก) is refused 409 with nothing recorded; an ended one reads 404 (GP G15)", async () => {
  db.answers["assetComponent.findFirst"] = link("outstanding")
  db.answers["assetComponent.updateMany"] = { count: 0 }
  const response = await remove()
  assert.deepEqual([response.status, await response.json()], [409, { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }])
  assert.deepEqual([args("assetMovement.createMany").length, args("attachment.create").length], [0, 0])
  db.answers["assetComponent.findFirst"] = null
  const gone = await remove()
  assert.deepEqual([gone.status, await gone.json()], [404, { error: "Installed component not found" }])
})

test("the responsibility rule and the pages that feed it count an outstanding component as held (spec §8.5, P2-R17)", () => {
  const branch = (assetMissingResponsibilityWhere.OR as Array<Record<string, unknown>>).find((entry) => entry.ownershipType === "component")
  assert.deepEqual(branch, { ownershipType: "component", OR: [{ departmentId: null }, { installedInLinks: { none: installedOrOutstandingLinkWhere } }] })
  for (const file of ["src/app/[locale]/(dashboard)/work-center/page.tsx", "src/app/[locale]/(dashboard)/reports/page.tsx"]) {
    assert.match(read(file), /installedInLinks: \{ where: installedOrOutstandingLinkWhere, select: \{ id: true \}, take: 1 \}/, file)
    assert.doesNotMatch(read(file), /installedInLinks: \{ where: \{ status: "installed"/, file)
  }
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /installedInLinks: \{\s+where: installedOrOutstandingLinkWhere,/)
  assert.match(page, /const installedInLinksForPanel = asset\.installedInLinks\.filter\(\(link\) => !isOutstandingLink\(link\)\)\.map\(/, "the panels still show installed parents only")
})

test("the parent's component manager keeps an outstanding link among the current ones, with its line, so ถอดออก reaches it (spec §8.5)", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx")
  const manager = read("src/components/assets/asset-component-manager.tsx")
  assert.match(page, /referenceType: true,\s+referenceId: true,/)
  assert.match(page, /custodian: \{ select: \{ code: true, fullNameTh: true \} \}/)
  assert.match(page, /const isCurrentLink = \(component: \{ status: string; removedAt: Date \| null \}\) => !component\.removedAt && \(component\.status === "installed" \|\| isOutstandingLink\(component\)\)/)
  assert.match(page, /prisma\.assetCheckin\.findMany\(\{ where: \{ id: \{ in: outstandingCheckinIds \} \}, select: \{ id: true, documentNo: true \} \}\)/)
  // One formatter for the line on every page (Task 12).
  assert.match(page, /const outstandingWords = \{ outstanding: t\("componentOutstanding"\), withHolder: \(holder: string\) => t\("componentOutstandingWith", \{ holder \}\) \}/)
  assert.match(page, /formatOutstandingComponentLine\(\{ holder: component\.componentAsset\.custodian, documentNo/)
  assert.doesNotMatch(page, /\.filter\(Boolean\)\.join\(" · "\)/)
  assert.doesNotMatch(page, /component\.status !== "installed" \|\| component\.removedAt/)
  assert.match(manager, /outstandingLine\?: string \| null/)
  assert.match(manager, /\{component\.outstandingLine \? <div className="mt-1 text-meta font-medium text-warning">\{component\.outstandingLine\}<\/div> : null\}/)
  for (const [locale, words] of [["th", ["ค้างคืน", "อยู่กับ {holder}"]], ["en", ["Outstanding", "With {holder}"]]] as const) {
    const asset = JSON.parse(read(`messages/${locale}.json`)).asset
    assert.deepEqual([asset.componentOutstanding, asset.componentOutstandingWith], words, locale)
  }
})
