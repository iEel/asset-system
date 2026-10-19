// The round's pending list (/th/audit/rounds/<id>/pending, messages/th.json auditPending): find an item and mark it
// not found with the in-app dialog. The list is cards on the phone and a table on the desktop; both are in the page and
// one of them is hidden.
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"

// An item on the pending list: a card on the phone, a table row (labelled "ดู: <tag>") on the desktop.
export function pendingEntry(page: Page, device: E2eDevice, tag: string): Locator {
  return device === "phone" ? page.locator("article").filter({ hasText: tag }) : page.getByLabel(`ดู: ${tag}`, { exact: true })
}

// "บันทึกไม่พบ": a button on the phone card, an item of ⋯ in the desktop row. Confirms the dialog with no remark (none is
// needed) and answers the finding id the save returns. onDialog runs while the dialog is open (axe on it).
export async function markNotFound(page: Page, device: E2eDevice, tag: string, onDialog?: () => Promise<unknown>): Promise<string> {
  if (device === "phone") {
    await pendingEntry(page, device, tag).getByRole("button", { name: "บันทึกไม่พบ" }).click()
  } else {
    await page.getByRole("button", { name: `การดำเนินการของ ${tag}` }).click()
    await page.getByRole("menuitem", { name: "บันทึกไม่พบ" }).click()
  }
  const dialog = page.getByRole("dialog", { name: "บันทึกทรัพย์สินนี้ว่าไม่พบ" })
  await expect(dialog).toBeVisible()
  await onDialog?.()
  const marked = page.waitForResponse((response) => response.url().includes("/api/audit-items/") && response.url().endsWith("/mark-not-found"))
  await dialog.getByRole("button", { name: "ยืนยันว่าไม่พบ" }).click()
  const response = await marked
  expect(response.status(), "the not-found save").toBe(200)
  await expect(page.getByText("บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว")).toBeVisible()
  await expect(dialog).toBeHidden()
  return ((await response.json()) as { findingId: string }).findingId
}
