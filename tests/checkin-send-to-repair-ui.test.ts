import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("check-in offers send-for-repair instead of a separate repair checkbox", () => {
  const form = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
  assert.doesNotMatch(form, /createMaintenance/)
  assert.match(form, /"Under Maintenance"/)
  assert.match(form, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(form, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/)
})

test("check-in return statuses send damaged assets to repair, not to Pending Repair", () => {
  const flow = readFileSync("src/lib/asset-status-flow.ts", "utf8")
  assert.match(flow, /\["Ready", "Under Maintenance", "Pending Disposal"\]/)
})

test("a row with an open repair returns into ส่งซ่อม only: the status is set and locked, the notice replaces the new-record help (S-R43)", () => {
  const form = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
  // The pick (and the arrival's initial row) sets the next status to Under Maintenance from the page's statuses.
  assert.match(form, /row\?\.openRepair/)
  assert.match(form, /initialRow\?\.openRepair/)
  assert.match(form, /const repairLocked = Boolean\(chosen\?\.openRepair && repairStatus\)/)
  // The select offers no other status while the row has an open repair.
  assert.match(form, /\(repairLocked && repairStatus \? \[repairStatus\] : statuses\)\.map\(/)
  // The notice of the open repair, and neither the new-record help nor the repair-problem field.
  assert.match(form, /t\("openRepairReturnNotice"\)/)
  assert.match(form, /sendsToRepair && !repairLocked \?/)
  // validate refuses another status for a row with an open repair, in the server's words.
  assert.match(form, /check\("nextStatusId", required\(values\.nextStatusId\) \?\? \(repairLocked && !sendsToRepair \? "checkinRepairStatusRequired" : null\)\)/)
})

test("the open-repair words are the addendum's, in Thai and English (S-R43)", () => {
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin.openRepairReturnNotice
  assert.equal(words("th"), "มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่")
  assert.equal(words("en"), "This asset has an open repair. After the return it goes to Send to repair under that repair; no new repair record is created.")
})
