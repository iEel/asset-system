// Repair records (spec §6.3 1–3), as IT staff on the computer (and the same walk on the phone): an unfinished record
// sends the asset to Under Maintenance, "repaired" brings it back by custody (In Use with its custodian, or Ready),
// "cannot repair, propose disposal" sends it to Pending Disposal, a mistaken record is cancelled, a second open record
// is refused, and the repair print opens. Each workflow starts with one wrong entry that shows under its field (§6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import {
  answerRepair,
  areaTag,
  bangkokToday,
  chooseAsset,
  completeRecord,
  createAsset,
  createPlan,
  dayBefore,
  endPlan,
  handOverPermanently,
  headerBadge,
  readAsset,
  readAssetMasters,
  repairSaveButton,
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

  // The pick: the asset card replaces the search, and its eligibility line says a new record can be written.
  await chooseAsset(page, "repair-record-asset", tag)
  await expect(page.locator('[data-repair-eligibility="ok"]')).toHaveText("ไม่มีบันทึกซ่อมที่ยังไม่เสร็จ บันทึกใหม่ได้")
  await answerRepair(page, { done: false })
  await expect(page.locator("[data-repair-status-line]")).toContainText("อยู่ระหว่างซ่อม")

  // A wrong entry first (spec §6.7): no problem written. The error shows under the field and focus goes to it.
  await repairSaveButton(page).click()
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

  // From the asset's own page: its "บันทึกซ่อม" (beside the primary: the header on the desktop, the bottom bar on the
  // phone) opens the form with the asset chosen. The page is opened without its axe check here (finding AR2 has its own
  // test below); its console and requests are still measured.
  await page.goto(`/th/assets/${asset.id}`)
  await page.getByRole("main").getByRole("link", { name: "บันทึกซ่อม", exact: true }).filter({ visible: true }).first().click()
  await page.waitForURL((url) => url.pathname === "/th/maintenance/new" && url.searchParams.get("assetId") === asset.id)
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await measure.recordPage("repair form from the asset")
  await page.locator("#repair-record-problem").fill(`${tag} พัดลมดัง ส่งช่างภายใน`)
  await answerRepair(page, { done: false })
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
  await answerRepair(page, { done: false })
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
  // AR2 fixed (FX2): this test now keeps the QR code named.
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R5")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} หน้าทรัพย์สิน`, ownershipType: "stock" })
  await measure.visit(`/th/assets/${asset.id}`, "asset page")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(tag)
})

test("a second record for an asset under repair is refused, and a mistaken record is cancelled with the asset back to Ready (ER3)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R3")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องบันทึกผิด`, ownershipType: "stock" })

  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair form")
  await page.locator("#repair-record-problem").fill(`${tag} บันทึกผิดเครื่อง`)
  await answerRepair(page, { done: false })
  const record = await saveRepairForm(page, measure, "save the mistaken repair")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("อยู่ระหว่างซ่อม")

  // Opened for the asset under repair, the card names its open record and links to it at once, before any save
  // (Review Focus 1).
  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair form, an asset with an open record")
  const openRecord = page.locator('[data-repair-eligibility="openRecord"]')
  await expect(openRecord).toContainText(`มีบันทึกซ่อมที่ยังไม่เสร็จ ${record.repairNo}`)
  await expect(openRecord.getByRole("link", { name: "เปิดบันทึกที่ยังไม่เสร็จ", exact: true })).toHaveAttribute("href", new RegExp(`^/th/maintenance/${record.id}(?:\\?|$)`))

  // No second open record: the asset search shows it, but it cannot be chosen, with the reason beside it.
  await measure.visit("/th/maintenance/new", "repair form, a second record")
  await page.locator("#repair-record-asset").click()
  await page.getByPlaceholder("พิมพ์เพื่อค้นหา...").fill(tag)
  const option = page.getByRole("option", { name: new RegExp(`^${tag} - `) })
  await expect(option).toContainText('ทรัพย์สินนี้มีงานซ่อมที่ยังไม่เสร็จ กด "ซ่อมเสร็จ" ที่บันทึกนั้นแทน')
  await expect(option).toHaveAttribute("aria-disabled", "true")
  await page.keyboard.press("Escape")
  await expect(page.getByPlaceholder("พิมพ์เพื่อค้นหา...")).toBeHidden()
  await expect(page.locator("#repair-record-asset")).toBeFocused()
  await expect(page.locator("#repair-record-asset-value")).not.toContainText(tag)
  // axe after the search closes (the open search has its own test below, finding AR3).
  await measure.recordPage("repair form after the refused search")

  // Cancel the mistaken record: the reason stays in its history, the asset goes back to Ready.
  await measure.visit(`/th/maintenance/${record.id}`, "mistaken record")
  await page.getByRole("button", { name: "ยกเลิกบันทึก", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "ยกเลิกบันทึกนี้?" })
  await expect(dialog).toBeVisible()
  await dialog.locator("#repair-cancel-reason").fill(`${tag} เลือกเครื่องผิด`)
  await measure.recordPage("cancel dialog")
  const cancelled = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${record.id}`) && response.request().method() === "PATCH")
  await measure.timed("cancel the mistaken record", async () => {
    await dialog.getByRole("button", { name: "ยืนยันยกเลิก", exact: true }).click()
    expect((await cancelled).status()).toBe(200)
  })
  await expect(dialog).toBeHidden()
  await expect(headerBadge(page)).toHaveText("ยกเลิก")
  await expect(valueBeside(page, "สถานะปัจจุบัน")).toHaveText("พร้อมใช้งาน")
  await expect(page.locator("#history")).toContainText("ยกเลิกบันทึก")
  await expect(page.locator("#history")).toContainText(`${tag} เลือกเครื่องผิด`)
  // A cancelled record cannot be finished or cancelled again.
  await expect(page.getByRole("button", { name: "ซ่อมเสร็จ", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "ยกเลิกบันทึก", exact: true })).toHaveCount(0)
  await measure.recordPage("cancelled record")
  expect((await readAsset(page.request, asset.id)).status.name, "cancelled: back to Ready").toBe("Ready")
})

