import assert from "node:assert/strict"
import test from "node:test"

import {
  getDisposalActionPermission,
  getDisposalAssetEligibilityError,
  getDisposalApprovalAssetStatusError,
  getDisposalDecisionStatusOptions,
  filterDisposalExecutorOptions,
  getDisposalSegregationError,
  getDisposalStatusTargetError,
} from "../src/lib/disposal-policy.ts"

test("accepts operational asset statuses and rejects protected disposal sources", () => {
  assert.equal(getDisposalAssetEligibilityError({ name: "Ready" }), null)
  assert.equal(getDisposalAssetEligibilityError({ name: "Checked Out" }), null)

  for (const statusName of [
    "Pending Disposal",
    "Disposed",
    "Retired",
    "Lost",
    "Missing",
    "Under Maintenance",
    "Pending Repair",
  ]) {
    assert.notEqual(getDisposalAssetEligibilityError({ name: statusName }), null, statusName)
  }
})

test("recognizes protected and target statuses from Thai master data labels", () => {
  assert.notEqual(getDisposalAssetEligibilityError({ nameTh: "ตัดจำหน่ายแล้ว" }), null)
  assert.notEqual(getDisposalAssetEligibilityError({ nameTh: "รอตัดจำหน่าย" }), null)
  assert.equal(getDisposalStatusTargetError("approve", { nameTh: "รอตัดจำหน่าย" }), null)
  assert.equal(getDisposalStatusTargetError("reject", { nameTh: "พร้อมใช้งาน" }), null)
  assert.equal(getDisposalStatusTargetError("execute", { nameTh: "เลิกใช้งาน" }), null)
})

test("limits disposal action status targets to their workflow stages", () => {
  assert.equal(getDisposalStatusTargetError("approve", { name: "Pending Disposal" }), null)
  assert.notEqual(getDisposalStatusTargetError("approve", { name: "Ready" }), null)

  assert.equal(getDisposalStatusTargetError("reject", { name: "Ready" }), null)
  assert.notEqual(getDisposalStatusTargetError("reject", { name: "Pending Disposal" }), null)

  assert.equal(getDisposalStatusTargetError("execute", { name: "Disposed" }), null)
  assert.equal(getDisposalStatusTargetError("execute", { name: "Retired" }), null)
  assert.notEqual(getDisposalStatusTargetError("execute", { name: "Lost" }), null)
})

test("blocks approval when the asset no longer remains pending disposal", () => {
  assert.equal(getDisposalApprovalAssetStatusError({ name: "Pending Disposal" }), null)
  assert.notEqual(getDisposalApprovalAssetStatusError({ name: "Ready" }), null)
})

test("orders decision options with pending disposal before the only valid rejection target", () => {
  const options = getDisposalDecisionStatusOptions([
    { id: "lost", name: "Lost" },
    { id: "ready", name: "Ready" },
    { id: "pending", name: "Pending Disposal" },
    { id: "disposed", name: "Disposed" },
  ])

  assert.deepEqual(options.map((option) => option.id), ["pending", "ready"])
})

test("requires the disposal approval permission for decisions and edit permission for execution", () => {
  assert.equal(getDisposalActionPermission("approve"), "disposal:approve")
  assert.equal(getDisposalActionPermission("reject"), "disposal:approve")
  assert.equal(getDisposalActionPermission("execute"), "disposal:edit")
})

test("blocks requester or creator self-approval when segregation is required", () => {
  assert.match(
    getDisposalSegregationError({
      action: "approve",
      segregationRequired: true,
      actorEmployeeId: "employee-requester",
      actorUserId: "user-approver",
      requestedById: "employee-requester",
      createdByUserId: "user-creator",
    }) ?? "",
    /requester/i
  )
  assert.match(
    getDisposalSegregationError({
      action: "approve",
      segregationRequired: true,
      actorEmployeeId: "employee-approver",
      actorUserId: "user-creator",
      requestedById: "employee-requester",
      createdByUserId: "user-creator",
    }) ?? "",
    /creator/i
  )
  assert.equal(
    getDisposalSegregationError({
      action: "approve",
      segregationRequired: false,
      actorEmployeeId: "employee-requester",
      actorUserId: "user-creator",
      requestedById: "employee-requester",
      createdByUserId: "user-creator",
    }),
    null
  )
})

test("blocks an approver from executing or being recorded as executor when segregation is required", () => {
  const input = {
    action: "execute" as const,
    segregationRequired: true,
    requestedById: "employee-requester",
    createdByUserId: "user-creator",
    approverId: "employee-approver",
  }

  assert.match(
    getDisposalSegregationError({ ...input, actorEmployeeId: "employee-approver", actorUserId: "user-executor", executedById: "employee-executor" }) ?? "",
    /approver/i
  )
  assert.match(
    getDisposalSegregationError({ ...input, actorEmployeeId: "employee-executor", actorUserId: "user-executor", executedById: "employee-approver" }) ?? "",
    /approver/i
  )
  assert.equal(
    getDisposalSegregationError({ ...input, actorEmployeeId: "employee-executor", actorUserId: "user-executor", executedById: "employee-executor" }),
    null
  )
})

test("removes the approver from executor options when segregation is required", () => {
  const employees = [{ id: "approver" }, { id: "operator" }]
  assert.deepEqual(filterDisposalExecutorOptions(employees, "approver", true), [{ id: "operator" }])
  assert.deepEqual(filterDisposalExecutorOptions(employees, "approver", false), employees)
})
