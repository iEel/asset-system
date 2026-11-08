// Page group 12 plan 2 Task 5 (plan docs/superpowers/plans/2026-11-08-group12-logs-approval-history.md; spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §4, §5, boards AD-Logs and AD-ApprovalHistory): the
// system history page (/th/admin/logs) and the approval history page (/th/admin/approvals/history).
// - System history needs system:view, which no run role holds (e2e/support/run-plan.ts), so it opens with the seed
//   admin's saved session (ADMIN_STATE_FILE), as e2e/admin/users-list.spec.ts does.
// - Approval history opens as the run IT head, who holds audit:approve and disposal:approve.
// The dev database is a copy of Production whose logs grow with every run, so nothing asserts a global total: the tag
// test reads the run's own asset, the date test compares two numbers of the same page, and the approval test only
// checks that whatever rows show sit under their day heading.
// Desktop (desktop-light, desktop-dark):
// - A run asset (E2E-<run>-<project>-LOG), created by the run IT staff through the asset API (createTxAsset, in a
//   context of their own saved session): its tag finds its create log, the user column names the IT staff, the arrow
//   opens the before/after table, and the ผู้ใช้ chip set to the run viewer leaves the list empty.
// - A tag no asset starts with shows ไม่พบทรัพย์สินรหัสนี้.
// - The date chip's วันนี้ puts today's Bangkok date in the URL and the header line, and the count does not grow.
// - Approval history as the IT head: the breadcrumb, the ผู้ตัดสินใจ chip, the date chip's วันนี้, and rows under the
//   วันนี้ heading (or the empty title).
// Phone (phone-light, phone-dark):
// - The logs cards never scroll the page sideways, and a card's arrow opens and closes its detail.
// Writes: POST /api/assets once per desktop project (createTxAsset), as the run IT staff. Nothing is deleted; no settings,
// LDAP, digest or sign-in request. axe through recordSettled on every page.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, authStateFile, fromRoot } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { createTxAsset, readAssetMasters } from "../transactions/tx-support.ts"
import { bangkokDate, thaiDay } from "../transactions/tx-plan.ts"
import { APPROVAL_HISTORY_WORDS as A, LOGS_WORDS as W } from "./logs-words.ts"

const LOGS = "/th/admin/logs"
const HISTORY = "/th/admin/approvals/history"
const DESKTOP_ONLY = "the table and its filters are the desktop's; the phone test reads the cards"
const PHONE_ONLY = "the cards are the phone's (md:hidden); the desktop tests read the table"

// A yyyy-mm-dd day as the header line writes it: src/lib/utils.ts formatDate ("09/11/2569"). The server formats in its
// own time zone, Bangkok on the dev machine; the day is a UTC midnight, the same calendar day in Bangkok.
const headerDay = (day: string) =>
  new Date(day).toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" })

const whole = (pattern: RegExp) => new RegExp(`^${pattern.source}$`)

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, title: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
}

// The header line "{range} · {count} รายการ · ใหม่สุดก่อน" for a range; returns its count.
async function headerCount(page: Page, range: string): Promise<number> {
  const line = page.getByRole("main").locator("p").filter({ hasText: whole(templatePattern(W.headerLine, { range: escapeRegExp(range), count: "[\\d,]+" })) })
  await expect(line).toHaveCount(1)
  const text = await line.innerText()
  const count = /· ([\d,]+) /.exec(text)?.[1] ?? ""
  return Number(count.replaceAll(",", ""))
}

// The date chip's วันนี้ preset (a link in the chip's popover): the URL gets today's Bangkok date on both sides.
async function chooseToday(page: Page, path: string) {
  const today = bangkokDate()
  await page.getByRole("button", { name: W.dateRange, exact: true }).filter({ visible: true }).click()
  await page.getByRole("dialog", { name: W.dateRange, exact: true }).getByRole("link", { name: W.presetToday, exact: true }).click()
  await page.waitForURL((url) => url.pathname === path && url.searchParams.get("dateFrom") === today && url.searchParams.get("dateTo") === today)
  const range = fillTemplate(W.rangeBetween, { from: headerDay(today), to: headerDay(today) })
  await expect(page.getByRole("button", { name: fillTemplate(W.dateRangeApplied, { range }), exact: true }).filter({ visible: true })).toBeVisible()
  return range
}

// The system history table's rows (the caption names the table); the detail rows stay hidden until opened.
const logRows = (page: Page): Locator => page.getByRole("table", { name: W.title, exact: true }).locator("tbody > tr").filter({ visible: true })

