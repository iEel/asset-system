import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The work center and notifications E2E specs of page group 9 plan 3 (plan
// docs/superpowers/plans/2026-11-07-group9-notifications-page.md, Task 3): what they stand on — the app's own words,
// the suite's fixtures, the IT head's run role, run-marked data only, axe through recordSettled, the touched topic set
// unread again in a finally (G9P3-R3), and no DELETE or digest request. The specs run with
// `npx playwright test e2e/work-center e2e/notifications`; these pins need no app. Reads strip \r (the working tree may
// be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []

test("the work center spec reads the app's own words (group 9 plan 3 task 3)", async () => {
  const { WORK_CENTER_WORDS: W, QUEUE_ORDER } = await import("../e2e/work-center/work-center-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const all = new Set(values(th))
  for (const [name, text] of Object.entries(W)) assert.ok(all.has(text), `${name}: "${text}" is a value of messages/th.json`)
  const wc = th.workCenter
  assert.equal(W.title, wc.title)
  assert.equal(W.notificationsLinkLabel, wc.notificationsLinkLabel)
  assert.equal(W.viewNavigation, wc.viewNavigation)
  assert.equal(W.allWork, wc.allWork)
  assert.equal(W.myWork, wc.myWork)
  assert.equal(W.myWorkUnavailable, wc.myWorkUnavailable)
  assert.equal(W.focusNavigation, wc.focusNavigation)
  assert.equal(W.overview, wc.tabs.overview)
  assert.equal(W.assetsTab, wc.tabs.assets)
  assert.equal(W.backlogTitle, wc.backlog.title)
  assert.equal(W.backlogYesterday, wc.backlog.yesterday)
  assert.equal(W.backlogOnDay, wc.backlog.onDay)
  assert.equal(W.tableCaption, wc.table.caption)
  assert.equal(W.tableShown, wc.table.shown)
  assert.equal(W.showMoreRows, wc.table.showMoreRows)
  assert.equal(W.recordRepairDone, wc.nextStep.recordRepairDone)
  // The queues in WORK_QUEUES order, by their names.
  const { WORK_QUEUES } = await import("../src/lib/work-queues.ts")
  assert.deepEqual([...QUEUE_ORDER], WORK_QUEUES.map((queue: string) => wc.queue[queue]))
  assert.deepEqual([W.approvals, W.maintenance, W.audit, W.disposal], [...QUEUE_ORDER])
  // "เมื่อ" leads both of the strip's earlier-day words, so the spec's absence check covers both.
  assert.ok(W.backlogYesterday.startsWith(W.backlogOnDay.split(" ")[0]))
})

test("the notifications spec reads the app's own words and the topics' titles (group 9 plan 3 task 3)", async () => {
  const { NOTIFICATION_WORDS: W, TOPIC_TITLES, ADVANCE_KEYS } = await import("../e2e/notifications/notifications-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const all = new Set(values(th))
  for (const [name, text] of Object.entries(W)) assert.ok(all.has(text), `${name}: "${text}" is a value of messages/th.json`)
  const n = th.notifications
  assert.equal(W.title, n.title)
  assert.equal(W.bellLine, n.bellLine)
  assert.equal(W.statusNavigation, n.statusNavigation)
  assert.deepEqual([W.unread, W.read, W.snoozed, W.all], [n.tabs.unread, n.tabs.read, n.tabs.snoozed, n.tabs.all])
  assert.equal(W.menu, n.actions.menu)
  assert.equal(W.markRead, n.actions.markRead)
  assert.equal(W.snoozeThreeDays, n.actions.snoozeThreeDays)
  assert.equal(W.cancelSnooze, n.actions.cancelSnooze)
  assert.equal(W.saved, n.saved)
  assert.equal(W.readToday, n.pill.readToday)
  assert.equal(W.snoozedUntil, n.pill.snoozedUntil)
  assert.equal(W.backlog, n.sections.backlog)
  assert.equal(W.advance, n.sections.advance)
  assert.equal(W.digestTitle, n.digest.title)
  assert.equal(W.digestEmpty, n.digest.empty)
  assert.equal(W.legacyTitle, n.digest.legacyTitle)
  assert.equal(W.digestDay, n.digest.day)
  // Every waiting-work key, in its order, with its notifications.<key> title; the advance keys are the app's.
  const { WAITING_WORK_KEYS } = await import("../src/lib/waiting-work-rules.ts")
  assert.deepEqual(Object.keys(TOPIC_TITLES), [...WAITING_WORK_KEYS])
  for (const [key, title] of Object.entries(TOPIC_TITLES)) assert.equal(title, n[key], key)
  const { ADVANCE_WARNING_KEYS } = await import("../src/lib/work-queues.ts")
  assert.deepEqual([...ADVANCE_KEYS], [...ADVANCE_WARNING_KEYS])
})

test("the two specs use the suite's fixtures as the IT head, the run's role unchanged, and axe through recordSettled (group 9 plan 3 task 3)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  // The IT head opens the work center (dashboard:view) and holds asset:view, so no run user meets the forbidden panel.
  assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes("dashboard:view") && E2E_ROLE_PERMISSIONS.itHead.includes("asset:view"))
  for (const file of ["e2e/work-center/work-center.spec.ts", "e2e/notifications/notifications.spec.ts"]) {
    const spec = read(file)
    assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), `${file}: the suite's fixtures`)
    assert.ok(!spec.includes(`from "@playwright/test"`), `${file}: nothing from @playwright/test`)
    assert.ok(spec.includes(`asUser("itHead")`), `${file}: the IT head`)
    assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`), `${file}: axe once settled`)
    assert.ok(!spec.includes("measure.recordPage("), `${file}: axe through recordSettled`)
    assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), `${file}: the phone on Chromium`)
    assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|read_all|signInOnce\(|\/api\/admin\//, file)
  }
})

test("the work center spec: the strip's sum, the badge and the bell, แสดงเพิ่ม to show=16, งานของฉัน, the run's open repair and its next step, the phone's grid, and the forbidden panel's reasoned skip (group 9 plan 3 task 3)", () => {
  const spec = read("e2e/work-center/work-center.spec.ts")
  assert.ok(spec.includes(`"งานค้างทั้งหมด = the sum of the cells"`))
  assert.ok(spec.includes(`"ภาพรวม's count = งานค้างทั้งหมด"`))
  assert.ok(spec.includes("await expectBell(page, await readNotificationsBadge(page))"))
  assert.ok(spec.includes(`url.searchParams.get("show") === "16"`))
  assert.ok(spec.includes(`"/th/work-center?view=mine"`))
  assert.ok(spec.includes("not.toContainText(W.backlogOnDay.split(\" \")[0])"))
  // The run's own record: a run asset (createTxAsset) and its not-done repair through the repair form's route.
  assert.ok(spec.includes(`createTxAsset(page, masters, testInfo.project.name, "WCR"`))
  assert.match(spec, /page\.request\.post\("\/api\/maintenance-tickets", \{\s*data: \{[^]{0,400}?done: false,/)
  assert.ok(spec.includes("new RegExp(`^/th/maintenance/${repair.id}\\\\?returnTo=`)"))
  assert.ok(spec.includes("url.pathname === `/th/maintenance/${repair.id}`"))
  assert.ok(spec.includes(`'[data-slot="work-center-tabs-grid"] > li'`) && spec.includes("await expect(cells).toHaveCount(6)"))
  assert.ok(spec.includes("noSidewaysScroll(page)"))
  assert.ok(spec.includes("test.skip(\n      !NO_ASSET_VIEW_USER,"))
  assert.ok((spec.match(/await (?:recordSettled\(page, measure, |open\(page, measure, )/g) ?? []).length >= 6)
})

test("the notifications spec: the header's count and the bell, read, snooze 3 days, cancel, #advance, the digest panel, and the topic set unread again in a finally (group 9 plan 3 task 3, G9P3-R3)", () => {
  const spec = read("e2e/notifications/notifications.spec.ts")
  assert.ok(spec.includes("await expectBell(page, unread)") && spec.includes("await expectBell(page, unread - 1)"))
  for (const step of ["W.markRead", "W.snoozeThreeDays", "W.cancelSnooze"]) assert.ok(spec.includes(`await choose(page, phone, title, ${step})`), step)
  for (const [label, status] of [["W.read", "read"], ["W.snoozed", "snoozed"], ["W.unread", "unread"], ["W.all", "all"]]) {
    assert.ok(spec.includes(`await goToTab(page, measure, ${label}, "${status}")`), status)
  }
  assert.ok(spec.includes(`page.locator("section#advance")`))
  assert.ok(spec.includes(`page.getByRole("region", { name: W.digestTitle, exact: true })`))
  // Only the IT head's own state row of the one topic: the unread action of the read-state route, in a finally.
  assert.match(spec, /\} finally \{\n(?:\s*\/\/[^\n]*\n)*\s*if \(touched\) await setUnread\(page, key\)\n/)
  assert.ok(spec.includes(`page.request.patch("/api/notifications", { data: { key, count, action: "unread" } })`))
  assert.equal((spec.match(/page\.request\.patch\(/g) ?? []).length, 1, "one PATCH: the unread action")
})
