import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { buildDailyDigestMessage } from "../src/lib/notification-digest-format.ts"
import { buildNotificationSummaryItems } from "../src/lib/notification-summary-items.ts"
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
