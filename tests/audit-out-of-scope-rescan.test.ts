import assert from "node:assert/strict"
import test from "node:test"

import { auditOutOfScopeRescanEvidenceFields, planAuditOutOfScopeRescanFindings } from "../src/lib/audit-out-of-scope-rescan.ts"

test("a re-scan needs evidence only for a field that differs from the snapshot and changes in this save; a remark-only edit needs none (P3-R18)", () => {
  const recorded = { wrong_location: "loc-2", wrong_custodian: null, wrong_department: "dept-1", wrong_condition: "condition-poor" }
  // The location still differs from the snapshot but repeats what was recorded; the condition moves on to a new value.
  assert.deepEqual(
    auditOutOfScopeRescanEvidenceFields(["wrong_location", "wrong_condition"], { wrong_location: "loc-2", wrong_condition: "condition-broken" }, recorded),
    ["wrong_condition"],
  )
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["wrong_location", "wrong_condition"], { wrong_location: "loc-2", wrong_condition: "condition-poor" }, recorded), [], "the same values again, a remark only")
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields([], {}, recorded), [])
  // "" and null are both "none": the form's empty value equals the server's null.
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["custodian"], { custodian: "" }, { custodian: null }), [])
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["custodian"], { custodian: "emp-9" }, { custodian: "" }), ["custodian"])
})

const pending = (id: string, findingType: string, actualValue: string | null) => ({ id, findingType, actualValue, reviewStatus: "pending" })

test("a re-scan reports a new differing field, moves a pending finding to the new value, leaves an unchanged one, and closes one that now matches (P3-R3)", () => {
  const plan = planAuditOutOfScopeRescanFindings(
    [pending("f-loc", "wrong_location", "loc-2"), pending("f-dept", "wrong_department", "dept-2"), pending("f-cond", "wrong_condition", "condition-poor")],
    [
      { type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" },
      { type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" },
      { type: "wrong_custodian", expectedValue: "emp-5", actualValue: "emp-9" },
    ],
    ["wrong_location", "wrong_custodian"],
  )
  assert.deepEqual(plan, {
    create: [{ type: "wrong_custodian", expectedValue: "emp-5", actualValue: "emp-9" }],
    update: [{ findingId: "f-loc", finding: { type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" } }],
    reject: ["f-dept"],
  })
})

test("a value a reviewer already approved is not reported again; a new value after it is", () => {
  const approved = [{ id: "f-a", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "approved" }]
  assert.deepEqual(planAuditOutOfScopeRescanFindings(approved, [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2" }], ["wrong_location"]), { create: [], update: [], reject: [] })
  assert.deepEqual(planAuditOutOfScopeRescanFindings(approved, [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" }], ["wrong_location"]), {
    create: [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" }],
    update: [],
    reject: [],
  })
})

test("decided findings are never reopened or closed; a save that leaves a rejected or exception value unchanged files nothing, and a save that changes to it again is a new claim (P3-R18: it then needs evidence)", () => {
  const decided = [
    { id: "f-a", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "approved" },
    { id: "f-r", findingType: "wrong_condition", actualValue: "condition-poor", reviewStatus: "rejected" },
    { id: "f-e", findingType: "wrong_department", actualValue: "dept-2", reviewStatus: "exception" },
  ]
  assert.deepEqual(planAuditOutOfScopeRescanFindings(decided, [], []), { create: [], update: [], reject: [] })
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings(
      decided,
      [
        { type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" },
        { type: "wrong_department", expectedValue: "dept-1", actualValue: "dept-2" },
      ],
      [],
    ),
    { create: [], update: [], reject: [] },
  )
  assert.deepEqual(planAuditOutOfScopeRescanFindings(decided, [{ type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" }], ["wrong_condition"]), {
    create: [{ type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" }],
    update: [],
    reject: [],
  })
})

test("a second pending finding of one field is closed and the first kept; a cleared value (null) equals null", () => {
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings([pending("f-1", "wrong_location", "loc-2"), pending("f-2", "wrong_location", "loc-2")], [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2" }], []),
    { create: [], update: [], reject: ["f-2"] },
  )
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings([pending("f-c", "wrong_custodian", null)], [{ type: "wrong_custodian", expectedValue: "emp-5", actualValue: null }], []),
    { create: [], update: [], reject: [] },
  )
})
