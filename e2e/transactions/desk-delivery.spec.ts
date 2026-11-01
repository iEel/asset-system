// Spec §6.1.8: the desk delivery. IT staff take the asset to the receiver's desk and do the whole handover on their
// phone, as the three steps of one form (group 3 spec §7.4, ruling P1-R4): step 1 the asset and the receiver (taps, the
// keyboard over the form while the remark is typed, a photo), step 2 the receiver reads it back on the phone, step 3 the
// receiver signs with a finger; the HO- document opens on the phone. A loan to a room is received on the room's behalf
// and saves unsigned. Phone projects only: on the desktop the same handover is handover.spec.ts. Chromium, not WebKit
// (ruling TX-R3): Playwright 1.61.1 draws a finger stroke only through Chromium's touch input.
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { bangkokDate } from "./tx-plan.ts"
import {
  closePhoneKeyboard,
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  expectPrints,
  expectReachable,
  openPhoneKeyboard,
  PHOTO_FIXTURE,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  signOnPad,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"
import { primaryAction } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

test("the desk delivery on the phone: step 1's checks, the read-back, a finger signature, the HO- document", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  test.skip(e2eDevice !== "phone", "the desk delivery is done on the phone (spec §6.1.8)")
  const receiver = readRunData().employees.receiver1
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "DSK", "โน้ตบุ๊กส่งถึงโต๊ะ")

  await visitAssetPage(measure, asset.id, "asset on the phone", testInfo)
  // The primary sits in the bottom bar: a link named ส่งมอบ (spec §7.8).
  const primary = primaryAction(page, "phone")
  await expect(primary).toHaveAccessibleName("ส่งมอบ")
  await primary.tap()
  await expect(page).toHaveURL(new RegExp(`/th/asset-management/checkout\\?assetId=${asset.id}`))
  await expect(page.getByRole("heading", { level: 1, name: "ส่งมอบทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  await record(measure, "handover form on the phone", testInfo)

  // Step 1: the way out instead of the desktop's footer, and its checks before the read-back.
  const steps = page.locator("#checkout-phone-steps")
  await expect(steps).toContainText("ขั้นที่ 1 จาก 3")
  await expect(page.getByRole("link", { name: TX_WORDS.phoneCancelBack })).toBeVisible()
  await expect(page.getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true })).toBeHidden()
  const next = page.getByRole("button", { name: TX_WORDS.phoneNext, exact: true })
  await next.tap()
  await expectFieldError(page, "checkout-destination", "กรุณาระบุข้อมูลนี้")
  await expectFieldError(page, "checkout-handover-mode", "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ")
  await expect(page.locator("#checkout-destination")).toBeFocused()

  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await expect(conditionChip(page, "ดี")).toBeChecked()
  await expect(page.getByText(/^วันที่ส่งมอบ: วันนี้ /)).toBeVisible()

  // The keyboard opens over the form while the remark is typed; the next button can still be reached.
  const remark = page.getByLabel("หมายเหตุ")
  const remarkText = `${asset.assetTag} ส่งถึงโต๊ะผู้รับ`
  await remark.tap()
  await openPhoneKeyboard(page)
  await remark.fill(remarkText)
  await expectReachable(next)
  await measure.screenshot("handover form with the keyboard open")
  await closePhoneKeyboard(page)

  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByText("เลือกรูปแล้ว พร้อมบันทึกพร้อมรายการส่งมอบ")).toBeVisible()

  // Step 2: the receiver reads it back on the phone; no review dialog.
  await next.tap()
  const readBack = page.locator("[data-checkout-read-back]")
  await expect(readBack).toBeVisible()
  // ผู้ถือครอง and แผนก as the desktop summary (user 2026-11-01): every run employee sits in the run's department, the asset's too.
  const runDepartment = runRecords(readRunState().runId).department
  for (const text of [receiver.fullNameTh, asset.assetTag, "รูปก่อนส่งมอบ 1 รูป", "มอบหมายใช้งานประจำ", "ใช้งานอยู่", remarkText, "ผู้ถือครอง", "แผนก", runDepartment.name]) await expect(readBack).toContainText(text)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await record(measure, "handover read-back on the phone", testInfo)

  // Something is wrong: back to step 1 with every choice kept, then on again.
  await page.getByRole("button", { name: TX_WORDS.phoneFix, exact: true }).tap()
  await expect(page.locator("#checkout-destination")).toContainText(receiver.fullNameTh)
  await next.tap()
  const confirm = page.getByRole("button", { name: TX_WORDS.phoneAccept, exact: true })
  await expectReachable(confirm)
  await confirm.tap()

  // Step 3: the statement and the finger signature. Going back to the check drops it, so it is signed again.
  const statement = page.locator("[data-checkout-sign-statement]")
  await expect(statement).toContainText(`ข้าพเจ้าได้รับ ${asset.assetTag}`)
  await expect(statement).toContainText("ในสภาพดี")
  const pad = page.getByRole("group", { name: "ลายเซ็นผู้รับ" })
  await signOnPad(page, pad, e2eDevice, browserName)
  await page.getByRole("button", { name: TX_WORDS.phoneBackToCheck }).tap()
  await confirm.tap()
  await expect(pad.getByRole("button", { name: "ล้างลายเซ็น" })).toBeDisabled()
  await signOnPad(page, pad, e2eDevice, browserName)
  await measure.screenshot("the receiver signed with a finger")

  const save = page.getByRole("button", { name: TX_WORDS.phoneSave, exact: true })
  await expectReachable(save)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
  await measure.timed("handover save on the phone", async () => {
    await save.tap()
    await saved
  })
  const checkout = (await (await saved).json()) as { id: string; documentNo: string; receiverSignature: string | null }
  expect(checkout.receiverSignature, "the finger signature is stored").toBeTruthy()

  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkouts/${checkout.id}`)
  await expect(page.getByText(checkout.documentNo, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("img", { name: "ผู้รับทรัพย์สิน" })).toBeVisible()
  await record(measure, "HO- document on the phone", testInfo)
  await expectPrints(page, "พิมพ์ใบส่งมอบ")

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("In Use")
  expect(after.custodianId).toBe(receiver.id)

  // A fresh form from the asset now handed over starts with it chosen but blocked, the reason under the field
  // (Appendix A ส่งมอบ, spec 6.4); handover.spec.ts checks it on the desktop.
  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "a fresh handover form on the phone", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)
})

test("a loan to a room on the phone: the due date is checked on step 1, the read-back says ถูกยืม, the statement reads รับในนามของ the room, and it saves unsigned", async ({ page, measure, e2eDevice }, testInfo) => {
  test.skip(e2eDevice !== "phone", "the desk delivery is done on the phone (spec §6.1.8)")
  const room = await ensureSecondLocation()
  const roomLabel = `${room.code} - ${room.name}`
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "DSL", "จอยืมให้ห้องประชุม")

  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "a loan form on the phone", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await page.locator("#checkout-type").getByText("ที่ตั้ง").tap()
  await pickSearchable(page, "checkout-destination", room.code, roomLabel)

  // A wrong due date first: refused on step 1, under its field.
  const next = page.getByRole("button", { name: TX_WORDS.phoneNext, exact: true })
  await page.locator("#checkout-expected-return").fill(bangkokDate(-1))
  await next.tap()
  await expectFieldError(page, "checkout-expected-return", "วันกำหนดคืนต้องเป็นวันเดียวกับหรือหลังวันที่ส่งมอบ")
  await expect(page.locator("#checkout-expected-return")).toBeFocused()
  await page.locator("#checkout-expected-return").fill(bangkokDate(7))
  await next.tap()

  const readBack = page.locator("[data-checkout-read-back]")
  // A room handover keeps the asset's department and shows the room (user 2026-11-01).
  for (const text of [room.name, "ยืมใช้ชั่วคราว", "ถูกยืม", "กำหนดคืน", runRecords(readRunState().runId).department.name]) await expect(readBack).toContainText(text)
  await page.getByRole("button", { name: TX_WORDS.phoneAccept, exact: true }).tap()

  await expect(page.locator("[data-checkout-sign-statement]")).toContainText(TX_WORDS.signOnBehalf.replace("{destination}", roomLabel))
  await record(measure, "the loan's sign step on the phone", testInfo)

  // No signature: it is optional, and the save goes through.
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
  await page.getByRole("button", { name: TX_WORDS.phoneSave, exact: true }).tap()
  const checkout = (await (await saved).json()) as { id: string; handoverMode: string }
  expect(checkout.handoverMode).toBe("temporary_loan")
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkouts/${checkout.id}`)

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Checked Out")
  expect(after.currentLocationId).toBe(room.id)
})
