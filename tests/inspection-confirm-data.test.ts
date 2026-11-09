import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  countRoundUnconfirmedAssets,
  countUnconfirmedAssetsByRound,
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

type FakeItem = { id: string; assetId: string; findings?: Array<{ id: string; findingType: string; reviewStatus: string }> }

// The findings are served by their own auditFinding.findMany (round + asset ids), from each fixture item's `findings`;
// the item rows the fake returns carry none, as the loader no longer selects them.
function fakeDb(items: FakeItem[], checkouts: Array<{ assetId: string; handoverMode: string | null }>, count = 0) {
  const calls: Call[] = []
  const findings = items.flatMap((entry) => (entry.findings ?? []).map((finding) => ({ ...finding, auditItemId: entry.id, assetId: entry.assetId, auditRoundId: "r1" })))
  const db = {
    auditItem: {
      findMany: async (args: Call["args"]) => (calls.push({ call: "auditItem.findMany", args }), items.map(({ findings: _findings, ...rest }) => rest)),
      count: async (args: Call["args"]) => (calls.push({ call: "auditItem.count", args }), count),
    },
    auditFinding: {
      findMany: async (args: Call["args"] & { where: { auditRoundId: string; assetId: { in: string[] } } }) => {
        calls.push({ call: "auditFinding.findMany", args })
        return findings
          .filter((finding) => finding.auditRoundId === args.where.auditRoundId && args.where.assetId.in.includes(finding.assetId))
          .map(({ auditRoundId: _round, assetId: _asset, ...rest }) => rest)
      },
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
  // Findings by round and asset ids, never a nested read by auditItemId (no index; final review I-1b).
  const findingCall = calls.find((entry) => entry.call === "auditFinding.findMany")
  assert.deepEqual(findingCall?.args.where, { auditRoundId: "r1", assetId: { in: items.map((entry) => entry.assetId) } })
  assert.deepEqual(findingCall?.args.select, { id: true, auditItemId: true, findingType: true, reviewStatus: true })
  assert.equal(JSON.stringify(calls[0].args.select).includes("findings"), false)
  assert.equal(t3?.custodianName, "สมชาย")
  assert.equal(t3?.locationName, "ห้อง 1")
  assert.deepEqual(rows.find((row) => row.assetTag === "T2")?.pendingFindingIds, ["f-1"])
  assert.equal(rows.find((row) => row.assetTag === "T1")?.targetStatusName, "Ready")
  assert.equal(rows.find((row) => row.assetTag === "T6")?.targetStatusName, null, "both modes open: handoverUnclear")
})

test("loadRoundInspectionRows reads findings by round and asset, chunked, not through the item's findings relation (plan 2 final review, mirrors audit-item-review-state.ts I-1b)", async () => {
  const source = read("src/lib/inspection-confirm-data.ts")
  const fn = source.slice(source.indexOf("export async function loadRoundInspectionRows("), source.indexOf("export async function countUnconfirmedAssetsByRound("))
  assert.doesNotMatch(fn, /\bfindings: \{ select/)
  assert.doesNotMatch(fn, /\bfindings:/)
  assert.match(fn, /db\.auditFinding\.findMany\(\{\n\s+where: \{ auditRoundId, assetId: \{ in: chunk \} \},\n\s+select: \{ id: true, auditItemId: true, findingType: true, reviewStatus: true \},/)
  assert.match(fn, /IX_audit_findings_assetId/)
  // 2,001 assets: two finding reads, 2,000 then 1, as the handover reads.
  const many = Array.from({ length: 2001 }, (_, index) => item(`M${String(index).padStart(4, "0")}`, index === 2000 ? { findings: [{ id: "f-last", findingType: "location_mismatch", reviewStatus: "pending" }] } : {}))
  const { db, calls } = fakeDb(many, [])
  const rows = await loadRoundInspectionRows(db, "r1")
  const reads = calls.filter((entry) => entry.call === "auditFinding.findMany").map((entry) => (entry.args.where as { assetId: { in: string[] } }).assetId.in.length)
  assert.deepEqual(reads, [2000, 1])
  assert.deepEqual(rows.find((row) => row.assetTag === "M2000")?.pendingFindingIds, ["f-last"])
  assert.equal(rows.find((row) => row.assetTag === "M2000")?.tab, "awaitingReview")
})

test("loadRoundInspectionRows reads no handovers for an empty round; countRoundUnconfirmedAssets counts the same where", async () => {
  const empty = fakeDb([], [])
  assert.deepEqual(await loadRoundInspectionRows(empty.db, "r1", ["a1"]), [])
  assert.equal(empty.calls.some((entry) => entry.call === "assetCheckout.findMany"), false)
  const counted = fakeDb([], [], 4)
  assert.equal(await countRoundUnconfirmedAssets(counted.db, "r1"), 4)
  assert.deepEqual(counted.calls[0], { call: "auditItem.count", args: { where: roundInspectionItemWhere("r1") } })
})

test("countUnconfirmedAssetsByRound groups the same where by round, in chunks of 2,000; a round with none is absent", async () => {
  const calls: Array<{ by: unknown; where: { auditRoundId: { in: string[] }; asset: unknown }; _count: unknown }> = []
  const db = {
    auditItem: {
      groupBy: async (args: (typeof calls)[number]) => {
        calls.push(args)
        return args.where.auditRoundId.in.includes("r2") ? [{ auditRoundId: "r2", _count: { _all: 3 } }] : []
      },
    },
  } as unknown as Parameters<typeof countUnconfirmedAssetsByRound>[0]
  const roundIds = Array.from({ length: 2001 }, (_, index) => `r${index}`)
  const counts = await countUnconfirmedAssetsByRound(db, roundIds)
  assert.deepEqual([...counts], [["r2", 3]])
  assert.deepEqual(calls.map((args) => args.where.auditRoundId.in.length), [2000, 1])
  assert.deepEqual(calls[0].by, ["auditRoundId"])
  assert.deepEqual(calls[0].where.asset, { isActive: true, status: { name: "Under Inspection" } })
  assert.deepEqual(calls[0]._count, { _all: true })
  assert.deepEqual(await countUnconfirmedAssetsByRound(db, []), new Map())
})

test("the approvals inbox's ready-to-close rounds wait for ยืนยันผลตรวจ too (spec §3)", () => {
  const inbox = read("src/lib/approval-inbox-query.ts")
  const body = inbox.slice(inbox.indexOf("async function getReadyAuditRoundIds("))
  const fn = body.slice(0, body.indexOf("\n}\n") + 3)
  assert.match(fn, /countUnconfirmedAssetsByRound\(prisma, roundIds\)/)
  assert.match(fn, /for \(const roundId of unconfirmedByRound\.keys\(\)\) blockedRoundIds\.add\(roundId\)/)
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

// Plan 4 task 4b: the after-close section's damaged list. Assets with an item in the round, Ready or In Use, with no
// active pending/approved disposal request and no open repair record (repair-record-policy's openRepairRecordWhere);
// the condition block (getCheckoutConditionBlock) is applied to what the read returns.
test("roundDamagedForDisposalItemWhere: round items of active Ready/In Use assets with no open disposal and no open repair", async () => {
  const { roundDamagedForDisposalItemWhere } = await import("../src/lib/inspection-confirm-data.ts")
  const { openRepairRecordWhere } = await import("../src/lib/repair-record-policy.ts")
  assert.deepEqual(roundDamagedForDisposalItemWhere("r1"), {
    auditRoundId: "r1",
    asset: {
      isActive: true,
      status: { name: { in: ["Ready", "In Use"] } },
      disposalRequests: { none: { isActive: true, requestStatus: { in: ["pending", "approved"] } } },
      maintenanceTickets: { none: openRepairRecordWhere },
    },
  })
})

test("toDamagedForDisposal keeps the condition-blocked assets (เสียหาย, ใช้งานไม่ได้, ซาก), by tag", async () => {
  const { toDamagedForDisposal } = await import("../src/lib/inspection-confirm-data.ts")
  const entry = (tag: string, condition: string | null) => ({ assetId: `a-${tag}`, asset: { assetTag: tag, name: `Asset ${tag}`, condition: condition ? { name: condition } : null } })
  assert.deepEqual(
    toDamagedForDisposal([entry("T3", "Damaged"), entry("T1", "Salvage"), entry("T2", "Good"), entry("T4", null), entry("T0", "Non-functional"), entry("T5", "Not assessed")]),
    [
      { assetId: "a-T0", assetTag: "T0", assetName: "Asset T0" },
      { assetId: "a-T1", assetTag: "T1", assetName: "Asset T1" },
      { assetId: "a-T3", assetTag: "T3", assetName: "Asset T3" },
    ],
  )
})

test("loadRoundDisposalSummary reads the damaged list through that where and returns damagedForDisposal", () => {
  const data = read("src/lib/inspection-confirm-data.ts")
  const body = data.slice(data.indexOf("export async function loadRoundDisposalSummary("))
  assert.match(body, /where: roundDamagedForDisposalItemWhere\(auditRoundId\)/)
  assert.match(body, /toDamagedForDisposal\(/)
  assert.match(body, /return \{ missingForDisposal, damagedForDisposal, requests, approved \}/)
  assert.match(data, /import \{ openRepairRecordWhere \} from "\.\/repair-record-policy\.ts"/)
  assert.match(data, /import \{ getCheckoutConditionBlock \} from "\.\/asset-lifecycle-policy\.ts"/)
})