// Finding AR1 (expected to fail until it is fixed): the print sheet's fields are <dt>/<dd> pairs in a <div> grid with no
// <dl> (src/components/asset-operations/operation-document-print.tsx), an axe serious "dlitem" violation on every print
// (handover, return, transfer, disposal, repair). When AR1 is fixed this test passes and Playwright reports it.
test("the repair print opens with the record's number, state and outcome (ER3, finding AR1)", async ({ page, measure }, testInfo) => {
  // AR1 fixed (FX1): this test now keeps the print's fields a description list.
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R4")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องพิมพ์บันทึกซ่อม`, ownershipType: "stock" })

  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair form")
  await page.locator("#repair-record-problem").fill(`${tag} เปลี่ยนแบตเตอรี่`)
  await answerRepair(page, { done: true, outcome: "ใช้งานได้", condition: "ดี" })
  const record = await saveRepairForm(page, measure, "save a finished repair")
  await expect(headerBadge(page)).toHaveText("ซ่อมเสร็จแล้ว")
  await page.getByRole("main").getByRole("link", { name: "พิมพ์" }).first().click()
  await page.waitForURL(new RegExp(`/th/maintenance/${record.id}/print`))
  await expect(page.getByRole("heading", { level: 1, name: "บันทึกการซ่อม" })).toBeVisible()
  await expect(page.getByText(record.repairNo).first()).toBeVisible()
  await expect(page.getByText(tag).first()).toBeVisible()
  await expect(page.getByText("ซ่อมเสร็จแล้ว").first()).toBeVisible()
  await expect(page.getByText("ใช้งานได้").first()).toBeVisible()
  await measure.recordPage("repair print")
})

// Finding AR3, decided (DX4 (ก)): the searchable select's popover is not modal, so the open search hides nothing under
// aria-hidden (axe aria-hidden-focus), and an empty result is no listbox (axe aria-required-children)
// (src/components/ui/searchable-select.tsx).
test("the open asset search passes axe (ER3, finding AR3)", async ({ page, measure }) => {
  await measure.visit("/th/maintenance/new", "repair form")
  await page.locator("#repair-record-asset").click()
  await expect(page.getByPlaceholder("พิมพ์เพื่อค้นหา...")).toBeFocused()
  // The popover fades in; axe read its empty line mid-fade once (Task 51's sixth run, phone-dark): measure it settled.
  await recordSettled(page, measure, "repair form with the asset search open")
})

