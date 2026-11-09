import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { InspectionRow } from "../src/lib/inspection-confirm-data.ts"
import {
  inspectionBlockedMessageKeys,
  inspectionSelectionSummary,
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
  const codes = ["notInRound", "notUnderInspection", "notScanned", "awaitingReview", "wrongTab", "handoverUnclear"]
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
    firstPendingFindingId: "f1",
  })
  assert.deepEqual(JSON.parse(JSON.stringify(page)), page)

  const bare = toInspectionPageRow({ ...row, scannedAt: null, pendingFindingIds: [], targetStatusName: null, auditResult: null })
  assert.equal(bare.scannedAt, null)
  assert.equal(bare.firstPendingFindingId, null)
  assert.equal(bare.targetStatusName, null)
  assert.equal(bare.auditResult, null)
})
