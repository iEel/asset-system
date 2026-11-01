import assert from "node:assert/strict"
import test from "node:test"

import { countBulkDepartmentChanges, getRegisterHolderLine, needsConditionAttention } from "../src/lib/asset-register-row-rules.ts"

// Group 4 plan 1 Task 2 (spec §6.1): the condition is a badge only when it needs attention (the phone list's rule).
test("needsConditionAttention: fair, poor, damaged, non functional and salvage need attention", () => {
  assert.equal(needsConditionAttention("Damaged"), true)
  assert.equal(needsConditionAttention("Good"), false)
  assert.equal(needsConditionAttention("Non_Functional"), true)
  assert.equal(needsConditionAttention("fair"), true)
  assert.equal(needsConditionAttention("Poor"), true)
  assert.equal(needsConditionAttention("Salvage"), true)
  assert.equal(needsConditionAttention("Excellent"), false)
  assert.equal(needsConditionAttention(""), false)
})

test("the holder line: the name and department, ส่วนกลาง with no holder, or no holder", () => {
  assert.deepEqual(getRegisterHolderLine({ ownership: "shared", custodian: null }), { kind: "shared" })
  assert.deepEqual(getRegisterHolderLine({ ownership: "personal", custodian: null }), { kind: "none" })
  assert.deepEqual(getRegisterHolderLine({ ownership: "stock", custodian: null }), { kind: "none" })
  assert.deepEqual(
    getRegisterHolderLine({ ownership: "personal", custodian: { name: "สมชาย ใจดี", departmentName: "ฝ่ายไอที" } }),
    { kind: "holder", name: "สมชาย ใจดี", department: "ฝ่ายไอที" }
  )
  assert.deepEqual(
    getRegisterHolderLine({ ownership: "shared", custodian: { name: "สมชาย ใจดี", departmentName: null } }),
    { kind: "holder", name: "สมชาย ใจดี", department: null }
  )
})

// Final review B1 (spec §6.6): the correction dialog says how many selected rows change department, with a holder chosen
// and on a room-only save, where the server makes a held บุคคล/Stock row follow its current holder.
test("countBulkDepartmentChanges: the chosen holder's department, else the current holder's; ส่วนกลาง never counted", () => {
  const row = (value: string, departmentId: string | null, holderDepartmentId: string | null) => ({ ownershipType: { value }, departmentId, holderDepartmentId })
  const rows = [
    row("personal", "dept-a", "dept-a"), // held, in step
    row("personal", "dept-wrong", "dept-a"), // held, drifted
    row("stock", "dept-it", null), // not held
    row("shared", "dept-shared", "dept-a"), // ส่วนกลาง keeps its own
    row("software_license", "dept-x", null),
    row("component", "dept-y", "dept-a"),
  ]
  // A holder chosen: every บุคคล/Stock row not already in that department.
  assert.equal(countBulkDepartmentChanges(rows, { departmentId: "dept-a" }), 2)
  assert.equal(countBulkDepartmentChanges(rows, { departmentId: "dept-b" }), 3)
  assert.equal(countBulkDepartmentChanges(rows, { departmentId: null }), 0)
  // Room only: the held rows whose department is not their holder's.
  assert.equal(countBulkDepartmentChanges(rows, null), 1)
  assert.equal(countBulkDepartmentChanges([row("shared", "dept-shared", "dept-a")], null), 0)
  assert.equal(countBulkDepartmentChanges([row("shared", "dept-shared", "dept-a")], { departmentId: "dept-b" }), 0)
  assert.equal(countBulkDepartmentChanges([], null), 0)
})
