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
const db: { calls: Array<{ call: string; args: Args }>; answers: Record<string, unknown>; refuse: boolean; uploads: string[] } = { calls: [], answers: {}, refuse: false, uploads: [] }
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
    export function requirePermission() { if (globalThis.__fakeDb.refuse) throw new Error("Forbidden: insufficient permissions") }`],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-evidence", `export function optionalFormFile(formData, key) { const value = formData.get(key); return value instanceof File && value.size > 0 ? value : null }
    export function optionalFormText(formData, key) { const value = formData.get(key); return typeof value === "string" && value.trim() ? value.trim() : null }
    export async function saveComponentEvidenceFile(file) { globalThis.__fakeDb.uploads.push("save:" + file.name); return { fileName: "saved.png", originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "uploads/asset-components/saved.png" } }`],
  ["@/lib/upload-server", `export function createUploadCleanup() {
      const uploads = globalThis.__fakeDb.uploads
      let committed = false
      let tracked = 0
      return { track(path) { tracked += 1; uploads.push("track:" + path) }, commit() { committed = true; uploads.push("commit") }, async discardIfUncommitted() { if (!committed && tracked > 0) uploads.push("discard") } }
    }`],
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
// P4-R1: ถอดส่วนควบ is POST …/components/<componentId>/remove; the old DELETE route is gone.
const removal = await import(pathToFileURL("src/app/api/assets/[id]/components/[componentId]/remove/route.ts").href)
const read = (file: string) => readFileSync(file, "utf8")
const LINK_UPDATED_AT = new Date("2026-10-20T04:00:00Z")
const link = (status: string, reference: Row = { referenceType: "checkin", referenceId: "checkin-1" }) => ({ id: "link-1", parentAssetId: "parent-1", componentAssetId: "comp-1", status, removedAt: null, reason: null, ...reference, updatedAt: LINK_UPDATED_AT, componentRole: "RAM", slotNo: null, parentAsset: { assetTag: "GRL-COM-26-0100", name: "Notebook" }, componentAsset: { id: "comp-1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB" } })
const removeContext = { params: Promise.resolve({ id: "parent-1", componentId: "link-1" }) }
const remove = () => removal.POST(
  new Request("http://localhost/api/assets/parent-1/components/link-1/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "ไม่ได้คืน" }) }),
  removeContext,
)
const removeWithPhoto = () => {
  const form = new FormData()
  form.set("reason", "เปลี่ยนเป็น 32GB")
  form.set("removedAt", "2026-11-01")
  form.set("removeEvidence", new File([new Uint8Array([137, 80, 78, 71])], "removed.png", { type: "image/png" }))
  return removal.POST(new Request("http://localhost/api/assets/parent-1/components/link-1/remove", { method: "POST", body: form }), removeContext)
}
beforeEach(() => { db.calls = []; db.answers = { "asset.findFirst": { id: "found" } }; db.refuse = false; db.uploads = [] })

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

test("each candidate says when it was last removed from this parent, null when never or only elsewhere: one read of its ids, removedAt only (group 4 plan 4, P4-R5)", async () => {
  const url = "http://localhost/api/assets/component-candidates?parentAssetId=parent-1&search=RAM"
  db.answers["asset.findMany"] = [
    { id: "comp-1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB", serialNumber: "S1" },
    { id: "comp-2", assetTag: "GRL-RAM-26-0002", name: "RAM 32GB", serialNumber: null },
  ]
  // The read names this parent, so a removal from another parent never comes back; comp-2 was removed only elsewhere.
  db.answers["assetComponent.findMany"] = (a: Args) => a.where?.parentAssetId === "parent-1"
    ? [{ componentAssetId: "comp-1", removedAt: new Date("2026-10-30T03:00:00Z") }, { componentAssetId: "comp-1", removedAt: new Date("2026-09-01T03:00:00Z") }]
    : [{ componentAssetId: "comp-2", removedAt: new Date("2026-10-31T03:00:00Z") }]
  const response = await candidates.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }))
  assert.deepEqual(await response.json(), { data: [
    { id: "comp-1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB", serialNumber: "S1", lastRemovalHere: { removedAt: "2026-10-30T03:00:00.000Z" } },
    { id: "comp-2", assetTag: "GRL-RAM-26-0002", name: "RAM 32GB", serialNumber: null, lastRemovalHere: null },
  ] })
  const [removals] = args("assetComponent.findMany") as Array<Args & { select?: unknown }>
  assert.deepEqual(removals.where, { parentAssetId: "parent-1", componentAssetId: { in: ["comp-1", "comp-2"] }, status: "removed", removedAt: { not: null } })
  assert.deepEqual(removals.select, { componentAssetId: true, removedAt: true })
  db.calls = []
  db.answers["asset.findMany"] = []
  await candidates.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }))
  assert.equal(args("assetComponent.findMany").length, 0, "no candidates, no second read")
})

test("POST …/remove ends an installed link as the old DELETE did: status removed, the date and reason sent, the photo saved and committed (P4-R1)", async () => {
  db.answers["assetComponent.findFirst"] = link("installed", { referenceType: null, referenceId: null })
  db.answers["assetComponent.findUnique"] = { ...link("removed"), removedAt: new Date("2026-11-01") }
  const response = await removeWithPhoto()
  assert.equal(response.status, 200, await response.clone().text())
  const [write] = args("assetComponent.updateMany")
  assert.deepEqual(write.where, { id: "link-1", parentAssetId: "parent-1", ...installedOrOutstandingLinkWhere, status: "installed", updatedAt: LINK_UPDATED_AT })
  const written = write.data as Row
  assert.deepEqual([written.status, written.reason, written.updatedBy, written.referenceType, written.referenceId], ["removed", "เปลี่ยนเป็น 32GB", "user-1", null, null])
  assert.equal((written.removedAt as Date).toISOString().slice(0, 10), "2026-11-01")
  const photo = args("attachment.create")[0].data as Row
  assert.deepEqual([photo.module, photo.referenceId, photo.filePath], ["asset_component_remove", "link-1", "uploads/asset-components/saved.png"])
  assert.deepEqual(db.uploads, ["save:removed.png", "track:uploads/asset-components/saved.png", "commit"], "the photo is kept: committed after the save, nothing discarded")
  const rows = args("assetMovement.createMany")[0].data as Row[]
  assert.deepEqual(rows.map((row) => [row.movementType, row.assetId, row.reason]), [["component_remove", "parent-1", "เปลี่ยนเป็น 32GB"], ["removed_from_parent", "comp-1", "เปลี่ยนเป็น 32GB"]])
})

test("POST …/remove refuses a viewer before any read or upload; the old components/<componentId> route has no DELETE and nothing sends one (P4-R1)", async () => {
  db.refuse = true
  const response = await removeWithPhoto()
  assert.equal(response.status, 403)
  assert.deepEqual([db.calls.length, db.uploads], [0, []], "nothing read, no photo saved")
  const source = read("src/app/api/assets/[id]/components/[componentId]/remove/route.ts")
  assert.ok(source.indexOf('requirePermission(user, "asset", "edit")') < source.indexOf("parseRemoveRequest(request)"))
  assert.doesNotMatch(source, /export async function DELETE/)
  const old = "src/app/api/assets/[id]/components/[componentId]/route.ts"
  assert.ok(!existsSync(old) || !/export async function DELETE/.test(read(old)), "the old path answers no DELETE")
  const manager = read("src/components/assets/asset-component-manager.tsx")
  assert.ok(manager.includes("fetch(`/api/assets/${assetId}/components/${component.id}/remove`, { method: \"POST\", body: formData })"))
  assert.doesNotMatch(manager, /method: "DELETE"/)
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
  for (const file of ["src/lib/work-center-page-data.ts", "src/lib/reports-operations-data.ts"]) {
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
  const loader = read("src/lib/asset-component-manager-data.ts")
  // Group 4 plan 4 Task 3: the links come from the loader alone (Task 2), which builds the line with the component's
  // holder (code first); the page reads only its own parent links' RT- numbers, for the map's parent lane.
  assert.match(loader, /referenceType: true,\s+referenceId: true,/)
  assert.match(loader, /custodian: \{ select: \{ code: true, fullNameTh: true \} \}/)
  assert.match(loader, /formatOutstandingComponentLine\(\{ holder: link\.componentAsset\.custodian, documentNo: document\?\.kind === "checkin" \? document\.code : null \}, outstandingWords\)/)
  assert.match(loader, /const current = built\.filter\(\(entry\) => entry\.row\.state !== "removed"\)/)
  assert.match(page, /prisma\.assetCheckin\.findMany\(\{ where: \{ id: \{ in: ownCheckinIds \} \}, select: \{ id: true, documentNo: true \} \}\)/)
  // One formatter for the line on every page (Task 12).
  assert.match(page, /const outstandingWords = \{ outstanding: t\("componentOutstanding"\), withHolder: \(holder: string\) => t\("componentOutstandingWith", \{ holder \}\) \}/)
  assert.match(page, /formatOutstandingComponentLine\(\{\s+holder: asset\.custodian \? \{ code: asset\.custodian\.code, fullNameTh: asset\.custodian\.fullNameTh \} : null,/)
  assert.doesNotMatch(page, /\.filter\(Boolean\)\.join\(" · "\)/)
  assert.doesNotMatch(page, /isCurrentLink|parentComponents/)
  assert.match(manager, /const showMenu = \(row: ComponentLinkRow\) => canEdit && row\.state !== "removed"/)
  assert.match(manager, /\{row\.outstandingLine \? <div className="mt-1 text-meta font-medium text-warning">\{row\.outstandingLine\}<\/div> : null\}/)
  for (const [locale, words] of [["th", ["ค้างคืน", "อยู่กับ {holder}"]], ["en", ["Outstanding", "With {holder}"]]] as const) {
    const asset = JSON.parse(read(`messages/${locale}.json`)).asset
    assert.deepEqual([asset.componentOutstanding, asset.componentOutstandingWith], words, locale)
  }
})
