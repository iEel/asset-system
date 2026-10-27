// The round's pending list (/th/audit/rounds/<id>/pending, group 2 spec §9; messages/th.json auditPending): its rows,
// its room chips, and "บันทึกไม่พบ" from the row, with the in-app dialog that names the asset. The list is cards on the
// phone and a table on the desktop; both are in the page and one of them is hidden.
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { chipByHref, chipByLabel, chipCount, expectChip } from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as W } from "./round-page-words.ts"

// The asset the not-found dialog names, with the item's expected room and custodian (spec §9, bug 13); a missing
// custodian reads "ไม่มีผู้ถือครอง".
export type PendingAsset = { tag: string; name: string; room: { code: string; name: string }; custodian: string | null }

// The rows that hold this text (a tag, or a run's prefix): cards on the phone, table rows on the desktop.
export function pendingRows(page: Page, device: E2eDevice, text: string): Locator {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: text })
}

// One item on the list, found by its tag on both screens. The desktop row still opens the asset as a whole ("ดู: <tag>",
// P2-R28); its scan link and not-found button stop the click from reaching it.
export function pendingEntry(page: Page, device: E2eDevice, tag: string): Locator {
  return pendingRows(page, device, tag)
}

// The room chips: the page's first TabNav, "ทุกห้อง N" and then the rooms.
export function roomChips(page: Page): Locator {
  return page.getByRole("main").locator('[data-slot="tab-nav"]').first()
}

// Exactly "ทุกห้อง" and these rooms (by id) with their counts; current is the chosen chip, "all" for ทุกห้อง.
export async function expectRoomChips(page: Page, all: number, rooms: Record<string, number>, current: string) {
  const row = roomChips(page)
  await expect(row.getByRole("link")).toHaveCount(1 + Object.keys(rooms).length)
  const allChip = chipByLabel(row, W.allRooms)
  await expect(chipCount(allChip)).toHaveText(all.toLocaleString("en-US"))
  for (const [locationId, count] of Object.entries(rooms)) await expectChip(row, `locationId=${locationId}`, count)
  await expect(current === "all" ? allChip : chipByHref(row, `locationId=${current}`)).toHaveAttribute("aria-current", "page")
}

// "บันทึกไม่พบ": a button on the row on both screens (spec §9, bug 14). The dialog names the asset (bug 15) and is
// confirmed with no remark (none is needed); answers the finding id the save returns. onDialog runs while the dialog
// is open (axe on it).
export async function markNotFound(page: Page, device: E2eDevice, asset: PendingAsset, onDialog?: () => Promise<unknown>): Promise<string> {
  await pendingEntry(page, device, asset.tag).getByRole("button", { name: "บันทึกไม่พบ", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกทรัพย์สินนี้ว่าไม่พบ" })
  await expect(dialog).toBeVisible()
  for (const text of [asset.name, asset.tag, asset.room.code, asset.room.name, asset.custodian ?? W.noCustodian, W.notFoundResult]) await expect(dialog).toContainText(text)
  await onDialog?.()
  const marked = page.waitForResponse((response) => response.url().includes("/api/audit-items/") && response.url().endsWith("/mark-not-found"))
  await dialog.getByRole("button", { name: "ยืนยันว่าไม่พบ" }).click()
  const response = await marked
  expect(response.status(), "the not-found save").toBe(200)
  await expect(page.getByText("บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว")).toBeVisible()
  await expect(dialog).toBeHidden()
  return ((await response.json()) as { findingId: string }).findingId
}
