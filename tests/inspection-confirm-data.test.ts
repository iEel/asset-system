import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  countRoundUnconfirmedAssets,
  inspectionUnderReviewAssetWhere,
  loadRoundInspectionRows,
  roundInspectionItemWhere,
} from "../src/lib/inspection-confirm-data.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a round's rows are its items whose asset is active and Under Inspection (inspection-confirm spec §4)", () => {
  assert.deepEqual(inspectionUnderReviewAssetWhere, { isActive: true, status: { name: "Under Inspection" } })
  assert.deepEqual(roundInspectionItemWhere("r1"), { auditRoundId: "r1", asset: { isActive: true, status: { name: "Under Inspection" } } })
  assert.deepEqual(roundInspectionItemWhere("r1", ["a1"]), {
    auditRoundId: "r1",
    asset: { isActive: true, status: { name: "Under Inspection" } },
    assetId: { in: ["a1"] },
  })
})

type Call = { call: string; args: { where?: unknown; select?: unknown; orderBy?: unknown } }

function fakeDb(items: unknown[], checkouts: Array<{ assetId: string; handoverMode: string | null }>, count = 0) {
  const calls: Call[] = []
  const db = {
    auditItem: {
      findMany: async (args: Call["args"]) => (calls.push({ call: "auditItem.findMany", args }), items),
      count: async (args: Call["args"]) => (calls.push({ call: "auditItem.count", args }), count),
    },
    assetCheckout: {
      findMany: async (args: Call["args"] & { where: { assetId: { in: string[] } } }) => {
        calls.push({ call: "assetCheckout.findMany", args })
        return checkouts.filter((checkout) => args.where.assetId.in.includes(checkout.assetId))
      },
    },
  }
  return { db: db as unknown as Parameters<typeof loadRoundInspectionRows>[0], calls }
}

const item = (tag: string, over: Record<string, unknown> = {}, assetOver: Record<string, unknown> = {}) => ({
  id: `item-${tag}`,
  assetId: `asset-${tag}`,
  auditStatus: "scanned",
  auditResult: "found",
  scannedAt: null,
  findings: [],
  ...over,
  asset: {
    id: `asset-${tag}`, assetTag: tag, name: `Asset ${tag}`, ownershipType: "personal", custodianId: null, custodian: null,
    currentLocation: { name: "ห้อง 1" }, condition: { name: "Good", nameTh: "ดี" },
    ...assetOver,
  },
})

test("loadRoundInspectionRows reads the items once, their open handovers, and fills tab, handovers, pending findings and target (spec §4)", async () => {
  const items = [
    item("T3", {}, { custodianId: "emp-1", custodian: { fullNameTh: "สมชาย" } }),
    item("T1", { auditStatus: "pending", auditResult: null }),
    item("T2", { findings: [{ id: "f-1", findingType: "location_mismatch", reviewStatus: "pending" }] }),
    item("T5", { auditResult: "not_found", findings: [{ id: "f-2", findingType: "not_found", reviewStatus: "approved" }] }),
    item("T4", {}, { condition: { name: "Non-functional", nameTh: "ใช้งานไม่ได้" } }),
    item("T6", {}, { ownershipType: "central" }),
  ]
  const { db, calls } = fakeDb(items, [
    { assetId: "asset-T3", handoverMode: "temporary_loan" },
    { assetId: "asset-T6", handoverMode: "permanent_assignment" },
    { assetId: "asset-T6", handoverMode: "temporary_loan" },
  ])
  const rows = await loadRoundInspectionRows(db, "r1")
  assert.equal(calls.filter((entry) => entry.call === "auditItem.findMany").length, 1)
  assert.deepEqual(calls[0].args.where, roundInspectionItemWhere("r1"))
  const checkoutCall = calls.find((entry) => entry.call === "assetCheckout.findMany")
  assert.deepEqual((checkoutCall?.args.where as { isReturned: boolean; transactionStatus: string }).isReturned, false)
  assert.deepEqual((checkoutCall?.args.where as { transactionStatus: string }).transactionStatus, "active")
  assert.deepEqual(rows.map((row) => row.assetTag), ["T1", "T2", "T3", "T4", "T5", "T6"])
  assert.deepEqual(rows.map((row) => row.tab), ["notScanned", "awaitingReview", "ready", "damaged", "notFound", "ready"])
  const t3 = rows.find((row) => row.assetTag === "T3")
  assert.deepEqual(t3?.handovers, { permanent: 0, temporary: 1, unknown: 0 })
  assert.equal(t3?.targetStatusName, "Checked Out")
  assert.equal(t3?.custodianName, "สมชาย")
  assert.equal(t3?.locationName, "ห้อง 1")
  assert.deepEqual(rows.find((row) => row.assetTag === "T2")?.pendingFindingIds, ["f-1"])
  assert.equal(rows.find((row) => row.assetTag === "T1")?.targetStatusName, "Ready")
  assert.equal(rows.find((row) => row.assetTag === "T6")?.targetStatusName, null, "both modes open: handoverUnclear")
})

test("loadRoundInspectionRows reads no handovers for an empty round; countRoundUnconfirmedAssets counts the same where", async () => {
  const empty = fakeDb([], [])
  assert.deepEqual(await loadRoundInspectionRows(empty.db, "r1", ["a1"]), [])
  assert.equal(empty.calls.some((entry) => entry.call === "assetCheckout.findMany"), false)
  const counted = fakeDb([], [], 4)
  assert.equal(await countRoundUnconfirmedAssets(counted.db, "r1"), 4)
  assert.deepEqual(counted.calls[0], { call: "auditItem.count", args: { where: roundInspectionItemWhere("r1") } })
})

test("the close checklist counts the unconfirmed assets and cannot close while any remain (spec §3)", () => {
  const close = read("src/lib/audit-round-close.ts")
  assert.match(close, /countRoundUnconfirmedAssets\(/)
  assert.match(close, /canClose: pendingItems === 0 && pendingFindings === 0 && openActions === 0 && unconfirmedAssets === 0/)
})

test("the PATCH close and the round page still read one checklist function", () => {
  assert.match(read("src/app/api/audit-rounds/[id]/route.ts"), /getAuditRoundCloseChecklist\(/)
  assert.match(read("src/lib/audit-round-page-data.ts"), /getAuditRoundCloseChecklist\(roundId\)/)
})
