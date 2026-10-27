// The steps on the round page (group 2 spec §8) and the chip rows it shares with its pending list (§9): the result
// list's rows and chip rows, a chip row's counts against the rows each chip opens (spec §5 "counts equal lists"), the
// next-step card, the "ไม่ตรงเรื่องอะไร" card with its field bars and its components line, a removable filter chip, and
// a button that must sit whole inside its card (spec §13 bug 2).
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { ROUND_PAGE_WORDS } from "./round-page-words.ts"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const formatted = (count: number) => count.toLocaleString("en-US")

// A finding's field as the URL names it (field=…, Task 1's auditFindingFields).
export type AuditField = "location" | "department" | "custodian" | "condition"

// The run's own rows of the result list: the phone's cards or the desktop table's rows (the other one is hidden).
export function resultRows(page: Page, device: E2eDevice, tagPrefix: string): Locator {
  return page.locator("#audit-result-list").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: tagPrefix })
}

// The result chips: the result list's first TabNav. The category chips: its second (hidden at one category).
export function resultChips(page: Page): Locator {
  return page.locator('#audit-result-list [data-slot="tab-nav"]').nth(0)
}

export function categoryChips(page: Page): Locator {
  return page.locator('#audit-result-list [data-slot="tab-nav"]').nth(1)
}

// One chip by its label, its count after it.
export function chipByLabel(row: Locator, label: string): Locator {
  return row.getByRole("link", { name: new RegExp(`^${escape(label)}\\s*[\\d,]*$`) })
}

// One chip by a part of its link (categoryId=…, locationId=…): the ids are the run's own, the labels may repeat.
export function chipByHref(row: Locator, hrefPart: string): Locator {
  return row.locator(`a[href*="${hrefPart}"]`)
}

// The count TabNav writes after a chip's label (its last span.num, src/components/ui/tab-nav.tsx).
export function chipCount(chip: Locator): Locator {
  return chip.locator("span.num").last()
}

export async function chipLabel(chip: Locator): Promise<string> {
  const [text, count] = await Promise.all([chip.textContent(), chipCount(chip).textContent()])
  const whole = (text ?? "").trim()
  return whole.slice(0, whole.length - (count ?? "").trim().length).trim()
}

// Exactly these chips in this order, each with its count.
export async function expectChips(row: Locator, chips: readonly (readonly [string, number])[]) {
  await expect(row.getByRole("link")).toHaveText(chips.map(([label, count]) => new RegExp(`^${escape(label)}\\s*${formatted(count)}$`)))
}

export async function expectChip(row: Locator, hrefPart: string, count: number) {
  const chip = chipByHref(row, hrefPart)
  await expect(chip).toHaveCount(1)
  await expect(chipCount(chip)).toHaveText(formatted(count))
}

// The app registers its service worker on window load (src/components/pwa/pwa-service-worker-register.tsx); a goto
// right after a load cancels that sw.js fetch and the measurement records a failed request (WebKit, E2E-1027B). Before
// each navigation away, the registration is let settle, at most five seconds (no service worker: no wait).
export async function settleServiceWorker(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker?.ready.then(() => undefined) ?? Promise.resolve(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]),
  )
}

// Spec §5: each chip of the row opens rows of its own count. Every chip's link is opened in turn, then the page the
// step started on. The rows are the run's own, so another run's data never counts.
export async function expectChipsMatchRows(page: Page, row: Locator, rows: Locator) {
  const start = page.url()
  const chips = await row.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href") ?? "",
      text: (link.textContent ?? "").trim(),
      count: Array.from(link.querySelectorAll("span.num")).pop()?.textContent?.trim() ?? "",
    })),
  )
  expect(chips.length, "the row has chips").toBeGreaterThan(0)
  for (const chip of chips) {
    expect(chip.count, `${chip.text}: a count`).toMatch(/^[\d,]+$/)
    await settleServiceWorker(page)
    await page.goto(chip.href)
    await expect(rows, `${chip.text}: its count is its rows (spec §5)`).toHaveCount(Number(chip.count.replace(/,/g, "")))
  }
  await settleServiceWorker(page)
  await page.goto(start)
}

// A card of the page: the ContentPanel section whose heading matches (the innermost, should panels nest).
function card(page: Page, heading: RegExp): Locator {
  return page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { level: 2, name: heading }) }).last()
}

// "ขั้นถัดไป: …" (spec §8): the steps, their lines, the main button and, at step 3, "ปิดรอบตรวจ".
export function nextStepCard(page: Page): Locator {
  return card(page, new RegExp(`^${escape(ROUND_PAGE_WORDS.nextStep)}`))
}

// "ไม่ตรงเรื่องอะไร" (spec §8): a bar per field, then "เครื่องที่ส่วนควบไม่ครบ N".
export function mismatchCard(page: Page): Locator {
  return card(page, new RegExp(`^${escape(ROUND_PAGE_WORDS.mismatchCard)}$`))
}

// A field's bar: a link only while its count is above 0. A `has:` filter must use a page-rooted locator; a locator
// chained from the card never matches inside an li.
export function fieldBar(mismatch: Locator, field: AuditField): Locator {
  return mismatch.locator(`a[href*="field=${field}"]`)
}

export function componentsMissingLine(mismatch: Locator): Locator {
  return mismatch.locator('a[href*="components=missing"]')
}

// A removable chip of the list's filters ("ล้างตัวกรองนี้: …"), by a part of its label.
export function filterChip(page: Page, text: string): Locator {
  return page
    .getByRole("group", { name: ROUND_PAGE_WORDS.activeFilters })
    .getByRole("link", { name: new RegExp(`^${escape(ROUND_PAGE_WORDS.clearFilter)}: .*${escape(text)}`) })
}

// Spec §13 bug 2: the button sits whole inside its card, not over its edge.
export async function expectInside(inner: Locator, outer: Locator) {
  await inner.scrollIntoViewIfNeeded()
  const [box, frame] = await Promise.all([inner.boundingBox(), outer.boundingBox()])
  if (!box || !frame) throw new Error("the button or its card is not on screen")
  expect(box.x, "the button starts inside its card").toBeGreaterThanOrEqual(frame.x - 1)
  expect(box.x + box.width, "the button ends inside its card").toBeLessThanOrEqual(frame.x + frame.width + 1)
  expect(box.y + box.height, "the button ends above its card's bottom").toBeLessThanOrEqual(frame.y + frame.height + 1)
}
