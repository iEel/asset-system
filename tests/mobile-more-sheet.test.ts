import assert from "node:assert/strict"
import test from "node:test"
import { SHEET_SWIPE_CLOSE_PX, isSheetSwipeClose } from "../src/lib/sheet-swipe.ts"
import { switchLocalePath } from "../src/lib/locale-path.ts"
import { getAccountDetailLine } from "../src/lib/user-display.ts"
import { getActiveNavigationLabelKey } from "../src/lib/navigation-active.ts"

test("a drag down of 80px, or a flick of 32px or more at 0.5px/ms or faster, closes the sheet; a drag up never does", () => {
  assert.equal(SHEET_SWIPE_CLOSE_PX, 80)
  assert.equal(isSheetSwipeClose(80, 1000), true); assert.equal(isSheetSwipeClose(79, 1000), false)
  assert.equal(isSheetSwipeClose(40, 60), true)   // 0.67 px/ms
  assert.equal(isSheetSwipeClose(40, 200), false) // 0.2 px/ms
  assert.equal(isSheetSwipeClose(31, 10), false)  // too short for a flick
  assert.equal(isSheetSwipeClose(-120, 100), false); assert.equal(isSheetSwipeClose(50, 0), false)
})
test("switching the language keeps the page: only the first locale segment changes", () => {
  assert.equal(switchLocalePath("/th/assets/abc", "th", "en"), "/en/assets/abc")
  assert.equal(switchLocalePath("/th", "th", "en"), "/en")
  assert.equal(switchLocalePath("/en/audit/rounds/r-1/scan", "en", "th"), "/th/audit/rounds/r-1/scan")
  assert.equal(switchLocalePath("/th/master-data/thai-suppliers", "th", "en"), "/en/master-data/thai-suppliers")
  assert.equal(switchLocalePath("/thx", "th", "en"), "/en/thx")
})
test("the person's second line joins role and department with ' · ', skips empty parts, never shortens (F5)", () => {
  assert.equal(getAccountDetailLine(["หัวหน้า IT", "ฝ่าย IT"]), "หัวหน้า IT · ฝ่าย IT")
  assert.equal(getAccountDetailLine([null, " ฝ่าย IT "]), "ฝ่าย IT")
  assert.equal(getAccountDetailLine([undefined, " "]), "")
  const role = "ผู้จัดการฝ่ายบริหารทรัพย์สินและจัดซื้อจัดจ้าง สำนักงานใหญ่ กรุงเทพมหานคร"
  assert.ok(role.length >= 60); assert.equal(getAccountDetailLine([role, "ฝ่าย IT"]), `${role} · ฝ่าย IT`)
})
test("the phone title is the open menu row's label key, found inside groups; none when no row is open (spec §6.6)", () => {
  const items = [{ labelKey: "dashboard", href: "/th/dashboard" }, { labelKey: "audit", children: [{ labelKey: "auditRound", href: "/th/audit/rounds" }] }]
  assert.equal(getActiveNavigationLabelKey(items, "/th/audit/rounds"), "auditRound")
  assert.equal(getActiveNavigationLabelKey(items, "/th/dashboard"), "dashboard")
  assert.equal(getActiveNavigationLabelKey(items, "/th/reports"), null); assert.equal(getActiveNavigationLabelKey(items, null), null)
})
