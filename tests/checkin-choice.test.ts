import assert from "node:assert/strict"
import test from "node:test"
import { getCheckinChoice } from "../src/lib/checkin-choice.ts"
import type { AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

const holderLabel = "E001 - สมชาย ใจดี"
const checkout = { id: "co-1", documentNo: "HO-202610-0001", checkoutDate: "2026-10-01T00:00:00.000Z", handoverMode: "permanent_assignment", checkoutType: "user", expectedReturnDate: null, remark: null, conditionBefore: "cond-good", destinationLabel: holderLabel }
const row = (overrides: Record<string, unknown> = {}) => ({ id: "asset-1", assetTag: "NB-0228", name: "โน้ตบุ๊ก", serialNumber: null, statusLabel: "ใช้งานอยู่", placeLabel: holderLabel, currentLocationId: "loc-1", conditionId: "cond-good", eligible: true, reasonKey: null, checkout, holderKey: "employee:emp-1", holderLabel, holderEmployeeId: "emp-1", ...overrides }) as AssetOperationSearchRow
const active = new Set(["emp-1", "emp-2"])

test("a takeable handover row is chosen with its checkout; return-by is its holder when the holder is an active employee (spec 6.3)", () => {
  assert.deepEqual(getCheckinChoice(row(), active), { checkoutId: "co-1", returnByEmployeeId: "emp-1", reasonKey: null })
  assert.deepEqual(getCheckinChoice(row(), new Set(["emp-2"])), { checkoutId: "co-1", returnByEmployeeId: null, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ holderEmployeeId: null }), active), { checkoutId: "co-1", returnByEmployeeId: null, reasonKey: null })
})

test("a blocked row is chosen but not taken: no checkout, no return-by, its reason (spec 6.4)", () => {
  assert.deepEqual(getCheckinChoice(row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }), active), { checkoutId: "", returnByEmployeeId: null, reasonKey: "asset.transactionReasonActiveMaintenance" })
})

test("nothing chosen, and a legacy row before its handover exists, take no checkout", () => {
  assert.deepEqual(getCheckinChoice(null, active), { checkoutId: "", returnByEmployeeId: null, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ legacy: true, checkout: undefined }), active), { checkoutId: "", returnByEmployeeId: null, reasonKey: null })
})
