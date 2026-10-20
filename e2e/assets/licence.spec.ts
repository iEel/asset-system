// Spec §7 "Assets": a software licence among the run's assets (ซอฟต์แวร์/License). IT staff register it on the asset
// form: a wrong entry first, more seats used than bought, shows its error under the field with focus on it (spec §6.7);
// corrected, the licence saves for the run's department with its seats, and its page shows the seats used and left.
// Added by the plan's final review (task LC1): its first browser run is Task 28's. Its own folder, so the transactions
// area's file list (TX7's pin) stays as rehearsed; it measures through that area's helpers (TX-R5, TX-R6).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { expectFieldError, readAssetMasters, record, visit, visitAssetPage } from "../transactions/tx-support.ts"

asUser("itStaff")

test("a software licence: more seats used than bought shows its error under the field; corrected, it saves with its seats and its page shows the seats left", async ({ page, measure }, testInfo) => {
  const { runId } = readRunState()
  const data = readRunData()
  const masters = await readAssetMasters(page)
  const tag = txAssetTag(runId, testInfo.project.name, "LIC")
  const name = txAssetName(runId, testInfo.project.name, "License ซอฟต์แวร์สำนักงาน")

  await visit(measure, "/th/assets/new", "new asset form for a software licence", testInfo)
  await page.locator("#asset-tag").fill(tag)
  await page.locator("#asset-category").selectOption(masters.categoryId)
  await page.locator("#asset-ownership-type").selectOption("software_license")
  await expect(page.locator("#asset-license-total-seats")).toBeVisible()
  await page.locator("#asset-company").selectOption(data.companyId)
  await page.locator("#asset-branch").selectOption(data.branchId)
  await page.locator("#asset-department").selectOption(data.departmentId)
  await page.locator("#asset-current-location").selectOption(data.locationId)
  await page.locator("#asset-status").selectOption(masters.readyStatusId)
  await page.locator("#asset-condition").selectOption(masters.goodConditionId)
  // The name after the category: the form suggests the category's name until one is typed.
  await page.locator("#asset-name").fill(name)
  await page.locator("#asset-license-total-seats").fill("5")
  await page.locator("#asset-license-used-seats").fill("7")
  const save = page.locator("[data-slot=sticky-form-footer]").getByRole("button", { name: "บันทึก", exact: true })
  // The tag's duplicate check runs while it is typed; the save waits for it (its reason shows beside the button).
  await expect(page.locator("#asset-save-reason")).toHaveCount(0)

  // A wrong entry first: 7 seats used of 5. Nothing is posted; the error shows under the field and the field takes focus.
  let posted = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/assets") posted += 1
  })
  await save.click()
  await expectFieldError(page, "asset-license-used-seats", "จำนวนสิทธิ์ที่ใช้ต้องไม่เกินจำนวนสิทธิ์ทั้งหมด")
  await expect(page.locator("#asset-license-used-seats")).toBeFocused()
  expect(posted, "the wrong entry posts nothing").toBe(0)
  await record(measure, "software licence form with its error", testInfo)

  await page.locator("#asset-license-used-seats").fill("2")
  await expect(page.locator("#asset-license-used-seats-error")).toHaveCount(0)

  const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets" && response.request().method() === "POST")
  await measure.timed("software licence save", async () => {
    await save.click()
    await created
  })
  expect((await created).status()).toBe(201)
  const asset = (await (await created).json()) as { id: string; assetTag: string }
  expect(asset.assetTag).toBe(tag)
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "บันทึกสำเร็จ" })).toBeVisible()
  await page.waitForURL("**/th/assets")
  // The register loads its list and thumbnails; leaving before they arrive would cancel them (TX-R10).
  await page.waitForLoadState("networkidle")

  // The saved licence: its type, its seats, the run's department, no holder.
  const read = await page.request.get(`/api/assets/${asset.id}`)
  expect(read.status()).toBe(200)
  const saved = (await read.json()) as { ownershipType: string; licenseTotalSeats: number | null; licenseUsedSeats: number | null; departmentId: string | null; custodianId: string | null }
  expect([saved.ownershipType, saved.licenseTotalSeats, saved.licenseUsedSeats, saved.departmentId, saved.custodianId]).toEqual(["software_license", 5, 2, data.departmentId, null])
  await visitAssetPage(measure, asset.id, "the new software licence", testInfo)
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
  await expect(page.locator("#overview")).toContainText("ใช้แล้ว 2/5 คงเหลือ 3")
})
