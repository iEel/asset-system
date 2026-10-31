import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildCheckinDocumentLines, checkinDocumentReadIds, type CheckinDocumentLateReturnRow } from "../src/lib/checkin-document-lines.ts"
import type { AssetComponentTransactionSnapshotV1, AssetTransactionSnapshotV1, CheckinRepairLink } from "../src/lib/asset-transaction-snapshot.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const entry = (componentAssetId: string, relationshipStatus: string, custodianId: string | null, currentLocationId: string): AssetComponentTransactionSnapshotV1 => ({
  componentLinkId: `link-${componentAssetId}`,
  componentAssetId,
  parentAssetId: "parent-1",
  relationshipStatus,
  relationshipUpdatedAt: "2026-10-31T03:00:00.000Z",
  assetUpdatedAt: "2026-10-31T03:00:00.000Z",
  statusId: "status-ready",
  conditionId: "condition-good",
  branchId: "branch-1",
  currentLocationId,
  custodianId,
  departmentId: "dept-1",
})
const after = (components: AssetComponentTransactionSnapshotV1[], repair?: CheckinRepairLink): AssetTransactionSnapshotV1 => ({
  version: 1,
  assetId: "parent-1",
  assetUpdatedAt: "2026-10-31T03:00:00.000Z",
  statusId: "status-ready",
  conditionId: "condition-good",
  branchId: "branch-1",
  currentLocationId: "loc-store",
  custodianId: null,
  departmentId: "dept-it",
  checkout: { id: "co-1", isReturned: true },
  components,
  ...(repair ? { repair } : {}),
})
const late = (assetId: string, value: unknown): CheckinDocumentLateReturnRow => ({ assetId, toValue: typeof value === "string" ? value : JSON.stringify(value) })
const components = new Map([
  ["c-1", { assetTag: "MS-0001", name: "Mouse" }],
  ["c-2", { assetTag: "KB-0002", name: "Keyboard" }],
  ["c-3", { assetTag: "AD-0003", name: "Adapter" }],
])
const labels = new Map([
  ["emp-5", "E005 - สมชาย ใจดี"],
  ["loc-desk", "L-201 - ห้องบัญชี"],
])
const lines = (afterSnapshot: AssetTransactionSnapshotV1 | null, lateReturns: CheckinDocumentLateReturnRow[] = [], overrides: { locale?: string; canViewRepair?: boolean } = {}) =>
  buildCheckinDocumentLines({ afterSnapshot, lateReturns, components, labels, locale: overrides.locale ?? "th", canViewRepair: overrides.canViewRepair ?? true })
// c-1 came back (installed), c-2 stays with E005, c-3 has no holder (the handover was to a room)
const missingTwo = after([entry("c-1", "installed", null, "loc-store"), entry("c-2", "outstanding", "emp-5", "loc-desk"), entry("c-3", "outstanding", null, "loc-desk")])
const missingC2 = { kind: "missing", componentAssetId: "c-2", component: "KB-0002 - Keyboard", holder: "E005 - สมชาย ใจดี", location: "L-201 - ห้องบัญชี" }
const missingC3 = { kind: "missing", componentAssetId: "c-3", component: "AD-0003 - Adapter", holder: null, location: "L-201 - ห้องบัญชี" }

test("the RT- lists the components the return left out, from its after snapshot, with their holder and room; returned ones are not listed (group 3 spec §8.5, P2-R5)", () => {
  assert.deepEqual(lines(missingTwo), { components: [missingC2, missingC3], repair: null })
})

