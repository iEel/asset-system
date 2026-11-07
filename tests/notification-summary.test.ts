import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { buildDailyDigestMessage } from "../src/lib/notification-digest-format.ts"
import { buildNotificationSummaryItems } from "../src/lib/notification-summary-items.ts"
import { buildActiveNotificationSummary, mergeNotificationItemsWithStates } from "../src/lib/notification-center.ts"
import { buildWaitingWorkHref, WAITING_WORK_KEYS, type WaitingWorkCounts, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

function emptyCounts(): WaitingWorkCounts {
  return Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 0])) as WaitingWorkCounts
}

test("adds approval inbox notification when approval detail counts are already suppressed", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), approvalInbox: 4, duePm: 1 })
  assert.deepEqual(items.map((item) => item.key), ["approvalInbox", "duePm"])
  assert.equal(items[0].href, "/th/admin/approvals")
  assert.equal(items[0].tone, "danger")
})

test("keeps direct pending approval notifications when approval inbox has no actionable items", () => {
  const items = buildNotificationSummaryItems("en", { ...emptyCounts(), pendingAuditFindings: 1, pendingDisposals: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href]), [
    ["pendingAuditFindings", "/en/audit/findings?status=pending"],
    ["pendingDisposals", "/en/disposal?status=pending"],
  ])
})

test("PM due within the reminder window links to the maintenance page", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), duePm: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href, item.tone]), [["duePm", "/th/maintenance#pm-due", "warning"]])
})

test("the two repair kinds follow approvals, and every row links where the shared source says (group 1 dashboard task 1, spec §6.3)", () => {
  const every = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 1])) as WaitingWorkCounts
  const items = buildNotificationSummaryItems("th", every)
  assert.deepEqual(items.map((item) => item.key), [...WAITING_WORK_KEYS])
  assert.deepEqual(items.slice(0, 3).map((item) => [item.key, item.href, item.tone]), [
    ["approvalInbox", "/th/admin/approvals", "danger"],
    ["openRepairs", "/th/maintenance?status=in_progress", "warning"],
    ["stuckRepairs", "/th/maintenance#stuck", "warning"],
  ])
  for (const item of items) assert.equal(item.href, buildWaitingWorkHref("th", item.key as WaitingWorkKey), item.key)
  assert.deepEqual(buildNotificationSummaryItems("th", emptyCounts()), [])
})

test("return reminders count temporary loans only", () => {
  const source = readFileSync("src/lib/waiting-work-rules.ts", "utf8")
  assert.match(source, /handoverMode:\s*"temporary_loan"/)
})

test("the bell counts nothing itself: getNotificationCenter reads the waiting-work source (group 1 dashboard task 1)", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")
  assert.match(source, /const \{ counts \} = await getWaitingWork\(user\)/)
  assert.match(source, /key: \{ in: \[\.\.\.WAITING_WORK_KEYS\] \}/)
  assert.doesNotMatch(source, /\.count\(|systemSetting|startOfToday|addDays/)
})

test("every waiting kind has its title and detail in both languages, and the digest names it (group 1 dashboard task 1)", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { notifications: Record<string, unknown> }
    for (const key of WAITING_WORK_KEYS) {
      assert.equal(typeof messages.notifications[key], "string", `${locale}: notifications.${key}`)
      assert.equal(typeof messages.notifications[`${key}Detail`], "string", `${locale}: notifications.${key}Detail`)
      const line = buildDailyDigestMessage(locale, [{ key, count: 1, href: "/", tone: "warning" }]).split("\n")[1]
      assert.notEqual(line, `- ${key}: 1`, `${locale}: the digest has a label for ${key}`)
    }
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { notifications: Record<string, string> }
  assert.equal(th.notifications.openRepairs, "ซ่อมยังไม่เสร็จ")
  assert.equal(th.notifications.stuckRepairs, "รอซ่อมแต่ยังไม่มีบันทึกซ่อม")
})

// Group 9 plan 1 task 6 (spec §5.1): the bell's number is the unread topics, not the sum of their items.
const centerItem = (key: string, count: number) => ({ key, count, href: `/th/${key}`, tone: "warning" as const })
const stateOf = (key: string, lastCount: number, isRead = true) => ({ key, isRead, lastCount, snoozedUntil: null, assignedToUserId: null })

test("the badge counts unread topics (group 9 plan 1 task 6)", () => {
  const now = new Date("2026-11-07T08:00:00.000Z")
  const items = mergeNotificationItemsWithStates(
    [centerItem("approvalInbox", 19), centerItem("duePm", 7), centerItem("openRepairs", 3), centerItem("returnsDueSoon", 5)],
    [stateOf("returnsDueSoon", 5)],
    now,
  )
  const active = buildActiveNotificationSummary(items)
  assert.equal(active.topics, 3)
  assert.equal(active.total, 29, "the items' sum stays for callers that need it")
  // A queue at 0 is never a topic, even when it is listed unread.
  assert.equal(buildActiveNotificationSummary([...items, { ...items[0], key: "duePm2", count: 0 }]).topics, 3)

  const source = readFileSync("src/lib/notification-summary.ts", "utf8").replace(/\r/g, "")
  assert.match(source, /total: center\.activeTopics,/)
  assert.match(source, /activeTotal: active\.total,\n\s+activeTopics: active\.topics,/)
})

test("a rise above lastCount brings a topic back (group 9 plan 1 task 6)", () => {
  const now = new Date("2026-11-07T08:00:00.000Z")
  const rows = [centerItem("approvalInbox", 19), centerItem("duePm", 7), centerItem("openRepairs", 3), centerItem("returnsDueSoon", 5)]
  assert.equal(buildActiveNotificationSummary(mergeNotificationItemsWithStates(rows, [stateOf("returnsDueSoon", 5)], now)).topics, 3)
  const risen = rows.map((row) => row.key === "returnsDueSoon" ? { ...row, count: 6 } : row)
  assert.equal(buildActiveNotificationSummary(mergeNotificationItemsWithStates(risen, [stateOf("returnsDueSoon", 5)], now)).topics, 4)
})
