// Page group 9 plan 3 Task 3 (plan docs/superpowers/plans/2026-11-07-group9-notifications-page.md; spec
// docs/superpowers/specs/2026-11-07-page-group-9-work-center-notifications-design.md §4, boards WC and WC-Phone): the
// rebuilt work center (/th/work-center), in all four projects, as the run's IT head (the only run role with
// dashboard:view, e2e/support/run-plan.ts; no permission was added for this task).
// The dev database is a copy of Production with thousands of queue rows whose counts move, so nothing asserts a global
// total: every step compares two surfaces of the same render, or reads the run's own record.
// - The strip: งานค้างทั้งหมด equals the sum of its queue cells (the desktop card, or the phone's one-line sum), each
//   queue tab's count equals its cell, and the ภาพรวม tab's count equals the total; the header's การแจ้งเตือน names the
//   bell's number. แสดงเพิ่ม takes the table from 8 rows to 16 (show=16) while more than 8 are waiting. The phone's
//   tabs are a 3 × 2 grid and the page never scrolls sideways.
// - งานของฉัน (view=mine): the switch's งานของฉัน is pressed and the strip names no earlier day (no เมื่อวาน). A run
//   asset with a repair the IT head records not done through the repair form's route (backdated 30 days, so it ranks
//   before the run's same-day rows) is in the ซ่อมบำรุง tab of งานของฉัน (the run's department: view=all would rank it
//   behind thousands of the copy's older rows); its next step บันทึกว่าซ่อมเสร็จ opens /th/maintenance/{id}, full width
//   on the phone's card.
// - A forbidden panel by URL (panel=assets without asset:view) needs a run user who opens the work center without
//   asset:view: the run has none, so that test skips with its reason (tests/work-center-page-data.test.ts pins the
//   fallback).
// axe through recordSettled on every step. Nothing is deleted; no settings, LDAP or digest request.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { bell } from "../shell/shell-steps.ts"
import { SHELL_WORDS, fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { E2E_ROLE_PERMISSIONS, E2E_USER_KEYS } from "../support/run-plan.ts"
import { readRunData } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { createTxAsset, readAssetMasters, type CreatedAsset } from "../transactions/tx-support.ts"
import { QUEUE_ORDER, WORK_CENTER_WORDS as W } from "./work-center-words.ts"

// The overview reads every queue of the dev copy: a first arrival can take far longer than the suite's 30 s default.
const HEAVY_MS = 90_000
const NUMBER = "[\\d,]+"
const toNumber = (text: string) => Number(text.trim().replaceAll(",", ""))
const QUEUE_NAMES: readonly string[] = QUEUE_ORDER
const TAB_LABELS: readonly string[] = [W.overview, ...QUEUE_ORDER, W.assetsTab]

// A run user who opens the work center (dashboard:view) without asset:view, for the forbidden ข้อมูลไม่ครบ panel.
const NO_ASSET_VIEW_USER = E2E_USER_KEYS.find((key) => {
  const permissions = E2E_ROLE_PERMISSIONS[key]
  return permissions.includes("dashboard:view") && !permissions.includes("asset:view")
})

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, label: string) {
  await page.goto(path, { waitUntil: "load", timeout: HEAVY_MS })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible({ timeout: HEAVY_MS })
  await recordSettled(page, measure, label)
}

// The bell's name for a number of unread topics (e2e/shell/shell-steps.ts bell): its count, or a name without one.
async function expectBell(page: Page, unread: number) {
  if (unread > 0) {
    await expect(bell(page)).toHaveAccessibleName(fillTemplate(SHELL_WORDS.bellLabel, { count: unread }))
  } else {
    await expect(bell(page)).toHaveAccessibleName(new RegExp(`^(?:${escapeRegExp(SHELL_WORDS.title)}|${escapeRegExp(SHELL_WORDS.bellEmpty)})$`))
  }
}

// The header's การแจ้งเตือน link: its name carries the unread topics (the badge beside it is hidden from readers).
async function readNotificationsBadge(page: Page): Promise<number> {
  const pattern = templatePattern(W.notificationsLinkLabel, { count: `(${NUMBER})` })
  const link = page.getByRole("link", { name: new RegExp(`^${pattern.source}$`) }).filter({ visible: true })
  await expect(link).toHaveCount(1)
  const name = (await link.getAttribute("aria-label")) ?? ""
  const match = pattern.exec(name)
  expect(match, `the notifications link's name: ${name}`).not.toBeNull()
  return toNumber(match?.[1] ?? "")
}

