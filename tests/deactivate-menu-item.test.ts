import assert from "node:assert/strict"
import test from "node:test"
import { deactivateMenuItem } from "../src/lib/deactivate-menu-item.ts"

// Group 7 follow-ups Task 1 (G7F-R2): "ปิดใช้งาน" in a row's ⋯ needs <module>:delete (hidden otherwise); when a
// blocker applies it shows as RowActions' unavailable item with the reason, never a button that fails later.
const onSelect = () => {}

test("without the delete permission there is no item", () => {
  assert.equal(deactivateMenuItem({ label: "ปิดใช้งาน", canDeactivate: false, blocked: null, onSelect }), null)
  assert.equal(deactivateMenuItem({ label: "ปิดใช้งาน", canDeactivate: false, blocked: "ยังถือครองทรัพย์สิน 2 รายการ", onSelect }), null)
})

test("a blocker makes it an unavailable item that reads its reason", () => {
  assert.deepEqual(deactivateMenuItem({ label: "ปิดใช้งาน", canDeactivate: true, blocked: "ยังถือครองทรัพย์สิน 2 รายการ", onSelect }), {
    kind: "unavailable",
    key: "deactivate",
    label: "ปิดใช้งาน",
    reason: "ยังถือครองทรัพย์สิน 2 รายการ",
    icon: undefined,
  })
})

test("with nothing blocking it is a destructive action that calls onSelect", () => {
  const item = deactivateMenuItem({ label: "ปิดใช้งาน", canDeactivate: true, blocked: null, onSelect, key: "off" })
  assert.deepEqual(item, { kind: "action", key: "off", label: "ปิดใช้งาน", onSelect, icon: undefined, destructive: true })
  // An empty reason is not a reason.
  assert.equal(deactivateMenuItem({ label: "ปิดใช้งาน", canDeactivate: true, blocked: "", onSelect })?.kind, "action")
})
