import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// The components page's rows (group 4 plan 4 Task 2): one server loader builds the current and past links with names,
// dates, the document (only with its permission, R12), the photo count and the outstanding line.
type Args = { where?: Record<string, unknown>; select?: unknown; orderBy?: unknown; take?: number }
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
      return method === "findMany" ? [] : null
    } } })
  }
  export const prisma = new Proxy({}, { get(_target, key) { return model(String(key)) } })
`
const mocks = new Map<string, string>([
  ["next-intl/server", `export async function getTranslations() {
    const words = { componentOutstanding: "ค้างคืน", componentOutstandingWith: "อยู่กับ {holder}" }
    return (key, values) => (words[key] ?? key).replace(/\\{(\\w+)\\}/g, (_m, name) => String(values?.[name] ?? ""))
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
const { prisma } = await import("@/lib/db" as string)
const { loadComponentManagerRows } = await import(pathToFileURL("src/lib/asset-component-manager-data.ts").href)
const args = (call: string) => db.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const { formatAssetDetailDate } = await import(pathToFileURL("src/lib/asset-detail-frame-rules.ts").href)

const component = (id: string, tag: string, name: string, custodian: { code: string; fullNameTh: string } | null = null) => ({ id, assetTag: tag, name, serialNumber: `SN-${id}`, custodian })
const INSTALLED_AT = new Date("2026-10-01T03:00:00Z")
const LINKS = [
  // Read newest installed first (installedAt desc), as the page reads them today.
  { id: "link-out", componentRole: "SSD", slotNo: null, installedAt: new Date("2026-10-05T03:00:00Z"), removedAt: null, status: "outstanding", reason: null, referenceType: "checkin", referenceId: "rt-1", createdBy: "user-1", updatedBy: "user-2", componentAsset: component("c2", "GRL-SSD-26-0001", "SSD 512GB", { code: "E001", fullNameTh: "สมชาย ใจดี" }) },
  { id: "link-old", componentRole: "Adapter", slotNo: null, installedAt: new Date("2026-09-01T03:00:00Z"), removedAt: new Date("2026-09-20T03:00:00Z"), status: "removed", reason: "ชำรุด", referenceType: "maintenance", referenceId: "mr-1", createdBy: "legacy import", updatedBy: "user-2", componentAsset: component("c4", "GRL-ADP-26-0001", "Adapter 65W") },
  { id: "link-in", componentRole: "RAM", slotNo: "Slot 2", installedAt: INSTALLED_AT, removedAt: null, status: "installed", reason: "เพิ่มหน่วยความจำ", referenceType: null, referenceId: null, createdBy: "user-1", updatedBy: "user-2", componentAsset: component("c1", "GRL-RAM-26-0001", "RAM 16GB") },
  { id: "link-gone", componentRole: "เครื่องอ่านบัตร", slotNo: null, installedAt: new Date("2026-08-01T03:00:00Z"), removedAt: new Date("2026-10-30T03:00:00Z"), status: "removed", reason: null, referenceType: "asset_component", referenceId: "link-gone", createdBy: null, updatedBy: "user-1", componentAsset: component("c3", "GRL-CRD-26-0001", "Card reader") },
]

beforeEach(() => {
  db.calls = []
  db.answers = {
    "assetComponent.findMany": LINKS,
    "assetCheckin.findMany": [{ id: "rt-1", documentNo: "RT-2026-0012" }],
    "maintenanceTicket.findMany": [{ id: "mr-1", repairNo: "MR-2026-0031" }],
    "attachment.findMany": [{ referenceId: "link-in" }, { referenceId: "link-in" }, { referenceId: "link-gone" }],
    "user.findMany": [
      { id: "user-1", username: "it01", displayName: "IT One", email: null, employee: { code: "E100", fullNameTh: "อรทัย ช่างไอที" } },
      { id: "user-2", username: "it02", displayName: "IT Two", email: null, employee: null },
    ],
  }
})

const canAll = () => true

test("the loader builds installed, outstanding and removed rows: current first, past newest first, names, dates, photo counts (group 4 plan 4 Task 2)", async () => {
  const result = await loadComponentManagerRows(prisma, { parentAssetId: "parent-1", locale: "th", can: canAll })
  assert.deepEqual([result.installedCount, result.outstandingCount, result.removedCount], [1, 1, 2])
  assert.deepEqual(result.rows.map((row: { id: string }) => row.id), ["link-out", "link-in", "link-gone", "link-old"])
  const [outstanding, installed, gone, old] = result.rows
  assert.deepEqual(installed, {
    id: "link-in",
    componentAsset: { id: "c1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB", serialNumber: "SN-c1" },
    role: "RAM",
    slotNo: "Slot 2",
    state: "installed",
    installedOn: formatAssetDetailDate(INSTALLED_AT, "th"),
    installedBy: "E100 - อรทัย ช่างไอที",
    removedOn: null,
    // updatedBy is "removed by" only once the link is removed.
    removedBy: null,
    reason: "เพิ่มหน่วยความจำ",
    document: null,
    evidenceCount: 2,
    outstandingLine: null,
  })
  assert.match(installed.installedOn, /2569/, "Buddhist calendar")
  // The outstanding line keeps its code-first holder (return-components.spec.ts:117).
  assert.equal(outstanding.state, "outstanding")
  assert.equal(outstanding.outstandingLine, "ค้างคืน · อยู่กับ E001 - สมชาย ใจดี · RT-2026-0012")
  assert.deepEqual(outstanding.document, { code: "RT-2026-0012", href: "/th/asset-management/checkins/rt-1" })
  assert.equal(outstanding.removedBy, null)
  // A removed link: its own reference has no document; a stored role that is not one of the 8 shows as stored.
  assert.deepEqual([gone.state, gone.role, gone.removedOn, gone.removedBy, gone.installedBy, gone.document, gone.evidenceCount], ["removed", "เครื่องอ่านบัตร", formatAssetDetailDate(new Date("2026-10-30T03:00:00Z"), "th"), "E100 - อรทัย ช่างไอที", null, null, 1])
  // A by-value that is not a user id shows as stored; a user without an employee reads "displayName (username)".
  assert.deepEqual([old.installedBy, old.removedBy, old.document, old.evidenceCount], ["legacy import", "IT Two (it02)", { code: "MR-2026-0031", href: "/th/maintenance/mr-1" }, 0])
})

test("the loader's reads: the links as today (take 100, newest installed first), names in one bounded read, photos of both kinds", async () => {
  await loadComponentManagerRows(prisma, { parentAssetId: "parent-1", locale: "en", can: canAll })
  const [links] = args("assetComponent.findMany")
  assert.deepEqual([links.where, links.orderBy, links.take], [{ parentAssetId: "parent-1" }, { installedAt: "desc" }, 100])
  const [users] = args("user.findMany")
  assert.deepEqual(new Set((users.where?.id as { in: string[] }).in), new Set(["user-1", "user-2", "legacy import"]))
  assert.deepEqual(users.select, { id: true, username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } })
  const [photos] = args("attachment.findMany")
  assert.deepEqual(photos.where, { isActive: true, module: { in: ["asset_component_install", "asset_component_remove"] }, referenceId: { in: ["link-out", "link-old", "link-in", "link-gone"] } })
})

