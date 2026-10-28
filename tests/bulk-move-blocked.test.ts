import assert from "node:assert/strict"
import test from "node:test"
import { bulkMoveBlockedList, readBulkMoveBlocked } from "../src/lib/bulk-move-blocked.ts"

const blocked = [
  { assetId: "a1", assetTag: "NB-001", code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" },
  { assetId: "a2", assetTag: "LIC-007", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" },
  { assetId: "a3", assetTag: "NB-002", code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" },
]

test("the bulk-move refusal's blocked assets are read from its body, and nothing else is", () => {
  assert.deepEqual(readBulkMoveBlocked({ code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "x", blocked }), blocked)
  assert.deepEqual(readBulkMoveBlocked({ blocked: [{ ...blocked[0], extra: 1 }, { assetId: 1 }, null, "NB-9"] }), [blocked[0]])
  for (const payload of [null, undefined, "x", {}, { blocked: "x" }, { error: "Some assets already have active checkouts" }]) assert.deepEqual(readBulkMoveBlocked(payload), [])
})

test("the list under the field groups the tags by reason, in the order the server named them", () => {
  const reasons: Record<string, string> = { ASSET_STATUS_TRANSFER_NOT_ALLOWED: "สถานะนี้ย้ายไม่ได้", ASSET_LICENSE_MOVE_NOT_ALLOWED: "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้" }
  assert.equal(bulkMoveBlockedList(blocked, (code) => reasons[code]), "NB-001, NB-002 (สถานะนี้ย้ายไม่ได้) · LIC-007 (License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้)")
  assert.equal(bulkMoveBlockedList([], (code) => code), "")
})
