import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_FINDING_COMPARISON_FIELDS,
  auditFindingApprovalEffect,
  auditFindingApprovalEffectKey,
  auditFindingApproveAllSiblings,
  auditFindingComparisonRows,
  auditFindingPanelGate,
} from "../src/lib/audit-finding-review-panel-rules.ts"

// The review panel's rules (group 2 spec §10, plan 4 Task 4), by value. Sources are read with LF.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const finding = (findingType: string, expectedValue: string | null, actualValue: string | null, assetId: string | null = "A1") => ({ findingType, assetId, expectedValue, actualValue })

test("approving a field finding changes that register field from the expected value to the found one; a custodian or a department may be cleared (group 2 spec §10; the review route)", () => {
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", "L2")), { kind: "change", field: "location", from: "L1", to: "L2" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_custodian", "E1", "E2")), { kind: "change", field: "custodian", from: "E1", to: "E2" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_department", "D1", null)), { kind: "change", field: "department", from: "D1", to: null })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_custodian", null, null)), { kind: "change", field: "custodian", from: null, to: null })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_condition", "C1", "C2")), { kind: "change", field: "condition", from: "C1", to: "C2" })
})

test("ไม่พบ and นอกขอบเขต never change the register; a location or condition with nothing found, no asset or an unknown type goes to ต้องตรวจสอบพิเศษ", () => {
  assert.deepEqual(auditFindingApprovalEffect(finding("not_found", "{\"assetTag\":\"A\"}", null)), { kind: "noChange", reason: "not_found" })
  assert.deepEqual(auditFindingApprovalEffect(finding("out_of_scope", null, "{}")), { kind: "noChange", reason: "out_of_scope" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_condition", "C1", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", "L2", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("need_review", "x", "y")), { kind: "manualReview" })
})

test("the consequence sentence's word: a field change, ไม่พบ alone, นอกขอบเขต with the transfer, or ต้องตรวจสอบพิเศษ (P4-R24)", () => {
  const key = (findingType: string, expectedValue: string | null, actualValue: string | null) => auditFindingApprovalEffectKey(auditFindingApprovalEffect(finding(findingType, expectedValue, actualValue)))
  assert.equal(key("wrong_location", "L1", "L2"), "effectChange")
  assert.equal(key("not_found", "{}", null), "effectNoChangeNotFound")
  assert.equal(key("out_of_scope", null, "{}"), "effectNoChangeOutOfScope")
  assert.equal(key("wrong_condition", "C1", null), "effectManualReview")
  const th = JSON.parse(read("messages/th.json")).auditFinding as Record<string, string>
  assert.equal(th.effectNoChangeNotFound, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน", "moving an asset nobody found reads oddly")
  assert.equal(th.effectNoChangeOutOfScope, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย")
})

test("the effect follows the review route's own branches, so the sentence cannot drift from what approve does", () => {
  const route = read("src/app/api/audit-findings/[id]/review/route.ts")
  assert.match(route, /wrong_location: "currentLocationId",\n  wrong_custodian: "custodianId",\n  wrong_department: "departmentId",\n  wrong_condition: "conditionId",/)
  assert.match(route, /if \(finding\.findingType === "out_of_scope"\) \{/)
  assert.match(route, /if \(finding\.findingType === "not_found"\) \{/)
  assert.match(route, /const canApplyNullableValue = fieldName === "custodianId" \|\| fieldName === "departmentId"/)
  assert.match(route, /if \(!fieldName \|\| !finding\.assetId \|\| \(finding\.actualValue === null && !canApplyNullableValue\)\) \{/)
})

const item = {
  expectedLocationId: "L1",
  expectedCustodianId: "E1",
  expectedDepartmentId: "D1",
  expectedConditionId: null,
  actualLocationId: "L2",
  actualCustodianId: "E1",
  actualDepartmentId: "D1",
  actualConditionId: "",
}

test("the four-field comparison: ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ, expected beside found, the different ones marked and the finding's own field named; ไม่พบ has nothing to compare (group 2 spec §10)", () => {
  assert.deepEqual(AUDIT_FINDING_COMPARISON_FIELDS, ["custodian", "department", "location", "condition"])
  assert.deepEqual(auditFindingComparisonRows("wrong_location", item), [
    { field: "custodian", expectedId: "E1", foundId: "E1", mismatch: false, thisFinding: false },
    { field: "department", expectedId: "D1", foundId: "D1", mismatch: false, thisFinding: false },
    { field: "location", expectedId: "L1", foundId: "L2", mismatch: true, thisFinding: true },
    // A blank id is no value, as the conflict check reads it (audit-finding-conflict.ts:38-41).
    { field: "condition", expectedId: null, foundId: null, mismatch: false, thisFinding: false },
  ])
  assert.deepEqual(auditFindingComparisonRows("out_of_scope", item).map((row) => row.thisFinding), [false, false, false, false])
  assert.deepEqual(auditFindingComparisonRows("not_found", item), [])
})

test("the panel's controls: none without audit:approve, none on a closed or cancelled round, no decision on a decided or own finding (roles M4, P4-R10, Appendix A §10)", () => {
  // Task 2's panel data: reportedByViewer and readOnly (the round is closed or cancelled; an old draft is open, spec §14).
  const base = { canApprove: true, reviewStatus: "pending", reportedByViewer: false, readOnly: false }
  assert.deepEqual(auditFindingPanelGate(base), { decide: "open", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reportedByViewer: true }), { decide: "ownFinding", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reviewStatus: "approved" }), { decide: "decided", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reviewStatus: "exception", reportedByViewer: true }), { decide: "decided", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, readOnly: true }), { decide: "roundReadOnly", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, readOnly: true, reviewStatus: "approved" }), { decide: "roundReadOnly", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, canApprove: false }), { decide: "noPermission", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, canApprove: false, readOnly: true }), { decide: "noPermission", followUp: false })
})

test("อนุมัติทุกช่องของทรัพย์สินนี้ takes the asset's other pending findings that the viewer did not report (group 2 spec §10, §15; Task 2's siblings)", () => {
  const siblings = [
    { id: "F2", reviewStatus: "pending", reportedByViewer: false },
    { id: "F3", reviewStatus: "pending", reportedByViewer: true },
    { id: "F4", reviewStatus: "approved", reportedByViewer: false },
  ]
  assert.deepEqual(auditFindingApproveAllSiblings(siblings).map((sibling) => sibling.id), ["F2"])
  assert.deepEqual(auditFindingApproveAllSiblings([]), [])
})
