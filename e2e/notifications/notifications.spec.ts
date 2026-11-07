// Page group 9 plan 3 Task 3 (plan docs/superpowers/plans/2026-11-07-group9-notifications-page.md; spec
// docs/superpowers/specs/2026-11-07-page-group-9-work-center-notifications-design.md §5.2, §5.3, §6.2, board NT): the
// notifications page (/th/notifications), in all four projects, as the run's IT head.
// The dev database is a copy of Production whose counts move, so nothing asserts a global number: the header's count
// is compared with the bell and the ยังไม่อ่าน tab, and the steps follow one topic of the IT head's own.
// - One topic, unread (the first listed topic in the waiting-work order that is unread; when every topic is read or
//   snoozed, the first one is set unread through the read-state route first, the IT head's own state row).
// - ทำเป็นอ่านแล้ว from its ⋯ (a menu on the computer, a sheet on the phone): the row leaves ยังไม่อ่าน, the bell drops
//   by 1, and the อ่านแล้ว tab shows it with "อ่านแล้ว HH:mm". เลื่อนเตือน 3 วัน moves it to เลื่อนเตือน with
//   "เลื่อนถึง …"; ยกเลิกการเลื่อนเตือน brings it back to ยังไม่อ่าน and the bell back to its number.
// - ทั้งหมด: the เตือนล่วงหน้า section has id="advance" (the work center's link lands there) while an advance topic has
//   work, the งานค้าง section id="backlog"; the digest panel renders its days or its empty state.
// - G9P3-R3: the topic is set unread again at the end, in a finally (the IT head's own state row only), so a rerun
//   starts from unread. No other user's state, no read-all, no digest request, nothing deleted.
// axe through recordSettled on every step.
import type { Locator, Page } from "../shell/shell-steps.ts"
import { bell } from "../shell/shell-steps.ts"
import { SHELL_WORDS, fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { ADVANCE_KEYS, NOTIFICATION_WORDS as W, TOPIC_TITLES, type TopicKey } from "./notifications-words.ts"

// The page reads every queue of the dev copy: a first arrival can take far longer than the suite's 30 s default.
const HEAVY_MS = 90_000
const NUMBER = "[\\d,]+"
const toNumber = (text: string) => Number(text.trim().replaceAll(",", ""))
const TOPIC_ORDER = Object.keys(TOPIC_TITLES) as TopicKey[]

type SummaryItem = { key: string; count: number; isRead: boolean; isSnoozed: boolean }

// The bell's own read (GET /api/notifications): the IT head's topics with their counts and states.
async function readSummary(page: Page): Promise<SummaryItem[]> {
  const response = await page.request.get("/api/notifications")
  expect(response.status(), "GET /api/notifications").toBe(200)
  return ((await response.json()) as { items: SummaryItem[] }).items
}

// The topic's state back to unread at its current count (the page's own read-state route, the IT head's own row).
async function setUnread(page: Page, key: TopicKey) {
  const count = (await readSummary(page)).find((item) => item.key === key)?.count ?? 0
  const response = await page.request.patch("/api/notifications", { data: { key, count, action: "unread" } })
  expect(response.status(), `PATCH /api/notifications unread ${key}`).toBe(200)
}

async function open(page: Page, measure: Measure, path: string, label: string) {
  await page.goto(path, { waitUntil: "load", timeout: HEAVY_MS })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible({ timeout: HEAVY_MS })
  await recordSettled(page, measure, label)
}

// The bell's name for a number of unread topics (e2e/shell/shell-steps.ts bell): its count, or a name without one.
async function expectBell(page: Page, unread: number) {
  if (unread > 0) {
    await expect(bell(page)).toHaveAccessibleName(fillTemplate(SHELL_WORDS.bellLabel, { count: unread }), { timeout: HEAVY_MS })
  } else {
    await expect(bell(page)).toHaveAccessibleName(new RegExp(`^(?:${escapeRegExp(SHELL_WORDS.title)}|${escapeRegExp(SHELL_WORDS.bellEmpty)})$`), { timeout: HEAVY_MS })
  }
}

// The header's line "กระดิ่งแถบบน = หัวข้อที่ยังไม่อ่าน N" (the title's badge beside it is hidden from readers).
async function readHeaderCount(page: Page): Promise<number> {
  const pattern = templatePattern(W.bellLine, { count: `(${NUMBER})` })
  const line = page.getByText(new RegExp(`^${pattern.source}$`))
  await expect(line).toHaveCount(1)
  const text = (await line.innerText()).trim()
  return toNumber(pattern.exec(text)?.[1] ?? "")
}

// The header's line with a given number.
const headerLine = (page: Page, unread: number): Locator => page.getByText(fillTemplate(W.bellLine, { count: unread }), { exact: true })

// A status tab (TabNav from sm, the 2 × 2 grid below), named by its word and its count.
const statusTab = (page: Page, label: string): Locator =>
  page.getByRole("navigation", { name: W.statusNavigation, exact: true }).getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}\\s*${NUMBER}$`) })

async function readTabCount(page: Page, label: string): Promise<number> {
  const text = (await statusTab(page, label).textContent()) ?? ""
  return toNumber(text.slice(text.indexOf(label) + label.length))
}

async function goToTab(page: Page, measure: Measure, label: string, status: string) {
  await statusTab(page, label).click()
  await expect(page).toHaveURL((url) => url.searchParams.get("status") === status, { timeout: HEAVY_MS })
  await expect(statusTab(page, label)).toHaveAttribute("aria-current", "page", { timeout: HEAVY_MS })
  await recordSettled(page, measure, `IT head: notifications, ${label}`)
}

// The topic's ⋯ and its row.
const topicMenu = (page: Page, title: string): Locator => page.getByRole("button", { name: fillTemplate(W.menu, { title }), exact: true })
const topicRow = (page: Page, title: string): Locator => page.locator("li").filter({ has: topicMenu(page, title) })

// One choice of the topic's ⋯: a menu item on the computer, the bottom sheet's button (named by the topic) on the phone.
async function choose(page: Page, phone: boolean, title: string, label: string) {
  await topicMenu(page, title).click()
  const item = phone
    ? page.getByRole("dialog", { name: title, exact: true }).getByRole("button", { name: label, exact: true })
    : page.getByRole("menuitem", { name: label, exact: true })
  await item.click()
  await expect(page.getByText(W.saved, { exact: true }).first()).toBeVisible({ timeout: HEAVY_MS })
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

test.describe("the IT head reads and sorts their notifications", () => {
  asUser("itHead")

  test("the header's count is the bell's; ทำเป็นอ่านแล้ว moves a topic to อ่านแล้ว with its time and the bell drops by 1; เลื่อนเตือน 3 วัน moves it to เลื่อนเตือน; ยกเลิกการเลื่อนเตือน brings it back; #advance and the digest panel (group 9 spec §5.2, §5.3, §6.2; G9P3-R3)", async ({ page, measure, e2eDevice }) => {
    test.setTimeout(300_000)
    const phone = e2eDevice === "phone"

    // One topic with work, unread: the first unread one, else the first one set unread (the IT head's own row).
    const topics = (await readSummary(page)).filter((item): item is SummaryItem & { key: TopicKey } => item.count > 0 && item.key in TOPIC_TITLES)
    expect(topics.length, "the IT head has at least one topic with work in the dev copy").toBeGreaterThan(0)
    const byOrder = [...topics].sort((a, b) => TOPIC_ORDER.indexOf(a.key) - TOPIC_ORDER.indexOf(b.key))
    const unreadTopic = byOrder.find((item) => !item.isRead && !item.isSnoozed)
    const key: TopicKey = (unreadTopic ?? byOrder[0]).key
    const title = TOPIC_TITLES[key]
    let touched = false
    try {
      if (!unreadTopic) {
        touched = true
        await setUnread(page, key)
      }

      await open(page, measure, "/th/notifications", "IT head: notifications")
      await expect(statusTab(page, W.unread)).toHaveAttribute("aria-current", "page")
      // The header names the bell's number, and so does the ยังไม่อ่าน tab.
      const unread = await readHeaderCount(page)
      expect(unread, "the topic is unread").toBeGreaterThan(0)
      expect(await readTabCount(page, W.unread)).toBe(unread)
      await expectBell(page, unread)
      await expect(topicMenu(page, title)).toBeVisible()
      if (phone) expect(await noSidewaysScroll(page), "the notifications page does not scroll sideways").toBe(true)

      // ทำเป็นอ่านแล้ว: the row leaves ยังไม่อ่าน and the bell drops by 1.
      touched = true
      await choose(page, phone, title, W.markRead)
      await expect(topicMenu(page, title)).toHaveCount(0, { timeout: HEAVY_MS })
      await expectBell(page, unread - 1)
      await expect(headerLine(page, unread - 1)).toBeVisible({ timeout: HEAVY_MS })
      await recordSettled(page, measure, "IT head: notifications after ทำเป็นอ่านแล้ว")

      // อ่านแล้ว lists it with the time it was read today.
      await goToTab(page, measure, W.read, "read")
      await expect(topicMenu(page, title)).toBeVisible()
      await expect(topicRow(page, title)).toContainText(templatePattern(W.readToday, { time: "\\d{2}:\\d{2}" }))

      // เลื่อนเตือน 3 วัน: it leaves อ่านแล้ว for เลื่อนเตือน with "เลื่อนถึง <date> <time>"; still not unread.
      await choose(page, phone, title, W.snoozeThreeDays)
      await expect(topicMenu(page, title)).toHaveCount(0, { timeout: HEAVY_MS })
      await expectBell(page, unread - 1)
      await goToTab(page, measure, W.snoozed, "snoozed")
      await expect(topicMenu(page, title)).toBeVisible()
      await expect(topicRow(page, title)).toContainText(templatePattern(W.snoozedUntil, { date: ".+?", time: "\\d{2}:\\d{2}" }))

      // ยกเลิกการเลื่อนเตือน: back to ยังไม่อ่าน without a pill, and the bell back to its number.
      await choose(page, phone, title, W.cancelSnooze)
      await expect(topicMenu(page, title)).toHaveCount(0, { timeout: HEAVY_MS })
      await expectBell(page, unread)
      await goToTab(page, measure, W.unread, "unread")
      await expect(topicMenu(page, title)).toBeVisible()
      await expect(topicRow(page, title)).not.toContainText(templatePattern(W.readToday, { time: "\\d{2}:\\d{2}" }))
      await expect(topicRow(page, title)).not.toContainText(templatePattern(W.snoozedUntil, { date: ".+?", time: "\\d{2}:\\d{2}" }))
      await expect(headerLine(page, unread)).toBeVisible()

      // ทั้งหมด: the sections by their ids, and the digest panel.
      await goToTab(page, measure, W.all, "all")
      const advanceWork = (await readSummary(page)).some((item) => item.count > 0 && (ADVANCE_KEYS as readonly string[]).includes(item.key))
      const advance = page.locator("section#advance")
      if (advanceWork) {
        await expect(advance).toHaveCount(1)
        await expect(advance.getByRole("heading", { level: 2, name: W.advance, exact: true })).toBeVisible()
      } else {
        await expect(advance).toHaveCount(0)
        test.info().annotations.push({ type: "note", description: "no advance topic has work in the dev copy: no เตือนล่วงหน้า section" })
      }
      if (topics.some((item) => !(ADVANCE_KEYS as readonly string[]).includes(item.key))) {
        await expect(page.locator("section#backlog").getByRole("heading", { level: 2, name: W.backlog, exact: true })).toBeVisible()
      }
      const digest = page.getByRole("region", { name: W.digestTitle, exact: true })
      await expect(digest).toBeVisible()
      const days = digest.locator("details > summary")
      await expect(days.or(digest.getByText(W.digestEmpty, { exact: true })).or(digest.getByRole("heading", { name: W.legacyTitle, exact: true })).first()).toBeVisible()
      if ((await days.count()) > 0) {
        await expect(days.first()).toHaveText(templatePattern(W.digestDay, { date: ".+?", topics: NUMBER, items: NUMBER }))
      }
      if (phone) expect(await noSidewaysScroll(page), "ทั้งหมด does not scroll sideways").toBe(true)
    } finally {
      // G9P3-R3: the topic it touched is unread again (the IT head's own state row only).
      if (touched) await setUnread(page, key)
    }
  })
})
