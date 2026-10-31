import assert from "node:assert/strict"
import test from "node:test"

import {
  checkinConditionNames,
  checkoutConditionBlockReasonKeys,
  checkoutConditionNames,
  filterSelectableConditions,
  getAssetOperationConditionError,
  getAssetOperationConditionOptions,
  getCheckoutConditionBlock,
} from "../src/lib/asset-lifecycle-policy.ts"

// The 9 seeded masters (prisma/seed.ts), in master order.
const seeded = [
  { id: "not-assessed", name: "Not Assessed", nameTh: "ยังไม่ประเมิน", isActive: true },
  { id: "new", name: "New", nameTh: "ใหม่", isActive: true },
  { id: "excellent", name: "Excellent", nameTh: "ดีมาก", isActive: true },
  { id: "good", name: "Good", nameTh: "ดี", isActive: true },
  { id: "fair", name: "Fair", nameTh: "พอใช้", isActive: true },
  { id: "poor", name: "Poor", nameTh: "แย่", isActive: true },
  { id: "damaged", name: "Damaged", nameTh: "เสียหาย", isActive: true },
  { id: "non-functional", name: "Non-functional", nameTh: "ใช้งานไม่ได้", isActive: true },
  { id: "salvage", name: "Salvage", nameTh: "ซาก", isActive: true },
]
const names = (rows: ReadonlyArray<{ name: string }>) => rows.map((row) => row.name)
const master = (name: string, isActive = true) => ({ name, isActive })

test("ส่งมอบ offers ใหม่/ดี/พอใช้; รับคืน offers those and เสียหาย/ใช้งานไม่ได้/ซาก, in master order (group 3 spec §19.1)", () => {
  assert.deepEqual([...checkoutConditionNames], ["New", "Good", "Fair"])
  assert.deepEqual([...checkinConditionNames], ["New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"])
  assert.deepEqual(names(getAssetOperationConditionOptions("checkout", seeded)), ["New", "Good", "Fair"])
  assert.deepEqual(names(getAssetOperationConditionOptions("checkin", seeded)), ["New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"])
})

test("an inactive master is dropped, and ยังไม่ประเมิน, ดีมาก and แย่ are never offered", () => {
  const withInactiveGood = seeded.map((row) => (row.name === "Good" ? { ...row, isActive: false } : row))
  assert.deepEqual(names(getAssetOperationConditionOptions("checkout", withInactiveGood)), ["New", "Fair"])
  assert.deepEqual(names(getAssetOperationConditionOptions("checkin", withInactiveGood)), ["New", "Fair", "Damaged", "Non-functional", "Salvage"])
  for (const operation of ["checkout", "checkin"] as const) {
    const offered = names(getAssetOperationConditionOptions(operation, seeded))
    for (const never of ["Not Assessed", "Excellent", "Poor"]) assert.equal(offered.includes(never), false, `${operation} ${never}`)
  }
})

test("the asset form's list is unchanged: ยังไม่ประเมิน and the broken conditions stay selectable there", () => {
  assert.deepEqual(names(filterSelectableConditions(seeded)), ["Not Assessed", "New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"])
})

test("the routes validate the condition by operation (group 3 spec §19.1)", () => {
  assert.equal(getAssetOperationConditionError("checkout", master("Good")), null)
  assert.equal(getAssetOperationConditionError("checkout", master("Damaged")), "ASSET_CONDITION_NOT_SELECTABLE")
  assert.equal(getAssetOperationConditionError("checkin", master("Damaged")), null)
  assert.equal(getAssetOperationConditionError("checkin", master("Salvage")), null)
  for (const operation of ["checkout", "checkin"] as const) {
    assert.equal(getAssetOperationConditionError(operation, master("Not Assessed")), "ASSET_CONDITION_NOT_SELECTABLE", operation)
    assert.equal(getAssetOperationConditionError(operation, master("Excellent")), "ASSET_CONDITION_NOT_SELECTABLE", operation)
    assert.equal(getAssetOperationConditionError(operation, null), "ASSET_STATE_MASTER_NOT_FOUND", operation)
    assert.equal(getAssetOperationConditionError(operation, undefined), "ASSET_STATE_MASTER_NOT_FOUND", operation)
    assert.equal(getAssetOperationConditionError(operation, master("Good", false)), "ASSET_STATE_MASTER_NOT_FOUND", operation)
  }
})

test("a recorded เสียหาย, ใช้งานไม่ได้ or ซาก refuses a handover; anything else does not (group 3 spec §19.2)", () => {
  assert.equal(getCheckoutConditionBlock("Damaged"), "damaged")
  assert.equal(getCheckoutConditionBlock("Non-functional"), "nonFunctional")
  assert.equal(getCheckoutConditionBlock("Salvage"), "salvage")
  // Only what normalizeAssetStateName folds today: surrounding spaces and case.
  assert.equal(getCheckoutConditionBlock(" damaged "), "damaged")
  assert.equal(getCheckoutConditionBlock("NON-FUNCTIONAL"), "nonFunctional")
  assert.equal(getCheckoutConditionBlock(" salvage"), "salvage")
  for (const name of ["Good", "New", "Fair", "Not Assessed", "Excellent", "Poor", "unknown", "", null, undefined]) {
    assert.equal(getCheckoutConditionBlock(name), null, String(name))
  }
  assert.deepEqual(checkoutConditionBlockReasonKeys, {
    damaged: "asset.transactionReasonConditionDamaged",
    nonFunctional: "asset.transactionReasonConditionNonFunctional",
    salvage: "asset.transactionReasonConditionSalvage",
  })
})
