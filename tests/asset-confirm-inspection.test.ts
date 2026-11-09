import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// ยืนยันผลตรวจ plan 5 task 1: the round an Under Inspection asset is confirmed in, and the single-asset confirm route for an
// asset in no round (rule checks, schema, source pins). The service imports @/lib/db and @/lib/audit-log, mocked here so
// no database loads.
const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", "export const prisma = {}"],
  ["@/lib/audit-log", "export async function logAudit() {}"],
])

;(nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void
}).registerHooks({
  resolve(specifier, context, next) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

const { pickInspectionRound, findAssetInspectionRound } = await import(pathToFileURL("src/lib/inspection-confirm-data.ts").href) as typeof import("../src/lib/inspection-confirm-data.ts")
const { assetConfirmInspectionSchema } = await import(pathToFileURL("src/lib/validations/asset-confirm-inspection.ts").href) as typeof import("../src/lib/validations/asset-confirm-inspection.ts")
const { assetConfirmInspectionErrors } = await import(pathToFileURL("src/lib/asset-confirm-inspection-service.ts").href) as typeof import("../src/lib/asset-confirm-inspection-service.ts")

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

type Candidate = Parameters<typeof pickInspectionRound>[0][number]
const candidate = (roundId: string, startDate: string, over: Partial<Candidate> = {}): Candidate => ({
  roundId,
  auditNo: `AUD-${roundId}`,
  startDate: new Date(startDate),
  roundStatus: "open",
  roundActive: true,
  tab: "ready",
  ...over,
})

test("the round choice prefers a ready, damaged or not-found tab over a newer round awaiting review (spec §7)", () => {
  const older = candidate("r-old", "2026-09-01", { tab: "ready", roundStatus: "closed" })
  const newer = candidate("r-new", "2026-10-01", { tab: "awaitingReview" })
  assert.deepEqual(pickInspectionRound([newer, older]), { roundId: "r-old", auditNo: "AUD-r-old", tab: "ready" })
  assert.deepEqual(pickInspectionRound([older, newer]), { roundId: "r-old", auditNo: "AUD-r-old", tab: "ready" })
  // damaged and notFound count as actionable too, newest first.
  assert.deepEqual(
    pickInspectionRound([candidate("a", "2026-08-01", { tab: "damaged" }), candidate("b", "2026-09-01", { tab: "notFound" })]),
    { roundId: "b", auditNo: "AUD-b", tab: "notFound" },
  )
})

test("with no actionable tab the newest round wins, whatever its tab; none gives null", () => {
  assert.deepEqual(
    pickInspectionRound([candidate("r-old", "2026-09-01", { tab: "awaitingReview" }), candidate("r-new", "2026-10-01", { tab: "awaitingReview" })]),
    { roundId: "r-new", auditNo: "AUD-r-new", tab: "awaitingReview" },
  )
  assert.deepEqual(
    pickInspectionRound([candidate("r-new", "2026-10-01", { tab: "notScanned" }), candidate("r-old", "2026-09-01", { tab: "awaitingReview" })]),
    { roundId: "r-new", auditNo: "AUD-r-new", tab: "notScanned" },
  )
  assert.equal(pickInspectionRound([]), null)
})

test("a cancelled or inactive round is ignored", () => {
  assert.deepEqual(
    pickInspectionRound([candidate("r-cancel", "2026-10-01", { roundStatus: "cancelled" }), candidate("r-old", "2026-09-01", { tab: "awaitingReview" })]),
    { roundId: "r-old", auditNo: "AUD-r-old", tab: "awaitingReview" },
  )
  assert.equal(pickInspectionRound([candidate("r-cancel", "2026-10-01", { roundStatus: "cancelled" })]), null)
  assert.equal(pickInspectionRound([candidate("r-off", "2026-10-01", { roundActive: false })]), null)
})

test("findAssetInspectionRound reads the asset's items in non-cancelled rounds and their findings by round and asset", async () => {
  const calls: Array<{ call: string; where: unknown }> = []
  const db = {
    auditItem: {
      findMany: async (args: { where: unknown }) => {
        calls.push({ call: "auditItem.findMany", where: args.where })
        return [
          { auditRoundId: "r-new", auditStatus: "scanned", auditResult: "found", auditRound: { auditNo: "AUD-2", startDate: new Date("2026-10-01"), status: "open", isActive: true }, asset: { condition: { name: "Good" } } },
          { auditRoundId: "r-old", auditStatus: "scanned", auditResult: "found", auditRound: { auditNo: "AUD-1", startDate: new Date("2026-09-01"), status: "closed", isActive: true }, asset: { condition: { name: "Good" } } },
        ]
      },
    },
    auditFinding: {
      findMany: async (args: { where: unknown }) => {
        calls.push({ call: "auditFinding.findMany", where: args.where })
        return [{ auditRoundId: "r-new", findingType: "location_mismatch", reviewStatus: "pending" }]
      },
    },
  }
  const found = await findAssetInspectionRound(db as never, "a1")
  assert.deepEqual(found, { roundId: "r-old", auditNo: "AUD-1", tab: "ready" })
  assert.deepEqual(calls[0], { call: "auditItem.findMany", where: { assetId: "a1", auditRound: { isActive: true, status: { not: "cancelled" } } } })
  assert.deepEqual(calls[1], { call: "auditFinding.findMany", where: { assetId: "a1", auditRoundId: { in: ["r-new", "r-old"] } } })
})

type Context = Parameters<typeof assetConfirmInspectionErrors>[1]
const context = (over: Partial<Context> = {}): Context => ({
  statusName: "Under Inspection",
  inRound: false,
  handovers: { permanent: 0, temporary: 0, unknown: 0 },
  ownershipType: "personal",
  currentCustodianId: "e1",
  currentLocationId: "l1",
  employeeActive: true,
  locationActive: true,
  ...over,
})
const input = (over: Partial<Parameters<typeof assetConfirmInspectionErrors>[0]> = {}) => ({
  statusName: "In Use" as const,
  custodianId: "e1" as string | null,
  locationId: "l1",
  reason: "checked on site",
  ...over,
})

test("rule checks: In Use without a holder, in a round, not under inspection", () => {
  assert.deepEqual(assetConfirmInspectionErrors(input({ custodianId: null }), context()), { custodianId: "assetInspectionHolderRequired" })
  assert.deepEqual(assetConfirmInspectionErrors(input(), context({ inRound: true })), { statusName: "assetInspectionInRound" })
  assert.deepEqual(assetConfirmInspectionErrors(input(), context({ statusName: "Ready" })), { statusName: "assetInspectionNotUnderInspection" })
})

test("rule checks: an open handover sets the status and locks the holder and location", () => {
  const loan = { permanent: 0, temporary: 1, unknown: 0 }
  assert.deepEqual(assetConfirmInspectionErrors(input({ statusName: "Ready" }), context({ handovers: loan })), { statusName: "assetInspectionHandoverStatus" })
  assert.deepEqual(assetConfirmInspectionErrors(input({ custodianId: "e2" }), context({ handovers: loan })), { custodianId: "assetInspectionHandoverLocked" })
  assert.deepEqual(assetConfirmInspectionErrors(input({ locationId: "l2" }), context({ handovers: loan })), { locationId: "assetInspectionHandoverLocked" })
  assert.deepEqual(
    assetConfirmInspectionErrors(input(), context({ handovers: { permanent: 0, temporary: 0, unknown: 1 } })),
    { statusName: "assetInspectionHandoverUnclear" },
  )
  // A loan to a room has no holder: the effective status is Checked Out, so no holder is needed.
  assert.deepEqual(assetConfirmInspectionErrors(input({ custodianId: null }), context({ handovers: loan, currentCustodianId: null })), {})
  assert.deepEqual(assetConfirmInspectionErrors(input(), context({ handovers: { permanent: 1, temporary: 0, unknown: 0 } })), {})
})

test("rule checks: an inactive employee or location, and valid input", () => {
  assert.deepEqual(assetConfirmInspectionErrors(input({ custodianId: "e2" }), context({ employeeActive: false })), { custodianId: "checkoutReceiverInactive" })
  assert.deepEqual(assetConfirmInspectionErrors(input({ locationId: "l2" }), context({ locationActive: false })), { locationId: "checkinLocationInactive" })
  assert.deepEqual(assetConfirmInspectionErrors(input(), context()), {})
  assert.deepEqual(assetConfirmInspectionErrors(input({ statusName: "Ready", custodianId: null }), context()), {})
})

test("the schema refuses a short reason, Checked Out from the body and a missing location", () => {
  const ok = { statusName: "Ready", custodianId: null, locationId: "l1", reason: "  abc  " }
  assert.deepEqual(assetConfirmInspectionSchema.parse(ok), { statusName: "Ready", custodianId: null, locationId: "l1", reason: "abc" })
  assert.equal(assetConfirmInspectionSchema.safeParse({ ...ok, statusName: "In Use", custodianId: "e1" }).success, true)
  const refused = (body: unknown) => assert.equal(assetConfirmInspectionSchema.safeParse(body).success, false, JSON.stringify(body))
  refused({ ...ok, reason: "ab" })
  refused({ ...ok, reason: "x".repeat(501) })
  refused({ ...ok, statusName: "Checked Out" })
  refused({ ...ok, locationId: undefined })
  refused({ ...ok, locationId: "  " })
})

test("source pins: the route and the service (permission, Serializable, conditional update, department, movements, log)", () => {
  const route = read("src/app/api/assets/[id]/confirm-inspection/route.ts")
  assert.match(route, /requirePermission\(user, "asset", "edit"\)/)
  assert.match(route, /error instanceof AssetConfirmInspectionChangedError/)
  assert.match(route, /isPrismaWriteConflict\(error\)/)
  assert.match(route, /status: 409/)

  const service = read("src/lib/asset-confirm-inspection-service.ts")
  assert.match(service, /isolationLevel: "Serializable"/)
  assert.match(service, /tx\.asset\.updateMany\(\{\s*where: \{ id: assetId, isActive: true, status: \{ name: INSPECTION_STATUS_NAME \} \}/)
  assert.match(service, /getRegisterDepartment\(/)
  assert.match(service, /findAssetInspectionRound\(tx,/)
  assert.match(service, /loadOpenHandoverCounts\(tx,/)
  for (const type of ["status_correction", "location_change", "custodian_change", "department_change"]) {
    assert.match(service, new RegExp(`movementType: "${type}"`), type)
  }
  assert.match(service, /referenceType: "asset"/)
  assert.match(service, /remark: "Inspection confirmed"/)
  assert.match(service, /action: "correct_status"/)
  const transactionEnd = service.indexOf("}, assetConfirmInspectionTransactionOptions)")
  const logAt = service.indexOf("logAudit(")
  assert.ok(transactionEnd > 0 && logAt > transactionEnd, "logAudit runs after the transaction")
})

test("fix 1: installed components follow the parent through the asset edit's shared helper, inside the transaction", () => {
  const service = read("src/lib/asset-confirm-inspection-service.ts")
  assert.match(service, /import \{ syncInstalledComponentsWithParent \} from "\.\/asset-component-sync\.ts"/)
  const call = service.match(/syncInstalledComponentsWithParent\(tx, \{[\s\S]*?\}\)/)?.[0] ?? ""
  assert.match(call, /parentAssetId: assetId/)
  assert.match(call, /currentLocationId: input\.locationId/)
  assert.match(call, /custodianId: input\.custodianId/)
  assert.match(call, /departmentId,/)
  assert.match(call, /movementType: "parent_register_update_sync"/)
  assert.match(call, /referenceType: "register_edit"/)
  const transactionStart = service.indexOf("prisma.$transaction(")
  const callAt = service.indexOf("syncInstalledComponentsWithParent(tx,")
  const transactionEnd = service.indexOf("}, assetConfirmInspectionTransactionOptions)")
  assert.ok(transactionStart < callAt && callAt < transactionEnd, "the sync runs inside the Serializable transaction")

  const put = read("src/app/api/assets/[id]/route.ts")
  assert.match(put, /import \{ syncInstalledComponentsWithParent \} from "@\/lib\/asset-component-sync"/)
  assert.match(put, /syncInstalledComponentsWithParent\(tx, \{[\s\S]*?movementType: "parent_register_update_sync",\s*referenceType: "register_edit",/)
})