test("each late return follows its component, as '<tag> คืนแล้ว <Bangkok day> · รับโดย <name>' (spec §8.6, P2-R2)", () => {
  const lateReturns = [
    late("c-3", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-11-01T17:00:00.000Z", outcome: "standalone" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "reattached" }),
  ]
  assert.deepEqual(lines(missingTwo, lateReturns).components, [
    missingC2,
    { kind: "returned", componentAssetId: "c-2", tag: "KB-0002", day: "31 ต.ค. 2569", receivedBy: "สมหญิง รักงาน" },
    missingC3,
    { kind: "returned", componentAssetId: "c-3", tag: "AD-0003", day: "2 พ.ย. 2569", receivedBy: "สมหญิง รักงาน" },
  ])
  const englishDays = lines(missingTwo, lateReturns, { locale: "en" }).components.flatMap((line) => (line.kind === "returned" ? [line.day] : []))
  assert.deepEqual(englishDays, ["31 Oct 2026", "2 Nov 2026"])
})

test("a late return of a component the list does not hold still prints after the list; a value that does not read is left out (P2-R5)", () => {
  const result = lines(after([entry("c-2", "outstanding", "emp-5", "loc-desk")]), [
    late("c-9", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "standalone" }),
    late("c-2", "not json"),
    late("c-2", "[]"),
    late("c-2", { receivedByName: "", returnDate: "2026-10-31" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "31/10/2026" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-02-30" }),
    { assetId: "c-2", toValue: null },
  ])
  assert.deepEqual(result.components, [
    missingC2,
    { kind: "returned", componentAssetId: "c-9", tag: "c-9", day: "31 ต.ค. 2569", receivedBy: "สมหญิง รักงาน" },
  ])
})

test("the repair line: เปิดใบซ่อม for a record the return opened, ต่อใบซ่อม for one it joined, a link only with maintenance:view (spec §8.7, P2-R5)", () => {
  assert.deepEqual(lines(after([], { id: "mt-1", repairNo: "MT-20261031-0001", joined: false })).repair, { key: "documentRepairOpened", repairNo: "MT-20261031-0001", href: "/th/maintenance/mt-1" })
  assert.deepEqual(lines(after([], { id: "mt-2", repairNo: "MT-20261001-0003", joined: true }), [], { locale: "en", canViewRepair: false }).repair, { key: "documentRepairJoined", repairNo: "MT-20261001-0003", href: null })
  assert.equal(lines(after([])).repair, null)
})

test("an RT- with nothing left out and no repair, or an old RT- with no after snapshot, has no lines", () => {
  assert.deepEqual(lines(null), { components: [], repair: null })
  assert.deepEqual(lines(after([entry("c-1", "installed", null, "loc-store")])), { components: [], repair: null })
})

test("the page reads each listed component once and labels each holder and room once", () => {
  const value = { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "reattached" }
  assert.deepEqual(checkinDocumentReadIds(missingTwo, [late("c-2", value), late("c-9", value)]), { componentIds: ["c-2", "c-3", "c-9"], labelIds: ["emp-5", "loc-desk"] })
  assert.deepEqual(checkinDocumentReadIds(null, []), { componentIds: [], labelIds: [] })
})

test("the line builder stays pure: relative .ts imports, no database", () => {
  const source = read("src/lib/checkin-document-lines.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split("\n").filter((line) => line.startsWith("import "))) assert.match(line, /^import (?:type )?\{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})

test("OperationDocumentPrint prints a lines slot below the fields and above the signatures, and the HO- and TR- pages pass none (P2-R5)", () => {
  const print = read("src/components/asset-operations/operation-document-print.tsx")
  assert.match(print, /\n  lines\?: React\.ReactNode\n\}/)
  const fields = print.indexOf("{sections.map((section) => (")
  const slot = print.indexOf('{lines ? <div data-document-lines className="mt-5 grid grid-cols-1 gap-5">{lines}</div> : null}')
  const signatures = print.indexOf("{signatures.map((signature) => (")
  assert.ok(fields > 0 && slot > fields && signatures > slot, `${fields} < ${slot} < ${signatures}`)
  for (const page of ["checkouts", "transfers"]) {
    assert.doesNotMatch(read(`src/app/[locale]/(print)/asset-management/${page}/[id]/page.tsx`), /\blines=/, page)
  }
})

test("the RT- page builds its lines from the after snapshot and this RT-'s late returns, for an active and a VOID RT- alike (P2-R5)", () => {
  const page = read("src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx")
  assert.match(page, /prisma\.assetMovement\.findMany\(\{\n\s+where: \{ referenceType: "checkin", referenceId: checkin\.id, movementType: "component_late_return" \},\n\s+orderBy: \{ performedAt: "asc" \},\n\s+select: \{ assetId: true, toValue: true \},\n\s+\}\)/)
  assert.match(page, /const documentLines = buildCheckinDocumentLines\(\{/)
  assert.match(page, /canViewRepair: hasPermission\(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION\.repair\.module, "view"\),/)
  const linesProp = page.slice(page.indexOf("      lines={"), page.indexOf("      signatures={"))
  assert.match(linesProp, /^      lines=\{documentLines\.components\.length > 0 \|\| documentLines\.repair \? renderCheckinDocumentLines\(documentLines, t\) : null\}\n$/)
  assert.doesNotMatch(linesProp, /transactionStatus/, "a VOID RT- shows its lines under the void banner")
  // The whole repair line is the link, so its name is "เปิดใบซ่อม MT-…" (E2E RT2).
  assert.match(page, /<Link href=\{lines\.repair\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\n\s+\{t\(lines\.repair\.key, \{ repairNo: lines\.repair\.repairNo \}\)\}\n\s+<\/Link>/)
})