test.describe("system history as the seed admin (group 12 plan 2)", () => {
  // The seed admin's saved session (written by the global setup): no run role holds system:view.
  test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

  test("a run asset's tag finds its logs", async ({ page, measure, e2eDevice, browser }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId, baseURL } = readRunState()
    const { users } = readRunData()
    const itStaff = users.itStaff
    const viewer = users.viewer
    if (!itStaff || !viewer) throw new Error("the run has no IT staff or viewer user: the setup did not finish")

    // The one write: the run IT staff create the asset in a context of their own saved session, so its create log
    // names them.
    const staff = await browser.newContext({ baseURL, storageState: fromRoot(authStateFile(runId, "itStaff")) })
    let asset: { id: string; assetTag: string; name: string }
    try {
      const staffPage = await staff.newPage()
      asset = await createTxAsset(staffPage, await readAssetMasters(staffPage), testInfo.project.name, "LOG", "โน้ตบุ๊กประวัติระบบ")
    } finally {
      await staff.close()
    }

    // The tag box in the page's one GET form: its single asset heads the list, with the link to its history.
    await open(page, measure, LOGS, W.title, "system history")
    const form = page.getByRole("search", { name: W.filterForm, exact: true })
    await form.getByRole("searchbox", { name: W.tagSearch, exact: true }).fill(asset.assetTag)
    await form.getByRole("button", { name: W.submit, exact: true }).click()
    await page.waitForURL((url) => url.pathname === LOGS && url.searchParams.get("tag") === asset.assetTag)
    const main = page.getByRole("main")
    await expect(main.locator("p").filter({ hasText: fillTemplate(W.tagSingleMatch, { name: asset.name, tag: asset.assetTag }) })).toHaveCount(1)
    await expect(main.getByRole("link", { name: W.assetHistoryLink, exact: true })).toBeVisible()
    await recordSettled(page, measure, "system history, the run asset's tag")

    // Its create log: one row, the IT staff's name in the user column, the action and the tag in the event.
    const rows = logRows(page)
    await expect(rows).toHaveCount(1)
    const row = rows.first()
    await expect(row.getByRole("cell").nth(1)).toHaveText(itStaff.displayName)
    await expect(row).toContainText(W.actionCreate)
    await expect(row).toContainText(asset.assetTag)

    // The arrow opens the before/after table; the asset's name is an after value. It then reads ซ่อนรายละเอียด.
    const event = `${W.actionCreate} ${asset.assetTag}`
    const expand = row.getByRole("button", { name: fillTemplate(W.expandRow, { event }), exact: true })
    await expect(expand).toHaveAttribute("aria-expanded", "false")
    await expand.click()
    const collapse = page.getByRole("button", { name: fillTemplate(W.collapseRow, { event }), exact: true })
    await expect(collapse).toHaveAttribute("aria-expanded", "true")
    const changes = page.getByRole("table", { name: W.changesCaption, exact: true })
    await expect(changes).toBeVisible()
    await expect(changes.getByRole("columnheader", { name: W.before, exact: true })).toBeVisible()
    await expect(changes.getByRole("columnheader", { name: W.after, exact: true })).toBeVisible()
    await expect(changes.getByRole("cell", { name: asset.name, exact: true })).toBeVisible()
    await recordSettled(page, measure, "system history, the create log opened")

    // The ผู้ใช้ chip set to another run user (the viewer, who made nothing here): the list is empty, the tag kept.
    await page.getByRole("button", { name: `${W.user}: ${W.userAll}`, exact: true }).filter({ visible: true }).click()
    const menu = page.getByRole("dialog", { name: W.user, exact: true })
    await menu.getByRole("combobox", { name: W.userSearch, exact: true }).fill(viewer.username)
    await menu.getByRole("option", { name: new RegExp(`· ${escapeRegExp(viewer.username)}$`) }).click()
    await page.waitForURL((url) => url.pathname === LOGS && url.searchParams.get("tag") === asset.assetTag && Boolean(url.searchParams.get("userId")))
    if (viewer.userId) expect(new URL(page.url()).searchParams.get("userId"), "the viewer's id").toBe(viewer.userId)
    await expect(main.getByText(W.emptyFiltered, { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(logRows(page).filter({ hasText: asset.assetTag })).toHaveCount(0)
    expect(await headerCount(page, W.rangeAll), "nothing by the viewer").toBe(0)
    await recordSettled(page, measure, "system history, the run asset's tag by the viewer")
  })

  test("an unknown tag shows the not-found text", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    // No asset tag starts with it: run tags read E2E-<run>-<project>-<key>, and NOTAG is no project code.
    const tag = `${readRunState().runId}-NOTAG-ZZ`
    await open(page, measure, LOGS, W.title, "system history")
    const form = page.getByRole("search", { name: W.filterForm, exact: true })
    await form.getByRole("searchbox", { name: W.tagSearch, exact: true }).fill(tag)
    await form.getByRole("button", { name: W.submit, exact: true }).click()
    await page.waitForURL((url) => url.pathname === LOGS && url.searchParams.get("tag") === tag)
    await expect(page.getByRole("main").getByText(W.tagNotFound, { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByRole("main").getByRole("link", { name: W.assetHistoryLink, exact: true })).toHaveCount(0)
    expect(await headerCount(page, W.rangeAll), "no asset, no logs").toBe(0)
    await recordSettled(page, measure, "system history, an unknown tag")
  })

  test("date presets narrow the list", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    await open(page, measure, LOGS, W.title, "system history")
    const before = await headerCount(page, W.rangeAll)

    const range = await chooseToday(page, LOGS)
    // The header line names today's range, and today's logs are a part of all of them.
    const today = await headerCount(page, range)
    expect(today, "today's logs are fewer than all logs").toBeLessThanOrEqual(before)
    await recordSettled(page, measure, "system history, today")
  })

  test("logs cards fit the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    await open(page, measure, LOGS, W.title, "system history (phone)")
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(await fits(), "the page does not scroll sideways").toBe(true)

    // The newest log's card: its arrow opens the detail it controls, then closes it.
    const card = page.locator('[data-slot="system-log-phone"] li').filter({ visible: true }).first()
    await expect(card).toBeVisible()
    const arrow = card.locator("button[aria-expanded]")
    await expect(arrow).toHaveAttribute("aria-expanded", "false")
    await expect(arrow).toHaveAttribute("aria-label", /^ดูรายละเอียด /)
    const detailId = await arrow.getAttribute("aria-controls")
    if (!detailId) throw new Error("the card's arrow controls no detail")
    const detail = page.locator(`[id="${detailId}"]`)
    await expect(detail).toBeHidden()
    await arrow.click()
    await expect(arrow).toHaveAttribute("aria-expanded", "true")
    await expect(arrow).toHaveAttribute("aria-label", /^ซ่อนรายละเอียด /)
    await expect(detail).toBeVisible()
    await recordSettled(page, measure, "system history card opened (phone)")
    expect(await fits(), "the opened card does not scroll the page sideways").toBe(true)
    await arrow.click()
    await expect(arrow).toHaveAttribute("aria-expanded", "false")
    await expect(detail).toBeHidden()
  })
})

test.describe("approval history as the run IT head (group 12 plan 2)", () => {
  asUser("itHead")

  test("approval history filters and day groups", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    await open(page, measure, HISTORY, A.title, "approval history")
    const main = page.getByRole("main")

    // The breadcrumb: the inbox link, then this page as the current crumb.
    const crumbs = page.getByRole("navigation", { name: A.breadcrumb, exact: true })
    await expect(crumbs.getByRole("link", { name: A.breadcrumbInbox, exact: true })).toHaveAttribute("href", "/th/admin/approvals")
    await expect(crumbs.getByText(A.breadcrumbHistory, { exact: true })).toHaveAttribute("aria-current", "page")
    await expect(main.getByRole("button", { name: `${A.actor}: ${A.actorAll}`, exact: true })).toBeVisible()

    // Every decision row sits under a day heading (a section named by it), before and after the date chip.
    const decisionRows = main.locator("li").filter({ has: page.locator("button[aria-expanded]") })
    const groupedRows = main.locator("section[aria-label] li").filter({ has: page.locator("button[aria-expanded]") })
    const everyRowGrouped = async () => expect(groupedRows).toHaveCount(await decisionRows.count())
    await everyRowGrouped()

    await chooseToday(page, HISTORY)
    await recordSettled(page, measure, "approval history, today")
    await everyRowGrouped()
    const rows = await decisionRows.count()
    if (rows > 0) {
      // Today's rows: all under the one วันนี้ heading.
      const heading = `${A.today} · ${thaiDay(bangkokDate())}`
      const today = main.getByRole("region", { name: heading, exact: true })
      await expect(today.getByRole("heading", { level: 3, name: heading, exact: true })).toBeVisible()
      await expect(today.locator("li").filter({ has: page.locator("button[aria-expanded]") })).toHaveCount(rows)
    } else {
      await expect(main.getByText(A.emptyTitle, { exact: true })).toBeVisible()
    }
  })
})
