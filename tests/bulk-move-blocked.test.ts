import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getBulkMoveVerdict, type AssetOperationFacts } from "../src/lib/asset-operation-eligibility.ts"
import {
  bulkMoveBlockedList, bulkMoveBlockedOrder, bulkMoveBlockedReasonKey, readBulkMoveBlocked, type BulkMoveBlockedCode,
} from "../src/lib/bulk-move-blocked.ts"

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

test("the save's refusal codes: an asset no longer active first, then the verdict's order (group 3 spec §10.2; P4-R4; plan 4 final review server-3)", () => {
  assert.deepEqual([...bulkMoveBlockedOrder], ["ASSET_NOT_ACTIVE", "ASSET_COMPONENT_OUTSTANDING", "ASSET_LICENSE_MOVE_NOT_ALLOWED", "ASSET_ACTIVE_CHECKOUT_EXISTS", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"])
})

test("a refusal code reads the row's reason words, one set of words; any other code reads null (group 3 spec §10.2; P4-R6, P4-R7)", () => {
  assert.deepEqual(bulkMoveBlockedOrder.map(bulkMoveBlockedReasonKey), [
    "bulkMove.blockedNotActive", "asset.transactionReasonComponentOutstanding", "asset.transactionReasonLicenseMove", "asset.transactionReasonOpenCheckoutBulkMove", "asset.transactionReasonWrittenOff",
  ])
  const base: AssetOperationFacts = { statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null }
  // A row never shows a not-active asset, so that code has its own words and no verdict (plan 4 final review server-3).
  const trigger: Record<Exclude<BulkMoveBlockedCode, "ASSET_NOT_ACTIVE">, Partial<AssetOperationFacts>> = {
    ASSET_COMPONENT_OUTSTANDING: { outstanding: { linkId: "link-1", checkinId: "rt-1" } },
    ASSET_LICENSE_MOVE_NOT_ALLOWED: { ownership: "software_license" },
    ASSET_ACTIVE_CHECKOUT_EXISTS: { openCheckout: { id: "co-1", handoverMode: "temporary_loan" } },
    ASSET_STATUS_TRANSFER_NOT_ALLOWED: { statusName: "Disposed" },
  }
  for (const code of bulkMoveBlockedOrder.filter((item) => item !== "ASSET_NOT_ACTIVE")) assert.equal(bulkMoveBlockedReasonKey(code), getBulkMoveVerdict({ ...base, ...trigger[code] }).reasonKey, code)
  for (const code of ["", "ASSET_CHANGED_DURING_OPERATION", "ASSET_TRANSFER_DESTINATION_INACTIVE", "VALIDATION_FAILED", "asset_license_move_not_allowed", "toString", "__proto__"]) {
    assert.equal(bulkMoveBlockedReasonKey(code), null, code)
  }
})

test("a not-active asset reads ถูกปิดใช้งานหรือลบแล้ว (plan 4 final review server-3)", () => {
  const messages = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).bulkMove as Record<string, string>
  assert.equal(messages("th").blockedNotActive, "ถูกปิดใช้งานหรือลบแล้ว")
  assert.equal(messages("en").blockedNotActive, "Deactivated or deleted")
})

test("the refusal rules stay pure: relative .ts imports, no database (P4 Global Constraints)", () => {
  const source = readFileSync("src/lib/bulk-move-blocked.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|from "@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
