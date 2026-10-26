// Spec §6.1.2–3: IT staff hand an E2E asset over (ส่งมอบ) to an E2E employee, permanently and as a temporary loan,
// with the receiver's signature (a mouse stroke on the desktop, a finger on the phone) and a photo, confirmed in the
// review dialog; the HO- document prints; a second handover of the same asset is refused. A wrong entry first shows
// its error under the field (spec §6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { bangkokDate } from "./tx-plan.ts"
import {
  createTxAsset,
  expectFieldError,
  expectPrints,
  PHOTO_FIXTURE,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  signOnPad,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { openMoreActions, primaryAction, readMenuEntries } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

test("a permanent handover: the receiver signs, a photo is attached, the review confirms; the asset is In Use with the receiver as custodian and the HO- document prints", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const receiver = readRunData().employees.receiver1
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "HO1", "โน้ตบุ๊กส่งมอบประจำ")

  // From the asset page's primary action (spec §7.1: a Ready personal asset's is ส่งมอบ), as IT staff start a handover.
  await visitAssetPage(measure, asset.id, "asset before the handover", testInfo)
  const primary = primaryAction(page, e2eDevice)
  await expect(primary).toHaveAccessibleName("ส่งมอบ")
  await primary.click()
  await expect(page).toHaveURL(new RegExp(`/th/asset-management/checkout\\?assetId=${asset.id}`))
  await expect(page.getByRole("heading", { level: 1, name: "ส่งมอบทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
  await expect(page.locator("#checkout-asset")).toContainText(asset.assetTag)
  await record(measure, "handover form", testInfo)

  // A wrong entry first: no receiver and no handover mode; each error shows under its field and the first takes focus.
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expectFieldError(page, "checkout-destination", "กรุณาระบุข้อมูลนี้")
  await expectFieldError(page, "checkout-handover-mode", "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ")
  await expectFieldError(page, "checkout-condition", "กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#checkout-destination")).toBeFocused()

  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await page.locator("#checkout-condition").selectOption({ label: "ดี" })
  await expect(page.locator("#checkout-destination-error")).toHaveCount(0)
  await expect(page.locator("#checkout-handover-mode-error")).toHaveCount(0)
  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByText("เลือกรูปแล้ว พร้อมบันทึกพร้อมรายการส่งมอบ")).toBeVisible()
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับ" }), e2eDevice, browserName)

  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })
  await expect(review).toBeVisible()
  await expect(review).toContainText(asset.assetTag)
  await expect(review).toContainText(receiver.fullNameTh)
  await expect(review).toContainText("มอบหมายใช้งานประจำ")
  await expect(review).toContainText("ใช้งานอยู่")
  await expect(review).toContainText("มีรูปหรือ ลายเซ็นแนบแล้ว")
  await record(measure, "handover review", testInfo)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
  await measure.timed("handover save", async () => {
    await review.getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
    await saved
  })
  const checkout = (await (await saved).json()) as { id: string; documentNo: string; receiverSignature: string | null; photoBefore: string | null }
  expect(checkout.documentNo).toMatch(/^HO-/)
  expect(checkout.receiverSignature, "the signature is stored with the handover").toBeTruthy()
  expect(checkout.photoBefore, "the photo is stored with the handover").toBeTruthy()

  // The HO- document opens on its own and prints.
  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkouts/${checkout.id}`)
  await expect(page.getByRole("heading", { level: 1, name: "ใบส่งมอบทรัพย์สิน" })).toBeVisible()
  await expect(page.getByText(checkout.documentNo, { exact: true }).first()).toBeVisible()
  const signature = page.getByRole("img", { name: "ผู้รับทรัพย์สิน" })
  await expect(signature).toBeVisible()
  expect(await signature.evaluate((image) => (image as HTMLImageElement).naturalWidth), "the signature image loads").toBeGreaterThan(0)
  await record(measure, "HO- document", testInfo)
  await expectPrints(page, "พิมพ์ใบส่งมอบ")

  // The outcome: In Use, the receiver holds it, in the UI and in the API.
  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("In Use")
  expect(after.custodianId).toBe(receiver.id)
  await visitAssetPage(measure, asset.id, "asset after the handover", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("ใช้งานอยู่")
  await expect(page.getByRole("main")).toContainText(receiver.fullNameTh)
  // The handover waits for the return now: รับคืน is the primary, and ส่งมอบ sits in "อื่น ๆ" with its reason (spec §7.1).
  await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("รับคืน")
  expect(await readMenuEntries(await openMoreActions(page, e2eDevice))).toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })
  await record(measure, "asset after the handover, อื่น ๆ open", testInfo)
})

test("a temporary loan: a due date before the handover date shows its error under the field; corrected, the asset is Checked Out with its due date", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
  const receiver = readRunData().employees.receiver2
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "HO2", "โน้ตบุ๊กยืมชั่วคราว")
  const today = bangkokDate()
  const dueDate = bangkokDate(7)

  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "loan form", testInfo)
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /ยืมใช้ชั่วคราว/ }).check()
  await page.locator("#checkout-condition").selectOption({ label: "ดี" })
  await page.locator("#checkout-date").fill(today)

  // A wrong entry first: the due date the day before the handover.
  await page.locator("#checkout-expected-return").fill(bangkokDate(-1))
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expectFieldError(page, "checkout-expected-return", "วันกำหนดคืนต้องเป็นวันเดียวกับหรือหลังวันที่ส่งมอบ")
  await expect(page.locator("#checkout-expected-return")).toBeFocused()
  await expect(page.getByRole("dialog")).toHaveCount(0)

  await page.locator("#checkout-expected-return").fill(dueDate)
  await expect(page.locator("#checkout-expected-return-error")).toHaveCount(0)
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับ" }), e2eDevice, browserName)
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })
  await expect(review).toContainText("ยืมใช้ชั่วคราว")
  await expect(review).toContainText("ถูกยืม")
  await expect(review).toContainText(dueDate)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
  await review.getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
  const checkout = (await (await saved).json()) as { id: string; documentNo: string; expectedReturnDate: string | null; handoverMode: string }
  expect(checkout.handoverMode).toBe("temporary_loan")
  expect(checkout.expectedReturnDate?.slice(0, 10)).toBe(dueDate)

  await page.waitForURL((url) => url.pathname === `/th/asset-management/checkouts/${checkout.id}`)
  await expect(page.getByText(checkout.documentNo, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("main")).toContainText("กำหนดคืน")
  await record(measure, "HO- document of the loan", testInfo)

  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Checked Out")
  expect(after.custodianId).toBe(receiver.id)
})

// The double checkout (spec §6.1.3) as it happens at the desk: two handover forms of the same asset are open (two IT
// staff, or one form left open); the first saves, the second is refused with the reason, and the asset stays with the
// first receiver. The refusal's reason a person reads is checked apart (finding TX-A1): it fails until the app names it.
const refusalToasts = new Map<string, string>()

test.describe("no double checkout", () => {
  test.describe.configure({ mode: "serial" })

  test("a second handover of an asset already handed over is refused, and the asset stays with the first receiver", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "HO3", "โน้ตบุ๊กส่งมอบซ้ำ")
    const fillHandover = async (form: typeof page, receiverCode: string, receiverLabel: string) => {
      await pickSearchable(form, "checkout-destination", receiverCode, receiverLabel)
      await form.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
      await form.locator("#checkout-condition").selectOption({ label: "ดี" })
      await form.getByRole("button", { name: "บันทึก", exact: true }).click()
    }
    const first = data.employees.receiver1
    const second = data.employees.receiver2

    // Both forms open before either saves.
    await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "the second desk's handover form", testInfo)
    const otherDesk = await page.context().newPage()
    await otherDesk.goto(`/th/asset-management/checkout?assetId=${asset.id}`)
    await expect(otherDesk.getByRole("heading", { level: 1, name: "ส่งมอบทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await fillHandover(otherDesk, first.code, `${first.code} - ${first.fullNameTh}`)
    const firstSaved = otherDesk.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
    await otherDesk.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" }).getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
    expect((await firstSaved).status()).toBe(201)
    await otherDesk.waitForURL("**/th/asset-management/checkouts/**")
    await otherDesk.close()

    measure.expectRefusal({ method: "POST", url: new RegExp(`/api/assets/${asset.id}/checkout$`), status: 409, reason: "the asset was handed over from the other form first" })
    await fillHandover(page, second.code, `${second.code} - ${second.fullNameTh}`)
    const refused = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
    await page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" }).getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
    expect((await refused).status()).toBe(409)
    const toast = page.locator("[data-sonner-toast][data-type=error]")
    await expect(toast).toBeVisible()
    const toastText = (await toast.innerText()).trim()
    refusalToasts.set(testInfo.project.name, toastText)
    testInfo.annotations.push({ type: "refusal shown", description: toastText })
    await expect(page).toHaveURL(new RegExp(`/th/asset-management/checkout\\?assetId=${asset.id}`))

    const after = await readAsset(page, asset.id)
    expect(after.status.name).toBe("In Use")
    expect(after.custodianId).toBe(first.id)

    // A fresh form no longer offers the asset, and its page offers the handover only as an unavailable item with its reason.
    await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "a fresh handover form", testInfo)
    await page.locator("#checkout-asset").click()
    await page.getByRole("dialog").last().getByRole("combobox").fill(asset.assetTag)
    await expect(page.getByRole("dialog").last()).toContainText("ไม่พบรายการ")
    await page.keyboard.press("Escape")
    await visitAssetPage(measure, asset.id, "asset handed over", testInfo)
    await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("รับคืน")
    expect(await readMenuEntries(await openMoreActions(page, e2eDevice))).toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })
  })

  test("the refusal says why: the asset is already handed over (finding TX-A1)", async ({ e2eTheme }, testInfo) => {
    // TX-A1 fixed (FX9): this test now keeps the refusal's reason in Thai.
    const text = refusalToasts.get(testInfo.project.name)
    expect(text, `the refusal test ran first (${e2eTheme})`).toBeTruthy()
    expect(text).toMatch(/ส่งมอบหรือยืมไม่ได้|ยังไม่รับคืน|ถูกส่งมอบแล้ว|ข้อมูลทรัพย์สินเปลี่ยนระหว่างบันทึก/)
  })
})
