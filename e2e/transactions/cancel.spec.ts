// Spec §6.1.7: IT staff cancel the latest transaction (ยกเลิกรายการ) of an E2E asset, a handover made by mistake: the
// asset goes back to the state before it, the HO- document prints as VOID with the reason, and the asset's history keeps
// the compensating movement. A wrong entry first shows its error under the field (spec §6.7).
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData } from "../support/state.ts"
import {
  createTxAsset,
  expectFieldError,
  expectPrints,
  handoverByApi,
  readAsset,
  readAssetMasters,
  record,
  visit,
  visitAssetPage,
} from "./tx-support.ts"

asUser("itStaff")

const cancelled = new Map<string, { history: string; operator: string; staffName: string }>()

test.describe("cancel the latest transaction", () => {
  test.describe.configure({ mode: "serial" })

  test("a mistaken handover is cancelled: the asset is Ready again with no custodian, the HO- document prints as VOID with the reason, and the history keeps the cancel", async ({ page, measure }, testInfo) => {
    const receiver = readRunData().employees.receiver1
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "CX1", "โน้ตบุ๊กยกเลิกรายการ")
    const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
    const reason = `${asset.assetTag} ส่งมอบผิดคน`

    await visitAssetPage(measure, asset.id, "asset handed over by mistake", testInfo)
    await page.getByRole("button", { name: "การดำเนินการเพิ่มเติม" }).click()
    await page.getByRole("menuitem", { name: "ยกเลิกรายการ" }).click()
    const dialog = page.getByRole("dialog", { name: "ยืนยันการยกเลิกรายการ" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("กำลังตรวจสอบว่าสามารถยกเลิกได้หรือไม่")).toHaveCount(0)
    // The dialog says what it will undo: In Use with the receiver now, Ready in the first room after.
    await expect(dialog).toContainText("สถานะปัจจุบัน")
    await expect(dialog).toContainText("ใช้งานอยู่")
    await expect(dialog).toContainText("สถานะที่จะคืนกลับ")
    await expect(dialog).toContainText("พร้อมใช้งาน")
    const operator = (await dialog.locator("dt", { hasText: "ผู้ทำรายการเดิม" }).locator("xpath=following-sibling::dd[1]").innerText()).trim()
    await record(measure, "cancel dialog", testInfo)

    // A wrong entry first: a reason of three letters.
    await dialog.getByLabel("เหตุผลที่ยกเลิก").fill("ผิด")
    await dialog.getByRole("button", { name: "ยืนยันยกเลิกรายการ" }).click()
    await expectFieldError(page, "transaction-cancel-reason", "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร")
    await expect(dialog.getByLabel("เหตุผลที่ยกเลิก")).toBeFocused()

    await dialog.getByLabel("เหตุผลที่ยกเลิก").fill(reason)
    await expect(page.locator("#transaction-cancel-reason-error")).toHaveCount(0)
    const saved = page.waitForResponse((response) => response.url().endsWith(`/api/asset-checkouts/${handover.id}/cancel`) && response.request().method() === "POST")
    await measure.timed("cancel save", async () => {
      await dialog.getByRole("button", { name: "ยืนยันยกเลิกรายการ" }).click()
      await saved
    })
    expect((await saved).status()).toBe(200)
    await expect(dialog).toBeHidden()

    // Back to the state before the handover.
    const after = await readAsset(page, asset.id)
    expect(after.status.name).toBe("Ready")
    expect(after.custodianId).toBeNull()
    await expect(page.getByTestId("asset-identity-summary")).toContainText("พร้อมใช้งาน")

    // The HO- document is VOID, with the reason, and still prints.
    await visit(measure, `/th/asset-management/checkouts/${handover.id}`, "VOID HO- document", testInfo)
    const banner = page.getByRole("status").filter({ hasText: "VOID / ยกเลิกแล้ว" })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(reason)
    await expect(page.getByText(handover.documentNo, { exact: true }).first()).toBeVisible()
    await expectPrints(page, "พิมพ์ใบส่งมอบ")

    // The history keeps the handover and the cancel that undid it.
    await visitAssetPage(measure, asset.id, "asset history after the cancel", testInfo, "operations")
    const history = page.getByRole("main")
    await expect(history).toContainText("ส่งมอบทรัพย์สิน")
    const cancelEntry = history.getByText(/Checkout Cancel|ยกเลิก.*ส่งมอบ/).first()
    await expect(cancelEntry).toBeVisible()
    const staffName = readRunData().users.itStaff?.displayName ?? ""
    cancelled.set(testInfo.project.name, { history: (await cancelEntry.innerText()).trim(), operator, staffName })
    testInfo.annotations.push({ type: "cancel dialog operator shown", description: operator })
  })

  // Finding TX-A5: the cancel's movement has no Thai label (movementTypes has no checkout_cancel), so the Thai page shows
  // the raw type, "Checkout Cancel".
  test("the cancel reads in Thai in the asset's history (finding TX-A5)", async ({ e2eTheme }, testInfo) => {
    // TX-A5 fixed (FX11): this test now keeps the cancel in Thai in the history.
    const shown = cancelled.get(testInfo.project.name)
    expect(shown, `the cancel test ran first (${e2eTheme})`).toBeTruthy()
    expect(shown?.history).not.toMatch(/Checkout Cancel/)
  })

  // Finding TX-A7: the cancel dialog's "ผู้ทำรายการเดิม" (who made the transaction) shows the user's id, a UUID, not the
  // person's name.
  test("the cancel dialog names the person who made the transaction (finding TX-A7)", async ({ e2eTheme }, testInfo) => {
    test.fail(true, "TX-A7: the dialog shows the operator's user id")
    const shown = cancelled.get(testInfo.project.name)
    expect(shown, `the cancel test ran first (${e2eTheme})`).toBeTruthy()
    expect(shown?.operator).toBe(shown?.staffName)
  })
})
