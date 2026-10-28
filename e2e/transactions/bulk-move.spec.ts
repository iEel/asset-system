// Spec §6.1.6: IT staff add three E2E assets at once on the batch form (spec §7: the batch form is exercised too), then
// move all three to the run's second room in one bulk move (ย้ายที่ตั้งหลายรายการ). A wrong entry first shows its errors
// under the fields (spec §6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { txAssetName, txAssetTag } from "./tx-plan.ts"
import {
  ensureSecondLocation,
  expectFieldError,
  pickAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  searchAssets,
  visit,
  visitAssetPage,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itStaff")

test("three assets added on the batch form move to the second room together", async ({ page, measure, e2eDevice }, testInfo) => {
  const { runId } = readRunState()
  const data = readRunData()
  const room = await ensureSecondLocation()
  const masters = await readAssetMasters(page)
  const tags = [1, 2, 3].map((index) => txAssetTag(runId, testInfo.project.name, `BM${index}`))
  const name = txAssetName(runId, testInfo.project.name, "จอภาพย้ายที่ตั้ง")

  // The batch form: the shared values once, a tag per row (the table on the desktop, a card per row on the phone).
  await visit(measure, "/th/assets/new", "new asset form", testInfo)
  await page.getByRole("group", { name: "วิธีเพิ่มทรัพย์สิน" }).getByRole("button", { name: "เพิ่มเป็นชุด" }).click()
  await page.locator("#asset-batch-name").fill(name)
  await page.locator("#asset-batch-category").selectOption(masters.categoryId)
  await page.locator("#asset-batch-company").selectOption(data.companyId)
  await page.locator("#asset-batch-branch").selectOption(data.branchId)
  await page.locator("#asset-batch-department").selectOption(data.departmentId)
  await page.locator("#asset-batch-current-location").selectOption(data.locationId)
  await page.locator("#asset-batch-status").selectOption(masters.readyStatusId)
  await page.locator("#asset-batch-condition").selectOption(masters.goodConditionId)
  await page.getByRole("button", { name: "เพิ่มแถว" }).click()
  await expect(page.locator("#asset-batch-row-count")).toContainText("รายการตอนนี้ 3 รายการ")
  const view = e2eDevice === "desktop" ? "row" : "card"
  for (const [index, tag] of tags.entries()) await page.locator(`#asset-batch-${view}-${index}-tag`).fill(tag)
  await record(measure, "batch form filled", testInfo)

  await page.getByRole("button", { name: "บันทึกทั้งชุด" }).click()
  await expect(page.getByText("ตรวจสอบก่อนบันทึก").first()).toBeVisible()
  for (const tag of tags) await expect(page.getByRole("main")).toContainText(tag)
  const created = page.waitForResponse((response) => response.url().endsWith("/api/assets/batch") && response.request().method() === "POST")
  await measure.timed("batch save", async () => {
    await page.getByRole("button", { name: "ยืนยันและบันทึกทั้งชุด" }).click()
    await created
  })
  const batch = (await (await created).json()) as { created: number; assetIds: string[]; assets: { id: string; assetTag: string }[] }
  expect(batch.created).toBe(3)
  expect(batch.assets.map((asset) => asset.assetTag).sort()).toEqual([...tags].sort())
  await expect(page.getByText("สร้างทรัพย์สินเป็นชุดสำเร็จ")).toBeVisible()
  await record(measure, "batch created", testInfo)

  // The bulk move: a wrong entry first (nothing chosen), then each asset typed by its tag and picked (spec 6.3).
  await visit(measure, "/th/asset-management/bulk-move", "bulk move form", testInfo)
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expectFieldError(page, "bulk-move-assets", "กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ")
  await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")
  await expectFieldError(page, "bulk-move-reason", "กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#bulk-move-assets-search")).toBeFocused()
  await expect(page.locator("#bulk-move-assets-search")).toHaveAttribute("aria-describedby", /(?:^|\s)bulk-move-assets-error(?:\s|$)/)

  for (const tag of tags) await pickAsset(page, "bulk-move-assets", tag, tag)
  await expect(page.locator("[data-asset-picked]")).toHaveCount(3)
  await expect(page.getByRole("main")).toContainText(TX_WORDS.chosenList.replace("{count}", "3"))
  await expect(page.locator("#bulk-move-assets-error")).toHaveCount(0)
  // A later answer marks the chosen ones (spec 6.1).
  const listbox = await searchAssets(page, "bulk-move-assets", tags[0].slice(0, -1))
  await expect(listbox.locator("[data-asset-option]").filter({ hasText: TX_WORDS.alreadyChosen })).toHaveCount(3)
  await record(measure, "bulk move, three chosen and a later answer", testInfo)
  await page.keyboard.press("Escape")
  await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)
  await page.locator("#bulk-move-reason").fill(`${runId} ย้ายทั้งชุดไปห้องปลายทาง`)
  const moved = page.waitForResponse((response) => response.url().endsWith("/api/assets/bulk-move") && response.request().method() === "POST")
  await measure.timed("bulk move save", async () => {
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await moved
  })
  expect((await moved).status()).toBe(200)
  await page.waitForURL("**/th/assets")
  // The register loads its list and thumbnails; leaving before they arrive would cancel them.
  await page.waitForLoadState("networkidle")
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "ย้ายที่ตั้งทรัพย์สินสำเร็จ" })).toBeVisible()

  for (const asset of batch.assets) {
    const after = await readAsset(page, asset.id)
    expect(after.currentLocationId, asset.assetTag).toBe(room.id)
    expect(after.status.name, asset.assetTag).toBe("Ready")
  }
  await visitAssetPage(measure, batch.assets[0].id, "a moved asset", testInfo)
  await expect(page.getByRole("main")).toContainText(room.name)
})
