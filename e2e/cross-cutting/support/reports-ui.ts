// The reports page as a person reads it (src/app/[locale]/(dashboard)/reports/page.tsx): a text on screen in the
// view's content, a view tab, and the catalog's list of the person's export rights.
import type { Page } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { E2eUserKey } from "../../support/run-plan.ts"
import { EXPORTS, permissionBadge } from "./export-rights.ts"

// reportsPage.viewAccounting, viewOperations, viewCatalog (messages/th.json).
const VIEWS = { accounting: "บัญชี", operations: "การปฏิบัติงาน", catalog: "คลังรายงาน" } as const
export type ReportView = keyof typeof VIEWS

// A text the view shows on screen (the phone shows cards where the desktop shows a table: the visible one counts).
export function inReport(page: Page, text: string) {
  return page.locator("[data-report-view-content]").getByText(text, { exact: true }).filter({ visible: true }).first()
}

// A view tab is a link in the "มุมมองรายงาน" navigation (reportsPage.viewNavigation); the view loads on the client.
export async function openView(page: Page, view: ReportView) {
  await page.getByRole("navigation", { name: "มุมมองรายงาน" }).getByRole("link", { name: VIEWS[view], exact: true }).click()
  // 30 s: the URL changes only once the view has rendered, and the operations view's data-fix queue reads the whole dev
  // register (20,000+ assets after the E2E runs; E2E-1109X/Y), as the register-after-save wait does.
  await expect(page).toHaveURL(new RegExp(`[?&]view=${view}(?:&|$)`), { timeout: 30_000 })
}

// The catalog's "สิทธิ์รายงานของคุณ" list (reportsPage.permissionTitle), opened: one badge per export, ใช้ได้ or
// ไม่มีสิทธิ์ for this user.
export async function expectCatalogRights(page: Page, user: E2eUserKey) {
  await page.locator("summary", { hasText: "สิทธิ์รายงานของคุณ" }).click()
  for (const plan of EXPORTS) await expect(page.getByText(permissionBadge(user, plan), { exact: true })).toBeVisible()
}

// The operations queue's cell (a filter link, issue=) by its label, inside the five cells: the issue badges of the rows
// below carry the same words as links.
export function queueCell(page: Page, label: string) {
  return page.locator("[data-report-ops-cells]").getByRole("link", { name: label, exact: true })
}

// A report's card in the catalog (data-report-catalog-report, src/lib/report-catalog.ts keys), in its audience's
// section (data-report-catalog-section).
export function catalogCard(page: Page, audience: string, report: string) {
  return page.locator(`[data-report-catalog-section="${audience}"] [data-report-catalog-report="${report}"]`)
}

// Today's date as the catalog's "ส่งออกล่าสุด" line writes it (formatAsOf, src/lib/dashboard-overview-rules.ts):
// Bangkok time, Buddhist year, "8 พ.ย. 2569" (the time after it is left out).
export function bangkokToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? ""
  return `${part("day")} ${part("month")} ${part("year")}`
}
