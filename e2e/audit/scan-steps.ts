// The steps a person takes on the audit scan page (/th/audit/rounds/<id>/scan, group 2 spec §11, §12), with the words on
// screen (messages/th.json auditScan; the walk's new words in ./scan-words.ts): pick or clear the room, read the switch
// and the category chips, type a name or a tag, open the check, answer ตรง or ไม่ตรง per field and choose what was
// found, add a photo, save, and read the banner. On a phone the check is a bottom sheet, on the desktop a panel beside
// the list; both hold the same form ([data-audit-check-form]).
import type { Locator, Page, Request, Response } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { SCAN_WORDS } from "./scan-words.ts"

export const checkForm = (page: Page): Locator => page.locator("[data-audit-check-form]")
export const savedBanner = (page: Page): Locator => page.locator("[data-audit-scan-saved]")
export const offlineBar = (page: Page): Locator => page.locator("[data-audit-scan-offline]")
export const shellBanner = (page: Page): Locator => page.locator("[data-shell-banner]")
export const searchBox = (page: Page): Locator => page.getByLabel("ค้นหาทรัพย์สินในรอบนี้", { exact: true })

const formatted = (count: number) => count.toLocaleString("en-US")

// The room button: the chosen room's "<code> - <name>" with "ห้องนี้ตรวจแล้ว x / y · เหลือ z" and "เปลี่ยนห้อง" (bug 21),
// or "เลือกห้องที่กำลังตรวจ" with none.
export function roomButton(page: Page): Locator {
  return page.locator("[data-audit-scan-room]")
}

// The room sheet: opened by itself on the first visit of a round with several rooms, or from the room button. A room
// reads "<code> - <name>" (the round options of src/lib/audit-options.ts).
export async function pickRoom(page: Page, room: { code: string; name: string }) {
  const roomName = `${room.code} - ${room.name}`
  const sheet = page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })
  if (!(await sheet.isVisible())) await roomButton(page).click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: new RegExp(`^${escapeRegExp(roomName)}`) }).click()
  await expect(sheet).toBeHidden()
  await expect(roomButton(page)).toContainText(roomName)
}

// "ไม่เลือกห้อง": the walk reads the whole round. The empty choice is stored, so the sheet does not open by itself again.
export async function clearRoom(page: Page) {
  const sheet = page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })
  await roomButton(page).click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: SCAN_WORDS.roomClear, exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(roomButton(page)).toContainText(SCAN_WORDS.roomPick)
}

// The header's counts (spec §11): "x / y" over "ไม่ตรง N", of the round's own items (P3-R1, P3-R2).
export function progress(page: Page): Locator {
  return page.locator("[data-audit-scan-progress]")
}

// The switch: ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (ทั้งรอบ with no room), each with its count (P3-R7). It stays above the
// search results.
export function tabs(page: Page): Locator {
  return page.getByRole("group", { name: SCAN_WORDS.tabsLabel, exact: true })
}

// Exactly these tabs in this order, each label with its count.
export async function expectTabs(page: Page, expected: readonly (readonly [string, number])[]) {
  await expect(tabs(page).getByRole("button")).toHaveText(expected.map(([label, count]) => new RegExp(`^${escapeRegExp(label)}\\s*${formatted(count)}$`)))
}

// The category chips under the switch (decision 3, P3-R6): toggle buttons, "ทุกหมวดหมู่" first (P3-R16), absent at one category.
export function categoryChips(page: Page): Locator {
  return page.getByRole("group", { name: SCAN_WORDS.categoryChipsLabel, exact: true })
}

// "ทุกหมวดหมู่ <all>", chosen, then one chip per category with these counts in this order (by count, P3-R6). The
// categories are the dev data's own, so a chip is read by its count and its place, never by its name.
export async function expectCategoryChips(page: Page, all: number, counts: readonly number[]) {
  const chips = categoryChips(page).getByRole("button")
  await expect(chips).toHaveText([new RegExp(`^${escapeRegExp(SCAN_WORDS.categoryAll)}\\s*${formatted(all)}$`), ...counts.map((count) => new RegExp(`\\D\\s*${formatted(count)}$`))])
  await expect(chips.first()).toHaveAttribute("aria-pressed", "true")
}

// The room list's rows: the round's own items of the room, the tab and the category.
export function roomRows(page: Page): Locator {
  return page.locator("[data-audit-scan-room-list] [data-audit-scan-row]")
}

// The ตรวจแล้ว tab's recorded out-of-scope finds, apart from the rows and the counts: a heading "บันทึกนอกขอบเขตแล้ว N"
// and one button per find with its "นอกขอบเขต" badge (P3-R25).
export function recordedFinds(page: Page): Locator {
  return page.locator("[data-audit-scan-room-list] [data-audit-scan-recorded-out-of-scope]")
}

// Type into the round's search once the last check has closed. On the phone the check is a modal sheet whose focus trap
// holds focus until its exit animation ends: text typed before that went nowhere in the rehearsal (phone-dark, note
// N-AU7), so the sheet must be gone first, and the box must hold the text.
export async function typeSearch(page: Page, text: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await searchBox(page).fill(text)
  await expect(searchBox(page)).toHaveValue(text)
}

// The search's results: one status line, then one list item per match shown.
export function searchResults(page: Page): Locator {
  return page.locator("[data-audit-scan-results]")
}

