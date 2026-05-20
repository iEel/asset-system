import assert from "node:assert/strict"
import test from "node:test"

import { getCategoryDeleteBlockReason } from "../src/lib/category-delete-guard.ts"

test("allows deleting unused categories", () => {
  assert.equal(getCategoryDeleteBlockReason({ assets: 0, models: 0 }), null)
})

test("blocks deleting categories that still have assets or models", () => {
  assert.equal(
    getCategoryDeleteBlockReason({ assets: 2, models: 1 }),
    "ไม่สามารถลบหมวดหมู่นี้ได้ เพราะยังมีทรัพย์สิน 2 รายการ และรุ่น 1 รายการใช้งานอยู่"
  )
})