test("a document shows only with its page's permission: no code and no link without it (R12)", async () => {
  const result = await loadComponentManagerRows(prisma, { parentAssetId: "parent-1", locale: "th", can: (module: string) => module !== "maintenance" })
  const old = result.rows.find((row: { id: string }) => row.id === "link-old")
  assert.equal(old.document, null)
  const outstanding = result.rows.find((row: { id: string }) => row.id === "link-out")
  assert.equal(outstanding.document?.code, "RT-2026-0012")
})

test("a parent with no links reads nothing more", async () => {
  db.answers["assetComponent.findMany"] = []
  const result = await loadComponentManagerRows(prisma, { parentAssetId: "parent-1", locale: "th", can: canAll })
  assert.deepEqual(result, { rows: [], installedCount: 0, outstandingCount: 0, removedCount: 0 })
  assert.deepEqual(db.calls.map((entry) => entry.call), ["assetComponent.findMany"])
})

test("the components page passes the loader's rows and the header facts to the manager, which keeps today's props", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx", "utf8")
  assert.match(page, /loadComponentManagerRows\(prisma, \{ parentAssetId: asset\.id, locale, can: \(module, action\) => hasPermission\(user, module, action\) \}\)/)
  assert.match(page, /holder: getRegisterHolderLine\(\{/)
  assert.match(page, /room: asset\.currentLocation\.name,/)
  assert.match(page, /linkRows=\{componentRows\}/)
  assert.match(page, /header=\{header\}/)
  assert.match(page, /currentComponents=\{currentComponents\}/)
})