export function searchRows(page: Page): Locator {
  return searchResults(page).getByRole("listitem")
}

// The line names the words typed and counts every match, the chosen room's and the others' (bug 20, P3-R5).
export async function expectSearchLine(page: Page, term: string, inRoom: number, otherRooms: number) {
  await expect(searchResults(page).getByRole("status")).toHaveText(fillTemplate(SCAN_WORDS.searchLine, { term, inRoom: formatted(inRoom), otherRooms: formatted(otherRooms) }))
}

// Type a name or a tag as a person does, then open the result for the asset. The round holds one asset for each word the
// walk types (its own records): in the chosen room unless found says where. A tag typed whole is an exact code, so its
// item is the first result wherever its room is (P3-R17).
export async function findAndOpen(page: Page, typed: string, asset: { tag: string; name: string }, found = { inRoom: 1, otherRooms: 0 }) {
  await typeSearch(page, typed)
  await expectSearchLine(page, typed, found.inRoom, found.otherRooms)
  await searchRows(page).getByRole("button", { name: tagPattern(asset.tag) }).click()
  await expect(checkForm(page)).toBeVisible()
  await expect(checkHeading(page, asset)).toBeVisible()
}

// The check's heading, the asset's name (bug 23): the sheet's title on a phone, the panel's heading on the desktop.
export function checkHeading(page: Page, asset: { name: string }): Locator {
  return page.getByRole("heading", { name: asset.name, exact: true })
}

// The check's fields, as the scan route compares them; a field the asset's ownership does not compare is not shown
// (bug 22: custodian for a non-personal asset, location for a licence).
export type CheckFieldKey = "location" | "custodian" | "department" | "condition"

export function checkField(page: Page, field: CheckFieldKey): Locator {
  return checkForm(page).locator(`[data-audit-check-field="${field}"]`)
}

// The field's ตรง / ไม่ตรง (spec §12). Exact: "ตรง" is a part of "ไม่ตรง".
export function fieldAnswer(page: Page, field: CheckFieldKey, answer: "match" | "mismatch"): Locator {
  return checkField(page, field).getByRole("button", { name: answer === "match" ? SCAN_WORDS.fieldMatch : SCAN_WORDS.fieldMismatch, exact: true })
}

// "ที่พบ": the searchable select ไม่ตรง opens; its name is the label, then the chosen value.
export function foundSelect(page: Page, field: CheckFieldKey): Locator {
  return checkField(page, field).getByRole("button", { name: new RegExp(`^${escapeRegExp(SCAN_WORDS.foundValue)}`) })
}

// ไม่ตรง, then "ที่พบ": types the search and picks the option whose label starts with the text, or matches the pattern.
export async function chooseInCheckField(page: Page, field: CheckFieldKey, search: string, option: string | RegExp) {
  await fieldAnswer(page, field, "mismatch").click()
  await expect(fieldAnswer(page, field, "mismatch")).toHaveAttribute("aria-pressed", "true")
  await foundSelect(page, field).click()
  // Exact: the popover is not modal (decision DX4), so the top bar's "ค้นหาทั่วระบบ" stays reachable beside it.
  const searchInput = page.getByRole("combobox", { name: "ค้นหา", exact: true })
  await searchInput.fill(search)
  await page.getByRole("option", { name: typeof option === "string" ? new RegExp(`^${escapeRegExp(option)}`) : option }).click()
  await expect(checkField(page, field)).toHaveAttribute("data-mismatch", "true")
}

// The save button of the check names what it saves (saveAllMatch, saveMismatch, saveOutOfScope).
export const saveButton = (page: Page): Locator => checkForm(page).locator("[data-audit-check-actions]").getByRole("button", { name: /^บันทึก/ })

export async function addPhoto(page: Page, file: string) {
  await checkForm(page).locator('input[type="file"]').setInputFiles(file)
  await expect(checkForm(page).getByRole("list", { name: "รูปที่รออัปโหลด 1 รูป" })).toBeVisible()
}

// The check's saves of one asset (a POST of the scan route whose body names it), so a step can show it sent nothing.
export function watchScanPosts(page: Page, roundId: string, assetId: string): { posts: string[]; stop: () => void } {
  const posts: string[] = []
  const watch = (request: Request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `/api/audit-rounds/${roundId}/scan` && request.postData()?.includes(`"assetId":"${assetId}"`)) posts.push(request.url())
  }
  page.on("request", watch)
  return { posts, stop: () => page.off("request", watch) }
}

// The next save's answer, then the status sync the page runs after an out-of-scope save (scan-status), so the next step
// reads the rows the server now holds, the find among them. The sync is awaited only once the save has answered, so an
// earlier poll never stands in for it.
export function nextScanSave(page: Page, roundId: string): { saved: Promise<Response>; synced: Promise<Response> } {
  const saved = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/audit-rounds/${roundId}/scan`)
  const synced = saved.then(() => page.waitForResponse((response) => new URL(response.url()).pathname === `/api/audit-rounds/${roundId}/scan-status`))
  return { saved, synced }
}

// Spec §11: the switch stays above the search results.
export async function expectAbove(upper: Locator, lower: Locator) {
  const [top, bottom] = await Promise.all([upper.boundingBox(), lower.boundingBox()])
  if (!top || !bottom) throw new Error("the switch or the results are not on screen")
  expect(top.y + top.height, "the upper one ends above the lower one").toBeLessThanOrEqual(bottom.y + 1)
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
