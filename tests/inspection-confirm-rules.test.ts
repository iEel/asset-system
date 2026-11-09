import assert from "node:assert/strict"
import test from "node:test"

import {
  classifyInspectionItem,
  inspectionOutcomeTab,
  inspectionTargetStatusName,
  type InspectionHandoverCounts,
} from "../src/lib/inspection-confirm-rules.ts"

const pendingFinding = { findingType: "condition_mismatch", reviewStatus: "pending" }

test("each tab has one rule, checked in order", () => {
  assert.equal(
    classifyInspectionItem({ auditStatus: "pending", auditResult: null, findings: [pendingFinding], conditionName: "Damaged" }),
    "notScanned",
  )
  assert.equal(
    classifyInspectionItem({
      auditStatus: "checked",
      auditResult: "not_found",
      findings: [{ findingType: "not_found", reviewStatus: "pending" }],
      conditionName: "Damaged",
    }),
    "awaitingReview",
  )
  assert.equal(
    classifyInspectionItem({
      auditStatus: "checked",
      auditResult: "not_found",
      findings: [{ findingType: "not_found", reviewStatus: "approved" }],
      conditionName: "Good",
    }),
    "notFound",
  )
  assert.equal(
    classifyInspectionItem({
      auditStatus: "checked",
      auditResult: "not_found",
      findings: [{ findingType: "not_found", reviewStatus: "rejected" }],
      conditionName: "Good",
    }),
    "ready",
  )
  assert.equal(
    classifyInspectionItem({
      auditStatus: "checked",
      auditResult: "not_found",
      findings: [{ findingType: "not_found", reviewStatus: "exception" }],
      conditionName: "Good",
    }),
    "ready",
  )
  assert.equal(
    classifyInspectionItem({ auditStatus: "checked", auditResult: "found", findings: [], conditionName: "Damaged" }),
    "damaged",
  )
  assert.equal(
    classifyInspectionItem({ auditStatus: "checked", auditResult: "found", findings: [], conditionName: "Non-functional" }),
    "damaged",
  )
  assert.equal(
    classifyInspectionItem({ auditStatus: "checked", auditResult: "found", findings: [], conditionName: "Salvage" }),
    "damaged",
  )
  assert.equal(
    classifyInspectionItem({
      auditStatus: "checked",
      auditResult: "out_of_scope",
      findings: [
        { findingType: "location_mismatch", reviewStatus: "approved" },
        { findingType: "condition_mismatch", reviewStatus: "rejected" },
      ],
      conditionName: "Good",
    }),
    "ready",
  )
})

const none: InspectionHandoverCounts = { permanent: 0, temporary: 0, unknown: 0 }

test("the target follows the open handovers first, then the ownership rule", () => {
  const target = (
    ownershipType: string | null,
    custodianId: string | null,
    handovers: Partial<InspectionHandoverCounts> = {},
  ) => inspectionTargetStatusName({ ownershipType, custodianId, handovers: { ...none, ...handovers } }, "confirm")

  assert.equal(target("stock", null, { permanent: 1 }), "In Use")
  assert.equal(target("personal", "emp-1", { temporary: 1 }), "Checked Out")
  assert.equal(target("personal", "emp-1", { unknown: 1 }), null)
  assert.equal(target("personal", "emp-1", { permanent: 1, temporary: 1 }), null)
  assert.equal(target("personal", "emp-1"), "In Use")
  assert.equal(target("personal", null), "Ready")
  assert.equal(target("shared", "emp-1"), "Ready")
  assert.equal(target("stock", "emp-1"), "Ready")
})

test("missing always targets Missing", () => {
  assert.equal(
    inspectionTargetStatusName({ ownershipType: "personal", custodianId: "emp-1", handovers: { ...none, unknown: 1 } }, "missing"),
    "Missing",
  )
})

test("outcomes map to their tab", () => {
  assert.deepEqual({ ...inspectionOutcomeTab }, { confirm: "ready", damaged: "damaged", missing: "notFound" })
})
