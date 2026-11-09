import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

import type { InspectionRow } from "../src/lib/inspection-confirm-data.ts"

// ยืนยันผลตรวจ (inspection-confirm plan 2 task 3): the confirm-results request schema, the per-asset refusals, and source
// pins on the service and the route. The service imports @/lib/db and @/lib/audit-log, mocked here so no database loads.
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

const { inspectionConfirmSchema } = await import(pathToFileURL("src/lib/validations/inspection-confirm.ts").href) as typeof import("../src/lib/validations/inspection-confirm.ts")
const { findInspectionConfirmRefusals } = await import(pathToFileURL("src/lib/inspection-confirm-service.ts").href) as typeof import("../src/lib/inspection-confirm-service.ts")

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the schema accepts 1 id with a 3-character reason and defaults outcome to confirm", () => {
  const parsed = inspectionConfirmSchema.parse({ assetIds: ["a1"], reason: "  abc  " })
  assert.deepEqual(parsed, { assetIds: ["a1"], reason: "abc", outcome: "confirm" })
  assert.equal(inspectionConfirmSchema.parse({ assetIds: ["a1"], reason: "abc", outcome: "missing" }).outcome, "missing")
  assert.equal(inspectionConfirmSchema.parse({ assetIds: ["a1"], reason: "abc", outcome: "damaged" }).outcome, "damaged")
})

test("the schema refuses 0 or 501 ids, a duplicate, a short reason, damaged with 2 ids and an unknown outcome", () => {
  const refused = (body: unknown) => assert.equal(inspectionConfirmSchema.safeParse(body).success, false, JSON.stringify(body).slice(0, 80))
  refused({ assetIds: [], reason: "abc" })
  refused({ assetIds: Array.from({ length: 501 }, (_, index) => `a${index}`), reason: "abc" })
  refused({ assetIds: ["a1", "a1"], reason: "abc" })
  refused({ assetIds: ["a1"], reason: "  ab  " })
  refused({ assetIds: ["a1"], reason: "x".repeat(501) })
  refused({ assetIds: ["a1", "a2"], reason: "abc", outcome: "damaged" })
  refused({ assetIds: ["a1"], reason: "abc", outcome: "other" })
  assert.equal(inspectionConfirmSchema.safeParse({ assetIds: Array.from({ length: 500 }, (_, index) => `a${index}`), reason: "abc" }).success, true)
})

const row = (assetId: string, over: Partial<InspectionRow>): InspectionRow => ({
  auditItemId: `item-${assetId}`,
  assetId,
  assetTag: `TAG-${assetId}`,
  assetName: `Asset ${assetId}`,
  auditStatus: "scanned",
  auditResult: "found",
  scannedAt: null,
  conditionName: "Good",
  conditionNameTh: "ดี",
  ownershipType: "personal",
  custodianId: "e1",
  custodianName: null,
  locationName: null,
  tab: "ready",
  handovers: { permanent: 0, temporary: 0, unknown: 0 },
  pendingFindingIds: [],
  targetStatusName: "In Use",
  ...over,
})

const rows: InspectionRow[] = [
  row("A", { tab: "ready", targetStatusName: "In Use" }),
  row("B", { tab: "awaitingReview" }),
  row("C", { tab: "ready", targetStatusName: null, handovers: { permanent: 0, temporary: 0, unknown: 1 } }),
  row("D", { tab: "notFound", auditResult: "not_found" }),
]

test("findInspectionConfirmRefusals names each refused asset with its code", () => {
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["A"], "confirm"), [])
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["B"], "confirm"), [{ assetId: "B", assetTag: "TAG-B", code: "awaitingReview" }])
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["C"], "confirm"), [{ assetId: "C", assetTag: "TAG-C", code: "handoverUnclear" }])
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["D"], "confirm"), [{ assetId: "D", assetTag: "TAG-D", code: "wrongTab" }])
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["D"], "missing"), [])
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["E"], "confirm"), [{ assetId: "E", assetTag: null, code: "notInRound" }])
  assert.deepEqual(
    findInspectionConfirmRefusals([row("N", { tab: "notScanned", auditStatus: "pending" })], ["N"], "confirm"),
    [{ assetId: "N", assetTag: "TAG-N", code: "notScanned" }],
  )
  assert.deepEqual(findInspectionConfirmRefusals(rows, ["A", "B", "E"], "confirm").map((entry) => entry.code), ["awaitingReview", "notInRound"])
})

test("the service writes in one serializable transaction, re-reads the rows and logs after it (source pins)", () => {
  const source = read("src/lib/inspection-confirm-service.ts")
  assert.match(source, /prisma\.\$transaction\(/)
  assert.match(source, /isolationLevel: "Serializable"/)
  assert.match(source, /loadRoundInspectionRows\(tx,/)
  // The round is read again inside the transaction, before the rows: a round cancelled meanwhile confirms nothing.
  assert.match(
    source,
    /prisma\.\$transaction\(async \(tx\) => \{[\s\S]*?tx\.auditRound\.findFirst\([\s\S]*?\.status === "cancelled"\) throw new Error\("Audit round is cancelled"\)[\s\S]*?loadRoundInspectionRows\(tx,/,
  )
  assert.match(source, /movementType: "status_correction"/)
  assert.match(source, /referenceType: "audit_round"/)
  assert.match(source, /action: "correct_status"/)
  const transactionAt = source.indexOf("prisma.$transaction(")
  const logAt = source.indexOf("logAudit(")
  assert.ok(transactionAt >= 0 && logAt > transactionAt, "logAudit runs after the transaction")
})

test("the route checks the permission, refuses a cancelled round and answers 409 with the blocked list (source pins)", () => {
  const source = read("src/app/api/audit-rounds/[id]/confirm-results/route.ts")
  assert.match(source, /requirePermission\(user, "asset", "edit"\)/)
  assert.match(source, /status === "cancelled"[\s\S]*?"Audit round is cancelled" \}, \{ status: 400 \}/)
  assert.match(source, /error instanceof InspectionConfirmChangedError/)
  assert.match(source, /isPrismaWriteConflict\(error\)/)
  assert.match(source, /code: "INSPECTION_CONFIRM_CHANGED"/)
  assert.match(source, /blocked/)
  assert.match(source, /status: 409/)
})
