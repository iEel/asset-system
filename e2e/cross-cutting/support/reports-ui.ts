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
  await expect(page).toHaveURL(new RegExp(`[?&]view=${view}(?:&|$)`))
}

// The catalog's "สิทธิ์รายงานของคุณ" list (reportsPage.permissionTitle), opened: one badge per export, ใช้ได้ or
// ไม่มีสิทธิ์ for this user.
export async function expectCatalogRights(page: Page, user: E2eUserKey) {
  await page.locator("summary", { hasText: "สิทธิ์รายงานของคุณ" }).click()
  for (const plan of EXPORTS) await expect(page.getByText(permissionBadge(user, plan), { exact: true })).toBeVisible()
}
