import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { InspectionRow } from "../src/lib/inspection-confirm-data.ts"
import {
  damagedDisposalHref,
  damagedRepairHref,
  inspectionBlockedMessageKeys,
  inspectionDamagedButtons,
  roundAllowsDisposal,
  inspectionSelectionSummary,
  isInspectionRowSelectable,
  isNotFoundRowHandoverBlocked,
  lostDisposalHref,
  inspectionTabCounts,
  parseInspectionTab,
  selectAllInspectionRows,
  toInspectionPageRow,
  type InspectionPageRow,
} from "../src/lib/inspection-confirm-page-model.ts"

function pageRow(overrides: Partial<InspectionPageRow> = {}): InspectionPageRow {
  return {
    assetId: "a1",
    assetTag: "AST-0001",
    assetName: "Laptop",
    auditStatus: "checked",
    auditResult: "found",
    scannedAt: null,
    conditionNameTh: null,
    locationName: null,
    custodianName: null,
    tab: "ready",
    targetStatusName: "Ready",
    handoverOpen: false,
    firstPendingFindingId: null,
    ...overrides,
  }
}

test("counts and the default tab", () => {
  const rows = [
    pageRow({ assetId: "a1", tab: "awaitingReview" }),
    pageRow({ assetId: "a2", tab: "notScanned" }),
    pageRow({ assetId: "a3", tab: "notScanned" }),
  ]
  const counts = inspectionTabCounts(rows)
  assert.deepEqual(counts, { ready: 0, awaitingReview: 1, damaged: 0, notFound: 0, notScanned: 2 })
  assert.equal(parseInspectionTab(undefined, counts), "awaitingReview")
  assert.equal(parseInspectionTab("notFound", counts), "notFound")
  assert.equal(parseInspectionTab("bogus", counts), "awaitingReview")
  assert.equal(parseInspectionTab(undefined, inspectionTabCounts([])), "ready")
})

test("select-all skips unclear handovers and caps at 500", () => {
  const three = [
    pageRow({ assetId: "a1" }),
    pageRow({ assetId: "a2", targetStatusName: null }),
    pageRow({ assetId: "a3", targetStatusName: "In Use" }),
    pageRow({ assetId: "a4", tab: "damaged", targetStatusName: "Ready" }),
  ]
  assert.deepEqual(selectAllInspectionRows(three), { ids: ["a1", "a3"], capped: false })

  const many = Array.from({ length: 501 }, (_, index) => pageRow({ assetId: `a${index}` }))
  const result = selectAllInspectionRows(many)
  assert.equal(result.ids.length, 500)
  assert.equal(result.capped, true)
  assert.equal(result.ids[0], "a0")
  assert.equal(result.ids[499], "a499")

  assert.deepEqual(selectAllInspectionRows(three.slice(0, 1).concat(three.slice(2)), 2), { ids: ["a1", "a3"], capped: false })
  assert.deepEqual(selectAllInspectionRows(many, 2), { ids: ["a0", "a1"], capped: true })
})

test("the dialog summary counts by target status", () => {
  const rows = [
    pageRow({ assetId: "a1", targetStatusName: "In Use" }),
    pageRow({ assetId: "a2", targetStatusName: "In Use" }),
    pageRow({ assetId: "a3", targetStatusName: "Ready" }),
    pageRow({ assetId: "a4", targetStatusName: "Checked Out" }),
  ]
  assert.deepEqual(inspectionSelectionSummary(rows, new Set(["a1", "a2", "a3"])), { "In Use": 2, Ready: 1 })
})

test("every refusal code has a message key, and each key exists in both message files", () => {
  const codes = ["notInRound", "notUnderInspection", "notScanned", "awaitingReview", "wrongTab", "handoverUnclear", "handoverOpen"]
  assert.deepEqual(Object.keys(inspectionBlockedMessageKeys).sort(), [...codes].sort())
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, unknown>>
    const page = messages.inspectionConfirmPage ?? {}
    for (const key of Object.values(inspectionBlockedMessageKeys)) {
      assert.equal(typeof page[key], "string", `${locale} inspectionConfirmPage.${key}`)
    }
  }
})

