// The steps a person takes on the audit scan page (/th/audit/rounds/<id>/scan), with the words on screen
// (messages/th.json auditScan): pick the room, type a name or a tag, open the check, change a field, add a photo, save,
// and read the banner. On a phone the check is a bottom sheet, on the desktop a panel beside the list; both hold the
// same form ([data-audit-check-form]).
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"

export const checkForm = (page: Page): Locator => page.locator("[data-audit-check-form]")
export const savedBanner = (page: Page): Locator => page.locator("[data-audit-scan-saved]")
export const offlineBar = (page: Page): Locator => page.locator("[data-audit-scan-offline]")
export const searchBox = (page: Page): Locator => page.getByLabel("ค้นหาทรัพย์สินในรอบนี้", { exact: true })

// The room sheet: opened by itself on the first visit of a round with several rooms, or from the room button. A room
// reads "<code> - <name>" (the round options of src/lib/audit-options.ts).
export async function pickRoom(page: Page, room: { code: string; name: string }) {
  const roomName = `${room.code} - ${room.name}`
  const sheet = page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })
  if (!(await sheet.isVisible())) await page.locator("[data-audit-scan-room]").click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: new RegExp(`^${escapeRegExp(roomName)}`) }).click()
  await expect(sheet).toBeHidden()
  await expect(page.locator("[data-audit-scan-room]")).toContainText(roomName)
}

// Type into the round's search once the last check has closed. On the phone the check is a modal sheet whose focus trap
// holds focus until its exit animation ends: text typed before that went nowhere in the rehearsal (phone-dark, note
// N-AU7), so the sheet must be gone first, and the box must hold the text.
export async function typeSearch(page: Page, text: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await searchBox(page).fill(text)
  await expect(searchBox(page)).toHaveValue(text)
}

// Type a name or a tag as a person does, then open the one result for the tag.
export async function findAndOpen(page: Page, typed: string, tag: string) {
  await typeSearch(page, typed)
  const results = page.locator("[data-audit-scan-results]")
  // The round holds one asset for each word the walk types (its own records).
  await expect(results.getByRole("status")).toHaveText("พบ 1 รายการในรอบนี้ · Enter = เปิดรายการแรก")
  await results.getByRole("button", { name: tagPattern(tag) }).click()
  await expect(checkForm(page)).toBeVisible()
  await expect(checkHeading(page, tag)).toBeVisible()
}

// The check's heading: the sheet's title on a phone, the panel's heading on the desktop.
export function checkHeading(page: Page, tag: string): Locator {
  return page.getByRole("heading", { name: tag, exact: true })
}

// One of the check's four fields (ที่ตั้ง, ผู้ถือครอง, แผนก, สภาพ): a searchable select. Types the search and picks the
// option whose label starts with the given text.
export async function chooseInCheckField(page: Page, label: "ที่ตั้ง" | "ผู้ถือครอง" | "แผนก" | "สภาพ", search: string, optionStart: string) {
  const field = checkForm(page).locator("[data-audit-check-field]").filter({ has: page.locator("label", { hasText: new RegExp(`^${label}`) }) })
  await field.getByRole("button").first().click()
  const searchInput = page.getByRole("combobox", { name: "ค้นหา" })
  await searchInput.fill(search)
  await page.getByRole("option", { name: new RegExp(`^${escapeRegExp(optionStart)}`) }).click()
  await expect(field).toHaveAttribute("data-mismatch", "true")
}

// The save button of the check names what it saves (saveAllMatch, saveMismatch, saveOutOfScope).
export const saveButton = (page: Page): Locator => checkForm(page).locator("[data-audit-check-actions]").getByRole("button", { name: /^บันทึก/ })

export async function addPhoto(page: Page, file: string) {
  await checkForm(page).locator('input[type="file"]').setInputFiles(file)
  await expect(checkForm(page).getByRole("list", { name: "รูปที่รออัปโหลด 1 รูป" })).toBeVisible()
}

// Spec §8: slow 4G on the phone's walk. WebKit has no network or CPU emulation, so each request of the page for a
// document, an RSC payload, a script, a style, a font or an image waits the round trip of a slow 4G link before it goes
// (latency only; the bandwidth is the machine's). The app's own API calls are left alone: WebKit cannot resend an
// intercepted request body when it retries on a fresh connection ("Send failed since rewinding of the data stream
// failed", rehearsal note N-AU8), and the app then queues the save as if offline. The CPU throttle of spec §8 is
// Chromium's (CDP) and is not applied on WebKit (ruling EA-R4).
export const SLOW_4G_ROUND_TRIP_MS = 150
export const isSlowedOnThePhone = (url: URL): boolean => !url.pathname.startsWith("/api/")
export async function slowNetwork(page: Page) {
  await page.route(isSlowedOnThePhone, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_4G_ROUND_TRIP_MS))
    await route.fallback()
  })
}

// The phone keyboard covers the lower half of the screen (spec §8 "the keyboard-open height"): 390×360 is what is left
// above it. The check's pinned save bar must stay on screen with the focused field above it.
export const KEYBOARD_OPEN_VIEWPORT = { width: 390, height: 360 }

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// A row or a result that names this tag.
export const tagPattern = (tag: string): RegExp => new RegExp(escapeRegExp(tag))
