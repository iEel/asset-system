// Repair records (spec §6.3 1–3), as IT staff on the computer (and the same walk on the phone): an unfinished record
// sends the asset to Under Maintenance, "repaired" brings it back by custody (In Use with its custodian, or Ready),
// "cannot repair, propose disposal" sends it to Pending Disposal, a mistaken record is cancelled, a second open record
// is refused, and the repair print opens. Each workflow starts with one wrong entry that shows under its field (§6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  areaTag,
  bangkokToday,
  chooseAsset,
  createAsset,
  dayBefore,
  handOverPermanently,
  headerBadge,
  readAsset,
  readAssetMasters,
  saveRepairForm,
  valueBeside,
} from "./repair-data.ts"

asUser("itStaff")

test("an unfinished repair sends an asset in use to Under Maintenance, and repaired brings it back In Use with its custodian (ER1)", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const receiver = run.employees.receiver1
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R1")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} โน้ตบุ๊กส่งซ่อม`, ownershipType: "personal" })
  await handOverPermanently(page.request, masters, asset.id, receiver.id)
  expect((await readAsset(page.request, asset.id)).status.name, "the asset is In Use before the repair").toBe("In Use")

  // The repair list, then its "บันทึกซ่อม".
  await measure.visit("/th/maintenance", "repair list")
  await page.getByRole("main").getByRole("link", { name: "บันทึกซ่อม", exact: true }).first().click()
  await page.waitForURL(/\/th\/maintenance\/new(?:\?|$)/)
  await expect(page.getByRole("heading", { level: 1, name: "บันทึกซ่อม" })).toBeVisible()
  await measure.recordPage("repair form")

  await chooseAsset(page, "repair-record-asset", tag)
  await page.getByRole("radio", { name: "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)" }).check()
  await expect(page.getByText('ทรัพย์สินจะเปลี่ยนเป็น "อยู่ระหว่างซ่อม" จนกว่าจะกดซ่อมเสร็จ')).toBeVisible()

  // A wrong entry first (spec §6.7): no problem written. The error shows under the field and focus goes to it.
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expect(page.locator("#repair-record-problem-error")).toHaveText("กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#repair-record-problem")).toBeFocused()
  await measure.recordPage("repair form with its error")

  await page.locator("#repair-record-problem").fill(`${tag} จอไม่ติด ส่งร้านเปลี่ยนจอ`)
  await expect(page.locator("#repair-record-problem-error")).toHaveCount(0)
  const record = await saveRepairForm(page, measure, "save the unfinished repair")
  expect(record.repairStatus).toBe("in_progress")
  expect(record.repairNo).toMatch(/^MT-\d{8}-\d{4}$/)

  // The record page: unfinished, the asset Under Maintenance, the custodian kept.
  await expect(headerBadge(page)).toHaveText("ยังซ่อมไม่เสร็จ")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("อยู่ระหว่างซ่อม")
  await expect(valueBeside(page, "ผู้ถือครอง")).toContainText(receiver.code)
  await measure.recordPage("unfinished repair record")
  expect((await readAsset(page.request, asset.id)).status.name, "an unfinished repair: Under Maintenance").toBe("Under Maintenance")

  // Repaired. A wrong entry first: the return date before the day the repair was recorded (a date pair reversed).
  const today = bangkokToday()
  await page.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกว่าซ่อมเสร็จ" })
  await expect(dialog).toBeVisible()
  await dialog.locator("#repair-complete-return-date").fill(dayBefore(today))
  await dialog.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
  await expect(dialog.locator("#repair-complete-return-date-error")).toHaveText("วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม")
  await expect(dialog.locator("#repair-complete-return-date")).toBeFocused()
  await measure.recordPage("repaired dialog with its error")

  await dialog.locator("#repair-complete-return-date").fill(today)
  await expect(dialog.locator("#repair-complete-return-date-error")).toHaveCount(0)
  await dialog.getByRole("radio", { name: "ใช้งานได้" }).check()
  const completed = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${record.id}`) && response.request().method() === "PATCH")
  await measure.timed("save repaired", async () => {
    await dialog.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
    expect((await completed).status()).toBe(200)
  })
  await expect(dialog).toBeHidden()
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  await expect(valueBeside(page, "ผลการซ่อม")).toHaveText("ใช้งานได้")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("ใช้งานอยู่")
  await expect(valueBeside(page, "ผู้ถือครอง")).toContainText(receiver.code)
  await measure.recordPage("repaired record")
  const after = await readAsset(page.request, asset.id)
  expect(after.status.name, "repaired, with an active handover: In Use").toBe("In Use")
  expect(after.custodian?.code, "the custodian is kept").toBe(receiver.code)
})