test("the row is serialisable", () => {
  const scannedAt = new Date("2026-11-01T03:04:05.000Z")
  const row: InspectionRow = {
    auditItemId: "i1",
    assetId: "a1",
    assetTag: "AST-0001",
    assetName: "Laptop",
    auditStatus: "checked",
    auditResult: "found",
    scannedAt,
    conditionName: "Good",
    conditionNameTh: "ดี",
    ownershipType: "personal",
    custodianId: "e1",
    custodianName: "Somchai",
    locationName: "HQ",
    tab: "awaitingReview",
    handovers: { permanent: 1, temporary: 0, unknown: 0 },
    pendingFindingIds: ["f1", "f2"],
    targetStatusName: "In Use",
  }
  const page = toInspectionPageRow(row)
  assert.deepEqual(page, {
    assetId: "a1",
    assetTag: "AST-0001",
    assetName: "Laptop",
    auditStatus: "checked",
    auditResult: "found",
    scannedAt: "2026-11-01T03:04:05.000Z",
    conditionNameTh: "ดี",
    locationName: "HQ",
    custodianName: "Somchai",
    tab: "awaitingReview",
    targetStatusName: "In Use",
    handoverOpen: true,
    firstPendingFindingId: "f1",
  })
  assert.deepEqual(JSON.parse(JSON.stringify(page)), page)

  const bare = toInspectionPageRow({ ...row, scannedAt: null, pendingFindingIds: [], targetStatusName: null, auditResult: null })
  assert.equal(bare.scannedAt, null)
  assert.equal(bare.firstPendingFindingId, null)
  assert.equal(bare.targetStatusName, null)
  assert.equal(bare.auditResult, null)
  assert.equal(toInspectionPageRow({ ...row, handovers: { permanent: 0, temporary: 0, unknown: 0 } }).handoverOpen, false)
  assert.equal(toInspectionPageRow({ ...row, handovers: { permanent: 0, temporary: 0, unknown: 1 } }).handoverOpen, true)
})

// Inspection-confirm plan 4 task 3: the not-found tab ticks its rows (their target is Missing), and the links onward.
test("a not-found row with no open handover is selectable and counts as Missing in the summary", () => {
  const rows = [
    pageRow({ assetId: "a1", tab: "notFound", targetStatusName: null }),
    pageRow({ assetId: "a2", tab: "notFound", targetStatusName: "In Use" }),
    pageRow({ assetId: "a3", tab: "damaged", targetStatusName: "Ready" }),
  ]
  assert.equal(isInspectionRowSelectable(rows[0]), true)
  assert.equal(isInspectionRowSelectable(rows[1]), true)
  assert.equal(isInspectionRowSelectable(rows[2]), false)
  assert.deepEqual(selectAllInspectionRows(rows), { ids: ["a1", "a2"], capped: false })
  assert.deepEqual(inspectionSelectionSummary(rows, new Set(["a1", "a2"])), { Missing: 2 })
})

// Plan 5 final review (decision B): หาไม่พบ refuses a row with any open handover, so its tick is disabled and select-all
// skips it; the summary leaves it out.
test("a not-found row with an open handover is not selectable, select-all skips it, the summary leaves it out", () => {
  const rows = [
    pageRow({ assetId: "a1", tab: "notFound", targetStatusName: "In Use", handoverOpen: true }),
    pageRow({ assetId: "a2", tab: "notFound", targetStatusName: "Ready" }),
    pageRow({ assetId: "a3", tab: "notFound", targetStatusName: null, handoverOpen: true }),
  ]
  assert.equal(isInspectionRowSelectable(rows[0]), false)
  assert.equal(isInspectionRowSelectable(rows[1]), true)
  assert.equal(isInspectionRowSelectable(rows[2]), false)
  assert.equal(isNotFoundRowHandoverBlocked(rows[0]), true)
  assert.equal(isNotFoundRowHandoverBlocked(rows[1]), false)
  assert.equal(isNotFoundRowHandoverBlocked(pageRow({ tab: "ready", handoverOpen: true })), false)
  assert.deepEqual(selectAllInspectionRows(rows), { ids: ["a2"], capped: false })
  assert.deepEqual(inspectionSelectionSummary(rows, new Set(["a1", "a2", "a3"])), { Missing: 1 })
  assert.equal(inspectionBlockedMessageKeys.handoverOpen, "blocked_handoverOpen")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).inspectionConfirmPage as Record<string, string>
  assert.equal(th.blocked_handoverOpen, "มีใบส่งมอบหรือใบยืมเปิดอยู่ ใช้แก้ไขสถานะจากหน้ารายละเอียดทรัพย์สินแทน")
})

