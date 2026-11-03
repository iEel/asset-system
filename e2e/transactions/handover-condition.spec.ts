// Group 3 spec §19 (the user's decisions of 2026-10-31): ส่งมอบ offers only ใหม่, ดี and พอใช้; a broken asset (เสียหาย,
// ใช้งานไม่ได้) is found but refused with a ส่งซ่อม link that opens its repair, and closing that repair as ใช้งานได้ + ดี
// lets it go out at once; a salvage asset (ซาก) is refused with no link; closing a repair as ซ่อมไม่ได้ makes the asset ซาก;
// the register's photo shows in the picker's rows and the summary card. IT staff change an asset's condition on the asset
// edit form, as at the desk. The desktop runs every test; the phone runs the repair loop's first half (search, reason,
// link), since the picker and the field error are the same part on both.
import { asUser, expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { readRunData } from "../support/state.ts"
import { uploadPhotoByApi } from "../asset-detail/detail-steps.ts"
import { saveRepairForm, valueBeside } from "../repair/repair-data.ts"
import {
  conditionChip,
  createTxAsset,
  expectFieldError,
  findAssetRow,
  PHOTO_FIXTURE,
  pickedAsset,
  pickSearchable,
  readAssetMasters,
  record,
  saveHandoverForm,
  visit,
  visitAssetEdit,
  visitAssetPage,
} from "./tx-support.ts"

asUser("itStaff")
const DESKTOP_ONLY = "the phone runs the repair loop's first half only; the rest is the same server and forms (spec §19)"

const REASON_DAMAGED = "สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ"
const REASON_SALVAGE = "เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้"
const CHECKOUT_PATH = "/th/asset-management/checkout"

// Playwright's types through the suite's own (the area's specs never import @playwright/test).
type Page = Measure["page"]
type TestInfo = Parameters<typeof visit>[3]
type AssetConditionRead = { condition: { name: string; nameTh: string } | null; status: { name: string } }
async function readCondition(page: Page, assetId: string): Promise<AssetConditionRead> {
  const response = await page.request.get(`/api/assets/${assetId}`)
  expect(response.status(), `GET /api/assets/${assetId}`).toBe(200)
  return (await response.json()) as AssetConditionRead
}

// The asset edit form, as IT staff: choose the condition by its Thai name and save (PUT /api/assets/<id>).
async function setConditionOnEditForm(page: Page, measure: Measure, assetId: string, label: string, testInfo: TestInfo) {
  await visitAssetEdit(measure, `/th/assets/${assetId}/edit`, `asset edit, condition ${label}`, testInfo)
  const select = page.locator("#asset-condition")
  await expect(select.locator("option", { hasText: new RegExp(`^${label}$`) })).toHaveCount(1)
  await select.selectOption({ label })
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assetId}`) && response.request().method() === "PUT")
  await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click()
  const response = await saved
  expect(response.status(), `PUT /api/assets/${assetId}: ${(await response.text()).slice(0, 300)}`).toBe(200)
  await page.waitForURL((url) => !url.pathname.endsWith("/edit"))
  expect((await readCondition(page, assetId)).condition?.nameTh).toBe(label)
}

test("ส่งมอบ offers exactly ใหม่, ดี and พอใช้ as the condition before the handover (spec §19.1)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  await visit(measure, CHECKOUT_PATH, "handover form, the conditions", testInfo)
  const radios = page.locator("#checkout-condition").getByRole("radio")
  await expect(radios).toHaveCount(3)
  for (const label of ["ใหม่", "ดี", "พอใช้"]) await expect(conditionChip(page, label)).toHaveCount(1)
  for (const label of ["ยังไม่ประเมิน", "เสียหาย", "ใช้งานไม่ได้", "ซาก"]) await expect(conditionChip(page, label)).toHaveCount(0)
})

test("the repair loop: a broken asset is refused with ส่งซ่อม; its repair closed ใช้งานได้ + ดี sets the condition, the history shows it, and the asset hands over (spec §19.3-4)", async ({ page, measure, e2eDevice }, testInfo) => {
  const receiver = readRunData().employees.receiver1
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "HC2", "โน้ตบุ๊กเสียรอซ่อม")
  await setConditionOnEditForm(page, measure, asset.id, "เสียหาย", testInfo)

  // The search finds it, refused with its reason, but it can be picked (A1-R1): the reason under the field, and ส่งซ่อม.
  await visit(measure, CHECKOUT_PATH, "handover form before the repair", testInfo)
  const row = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)
  await expect(row.locator("[data-asset-option-reason]")).toHaveText(REASON_DAMAGED)
  await row.click()
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await expectFieldError(page, "checkout-asset", REASON_DAMAGED)
  const repairLink = page.locator("[data-checkout-repair-link]").filter({ visible: true })
  await expect(repairLink).toHaveText("ส่งซ่อม")
  await expect(repairLink).toHaveAttribute("href", `/th/maintenance/new?assetId=${asset.id}`)
  await record(measure, "handover form, a broken asset picked", testInfo)
  // The phone stops here (DESKTOP_ONLY): the repair and the handover after it are the desktop's.
  if (e2eDevice === "phone") return

  // ส่งซ่อม opens a new repair for the asset; recorded as already done, ใช้งานได้ asks สภาพหลังซ่อม (none chosen: เสียหาย is
  // not offered), and ดี is chosen.
  await repairLink.click()
  await page.waitForURL((url) => url.pathname === "/th/maintenance/new" && url.searchParams.get("assetId") === asset.id)
  await expect(page.locator("#repair-record-asset-value")).toContainText(asset.assetTag)
  await page.locator("#repair-record-problem").fill(`${asset.assetTag} จอแตก เปลี่ยนจอแล้ว`)
  // No answer is pre-checked (group 5 plan 2): ซ่อมเสร็จแล้ว, then ใช้งานได้.
  await page.getByRole("radio", { name: "ซ่อมเสร็จแล้ว", exact: true }).check()
  await page.getByRole("radio", { name: "ใช้งานได้", exact: true }).check()
  const condition = page.locator("#repair-create-condition")
  await expect(condition).toContainText("สภาพหลังซ่อม")
  await expect(condition.getByRole("radio")).toHaveCount(2)
  await expect(condition.getByRole("radio", { checked: true })).toHaveCount(0)
  await condition.getByRole("radio", { name: "ดี", exact: true }).check()
  await record(measure, "repair form, done, condition ดี", testInfo)
  const repair = await saveRepairForm(page, measure, "save the repair done")

  // The asset page: the condition is ดี, and the history shows the change from เสียหาย to ดี.
  expect((await readCondition(page, asset.id)).condition?.nameTh).toBe("ดี")
  await visitAssetPage(measure, asset.id, "asset after the repair", testInfo)
  await expect(valueBeside(page.getByRole("main"), "สภาพ")).toContainText("ดี")
  await visitAssetPage(measure, asset.id, "asset history after the repair", testInfo, "history")
  // The repair's row names its MT- record; the edit's row before it reads ดี → เสียหาย.
  const change = page.getByRole("main").getByRole("row").filter({ visible: true }).filter({ hasText: "เปลี่ยนสภาพ" }).filter({ hasText: "เสียหาย → ดี" })
  await expect(change).toHaveCount(1)
  await expect(change).toContainText(repair.repairNo)

  // Back on ส่งมอบ: it is takeable now, and it goes to an employee (the HO- document opens).
  await visit(measure, CHECKOUT_PATH, "handover form after the repair", testInfo)
  const takeable = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)
  await expect(takeable.locator("[data-asset-option-reason]")).toHaveCount(0)
  await takeable.click()
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await expect(page.locator("#checkout-asset-error")).toHaveCount(0)
  await expect(page.locator("[data-checkout-repair-link]")).toHaveCount(0)
  await expect(conditionChip(page, "ดี")).toBeChecked()
  // IT assesses it at the handover as พอใช้ (spec §19.1): the handover writes that condition to the asset.
  await conditionChip(page, "พอใช้").check()
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  const checkout = await saveHandoverForm(page, e2eDevice, asset.id)
  expect(checkout.documentNo).toMatch(/^HO-/)
  await expect(page.getByText(checkout.documentNo, { exact: true }).first()).toBeVisible()
  const handedOver = await readCondition(page, asset.id)
  expect(handedOver.status.name).toBe("In Use")
  expect(handedOver.condition?.nameTh, "the condition chosen at the handover").toBe("พอใช้")

  // The asset page shows the condition chosen at the handover, and the history's row for it names the HO- record.
  await visitAssetPage(measure, asset.id, "asset after the handover", testInfo)
  await expect(valueBeside(page.getByRole("main"), "สภาพ")).toContainText("พอใช้")
  await visitAssetPage(measure, asset.id, "asset history after the handover", testInfo, "history")
  const assessed = page.getByRole("main").getByRole("row").filter({ visible: true }).filter({ hasText: "เปลี่ยนสภาพ" }).filter({ hasText: "ดี → พอใช้" })
  await expect(assessed).toHaveCount(1)
  await expect(assessed).toContainText(checkout.documentNo)
})

test("a salvage asset is refused as รอตัดจำหน่าย, with no ส่งซ่อม link (spec §19.3)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "HC3", "โน้ตบุ๊กซาก")
  await setConditionOnEditForm(page, measure, asset.id, "ซาก", testInfo)

  await visit(measure, CHECKOUT_PATH, "handover form, a salvage asset", testInfo)
  const row = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)
  await expect(row.locator("[data-asset-option-reason]")).toHaveText(REASON_SALVAGE)
  await row.click()
  await expectFieldError(page, "checkout-asset", REASON_SALVAGE)
  await expect(page.locator("[data-checkout-repair-link]")).toHaveCount(0)
  await record(measure, "handover form, a salvage asset picked", testInfo)
})

test("closing an open repair as ซ่อมไม่ได้ says the condition becomes ซาก, and it does (spec §19.4)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "HC4", "โน้ตบุ๊กซ่อมไม่ได้")

  await visit(measure, `/th/maintenance/new?assetId=${asset.id}`, "repair form, an open repair", testInfo)
  await expect(page.locator("#repair-record-asset-value")).toContainText(asset.assetTag)
  await page.locator("#repair-record-problem").fill(`${asset.assetTag} เมนบอร์ดเสีย`)
  await page.getByRole("radio", { name: "ยังซ่อมไม่เสร็จ", exact: true }).check()
  const repair = await saveRepairForm(page, measure, "save the open repair")

  await page.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกว่าซ่อมเสร็จ" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("radio", { name: "ซ่อมไม่ได้ เสนอจำหน่าย" }).check()
  await expect(dialog).toContainText("สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก")
  await expect(dialog.locator("#repair-complete-condition")).toHaveCount(0)
  await record(measure, "repair complete dialog, ซ่อมไม่ได้", testInfo)
  const completed = page.waitForResponse((response) => response.url().endsWith(`/api/maintenance-tickets/${repair.id}`) && response.request().method() === "PATCH")
  await dialog.getByRole("button", { name: "ซ่อมเสร็จ", exact: true }).click()
  expect((await completed).status()).toBe(200)
  await expect(dialog).toBeHidden()

  const after = await readCondition(page, asset.id)
  expect(after.condition?.nameTh).toBe("ซาก")
  expect(after.status.name).toBe("Pending Disposal")
  await visitAssetPage(measure, asset.id, "asset after ซ่อมไม่ได้", testInfo)
  await expect(valueBeside(page.getByRole("main"), "สภาพ")).toContainText("ซาก")
})

test("the register's photo shows in the picker's row and the summary card; an asset without one shows the empty frame (spec §19.5)", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice === "phone", DESKTOP_ONLY)
  const masters = await readAssetMasters(page)
  const withPhoto = await createTxAsset(page, masters, testInfo.project.name, "HC5", "โน้ตบุ๊กมีรูป")
  const withoutPhoto = await createTxAsset(page, masters, testInfo.project.name, "HC6", "โน้ตบุ๊กไม่มีรูป")
  await uploadPhotoByApi(page, withPhoto.id)

  const summary = page.locator('[data-slot="operation-summary-card"]').filter({ visible: true })
  await visit(measure, CHECKOUT_PATH, "handover form, an asset with a photo", testInfo)
  const row = await findAssetRow(page, "checkout-asset", withPhoto.assetTag, withPhoto.assetTag)
  const rowImage = row.locator("img")
  await expect(rowImage).toHaveCount(1)
  await expect.poll(() => rowImage.evaluate((image) => (image as HTMLImageElement).naturalWidth), { message: "the row's photo loads" }).toBeGreaterThan(0)
  await row.click()
  await expect(pickedAsset(page, withPhoto.id)).toContainText(withPhoto.assetTag)
  const cardImage = summary.locator("img")
  await expect(cardImage).toHaveCount(1)
  await expect.poll(() => cardImage.evaluate((image) => (image as HTMLImageElement).naturalWidth), { message: "the card's photo loads" }).toBeGreaterThan(0)
  await record(measure, "handover form, a photo in the summary", testInfo)

  // รูปก่อนส่งมอบ: the chosen photo shows under the dropzone, and the review's รูปก่อนส่งมอบ line shows it at 48 px
  // beside แนบแล้ว (final review M5). The review is closed with ยกเลิก: nothing is saved.
  const receiver = readRunData().employees.receiver1
  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  const chosen = page.locator('[data-slot="chosen-photo-preview"] img').filter({ visible: true })
  await expect(chosen).toHaveCount(1)
  await expect.poll(() => chosen.evaluate((image) => (image as HTMLImageElement).naturalWidth), { message: "the chosen photo loads" }).toBeGreaterThan(0)
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await page.getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })
  await expect(review).toBeVisible()
  const photoLine = review.locator("dl > div").filter({ has: page.locator("dt", { hasText: /^รูปก่อนส่งมอบ$/ }) })
  await expect(photoLine).toContainText("แนบแล้ว")
  const reviewPhoto = photoLine.locator('[data-slot="chosen-photo-preview"] img')
  await expect(reviewPhoto).toHaveCount(1)
  await expect(reviewPhoto).toHaveAttribute("width", "48")
  await expect.poll(() => reviewPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth), { message: "the review's photo loads" }).toBeGreaterThan(0)
  await record(measure, "handover review, the photo before the handover", testInfo)
  await review.getByRole("button", { name: "ยกเลิก", exact: true }).click()
  await expect(review).toBeHidden()

  await visit(measure, CHECKOUT_PATH, "handover form, an asset without a photo", testInfo)
  const plain = await findAssetRow(page, "checkout-asset", withoutPhoto.assetTag, withoutPhoto.assetTag)
  await expect(plain.locator("img")).toHaveCount(0)
  await expect(plain.locator("svg").first()).toBeVisible()
  await plain.click()
  await expect(pickedAsset(page, withoutPhoto.id)).toContainText(withoutPhoto.assetTag)
  await expect(summary).toBeVisible()
  await expect(summary.locator("img")).toHaveCount(0)
  await expect(summary.locator("svg").first()).toBeVisible()
})
