import assert from "node:assert/strict"
import test from "node:test"

import * as lifecyclePolicy from "../src/lib/asset-lifecycle-policy.ts"

test("asset operation dropdowns omit active legacy conditions", async () => {
  const buildOptions = (lifecyclePolicy as typeof lifecyclePolicy & {
    getAssetOperationConditionOptions?: <T extends { id: string; name?: string | null; isActive?: boolean }>(conditions: readonly T[]) => T[]
  }).getAssetOperationConditionOptions
  const conditions = [
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

  assert.deepEqual(buildOptions?.(conditions).map((condition) => condition.id), [
    "not-assessed",
    "new",
    "good",
    "fair",
    "damaged",
    "non-functional",
    "salvage",
  ])
})

test("operation condition validation rejects legacy, inactive, and missing conditions", () => {
  const validate = (lifecyclePolicy as typeof lifecyclePolicy & {
    getAssetOperationConditionError?: (
      condition: { name?: string | null; isActive?: boolean } | null | undefined,
    ) => string | null
  }).getAssetOperationConditionError

  assert.equal(validate?.({ name: "Good", isActive: true }), null)
  assert.equal(validate?.({ name: "Excellent", isActive: true }), "ASSET_CONDITION_NOT_SELECTABLE")
  assert.equal(validate?.({ name: "Good", isActive: false }), "ASSET_STATE_MASTER_NOT_FOUND")
  assert.equal(validate?.(null), "ASSET_STATE_MASTER_NOT_FOUND")
})
