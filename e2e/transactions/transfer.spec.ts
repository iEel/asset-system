// Spec §6.1.5: IT staff transfer (โอนย้าย) an E2E asset to the run's second room and a new custodian: the TR- document,
// the new room and custodian. Transfer had no data in the dev database and its print page had never been previewed
// (wiki #22). A wrong entry first shows its errors under the fields (spec §6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  createTxAsset,
  ensureSecondLocation,
  expectFieldError,
  expectPrints,
  findAssetRow,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  record,
  visit,
  visitAssetPage,
  TRANSACTION_PAGE_ARRIVAL_MS,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"
import { menuItem, openMoreActions, primaryAction } from "../asset-detail/detail-steps.ts"

asUser("itStaff")

const transfers = new Map<string, { assetId: string; assetTag: string; transferId: string; documentNo: string; custodian: string }>()

test.describe("transfer", () => {
  test.describe.configure({ mode: "serial" })

  test("a transfer to the second room and a new custodian: the asset's room and custodian change, and the TR- document opens and prints", async ({ page, measure, e2eDevice }, testInfo) => {
    const receiver = readRunData().employees.receiver2
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "TR1", "โน้ตบุ๊กโอนย้าย")

    await visitAssetPage(measure, asset.id, "asset before the transfer", testInfo)
    // A Ready asset's primary is ส่งมอบ; its transfer is in "อื่น ๆ" (spec §7.1).
    await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("ส่งมอบ")
    await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()
    await expect(page).toHaveURL(new RegExp(`/th/asset-management/transfer\\?assetId=${asset.id}`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await record(measure, "transfer form", testInfo)

    // A wrong entry first: no destination and no reason.
    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    await expectFieldError(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ")
    await expectFieldError(page, "transfer-reason", "กรุณาระบุข้อมูลนี้")
    await expect(page.locator("#transfer-to-location")).toBeFocused()

    await pickSearchable(page, "transfer-to-location", room.code, `${room.code} - ${room.name}`)
    await pickSearchable(page, page.getByRole("button", { name: /^ผู้ถือครองปลายทาง/ }), receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
    await page.locator("#transfer-reason").fill(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expect(page.locator("#transfer-to-location-error")).toHaveCount(0)

    await page.getByRole("button", { name: "บันทึก", exact: true }).click()
    const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนโอนย้าย" })
    await expect(review).toContainText(room.code)
    await expect(review).toContainText(receiver.fullNameTh)
    await expect(review).toContainText("ใช้งานอยู่")
    await record(measure, "transfer review", testInfo)
    const saved = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${asset.id}/transfer`) && response.request().method() === "POST")
    await measure.timed("transfer save", async () => {
      await review.getByRole("button", { name: "ยืนยันโอนย้าย" }).click()
      await saved
    })
    const transfer = (await (await saved).json()) as { id: string; documentNo: string }
    expect(transfer.documentNo).toMatch(/^TR-/)
    transfers.set(testInfo.project.name, { assetId: asset.id, assetTag: asset.assetTag, transferId: transfer.id, documentNo: transfer.documentNo, custodian: receiver.fullNameTh })

    // The form opens the TR- document (user decision 2026-10-21, FX10); the asset has the new room and custodian.
    await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    const after = await readAsset(page, asset.id)
    expect(after.currentLocationId).toBe(room.id)
    expect(after.custodianId).toBe(receiver.id)
    expect(after.status.name).toBe("In Use")
    await visitAssetPage(measure, asset.id, "asset after the transfer", testInfo)
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(receiver.fullNameTh)

    // The TR- document (wiki #22: never previewed before), opened at its address.
    await visit(measure, `/th/asset-management/transfers/${transfer.id}`, "TR- document", testInfo)
    await expect(page.getByRole("heading", { level: 1, name: "โอนย้ายทรัพย์สิน" })).toBeVisible()
    await expect(page.getByText(transfer.documentNo, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(room.name)
    await expect(page.getByRole("main")).toContainText(`${asset.assetTag} ย้ายไปห้องปลายทาง`)
    await expectPrints(page, "พิมพ์เอกสารโอนย้าย")
  })

  // Finding TX-A4: no page linked to /asset-management/transfers/<id>, so a person could not open the TR- document they
  // had just made.
  test("the TR- document opens from the asset page (finding TX-A4)", async ({ page, measure }, testInfo) => {
    // TX-A4 fixed (FX10): this test keeps the TR- document linked from the asset's history.
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    // The overview's ความเคลื่อนไหวล่าสุด and the history tab both link it (spec §7.5, §7.6).
    for (const view of [undefined, "history"] as const) {
      await visitAssetPage(measure, transfer.assetId, `asset after the transfer (${view ?? "overview"})`, testInfo, view)
      expect(await page.locator(`a[href*="/asset-management/transfers/${transfer.transferId}"]`).count(), `links to the TR- document (${view ?? "overview"})`).toBeGreaterThan(0)
    }
  })

  // Finding TX-A6: the TR- document prints the status, room and department before and after, but not the custodian, so
  // a transfer that hands the asset to a new holder has no paper naming them.
  test("the TR- document names the new custodian (finding TX-A6)", async ({ page, measure }, testInfo) => {
    // TX-A6 fixed (FX13): this test now keeps the custodian on the TR- document.
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    await visit(measure, `/th/asset-management/transfers/${transfer.transferId}`, "TR- document", testInfo)
    await expect(page.getByRole("main")).toContainText(transfer.custodian, { timeout: 3_000 })
  })

  // The transferred asset is held with no handover: รับคืน lists it as ข้อมูลเก่า under its holder, ready to pick (spec
  // 6.3). It is read, never picked, so no backfill is made (S-R7).
  test("the transferred asset is a ข้อมูลเก่า row on รับคืน, under its holder (server asset search)", async ({ page, measure }, testInfo) => {
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    const room = await ensureSecondLocation()
    await visit(measure, "/th/asset-management/checkin", "return form, empty", testInfo)
    const row = await findAssetRow(page, "checkin-checkout", transfer.assetTag, transfer.assetTag)
    await expect(row).not.toHaveAttribute("aria-disabled", "true")
    // The ข้อมูลเก่า line names the room the transfer took it to (S-R47).
    await expect(row).toContainText(TX_WORDS.legacyRow.replace("{location}", `${room.code} - ${room.name}`))
    // The group that holds the row (the inner locator is relative to the group: Playwright queries it inside each group).
    await expect(page.locator("#checkin-checkout-listbox [data-asset-option-group]").filter({ has: page.locator(`[data-asset-option="${transfer.assetId}"]`) })).toContainText(transfer.custodian)
  })
})
