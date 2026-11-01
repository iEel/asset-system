import assert from "node:assert/strict"
import test from "node:test"

import { getRegisterHolderLine, needsConditionAttention } from "../src/lib/asset-register-row-rules.ts"

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
