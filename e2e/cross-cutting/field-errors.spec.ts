// Errors under the field in the real flow (spec §6.7, the V track): in each workflow's form, IT staff make one wrong
// entry first (an empty required field, or a date pair reversed), the error shows under that field with focus on it,
// and the corrected entry then saves for real. One test per form; each registers its own E2E asset.
import { expect, test, asUser } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import { fillReturn, isoDay, save } from "./support/forms.ts"
import { createAsset, handOver, projectMarker, readAsset, readAssetChoices, returnAsset } from "./support/records.ts"
import { choose, expectFieldError, expectNoFieldError } from "./support/ui.ts"

asUser("itStaff")

// common.validation and the forms' own sentences (messages/th.json; the unit test pins them).
const REQUIRED = "กรุณาระบุข้อมูลนี้"
const END_BEFORE_START = "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"
const HANDOVER_MODE_REQUIRED = "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ"
const DUPLICATE_TAG = "รหัสทรัพย์สินนี้ถูกใช้งานแล้ว"

test("asset register: a warranty that ends before it starts shows its error, and the corrected asset saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const tag = `${projectMarker(testInfo)}-FE-ASSET`
  // Opened from the register filtered to this tag, so the save returns there (the unfiltered register's first page
  // holds other runs' assets, whose photos may sit in another checkout's upload folder: findings, note N10).
  const register = `/th/assets?search=${encodeURIComponent(tag)}`
  await measure.visit(`/th/assets/new?returnTo=${encodeURIComponent(register)}`, "asset form")
  await page.locator("#asset-tag").fill(tag)
  await page.locator("#asset-name").fill(`${projectMarker(testInfo)} ฟอร์มทะเบียน`)
  await page.locator("#asset-category").selectOption(choices.categoryId)
  await page.locator("#asset-ownership-type").selectOption("shared")
  await page.locator("#asset-company").selectOption(run.companyId)
  await page.locator("#asset-branch").selectOption(run.branchId)
  await page.locator("#asset-department").selectOption(run.departmentId)
  await page.locator("#asset-current-location").selectOption(run.locationId)
  await page.locator("#asset-status").selectOption(choices.readyStatusId)
  await page.locator("#asset-condition").selectOption(choices.goodConditionId)
  await page.locator("#asset-warranty-start").fill("2026-02-01")
  await page.locator("#asset-warranty-end").fill("2026-01-01")
  await save(page)
  await expectFieldError(page, "asset-warranty-end", END_BEFORE_START)

  await page.locator("#asset-warranty-end").fill("2027-01-31")
  await expectNoFieldError(page, "asset-warranty-end")
  await measure.timed("asset save", async () => {
    await save(page)
    await expect(page).toHaveURL(new RegExp(`/th/assets\\?search=${encodeURIComponent(tag)}`))
  })
  await expect(page.getByRole("main").getByText(tag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
  await measure.recordPage("register after the asset save")
})

test("asset register: a tag already in use shows its error under the tag as it is typed, and the save goes to it", async ({ page, measure }, testInfo) => {
  const choices = await readAssetChoices(page, measure)
  const existing = await createAsset(page.request, testInfo, choices, { slug: "FE-DUP", name: "รหัสซ้ำ" })
  await page.locator("#asset-tag").fill(existing.assetTag)
  await page.locator("#asset-name").fill(`${projectMarker(testInfo)} รหัสซ้ำอีกครั้ง`)
  // The form checks the tag as it is typed (src/components/assets/asset-form.tsx, /api/assets/duplicates); the save
  // waits for that check, then focuses the tag.
  await expect(page.locator("#asset-tag-error")).toHaveText(DUPLICATE_TAG)
  await save(page)
  await expectFieldError(page, "asset-tag", DUPLICATE_TAG)
  await measure.recordPage("asset form with the duplicate tag")
})

// Finding M3 (expected to fail until fixed): two saves of one typed tag at once (the form's duplicate check sees
// neither) reach the database's unique constraint, and the asset route answers 500 "Unexpected error" instead of the
// tag's field error.
test("a typed tag that already exists is refused with the tag's field error, not a 500 (finding M3)", async ({ page, measure }, testInfo) => {
  // M3 fixed (FX7): this test now keeps a taken typed tag the tag's field error.
  const choices = await readAssetChoices(page, measure)
  const existing = await createAsset(page.request, testInfo, choices, { slug: "FE-RACE", name: "รหัสซ้ำพร้อมกัน" })
  const again = await page.request.post("/api/assets", {
    data: {
      assetTag: existing.assetTag,
      name: `${projectMarker(testInfo)} รหัสซ้ำพร้อมกัน 2`,
      categoryId: choices.categoryId,
      companyId: readRunData().companyId,
      branchId: readRunData().branchId,
      ownershipType: "shared",
      departmentId: readRunData().departmentId,
      currentLocationId: readRunData().locationId,
      statusId: choices.readyStatusId,
      conditionId: choices.goodConditionId,
      purchaseDate: null,
      purchasePrice: null,
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    },
  })
  expect(again.status()).toBe(400)
  expect(((await again.json()) as { fieldErrors?: Record<string, string> }).fieldErrors?.assetTag).toBe("duplicate")
})

test("handover: no handover mode shows its error, and the corrected handover saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-HO", name: "ฟอร์มส่งมอบ", ownershipType: "personal" })
  await measure.visit(`/th/asset-management/checkout?assetId=${asset.id}`, "handover form")
  await expect(page.locator("#checkout-asset")).toContainText(asset.assetTag)
  await choose(page, "checkout-destination", run.employees.receiver2.code)
  await page.locator("#checkout-condition").selectOption(choices.goodConditionId)
  await save(page)
  await expectFieldError(page, "checkout-handover-mode", HANDOVER_MODE_REQUIRED, { group: true, focus: 'input[name="handoverModeChoice"][value="permanent_assignment"]' })

  await page.getByRole("radio", { name: /^มอบหมายใช้งานประจำ/ }).check()
  await expectNoFieldError(page, "checkout-handover-mode")
  await save(page)
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })
  await expect(review).toBeVisible()
  await measure.recordPage("handover review")
  await measure.timed("handover save", async () => {
    await review.getByRole("button", { name: "ยืนยันส่งมอบ" }).click()
    // The handover's document (HO-), src/components/asset-operations/checkout-form.tsx.
    await expect(page).toHaveURL(/\/th\/asset-management\/checkouts\/[0-9a-f-]{36}(?:[?#]|$)/)
  })
  // The document opens with its number; its axe is the finding M8 test's.
  await expect(page.getByText(/HO-\d{6}-\d+/).first()).toBeVisible()
  const saved = await readAsset(page.request, asset.id)
  expect([saved.status.name, saved.custodianId]).toEqual(["In Use", run.employees.receiver2.id])
})

test("return: no one who returns it shows its error, and the corrected return saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-RT", name: "ฟอร์มรับคืน", ownershipType: "personal" })
  const checkout = await handOver(page.request, asset, run.employees.receiver1.id, choices)
  await measure.visit(`/th/asset-management/checkin?checkoutId=${checkout.id}`, "return form")
  await expect(page.locator("#checkin-checkout")).toContainText(asset.assetTag)
  await save(page)
  await expectFieldError(page, "checkin-return-by", REQUIRED)

  await fillReturn(page, choices)
  await expectNoFieldError(page, "checkin-return-by")
  await save(page)
  // The review dialog's axe is the finding M9 test's (its body fails on the phone).
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })
  await expect(review).toBeVisible()
  await measure.timed("return save", async () => {
    await review.getByRole("button", { name: "ยืนยันรับคืน" }).click()
    // The return's document (RT-), src/components/asset-operations/checkin-form.tsx.
    await expect(page).toHaveURL(/\/th\/asset-management\/checkins\/[0-9a-f-]{36}(?:[?#]|$)/)
  })
  await expect(page.getByText(/RT-\d{6}-\d+/).first()).toBeVisible()
  const saved = await readAsset(page.request, asset.id)
  expect([saved.status.name, saved.custodianId]).toEqual(["Ready", null])
})

// Finding M8 (expected to fail until fixed): the handover (HO-) and return (RT-) documents lay their fields out as
// <dt>/<dd> pairs outside a <dl>, an axe serious violation (dlitem, WCAG 1.3.1), on every device.
test("the handover and return documents open and pass axe (finding M8)", async ({ page, measure }, testInfo) => {
  // M8 fixed (FX1): this test now keeps the documents' fields a description list.
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-DOC", name: "เอกสารส่งมอบ", ownershipType: "personal" })
  const checkout = await handOver(page.request, asset, run.employees.receiver1.id, choices)
  const checkin = await returnAsset(page.request, asset, checkout.id, choices)
  await measure.visit(`/th/asset-management/checkouts/${checkout.id}`, "handover document")
  await expect(page.getByText(/HO-\d{6}-\d+/).first()).toBeVisible()
  await measure.visit(`/th/asset-management/checkins/${checkin.id}`, "return document")
  await expect(page.getByText(/RT-\d{6}-\d+/).first()).toBeVisible()
})

// Finding M9 (expected to fail on the phone until fixed): the return's review dialog scrolls its body on a phone, and
// the scrolling body cannot take keyboard focus (axe serious scrollable-region-focusable, WCAG 2.1.1). On the desktop
// the body does not scroll and the dialog passes.
test("the return's review dialog passes axe (finding M9 on the phone)", async ({ page, measure }, testInfo) => {
  // M9 fixed (FX3): this test now keeps the return review's scrolling body reachable from the keyboard on the phone.
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-RV", name: "ตรวจสอบก่อนรับคืน", ownershipType: "personal" })
  const checkout = await handOver(page.request, asset, run.employees.receiver1.id, choices)
  await measure.visit(`/th/asset-management/checkin?checkoutId=${checkout.id}`, "return form (review)")
  await fillReturn(page, choices)
  await save(page)
  await expect(page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })).toBeVisible()
  await measure.recordPage("return review")
})