// งานค้างทั้งหมด and its queue cells: the desktop card (a cell per queue with its name and count), or the phone's one
// line "งานค้างทั้งหมด N = a + b + …" (the cells' card shows from md).
async function readStrip(page: Page, phone: boolean): Promise<{ total: number; names: string[] | null; counts: number[] }> {
  if (!phone) {
    const card = page.locator('[data-slot="work-center-backlog"]')
    await expect(card).toBeVisible()
    const total = toNumber(await card.locator("h2 + span").innerText())
    const cells = await card.locator("ul > li a").evaluateAll((links) =>
      links.map((link) => {
        const spans = link.querySelectorAll(":scope > span")
        return { name: spans[0]?.textContent?.trim() ?? "", count: spans[1]?.textContent?.trim() ?? "" }
      }),
    )
    return { total, names: cells.map((cell) => cell.name), counts: cells.map((cell) => toNumber(cell.count)) }
  }
  const line = page.locator('[data-slot="work-center-backlog-line"]')
  await expect(line).toBeVisible()
  const text = (await line.innerText()).trim()
  const match = new RegExp(`^${escapeRegExp(W.backlogTitle)} (${NUMBER})(?: = (${NUMBER}(?: \\+ ${NUMBER})*))?`).exec(text)
  expect(match, `the phone's backlog line: ${text}`).not.toBeNull()
  return { total: toNumber(match?.[1] ?? ""), names: null, counts: match?.[2] ? match[2].split(" + ").map(toNumber) : [] }
}

// The queue tabs on screen (TabNav from md, the grid below): each tab's label, its count as written, and aria-current.
async function readTabs(page: Page): Promise<{ label: string; count: string; current: boolean }[]> {
  const nav = page.getByRole("navigation", { name: W.focusNavigation, exact: true })
  await expect(nav).toBeVisible()
  const links = await nav.getByRole("link").evaluateAll((elements) =>
    elements.map((element) => ({ text: (element.textContent ?? "").trim(), current: element.getAttribute("aria-current") === "page" })),
  )
  return links.map((link) => {
    const label = TAB_LABELS.find((candidate) => link.text.startsWith(candidate)) ?? ""
    expect(label, `a tab's label: ${link.text}`).not.toBe("")
    return { label, count: link.text.slice(label.length).trim(), current: link.current }
  })
}