test("lostDisposalHref: none is null, one is the single form with type=lost, more is the batch form", () => {
  const back = "/th/audit/rounds/r1/confirm?tab=notFound"
  const encoded = encodeURIComponent(back)
  assert.equal(lostDisposalHref("th", "r1", [], back), null)
  assert.equal(
    lostDisposalHref("th", "r1", [{ assetId: "a1" }], back),
    `/th/disposal/new?assetId=a1&sourceType=audit_round&sourceId=r1&type=lost&returnTo=${encoded}`,
  )
  assert.equal(
    lostDisposalHref("th", "r1", [{ assetId: "a1" }, { assetId: "a2" }, { assetId: "a3" }], back),
    `/th/disposal/batch/new?type=lost&fromAuditRound=r1&returnTo=${encoded}`,
  )
  assert.equal(lostDisposalHref("en", "r1", [{ assetId: "a1" }, { assetId: "a2" }], back), `/en/disposal/batch/new?type=lost&fromAuditRound=r1&returnTo=${encoded}`)
})

test("the damaged row's forms: the repair form and the disposal form from this round, no method chosen, both back here", () => {
  const back = "/th/audit/rounds/r1/confirm?tab=damaged"
  const encoded = encodeURIComponent(back)
  assert.equal(damagedRepairHref("th", "a1", back), `/th/maintenance/new?assetId=a1&returnTo=${encoded}`)
  assert.equal(damagedDisposalHref("th", "r1", "a1", back), `/th/disposal/new?assetId=a1&sourceType=audit_round&sourceId=r1&returnTo=${encoded}`)
  assert.doesNotMatch(damagedDisposalHref("th", "r1", "a1", back), /type=/)
})

// Plan 4 task 4b (user decision 2026-11-09 option A): disposal from a round waits for its close; disposal-readiness.ts
// refuses an asset with an item in an open round.
test("roundAllowsDisposal: only a closed round", () => {
  assert.equal(roundAllowsDisposal("closed"), true)
  for (const status of ["planned", "in_progress", "open", "cancelled", ""]) assert.equal(roundAllowsDisposal(status), false, status)
})

test("inspectionDamagedButtons: open round is repair + confirm only; closed round is repair + dispose; permissions hide theirs", () => {
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: false, canRepair: true, canDispose: true }), ["repair", "confirmOnly"])
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: false, canRepair: false, canDispose: true }), ["confirmOnly"])
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: true, canRepair: true, canDispose: true }), ["repair", "dispose"])
  // Closed without disposal:create: confirm only stays, so the row can still be confirmed (plan 2 ruling).
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: true, canRepair: true, canDispose: false }), ["repair", "confirmOnly"])
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: true, canRepair: false, canDispose: false }), ["confirmOnly"])
  assert.ok(!inspectionDamagedButtons({ roundClosed: false, canRepair: true, canDispose: true }).includes("dispose"))
})

// Plan 5 final review (decision C): a damaged row on loan (target ถูกยืม) confirms only; the repair form and the
// disposal request both refuse an asset on loan.
test("inspectionDamagedButtons: a row whose target is Checked Out gets confirm only, whatever the round and permissions", () => {
  for (const roundClosed of [false, true]) {
    assert.deepEqual(inspectionDamagedButtons({ roundClosed, canRepair: true, canDispose: true, targetStatusName: "Checked Out" }), ["confirmOnly"])
  }
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: true, canRepair: true, canDispose: true, targetStatusName: "In Use" }), ["repair", "dispose"])
  assert.deepEqual(inspectionDamagedButtons({ roundClosed: false, canRepair: true, canDispose: true, targetStatusName: "Ready" }), ["repair", "confirmOnly"])
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).inspectionConfirmPage as Record<string, string>
  assert.equal(th.damagedLoanNote, "มีใบยืมเปิดอยู่ ต้องรับคืนก่อนบันทึกซ่อมหรือขอตัดจำหน่าย")
})