test("transfer: an empty reason shows its error, and the corrected transfer saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-TR", name: "ฟอร์มโอนย้าย", ownershipType: "personal" })
  await measure.visit(`/th/asset-management/transfer?assetId=${asset.id}`, "transfer form")
  await expect(page.locator("#transfer-asset")).toContainText(asset.assetTag)
  await choose(page, page.getByRole("button", { name: /^ผู้ถือครองปลายทาง/ }), run.employees.receiver1.code)
  await save(page)
  await expectFieldError(page, "transfer-reason", REQUIRED)

  await page.locator("#transfer-reason").fill(`${projectMarker(testInfo)} ย้ายให้ผู้ใช้งาน`)
  await expectNoFieldError(page, "transfer-reason")
  await save(page)
  const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนโอนย้าย" })
  await expect(review).toBeVisible()
  await measure.recordPage("transfer review")
  await measure.timed("transfer save", async () => {
    await review.getByRole("button", { name: "ยืนยันโอนย้าย" }).click()
    // The transfer opens its TR- document (src/components/asset-operations/transfer-form.tsx, FX10).
    await expect(page).toHaveURL(new RegExp(`/th/asset-management/transfers/[^/?#]+(?:[?#]|$)`))
  })
  // The transfer lands on its TR- document; here, what was saved.
  expect((await readAsset(page.request, asset.id)).custodianId).toBe(run.employees.receiver1.id)
})