const tabLink = (page: Page, label: string): Locator =>
  page.getByRole("navigation", { name: W.focusNavigation, exact: true }).getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}`) })

// "แสดง n จาก m" under the table (its footer on the computer, the line under the cards on the phone).
async function readShown(page: Page): Promise<{ shown: number; total: number }> {
  const pattern = templatePattern(W.tableShown, { shown: `(${NUMBER})`, total: `(${NUMBER})` })
  const line = page.getByText(new RegExp(`^${pattern.source}$`)).filter({ visible: true })
  await expect(line).toHaveCount(1)
  const text = (await line.innerText()).trim()
  const match = pattern.exec(text)
  expect(match, `the shown line: ${text}`).not.toBeNull()
  return { shown: toNumber(match?.[1] ?? ""), total: toNumber(match?.[2] ?? "") }
}

// The rows on screen: the table's body rows on the computer, the cards on the phone.
const rows = (page: Page, phone: boolean): Locator =>
  phone ? page.locator('[data-slot="work-center-cards"] > li') : page.getByRole("table", { name: W.tableCaption, exact: true }).locator("tbody tr")

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

// A repair of the run asset recorded not done (ค้าง) through the repair form's route, every key of its body, reported
// by the IT head's run employee 30 days ago: it ranks before the run's same-day rows (oldest first).
async function openRepairByApi(page: Page, asset: CreatedAsset): Promise<{ id: string; repairNo: string }> {
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId: asset.id,
      maintenancePlanId: null,
      problem: `${asset.assetTag} รอซ่อม ทดสอบศูนย์งานค้าง`,
      reportedDate: bangkokDate(-30),
      done: false,
      outcome: null,
      conditionId: null,
      reportedById: readRunData().employees.itHead.id,
      vendorId: null,
      repairCost: null,
      invoiceNo: null,
      remark: "E2E open repair for the work center",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; repairNo: string }
}

test.describe("the IT head reads the work center", () => {
  asUser("itHead")

  test("the strip's งานค้างทั้งหมด is the sum of its queue cells and the ภาพรวม tab's count, the notifications badge is the bell's number, แสดงเพิ่ม adds 8 rows (show=16); the phone's tabs are a 3 × 2 grid (group 9 spec §4.1, §4.2)", async ({ page, measure, e2eDevice }) => {
    test.setTimeout(300_000)
    const phone = e2eDevice === "phone"
    await open(page, measure, "/th/work-center", "IT head: the work center")

    // The strip and the tabs of the same render agree.
    const strip = await readStrip(page, phone)
    const tabs = await readTabs(page)
    const overview = tabs.find((tab) => tab.label === W.overview)
    expect(overview?.current, "ภาพรวม is the current tab").toBe(true)
    const queueTabs = tabs.filter((tab) => QUEUE_NAMES.includes(tab.label))
    // The IT head sees the four queues (approve, maintenance, audit and disposal permissions), in the shared order.
    expect(queueTabs.map((tab) => tab.label)).toEqual(QUEUE_NAMES)
    if (strip.names) expect(strip.names, "the cells name the queues in the tabs' order").toEqual(QUEUE_NAMES)
    expect(strip.counts, "each queue tab's count is its cell").toEqual(queueTabs.map((tab) => toNumber(tab.count)))
    expect(strip.counts.reduce((total, value) => total + value, 0), "งานค้างทั้งหมด = the sum of the cells").toBe(strip.total)
    expect(toNumber(overview?.count ?? ""), "ภาพรวม's count = งานค้างทั้งหมด").toBe(strip.total)

    // การแจ้งเตือน names the unread topics, the bell's number.
    await expectBell(page, await readNotificationsBadge(page))

    if (phone) {
      // Board WC-Phone: ภาพรวม, the four queues and ข้อมูลไม่ครบ (the IT head holds asset:view) in a 3 × 2 grid.
      const cells = page.locator('[data-slot="work-center-tabs-grid"] > li')
      await expect(cells).toHaveCount(6)
      const boxes = await cells.evaluateAll((items) =>
        items.map((item) => {
          const box = item.getBoundingClientRect()
          return { top: Math.round(box.top), left: Math.round(box.left) }
        }),
      )
      expect(new Set(boxes.slice(0, 3).map((box) => box.top)).size, "the first row of three").toBe(1)
      expect(new Set(boxes.slice(3).map((box) => box.top)).size, "the second row of three").toBe(1)
      expect(boxes[3].top).toBeGreaterThan(boxes[0].top)
      expect(boxes.slice(3).map((box) => box.left)).toEqual(boxes.slice(0, 3).map((box) => box.left))
      expect(await noSidewaysScroll(page), "the work center does not scroll sideways").toBe(true)
    }

    // The first 8 rows, then แสดงเพิ่ม while more are waiting.
    const first = await readShown(page)
    expect(first.shown).toBe(Math.min(8, first.total))
    if (first.total > 0) await expect(rows(page, phone)).toHaveCount(first.shown)
    if (first.total <= 8) {
      test.info().annotations.push({ type: "note", description: `only ${first.total} rows wait: no แสดงเพิ่ม to press` })
      return
    }
    await page.getByRole("link", { name: fillTemplate(W.showMoreRows, { count: Math.min(8, first.total - 8) }), exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL((url) => url.searchParams.get("show") === "16" && !url.searchParams.has("panel"), { timeout: HEAVY_MS })
    const expected = Math.min(16, first.total)
    const more = templatePattern(W.tableShown, { shown: String(expected), total: NUMBER })
    await expect(page.getByText(new RegExp(`^${more.source}$`)).filter({ visible: true })).toHaveCount(1, { timeout: HEAVY_MS })
    await expect(rows(page, phone)).toHaveCount(expected)
    await recordSettled(page, measure, "IT head: the work center after แสดงเพิ่ม")
    if (phone) expect(await noSidewaysScroll(page), "16 cards do not scroll sideways").toBe(true)
  })

  test("งานของฉัน is pressed and names no earlier day; the run's open repair is in its ซ่อมบำรุง tab, and บันทึกว่าซ่อมเสร็จ opens /maintenance/{id} (full width on the phone's card) (group 9 spec §4.1, §4.2)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const phone = e2eDevice === "phone"
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "WCR", "เครื่องรอซ่อมศูนย์งานค้าง")
    const repair = await openRepairByApi(page, asset)

    await open(page, measure, "/th/work-center?view=mine", "IT head: the work center, งานของฉัน")
    const views = page.getByRole("navigation", { name: W.viewNavigation, exact: true })
    await expect(views.getByRole("link", { name: W.myWork, exact: true })).toHaveAttribute("aria-current", "page")
    await expect(views.getByRole("link", { name: W.allWork, exact: true })).not.toHaveAttribute("aria-current", "page")
    // The IT head's run user is linked to a run employee: งานของฉัน filters, no notice.
    await expect(page.getByText(W.myWorkUnavailable, { exact: true })).toHaveCount(0)
    // งานของฉัน records nothing and compares with no earlier day: neither "เมื่อวาน n" nor "เมื่อ <date> n".
    const backlog = page.locator(phone ? '[data-slot="work-center-backlog-line"]' : '[data-slot="work-center-backlog"]')
    await expect(backlog).toBeVisible()
    await expect(backlog).toContainText(W.backlogTitle)
    await expect(backlog).not.toContainText(W.backlogOnDay.split(" ")[0])

    // The ซ่อมบำรุง tab keeps the view.
    await tabLink(page, W.maintenance).click()
    await expect(page).toHaveURL((url) => url.searchParams.get("view") === "mine" && url.searchParams.get("panel") === "maintenance", { timeout: HEAVY_MS })
    await expect(tabLink(page, W.maintenance)).toHaveAttribute("aria-current", "page", { timeout: HEAVY_MS })
    await expect(views.getByRole("link", { name: W.myWork, exact: true })).toHaveAttribute("aria-current", "page")
    await recordSettled(page, measure, "IT head: งานของฉัน, ซ่อมบำรุง")

    // Every row of the tab up to 200 (the run's other specs leave their own rows in its department).
    await open(page, measure, "/th/work-center?view=mine&panel=maintenance&show=200", "IT head: งานของฉัน, ซ่อมบำรุง, every row")
    await expect(tabLink(page, W.maintenance)).toHaveAttribute("aria-current", "page")
    const entry = rows(page, phone).filter({ hasText: repair.repairNo })
    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText(asset.name)
    await expect(entry).toContainText(asset.assetTag)
    // The next step names its record (RowActions' sr-only code: the repair number).
    const next = entry.getByRole("link", { name: new RegExp(`^${escapeRegExp(W.recordRepairDone)}\\s+${escapeRegExp(repair.repairNo)}$`) })
    await expect(next).toBeVisible()
    await expect(next).toHaveAttribute("href", new RegExp(`^/th/maintenance/${repair.id}\\?returnTo=`))

    if (phone) {
      // Board WC-Phone: the card's next step is full width (the card's padding aside) and 44 px tall.
      const [cardBox, nextBox] = await Promise.all([entry.boundingBox(), next.boundingBox()])
      expect(cardBox && nextBox, "the card and its next step are laid out").toBeTruthy()
      expect(nextBox?.width ?? 0).toBeGreaterThanOrEqual((cardBox?.width ?? 0) - 32)
      expect(nextBox?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect(await noSidewaysScroll(page), "งานของฉัน does not scroll sideways").toBe(true)
    }

    await next.click()
    await expect(page).toHaveURL((url) => url.pathname === `/th/maintenance/${repair.id}`, { timeout: HEAVY_MS })
    await expect(page.getByRole("main")).toContainText(repair.repairNo, { timeout: HEAVY_MS })
    await recordSettled(page, measure, "IT head: the repair opened from the work center's next step")
  })
})

test.describe("a user who opens the work center without asset:view", () => {
  asUser(NO_ASSET_VIEW_USER ?? "itHead")

  test("panel=assets by URL falls back to ภาพรวม without the ข้อมูลไม่ครบ tab (group 9 plan 2 final review ruling 4)", async ({ page, measure }) => {
    test.skip(
      !NO_ASSET_VIEW_USER,
      "no run user holds dashboard:view without asset:view (e2e/support/run-plan.ts: only the IT head opens the work center, and they hold asset:view); tests/work-center-page-data.test.ts pins the fallback",
    )
    test.setTimeout(300_000)
    await open(page, measure, "/th/work-center?panel=assets", "a user without asset:view: panel=assets")
    const tabs = await readTabs(page)
    expect(tabs.find((tab) => tab.current)?.label).toBe(W.overview)
    expect(tabs.map((tab) => tab.label)).not.toContain(W.assetsTab)
  })
})
