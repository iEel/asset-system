import assert from "node:assert/strict"
import test from "node:test"

import {
  filterAssetCreateStatuses,
  filterSelectableConditions,
  getAssetStateSelectionError,
} from "../src/lib/asset-lifecycle-policy.ts"

const statuses = [
  { id: "draft", name: "Draft", isActive: true },
  { id: "ready", name: "Ready", isActive: true },
  { id: "repair", name: "Pending Repair", isActive: true },
  { id: "inactive", name: "Ready", isActive: false },
]

const conditions = [
  { id: "unknown", name: "Not Assessed", isActive: true },
  { id: "new", name: "New", isActive: true },
  { id: "good", name: "Good", isActive: true },
  { id: "excellent", name: "Excellent", isActive: true },
  { id: "poor", name: "Poor", isActive: true },
  { id: "inactive", name: "Fair", isActive: false },
]

test("asset create options omit workflow-owned statuses and legacy conditions", () => {
  assert.deepEqual(filterAssetCreateStatuses(statuses).map((item) => item.id), ["draft", "ready"])
  assert.deepEqual(filterSelectableConditions(conditions).map((item) => item.id), ["unknown", "new", "good"])
})

test("asset create rejects inactive or non-selectable master values", () => {
  assert.equal(
    getAssetStateSelectionError({
      operation: "create",
      status: { name: "Pending Repair", isActive: true },
      condition: { name: "Good", isActive: true },
    }),
    "ASSET_STATUS_CREATE_NOT_ALLOWED"
  )
  assert.equal(
    getAssetStateSelectionError({
      operation: "create",
      status: { name: "Ready", isActive: true },
      condition: { name: "Excellent", isActive: true },
    }),
    "ASSET_CONDITION_NOT_SELECTABLE"
  )
  assert.equal(
    getAssetStateSelectionError({
      operation: "create",
      status: { name: "Ready", isActive: false },
      condition: { name: "Good", isActive: true },
    }),
    "ASSET_STATE_MASTER_NOT_FOUND"
  )
})

test("asset edit preserves an unchanged legacy condition but rejects selecting another legacy condition", () => {
  assert.equal(
    getAssetStateSelectionError({
      operation: "register_edit",
      currentStatusName: "In Use",
      currentConditionName: "Excellent",
      status: { name: "In Use", isActive: true },
      condition: { name: "Excellent", isActive: true },
    }),
    null
  )
  assert.equal(
    getAssetStateSelectionError({
      operation: "register_edit",
      currentStatusName: "In Use",
      currentConditionName: "Good",
      status: { name: "In Use", isActive: true },
      condition: { name: "Poor", isActive: true },
    }),
    "ASSET_CONDITION_NOT_SELECTABLE"
  )
})
