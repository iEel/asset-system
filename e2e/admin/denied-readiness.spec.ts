// Page group 12 plan 1 Task 4 (plan docs/superpowers/plans/2026-11-08-group12-denied-readiness.md; spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §6, §9, boards AD-Denied and AD-Readiness): the denied
// page, the approvals pages' redirect to it, and the readiness page.
// - The run viewer (no setting:view, e2e/support/run-plan.ts) opens the readiness page: the denied page names
//   ความพร้อมใช้งานจริง, the permission in Thai words (ดู · ตั้งค่าระบบ), the viewer's run role, and offers the back
//   button. Desktop and phone. The plan named the settings page, which asks for the same setting:view; the suite never
//   names the settings page's path (tests/e2e-review.test.ts HZ1, the settings-save hazard), so the readiness page,
//   behind the same gate, stands in for it.
// - The run viewer (no disposal:approve or audit:approve) opens the approvals inbox and its history: both land on the
//   denied page with the approval words.
// - The seed admin (setting:view) opens /th/admin/readiness: the four group headings, the chip counts that add up to the
//   total, and ต้องแก้ shows only fail rows or the empty text. No single check's status is asserted: they follow the dev
//   server's env.
// Writes: none. Every request is a page load. axe through recordSettled on every page (the approvals helper records the
// denied page as the roles spec does).
import type { Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { roleDisplayFor } from "../support/run-plan.ts"
import { readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { expectApprovalInboxDenied } from "../cross-cutting/support/roles-ui.ts"
import { DENIED_WORDS as D, READINESS_WORDS as R } from "./denied-readiness-words.ts"

const READINESS = "/th/admin/readiness"

test.describe("the denied page", () => {
  asUser("viewer")

  test("a run user without a permission sees the page named and the permission in Thai", async ({ page, measure }) => {
    // The dashboard's loading.tsx streams the page, so requirePagePermission's redirect lands after the first load.
    await page.goto(READINESS, { waitUntil: "load" })
    await expect(page).toHaveURL(new RegExp(`/th/access-denied\\?(?=.*module=setting)(?=.*action=view)(?=.*from=${encodeURIComponent(READINESS)}(?:&|$))`))
    const main = page.getByRole("main")
    // The title is plain text, not a heading (findings, note N13).
    await expect(main.getByText(fillTemplate(D.titleNamed, { page: D.readinessPage }), { exact: true })).toBeVisible()
    const permission = fillTemplate(D.permissionWords, { action: D.actionView, module: D.moduleSetting })
    await expect(main.getByText(fillTemplate(D.needs, { permission }), { exact: true })).toBeVisible()
    // The viewer's run role by its Thai name; the roles spec may have added the viewer to its no-permission role too.
    const roles = main.getByText(new RegExp(`^${D.yourRoles.replace("{roles}", "")}`))
    await expect(roles).toBeVisible()
    await expect(roles).toContainText(roleDisplayFor("viewer", readRunState().runId).displayNameTh)
    await expect(main.getByRole("button", { name: D.goBack, exact: true })).toBeVisible()
    await expect(main.getByRole("link", { name: D.backHome, exact: true })).toBeVisible()
    await page.waitForLoadState("load")
    await recordSettled(page, measure, "denied: readiness (viewer)")
  })

  test("approvals pages send a non-approver to the denied page", async ({ page, measure }) => {
    await expectApprovalInboxDenied(page, measure, "the viewer")
    await expectApprovalInboxDenied(page, measure, "the viewer, history", "/th/admin/approvals/history")
  })
})

// A chip's count: the number in its link ("ต้องแก้ 3" → 3).
async function chipCount(page: Page, word: string): Promise<number> {
  const chip = page.getByRole("navigation", { name: R.filterLabel }).getByRole("link", { name: new RegExp(`^${word}\\s*[\\d,]+$`) })
  const text = (await chip.locator(".num").textContent()) ?? ""
  return Number(text.replace(/[^\d]/g, ""))
}

async function openReadiness(page: Page, measure: Measure, path: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: R.title, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
}

test.describe("the readiness page", () => {
  // The seed admin's saved session (written by the global setup): no run role holds setting:view.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("readiness shows groups, chips and filters", async ({ page, measure }) => {
    await openReadiness(page, measure, READINESS, "readiness")
    const main = page.getByRole("main")
    for (const group of R.groups) await expect(main.getByRole("heading", { level: 3, name: group, exact: true })).toBeVisible()

    const all = await chipCount(page, R.filterAll)
    const fail = await chipCount(page, R.filterFail)
    const warning = await chipCount(page, R.filterWarning)
    const pass = await chipCount(page, R.filterPass)
    expect(all).toBeGreaterThan(0)
    expect(fail + warning + pass).toBe(all)
    await expect(main.locator('[data-slot="readiness-filter-chips"] p')).toHaveText(`${fail} + ${warning} + ${pass} = ${all}`)
    await expect(page.getByRole("navigation", { name: R.filterLabel }).getByRole("link", { name: new RegExp(`^${R.filterAll}`) })).toHaveAttribute("aria-current", "page")

    // ต้องแก้: only fail rows, or the empty text when nothing fails. Each check shows one badge, in the table from md or
    // in its card below md, so only the visible ones count.
    await page.getByRole("navigation", { name: R.filterLabel }).getByRole("link", { name: new RegExp(`^${R.filterFail}`) }).click()
    await page.waitForURL((url) => url.pathname === READINESS && url.searchParams.get("filter") === "fail")
    await expect(page.getByRole("navigation", { name: R.filterLabel }).getByRole("link", { name: new RegExp(`^${R.filterFail}`) })).toHaveAttribute("aria-current", "page")
    const badges = main.locator('section[aria-label] [data-slot="status-badge"]').filter({ visible: true })
    if (fail === 0) {
      await expect(main.getByText(R.filterEmpty, { exact: true })).toBeVisible()
      await expect(badges).toHaveCount(0)
    } else {
      await expect(badges).toHaveCount(fail)
      await expect(badges.filter({ hasNotText: R.statusFail })).toHaveCount(0)
      await expect(main.getByText(R.filterEmpty, { exact: true })).toHaveCount(0)
    }
    await recordSettled(page, measure, "readiness: ต้องแก้")
  })
})