// บันทึกซ่อม refuses a held asset before the save (group 5 plan 2, Review Focus 3): answered ซ่อมเสร็จแล้ว + ซ่อมไม่ได้, a
// personal asset still on its handover says who holds it on which HO-, with รับคืน (IT staff have asset:edit) back to the
// asset's page. Answered ยังซ่อมไม่เสร็จ instead, the refusal goes and the status line says what the save will do. The
// asset is never saved here.
test("a held asset is refused at once, and the refusal goes when the answer no longer hits it (group 5 plan 2, Review Focus 3)", async ({ page, measure }, testInfo) => {
  const receiver = readRunData().employees.receiver1
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "R6")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} โน้ตบุ๊กที่ยังส่งมอบอยู่`, ownershipType: "personal" })
  const handover = await handOverPermanently(page.request, masters, asset.id, receiver.id)
  expect(handover.documentNo, "the handover's document").toMatch(/^HO-/)

  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair form, a held asset")
  await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
  await answerRepair(page, { done: true, outcome: "ซ่อมไม่ได้ เสนอจำหน่าย" })
  const heldNotice = page.locator("[data-repair-held]")
  await expect(heldNotice).toContainText("อยู่กับ")
  await expect(heldNotice).toContainText(handover.documentNo)
  const returnLink = heldNotice.getByRole("link", { name: "รับคืน", exact: true })
  await expect(returnLink).toBeVisible()
  const href = (await returnLink.getAttribute("href")) ?? ""
  expect(href).toContain("/th/asset-management/checkin?checkoutId=")
  expect(href).toContain(`returnTo=%2Fth%2Fassets%2F${asset.id}`)
  expect(new URL(href, "http://repair.test").searchParams.get("checkoutId"), "รับคืน opens this handover").toBe(handover.id)
  await measure.recordPage("repair form, a held asset refused")

  // ยังซ่อมไม่เสร็จ does not hit the refusal: the notice goes, and the status line reads ใช้งานอยู่ → อยู่ระหว่างซ่อม.
  await answerRepair(page, { done: false })
  await expect(page.locator("[data-repair-held]")).toHaveCount(0)
  await expect(page.locator("[data-repair-status-line]")).toHaveText(/ใช้งานอยู่\s*→\s*อยู่ระหว่างซ่อม/)
  await measure.recordPage("repair form, a held asset not done")
})

// A PM visit recorded not done (group 5 plan 2, G5P2-R6): ?planId= pre-checks ซ่อมเสร็จแล้ว with no result, the visit is
// saved ยังซ่อมไม่เสร็จ, and the plan's next due date stays where it was (it moves only on a done visit). The run-marked
// plan is made through the app's API and ended at the end, whatever happens.
test("a PM visit saved not done leaves its plan's date, and the plan is ended (group 5 plan 2, G5P2-R6)", async ({ page, measure }, testInfo) => {
  const masters = await readAssetMasters(page)
  const tag = areaTag(testInfo, "P2")
  const asset = await createAsset(page.request, masters, { tag, name: `${tag} เครื่องสำรองไฟตรวจ PM`, ownershipType: "shared" })
  const title = `${tag} ตรวจเช็กยังไม่เสร็จ`
  const nextDueDate = bangkokToday()
  const plan = await createPlan(page.request, { assetId: asset.id, title, nextDueDate })
  try {
    await measure.visit(`/th/maintenance/new?planId=${plan.id}`, "PM visit form")
    await expect(page.locator("#repair-record-asset-value")).toContainText(tag)
    await expect(page.getByRole("radio", { name: "ซ่อมเสร็จแล้ว", exact: true })).toBeChecked()
    await expect(page.locator("#repair-record-outcome").getByRole("radio")).toHaveCount(2)
    await expect(page.locator("#repair-record-outcome").getByRole("radio", { checked: true })).toHaveCount(0)
    await answerRepair(page, { done: false })
    const record = await saveRepairForm(page, measure, "save the PM visit not done")
    expect(record.repairStatus).toBe("in_progress")
    await expect(valueBeside(page, "แผน PM")).toContainText(plan.planNo)
    await measure.recordPage("PM visit not done record")

    // The edit page holds the plan's next due date as the date input's value: unchanged.
    await measure.visit(`/th/maintenance/pm/${plan.id}/edit`, "PM plan edit page after a visit not done")
    await expect(page.locator("#maintenance-plan-next-due-date")).toHaveValue(nextDueDate)
    // The asset select loads its label after the page opens; let it finish before leaving (as ER4 does).
    await page.waitForLoadState("networkidle")
  } finally {
    await endPlan(page.request, plan.id)
  }
})
