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
  completeRecord,
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

test("repaired brings a Ready asset back to Ready, and a second record found beyond repair sends it to Pending Disposal (ER2)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R2")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องส่วนกลางส่งซ่อม`, ownershipType: "shared" })

  // From the asset's own page: its "บันทึกซ่อม" opens the form with the asset chosen. The page is opened without its
  // axe check here (finding AR2 has its own test below); its console and requests are still measured.
  await page.goto(`/th/assets/${asset.id}`)
  await page.getByRole("main").getByRole("link", { name: "บันทึกซ่อม", exact: true }).first().click()
  await page.waitForURL(/\/th\/maintenance\/new\?assetId=/)
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await measure.recordPage("repair form from the asset")
  await page.locator("#repair-record-problem").fill(`${tag} พัดลมดัง ส่งช่างภายใน`)
  await page.getByRole("radio", { name: "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)" }).check()
  const first = await saveRepairForm(page, measure, "save the first unfinished repair")
  await expect(headerBadge(page)).toHaveText("ยังซ่อมไม่เสร็จ")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("อยู่ระหว่างซ่อม")
  expect((await readAsset(page.request, asset.id)).status.name).toBe("Under Maintenance")

  // Repaired: no custodian, so Ready.
  await completeRecord(page, measure, first.id, "ใช้งานได้", "save the first repaired")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("พร้อมใช้งาน")
  await measure.recordPage("first record repaired")
  expect((await readAsset(page.request, asset.id)).status.name, "repaired, no custodian: Ready").toBe("Ready")

  // It breaks again: a second record, unfinished, then found beyond repair.
  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "second repair form")
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await page.locator("#repair-record-problem").fill(`${tag} เมนบอร์ดเสีย`)
  await page.getByRole("radio", { name: "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)" }).check()
  const second = await saveRepairForm(page, measure, "save the second unfinished repair")
  expect(second.id).not.toBe(first.id)
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("อยู่ระหว่างซ่อม")
  await completeRecord(page, measure, second.id, "ซ่อมไม่ได้ เสนอจำหน่าย", "save beyond repair")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  await expect(valueBeside(page, "ผลการซ่อม")).toHaveText("ซ่อมไม่ได้ เสนอจำหน่าย")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("รอตัดจำหน่าย")
  await measure.recordPage("second record beyond repair")
  expect((await readAsset(page.request, asset.id)).status.name, "beyond repair: Pending Disposal").toBe("Pending Disposal")

  // The asset's repair history lists both records.
  await measure.visit(`/th/maintenance?assetId=${asset.id}`, "the asset's repair records")
  for (const record of [first, second]) await expect(page.getByRole("main").getByText(record.repairNo).first()).toBeAttached()
})

// Finding AR2 (expected to fail until it is fixed): the asset page's QR code is an <svg role="img"> with no name
// (src/components/assets/asset-qr-code.tsx, qrcode.react without a title), an axe serious "svg-img-alt" violation.
test("the asset page passes axe (ER2, finding AR2)", async ({ page, measure }, testInfo) => {
  test.fail(true, "AR2: the asset page's QR code svg has role img and no name (axe svg-img-alt, serious)")
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R5")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} หน้าทรัพย์สิน`, ownershipType: "stock" })
  await measure.visit(`/th/assets/${asset.id}`, "asset page")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(tag)
})
