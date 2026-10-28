// The dashboard as a person reads it (src/app/[locale]/(dashboard)/dashboard/page.tsx, page group 1): the KPI strip,
// the sections in their order, the rows of งานที่รอคุณ, and the bell's rows of the same kinds. The page marks each
// section with data-dashboard-section and each waiting row with data-waiting-key; a row's count is its .num, as the
// bell writes its own.
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { bell, bellBox } from "../shell/shell-steps.ts"
import { WAITING_ORDER, WAITING_TITLES, type WaitingKey } from "./dashboard-words.ts"
import { REVIEW_WORDS } from "../audit/review-words.ts"

// The spec file takes the browser types from here: it imports nothing from @playwright/test.
export type { Locator, Page }
export type WaitingRow = { key: WaitingKey; count: string }

export const kpiStrip = (page: Page): Locator => page.getByRole("main").locator('[data-slot="stat-strip"]').first()
export const kpiCell = (page: Page, label: string | RegExp): Locator =>
  kpiStrip(page).locator('[data-slot="stat"]').filter({ has: page.locator("dt", { hasText: label }) })
export async function kpiLabels(page: Page): Promise<string[]> {
  return (await kpiStrip(page).locator("dt").allInnerTexts()).map((text) => text.trim())
}
export const section = (page: Page, key: string): Locator => page.locator(`[data-dashboard-section="${key}"]`)
export async function sectionOrder(page: Page): Promise<string[]> {
  return page.locator("[data-dashboard-section]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dashboard-section") ?? ""))
}
export const byWaitingOrder = (left: WaitingKey, right: WaitingKey) => WAITING_ORDER.indexOf(left) - WAITING_ORDER.indexOf(right)

// The first number of a text as the page formats it: "1,380" of "1,380 79%".
export async function countIn(locator: Locator): Promise<string> {
  const match = /[\d,]+/.exec(await locator.innerText())
  if (!match) throw new Error("no number in the text")
  return match[0]
}

// The rows of งานที่รอคุณ on screen: the desktop table's rows or the phone's row links.
export async function waitingRows(page: Page): Promise<WaitingRow[]> {
  const rows: WaitingRow[] = []
  for (const row of await section(page, "waiting").locator("[data-waiting-key]").filter({ visible: true }).all()) {
    rows.push({ key: (await row.getAttribute("data-waiting-key")) as WaitingKey, count: (await row.locator(".num").first().innerText()).trim() })
  }
  return rows
}

// The list a waiting row's count opens: the desktop row holds the count link, the phone row is the link.
export async function waitingHref(page: Page, key: WaitingKey): Promise<string> {
  const row = section(page, "waiting").locator(`[data-waiting-key="${key}"]`).filter({ visible: true }).first()
  const href = await row.evaluate((node) => (node instanceof HTMLAnchorElement ? node : node.querySelector("a"))?.getAttribute("href") ?? "")
  if (!href) throw new Error(`the ${key} row has no link`)
  return href
}

// How the list a kind opens shows its total on screen (Task 3D): the approvals page's "ทั้งหมด" cell, or the
// "<from>–<to> จาก <total> รายการ" line of a list (disposal, findings, the repair list by status, the register). The
// stuck repairs and due PM open a section of the repair page, whose list foot counts the repair records, not the
// section, so they have none here.
export const LIST_TOTAL: Partial<Record<WaitingKey, "approvals" | "range">> = {
  approvalInbox: "approvals",
  openRepairs: "range",
  pendingAuditFindings: "range",
  openAuditActions: "range",
  auditActionsDueSoon: "range",
  pendingDisposals: "range",
  approvedDisposals: "range",
  returnsDueSoon: "range",
  warrantyExpiringSoon: "range",
  licenseExpiringSoon: "range",
}

// The tab a findings link lands on (group 2 plan 4, P4-R3): pending on รอพิจารณา, and the bell's open and due-soon
// actions on ต้องติดตาม, each listing the bell's own where.
export const FINDING_TABS: Readonly<Record<string, string>> = {
  pendingAuditFindings: REVIEW_WORDS.tabPending,
  openAuditActions: REVIEW_WORDS.tabFollowUp,
  auditActionsDueSoon: REVIEW_WORDS.tabFollowUp,
}

// The bell's rows (src/components/layout/notification-bell.tsx): each group is a region, each row a link whose first
// line is the kind's title and whose .num is its count; read once the summary has loaded, in the shared order.
export async function bellRows(page: Page): Promise<WaitingRow[]> {
  const box = bellBox(page)
  if (!(await box.isVisible())) await bell(page).click()
  await expect(box.getByRole("region").first()).toBeVisible()
  const keyByTitle = new Map(Object.entries(WAITING_TITLES).map(([key, title]) => [title as string, key as WaitingKey]))
  const rows: WaitingRow[] = []
  for (const link of await box.getByRole("region").getByRole("link").all()) {
    const title = (await link.locator("p").first().innerText()).trim()
    const key = keyByTitle.get(title)
    if (!key) throw new Error(`the bell lists a kind the dashboard does not know: ${title}`)
    rows.push({ key, count: (await link.locator(".num").innerText()).trim() })
  }
  return rows.sort((left, right) => byWaitingOrder(left.key, right.key))
}

// The pace a round's own dates give on a Bangkok day, as the page writes it ("75%"): clamp((today − start) /
// (due − start), 0, 1); a round that starts and ends on one day is 100% from its start.
export function expectedPace(start: string, end: string, today: string): string {
  const day = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86_400_000
  const span = day(end) - day(start)
  const pace = span <= 0 ? (day(today) >= day(start) ? 1 : 0) : Math.min(1, Math.max(0, (day(today) - day(start)) / span))
  return `${Math.round(pace * 100)}%`
}
