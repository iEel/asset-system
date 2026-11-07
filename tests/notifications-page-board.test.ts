import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 9 plan 3 task 2 (board NT, spec §5.2, §6.2): the notifications page on its loader, the status tabs, the
// assigned chip, read-all, the two sections, the topic rows with their ⋯ menu and the daily digest panel. Sources are
// read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/notifications/page.tsx")
const actions = () => read("src/components/notifications/notification-center-actions.tsx")
const row = () => read("src/components/notifications/notification-topic-row.tsx")
const digest = () => read("src/components/notifications/notification-digest-panel.tsx")
const messages = (locale: "th" | "en") =>
  (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { notifications: Record<string, unknown> }).notifications
const message = (locale: "th" | "en", path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages(locale))

test("the page reads everything from getNotificationsPageData", () => {
  const source = page()
  assert.match(source, /const data = await getNotificationsPageData\(user, \{ searchParams: rawSearchParams, locale \}\)/)
  assert.doesNotMatch(source, /prisma\.|getNotificationCenter\(|<StatStrip/)
  // The header number is the unread topics, the same as the bell and the work center.
  assert.match(source, /t\("bellLine", \{ count: data\.counts\.unread \}\)/)
  assert.match(source, /<Notice tone="info"/)
})

test("the status tabs and the assigned chip build status= and assigned=1 links", () => {
  const source = page()
  assert.match(source, /NOTIFICATION_STATUS_TABS\.map\(\(status\) => \(\{/)
  assert.match(source, /href: buildNotificationsHref\(locale, data\.params, \{ status \}\)/)
  assert.match(source, /count: formatCount\(data\.counts\[status\]\)/)
  assert.match(source, /<TabNav\b/)
  assert.match(source, /grid grid-cols-2 gap-1\.5 sm:hidden/, "phone: the tabs are a 2 × 2 grid below sm")
  assert.match(source, /href=\{buildNotificationsHref\(locale, data\.params, \{ assigned: !data\.params\.assigned \}\)\}/)
  assert.match(source, /aria-current=\{data\.params\.assigned \? "true" : undefined\}/)
  assert.match(source, /t\("assignedFilter", \{ count: data\.counts\.assigned \}\)/)
})

test("ทำเป็นอ่านแล้วทั้งหมด uses read_all and shows only while something is unread", () => {
  assert.match(page(), /\{data\.counts\.unread > 0 \? \(\n\s+<NotificationReadAllButton\b/)
  const source = actions()
  assert.match(source, /export function NotificationReadAllButton\(/)
  assert.match(source, /await markAllNotificationsRead\(locale\)/)
  assert.match(read("src/lib/notification-client-sync.ts"), /body: JSON\.stringify\(\{ action: "read_all" \}\)/)
  assert.equal(message("th", "markAllReadCommand"), "ทำเป็นอ่านแล้วทั้งหมด")
})

test("the backlog and advance sections, the advance one with id advance", () => {
  const source = page()
  assert.match(source, /<TopicSection\n\s+id="backlog"/)
  assert.match(source, /<TopicSection\n\s+id="advance"/)
  assert.match(source, /<section id=\{id\} aria-labelledby=\{`\$\{id\}-heading`\} className="border-t border-border first:border-t-0">/)
  assert.match(source, /t\("sections\.backlogMeta", \{ queues: data\.backlog\.queues \}\)/)
  assert.equal(message("th", "sections.backlog"), "งานค้าง")
  assert.equal(message("th", "sections.advance"), "เตือนล่วงหน้า")
  assert.equal(message("th", "sections.backlogMeta"), "{queues, number} คิว ตรงกับศูนย์งานค้าง")
  assert.equal(message("th", "sections.advanceMeta"), "ยังไม่ถึงขั้นเป็นงานค้าง")
})

test("an empty status tab shows its own empty state", () => {
  assert.match(page(), /<EmptyNote padded>\{t\(`empty\.\$\{data\.params\.status\}`\)\}<\/EmptyNote>/)
  for (const locale of ["th", "en"] as const) {
    for (const status of ["unread", "read", "snoozed", "all"]) {
      assert.equal(typeof message(locale, `empty.${status}`), "string", `${locale}: notifications.empty.${status}`)
    }
  }
})

test("the footer sum line", () => {
  assert.match(page(), /t\("footer", \{ total: data\.counts\.all, unread: data\.counts\.unread, read: data\.counts\.read, snoozed: data\.counts\.snoozed \}\)/)
  assert.equal(
    message("th", "footer"),
    "{total, number} หัวข้อ = ยังไม่อ่าน {unread, number} + อ่านแล้ว {read, number} + เลื่อนเตือน {snoozed, number} · ข้อมูลทะเบียนไม่ครบและความคืบหน้าตรวจนับดูที่ศูนย์งานค้าง ไม่ส่งแจ้งเตือน",
  )
})

test("a topic row: the whole row opens and marks read, unread emphasised, change and pill, ⋯ last", () => {
  const source = row()
  assert.match(source, /<NotificationOpenLink\n\s+item=\{\{ key: row\.key, count: row\.count, href: row\.href \}\}/)
  assert.match(source, /row\.state === "unread" \? "font-semibold text-foreground" : "text-muted-foreground"/)
  assert.match(source, /t\("detail\.assignee", \{ name: row\.assigneeName \}\)/)
  assert.match(source, /topicStatePill\(row, now, locale\)/)
  assert.match(source, /<StatusBadge label=\{t\(pill\.key, pill\.values\)\} tone="muted" \/>/)
  assert.match(source, /case "new":\n\s+return <StatusBadge label=\{t\("change\.new"\)\} tone="warning" \/>/)
  assert.match(source, /case "unknown":\n\s+return null/)
  assert.match(source, /<NotificationCenterActions\b/)
  for (const locale of ["th", "en"] as const) {
    for (const key of ["change.same", "change.new", "change.fromYesterday", "change.fromDay", "pill.readToday", "pill.readOn", "pill.snoozedUntil", "detail.overdueSince", "detail.assignee"]) {
      assert.equal(typeof message(locale, key), "string", `${locale}: notifications.${key}`)
    }
  }
  assert.equal(message("th", "detail.overdueSince"), "เกินกำหนดตั้งแต่ {date}")
})

test("snooze choices send 24, 72 and 168 hours", () => {
  const source = actions()
  assert.match(source, /const SNOOZE_CHOICES = \[\n\s+\{ key: "day", hours: 24 \},\n\s+\{ key: "threeDays", hours: 72 \},\n\s+\{ key: "week", hours: 168 \},\n\s*\] as const/)
  assert.match(source, /onSelect: \(\) => mutate\(\{ action: "snooze", snoozeHours: choice\.hours \}\)/)
  assert.match(source, /<RowActions\b/)
  assert.equal(message("th", "actions.snoozeDay"), "1 วัน")
  assert.equal(message("th", "actions.snoozeThreeDays"), "3 วัน")
  assert.equal(message("th", "actions.snoozeWeek"), "1 สัปดาห์")
})

test("cancel snooze sends unread, only on a snoozed row", () => {
  const source = actions()
  assert.match(source, /item\.state === "snoozed"\n\s+\? \[\{ kind: "action", key: "cancel-snooze", label: labels\.cancelSnooze, onSelect: \(\) => mutate\(\{ action: "unread" \}\) \}\]/)
  assert.match(source, /item\.state === "read"\n\s+\? \{ kind: "action", key: "unread", label: labels\.markUnread, onSelect: \(\) => mutate\(\{ action: "unread" \}\) \}\n\s+: \{ kind: "action", key: "read", label: labels\.markRead, onSelect: \(\) => mutate\(\{ action: "read" \}\) \}/)
  assert.equal(message("th", "actions.cancelSnooze"), "ยกเลิกการเลื่อนเตือน")
  assert.equal(message("th", "actions.markRead"), "ทำเป็นอ่านแล้ว")
  assert.equal(message("th", "actions.markUnread"), "ทำเป็นยังไม่อ่าน")
  assert.equal(message("th", "actions.changeAssignee"), "เปลี่ยนผู้รับผิดชอบ…")
})

test("every action keeps its toasts, the summary-changed event and router.refresh()", () => {
  const source = actions()
  assert.equal(source.match(/toast\.success\(labels\.saved\)\n\s+notifyNotificationSummaryChanged\(\)\n\s+router\.refresh\(\)/g)?.length, 2, "one topic and read-all")
  assert.match(source, /if \(!response\.ok\) \{\n\s+toast\.error\(labels\.error\)/)
  assert.match(source, /<AccessibleDialog\b/)
  assert.match(source, /mutate\(\{ action: "assign", assignedToUserId: assignedToUserId \|\| null \}/)
})

test("the digest panel: one <details> per day, the first open, the digest=all link and the legacy rows", () => {
  const source = digest()
  assert.match(source, /<details key=\{day\.day\.toISOString\(\)\} open=\{index === 0\}/)
  assert.match(source, /<summary\b/)
  assert.match(source, /href=\{buildNotificationsHref\(locale, params, \{ digestAll: true \}\)\}/)
  assert.match(source, /t\("digest\.showAll", \{ days: totalDays \}\)/)
  assert.match(source, /buildWaitingWorkHref\(locale, topic\.key\)/)
  assert.match(source, /t\("digest\.legacyTitle"\)/)
  assert.match(source, /<EmptyNote>\{t\("digest\.empty"\)\}<\/EmptyNote>/)
  assert.equal(message("th", "digest.title"), "สรุปรายวันที่ส่งแล้ว")
  assert.equal(message("th", "digest.subtitle"), "ส่งวันละครั้ง นับเฉพาะหัวข้อที่ยังไม่อ่านตอนส่ง")
  assert.equal(message("th", "digest.day"), "{date} · {topics, number} หัวข้อ · {items, number} รายการ")
  assert.equal(message("th", "digest.showAll"), "ดูย้อนหลังทั้งหมด ({days, number} วัน)")
  assert.equal(message("th", "digest.empty"), "ยังไม่มีสรุปรายวันที่ส่ง")
  // The side panel is the right column from lg and follows the list on phones.
  assert.match(page(), /lg:grid-cols-\[minmax\(0,1fr\)_20rem\]/)
  assert.ok(page().indexOf("<NotificationDigestPanel") > page().indexOf('id="advance"'))
})
