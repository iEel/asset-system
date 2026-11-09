import assert from "node:assert/strict"
import test from "node:test"

import {
  CONSUMABLE_ADJUST_MAX,
  CONSUMABLE_ISSUE_MAX,
  CONSUMABLE_OFTEN_COUNT,
  CONSUMABLE_OFTEN_DAYS,
  consumableAdjustError,
  consumableBlockedIssueStatusNames,
  consumableIssueAssetError,
  consumableOftenChanged,
  consumableStockState,
  isConsumableLow,
} from "../src/lib/consumable-rules.ts"
import { getBangkokDateKey } from "../src/lib/preventive-maintenance.ts"
import {
  consumableAdjustSchema,
  consumableIssueSchema,
  consumableItemSchema,
  consumableReceiveSchema,
} from "../src/lib/validations/consumables.ts"

const dayMs = 86_400_000

test("the limits match the spec", () => {
  assert.equal(CONSUMABLE_ISSUE_MAX, 9999)
  assert.equal(CONSUMABLE_ADJUST_MAX, 99999)
  assert.equal(CONSUMABLE_OFTEN_DAYS, 90)
  assert.equal(CONSUMABLE_OFTEN_COUNT, 2)
  assert.deepEqual([...consumableBlockedIssueStatusNames], ["Disposed", "Retired", "Lost", "Missing", "Pending Disposal"])
})

test("stock state: out first, then low", () => {
  assert.equal(consumableStockState({ onHand: 0, minQuantity: 0 }), "out")
  assert.equal(consumableStockState({ onHand: 1, minQuantity: 2 }), "low")
  assert.equal(consumableStockState({ onHand: 2, minQuantity: 2 }), "low")
  assert.equal(consumableStockState({ onHand: 3, minQuantity: 2 }), "ok")
  assert.equal(consumableStockState({ onHand: 5, minQuantity: 0 }), "ok")
  assert.equal(isConsumableLow({ onHand: 2, minQuantity: 2 }), true)
  assert.equal(isConsumableLow({ onHand: 0, minQuantity: 0 }), false)
  assert.equal(isConsumableLow({ onHand: 3, minQuantity: 2 }), false)
})

test("adjust: a count equal to on-hand is no change, outside 0–99999 is out of range", () => {
  assert.equal(consumableAdjustError(5, 5), "noChange")
  assert.equal(consumableAdjustError(5, -1), "range")
  assert.equal(consumableAdjustError(5, 100000), "range")
  assert.equal(consumableAdjustError(5, 1.5), "range")
  assert.equal(consumableAdjustError(5, 6), null)
  assert.equal(consumableAdjustError(5, 0), null)
})

test("issue target: an active asset not in a blocked status", () => {
  for (const statusName of consumableBlockedIssueStatusNames) {
    assert.equal(consumableIssueAssetError({ isActive: true, statusName }), "assetStatus", statusName)
  }
  assert.equal(consumableIssueAssetError({ isActive: false, statusName: "Ready" }), "assetStatus")
  assert.equal(consumableIssueAssetError(null), "assetNotFound")
  assert.equal(consumableIssueAssetError({ isActive: true, statusName: "Ready" }), null)
})

test("changed often: 2+ issues of an item within 90 days", () => {
  const now = new Date("2026-11-09T05:00:00.000Z")
  const ago = (days: number) => new Date(now.getTime() - days * dayMs)
  assert.deepEqual(
    consumableOftenChanged([
      { itemId: "a", performedAt: ago(10) },
      { itemId: "a", performedAt: ago(80) },
      { itemId: "b", performedAt: ago(5) },
    ], now),
    [{ itemId: "a", count: 2 }],
  )
  assert.deepEqual(
    consumableOftenChanged([
      { itemId: "a", performedAt: ago(10) },
      { itemId: "a", performedAt: ago(100) },
    ], now),
    [],
  )
})

test("schemas: receive date, quantity, default unit, reason length", () => {
  const tomorrow = getBangkokDateKey(new Date(Date.now() + dayMs))
  const today = getBangkokDateKey(new Date())
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 1, receivedDate: tomorrow }).success, false)
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 1, receivedDate: today }).success, true)
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 1, receivedDate: "2026-02-30" }).success, false)
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 1, receivedDate: "9/11/2026" }).success, false)
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 0, receivedDate: today }).success, false)
  assert.equal(consumableReceiveSchema.safeParse({ itemId: "i", quantity: 10000, receivedDate: today }).success, false)

  assert.equal(consumableIssueSchema.safeParse({ itemId: "i", quantity: 0, assetId: "a" }).success, false)
  assert.equal(consumableIssueSchema.safeParse({ itemId: "i", quantity: 1.5, assetId: "a" }).success, false)
  assert.equal(consumableIssueSchema.safeParse({ itemId: "i", quantity: 3, assetId: "a" }).success, true)

  const item = consumableItemSchema.parse({ name: "  เมาส์  " })
  assert.equal(item.unit, "ชิ้น")
  assert.equal(item.name, "เมาส์")
  assert.equal(consumableItemSchema.safeParse({ name: "   " }).success, false)
  assert.equal(consumableItemSchema.safeParse({ name: "x", minQuantity: 100000 }).success, false)

  assert.equal(consumableAdjustSchema.safeParse({ itemId: "i", counted: 3, reason: "ab" }).success, false)
  assert.equal(consumableAdjustSchema.safeParse({ itemId: "i", counted: 3, reason: "  ab  " }).success, false)
  assert.equal(consumableAdjustSchema.safeParse({ itemId: "i", counted: 0, reason: "นับใหม่" }).success, true)
  assert.equal(consumableAdjustSchema.safeParse({ itemId: "i", counted: 100000, reason: "นับใหม่" }).success, false)
})
