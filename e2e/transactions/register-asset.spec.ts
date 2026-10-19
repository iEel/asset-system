// Spec §6.1.1: IT staff register an E2E asset on the asset form, with a photo and a purchase document. A wrong entry
// first (no room) shows its error under the field (spec §6.7); the corrected form saves the asset, its purchase
// document and its photo. On the phone the form's sticky save bar stays reachable with the keyboard open (spec §8).
// The partial-save follow-up failure is not part of this run (spec §6.1.1: its unit test covers it).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { txAssetName, txAssetTag } from "./tx-plan.ts"
import {
  closePhoneKeyboard,
  expectFieldError,
  expectReachable,
  openPhoneKeyboard,
  PDF_FIXTURE,
  PHOTO_FIXTURE,
  readAsset,
  readAssetMasters,
  record,
  visit,
  visitAssetPage,
} from "./tx-support.ts"

asUser("itStaff")

test("a new asset with a photo and a purchase document: no room first shows its error under the field, then the asset saves Ready with both", async ({ page, measure, e2eDevice }, testInfo) => {
  const { runId } = readRunState()
  const data = readRunData()
  const masters = await readAssetMasters(page)
  const tag = txAssetTag(runId, testInfo.project.name, "REG")
  const name = txAssetName(runId, testInfo.project.name, "โน้ตบุ๊กลงทะเบียนใหม่")
  const documentNo = `${tag}-PO`

  await visit(measure, "/th/assets/new", "new asset form", testInfo)
  await page.locator("#asset-tag").fill(tag)
  await page.locator("#asset-category").selectOption(masters.categoryId)
  await page.locator("#asset-company").selectOption(data.companyId)
  await page.locator("#asset-branch").selectOption(data.branchId)
  await page.locator("#asset-department").selectOption(data.departmentId)
  await page.locator("#asset-status").selectOption(masters.readyStatusId)
  await page.locator("#asset-condition").selectOption(masters.goodConditionId)
  await page.locator("#asset-purchase-document-no").fill(documentNo)
  await page.locator("#asset-purchase-document-file").setInputFiles(PDF_FIXTURE)
  await page.locator("#asset-photo-file").setInputFiles(PHOTO_FIXTURE)
  await expect(page.getByText("evidence.pdf")).toBeVisible()
  await expect(page.getByText("photo.png")).toBeVisible()
  const save = page.locator("[data-slot=sticky-form-footer]").getByRole("button", { name: "บันทึก", exact: true })
  // The tag's duplicate check runs while it is typed; the save waits for it (its reason shows beside the button).
  await expect(page.locator("#asset-save-reason")).toHaveCount(0)

  // A wrong entry first: no room. Nothing is posted; the error shows under the field and the field takes focus.
  let posted = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/assets") posted += 1
  })
  await save.click()
  await expectFieldError(page, "asset-current-location", "กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#asset-current-location")).toBeFocused()
  expect(posted, "the wrong entry posts nothing").toBe(0)
  await record(measure, "new asset form with its error", testInfo)

  await page.locator("#asset-current-location").selectOption(data.locationId)
  await expect(page.locator("#asset-current-location-error")).toHaveCount(0)

  // The name (the form suggests the category's; IT staff type their own). On the phone the keyboard opens over the form
  // while it is typed, and the sticky save bar stays reachable.
  if (e2eDevice === "phone") await openPhoneKeyboard(page)
  await page.locator("#asset-name").fill(name)
  if (e2eDevice === "phone") {
    await expectReachable(save)
    await measure.screenshot("asset form with the keyboard open")
  }

  const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets" && response.request().method() === "POST")
  const photoSaved = page.waitForResponse((response) => /\/api\/assets\/[^/]+\/attachments$/.test(new URL(response.url()).pathname) && response.request().method() === "POST")
  const documentLinked = page.waitForResponse((response) => /\/api\/assets\/[^/]+\/purchase-documents$/.test(new URL(response.url()).pathname) && response.request().method() === "POST")
  await measure.timed("asset save with its follow-ups", async () => {
    await save.click()
    await Promise.all([created, photoSaved, documentLinked])
  })
  if (e2eDevice === "phone") await closePhoneKeyboard(page)
  expect((await created).status()).toBe(201)
  expect((await photoSaved).ok(), "the photo is saved").toBe(true)
  expect((await documentLinked).ok(), "the purchase document is linked").toBe(true)
  const asset = (await (await created).json()) as { id: string; assetTag: string }
  expect(asset.assetTag).toBe(tag)
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "บันทึกสำเร็จ" })).toBeVisible()
  await page.waitForURL("**/th/assets")
  // The register loads its list and thumbnails; leaving before they arrive would cancel them.
  await page.waitForLoadState("networkidle")

  // The saved asset: Ready, with its photo and its purchase document.
  const after = await readAsset(page, asset.id)
  expect(after.status.name).toBe("Ready")
  await visitAssetPage(measure, asset.id, "the new asset", testInfo)
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
  await expect(page.getByTestId("asset-identity-summary")).toContainText("พร้อมใช้งาน")
  await expect(page.getByRole("main")).toContainText(documentNo)
  const photo = page.locator('main img[src*="/api/attachments/"]').first()
  await expect(photo).toBeVisible()
  expect(await photo.evaluate((image) => (image as HTMLImageElement).naturalWidth), "the photo loads").toBeGreaterThan(0)
})
