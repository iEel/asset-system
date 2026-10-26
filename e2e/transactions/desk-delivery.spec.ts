// Spec §6.1.8: the desk delivery. IT staff take the asset to the receiver's desk and do the whole handover on their
// phone: taps, the keyboard over the form while the remark is typed (the save button stays reachable), a photo, and
// the receiver's signature with a finger on the IT staff's phone; the HO- document opens on the phone. Phone projects
// only: on the desktop the same handover is handover.spec.ts. Chromium, not WebKit (ruling TX-R3): Playwright 1.61.1
// draws a finger stroke only through Chromium's touch input.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  closePhoneKeyboard,
  createTxAsset,
  expectPrints,
  expectReachable,
  openPhoneKeyboard,
  PHOTO_FIXTURE,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  signOnPad,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { primaryAction } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

test("the desk delivery on the phone: the handover with the keyboard open and a finger signature, and the HO- document on the phone", async ({ page, measure, e2eDevice, browserName }, testInfo) => {
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

  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await page.locator("#checkout-condition").selectOption({ label: "ดี" })

  // The keyboard opens over the form while the remark is typed; the save button can still be reached.
  const remark = page.getByLabel("หมายเหตุ")
  await remark.tap()
  await openPhoneKeyboard(page)
  await remark.fill(`${asset.assetTag} ส่งถึงโต๊ะผู้รับ`)
  const save = page.getByRole("button", { name: "บันทึก", exact: true })
  await expectReachable(save)
  await measure.screenshot("handover form with the keyboard open")
  await closePhoneKeyboard(page)

  await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByText("เลือกรูปแล้ว พร้อมบันทึกพร้อมรายการส่งมอบ")).toBeVisible()
  await signOnPad(page, page.getByRole("group", { name: "ลายเซ็นผู้รับ" }), e2eDevice, browserName)
  await measure.screenshot("the receiver signed with a finger")

  await save.tap()
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })
  await expect(review).toContainText(receiver.fullNameTh)
  await expect(review).toContainText("มีรูปหรือ ลายเซ็นแนบแล้ว")
  const confirm = review.getByRole("button", { name: "ยืนยันส่งมอบ" })
  await expectReachable(confirm)
  await record(measure, "handover review on the phone", testInfo)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/checkout`) && response.request().method() === "POST")
  await measure.timed("handover save on the phone", async () => {
    await confirm.tap()
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
})