test("repair record: an empty problem shows its error, and the corrected record saves", async ({ page, measure }, testInfo) => {
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-MT", name: "ฟอร์มบันทึกซ่อม" })
  await measure.visit(`/th/maintenance/new?assetId=${asset.id}`, "repair record form")
  await expect(page.locator("#repair-record-asset")).toContainText(asset.assetTag)
  await page.getByRole("radio", { name: /^ยังซ่อมไม่เสร็จ/ }).check()
  await save(page)
  await expectFieldError(page, "repair-record-problem", REQUIRED)

  await page.locator("#repair-record-problem").fill(`${projectMarker(testInfo)} เปิดเครื่องไม่ติด`)
  await expectNoFieldError(page, "repair-record-problem")
  await measure.timed("repair record save", async () => {
    await save(page)
    await expect(page).toHaveURL(/\/th\/maintenance\/[0-9a-f-]{36}(?:[?#]|$)/)
  })
  await measure.recordPage("after the repair record save")
  expect((await readAsset(page.request, asset.id)).status.name).toBe("Under Maintenance")
})

test("PM plan: an empty title shows its error, and the corrected plan saves", async ({ page, measure }, testInfo) => {
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-PM", name: "ฟอร์มแผน PM" })
  await measure.visit("/th/maintenance/pm/new", "PM plan form")
  await choose(page, "maintenance-plan-asset", asset.assetTag)
  await save(page)
  await expectFieldError(page, "maintenance-plan-title", REQUIRED)

  const title = `${projectMarker(testInfo)} ทำความสะอาดรายเดือน`
  await page.locator("#maintenance-plan-title").fill(title)
  await expectNoFieldError(page, "maintenance-plan-title")
  let planId = ""
  await measure.timed("PM plan save", async () => {
    const created = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/maintenance-plans")
    await save(page)
    const response = await created
    expect(response.status(), "the plan is created").toBe(201)
    planId = ((await response.json()) as { id: string }).id
    await expect(page).toHaveURL(/\/th\/maintenance\/pm(?:[?#]|$)/)
  })
  await measure.recordPage("after the PM plan save")
  // The list is sorted by due date and grows run by run on the dev data: the saved plan is read on its own page.
  await measure.visit(`/th/maintenance/pm/${planId}/edit`, "the saved PM plan")
  await expect(page.locator("#maintenance-plan-title")).toHaveValue(title)
  // The asset select loads its label after the page opens; the test ends once it has (e2e fix loop 2).
  await page.waitForLoadState("networkidle")
})

test("disposal request: an empty reason shows its error, and the corrected request saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-DP", name: "ฟอร์มขอตัดจำหน่าย" })
  await measure.visit(`/th/disposal/new?assetId=${asset.id}`, "disposal request form")
  await choose(page, "disposal-request-requested-by", run.employees.itStaff.code)
  await save(page)
  await expectFieldError(page, "disposal-request-reason", REQUIRED)

  await page.locator("#disposal-request-reason").fill(`${projectMarker(testInfo)} ชำรุดเกินซ่อม ขอตัดจำหน่าย`)
  await expectNoFieldError(page, "disposal-request-reason")
  await measure.timed("disposal request save", async () => {
    await save(page)
    await expect(page).toHaveURL(/\/th\/disposal\/[0-9a-f-]{36}(?:[?#]|$)/)
  })
  await measure.recordPage("after the disposal request save")
  expect((await readAsset(page.request, asset.id)).status.name).toBe("Pending Disposal")
})

test("audit round: an end date before the start shows its error, and the corrected round saves", async ({ page, measure }, testInfo) => {
  const run = readRunData()
  const choices = await readAssetChoices(page, measure)
  // The round's scope is the run's room and the Draft status: only this run's Draft assets, never another area's.
  const asset = await createAsset(page.request, testInfo, choices, { slug: "FE-AUD", name: "ฟอร์มรอบตรวจนับ", status: "draft" })
  await measure.visit("/th/audit/rounds/new", "audit round form")
  const name = `${projectMarker(testInfo)} รอบตรวจฟอร์ม`
  await page.locator("#audit-round-name").fill(name)
  await page.getByLabel("ที่ตั้ง", { exact: true }).selectOption(run.locationId)
  await page.getByLabel("สถานะทรัพย์สิน", { exact: true }).selectOption(choices.draftStatusId)
  await page.locator("#audit-round-start-date").fill(isoDay(1))
  await page.locator("#audit-round-end-date").fill(isoDay(0))
  await save(page)
  await expectFieldError(page, "audit-round-end-date", END_BEFORE_START)

  await page.locator("#audit-round-end-date").fill(isoDay(11))
  await expectNoFieldError(page, "audit-round-end-date")
  await page.getByRole("button", { name: "ดูตัวอย่าง" }).click()
  await expect(page.getByText(asset.assetTag).first()).toBeVisible()
  await measure.timed("audit round save", async () => {
    await save(page)
    await expect(page).toHaveURL(/\/th\/audit\/rounds\/[0-9a-f-]{36}(?:[?#]|$)/)
  })
  await measure.recordPage("after the audit round save")
  await expect(page.getByRole("main").getByText(name).first()).toBeVisible()
})
