import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
const provider = () => read("src/components/layout/shell-notifications.tsx")
const messages = (locale: string) => JSON.parse(read(`messages/${locale}.json`)) as { notifications: Record<string, string> }

test("the shell keeps one notification summary current: on mount, every 2 minutes while visible, on return to the tab, and on the change event (menu B shell task 3)", () => {
  const source = provider()
  assert.match(source, /^"use client"/)
  assert.match(source, /export function ShellNotificationsProvider\(\{ children \}: \{ children: React\.ReactNode \}\)/)
  assert.match(source, /throw new Error\("useShellNotifications must be used inside <ShellNotificationsProvider>"\)/)
  assert.match(source, /if \(document\.visibilityState === "visible"\) void refresh\(\)/)
  assert.match(source, /window\.setInterval\(refreshWhenVisible, NOTIFICATION_POLL_MS\)/)
  assert.match(source, /window\.clearInterval\(/)
  assert.match(source, /document\.addEventListener\("visibilitychange", refreshWhenVisible\)/)
  assert.match(source, /document\.removeEventListener\("visibilitychange", refreshWhenVisible\)/)
  assert.match(source, /window\.addEventListener\(notificationSummaryChangedEvent, refresh\)/)
  assert.match(source, /window\.removeEventListener\(notificationSummaryChangedEvent, refresh\)/)
  assert.match(source, /notificationRequestGuard\.begin\(\)/)
  assert.match(source, /if \(data && notificationRequestGuard\.isLatest\(requestId\)\) applyServerSummary\(data\)/)
  assert.match(source, /fetchNotificationSummary\(locale\)/)
  assert.doesNotMatch(source, /setSummary\(null\)|setSummary\(\{ total: 0/)
})

test("marking read updates the shared summary in place and tells the app; read-all takes the server's summary; both say whether the save landed (menu B shell task 3)", () => {
  const source = provider()
  assert.match(source, /markRead\(key: string\): Promise<boolean>/)
  assert.match(source, /markAllRead\(\): Promise<boolean>/)
  assert.match(source, /const saved = await markNotificationRead\(item\)\n\s+if \(saved\) \{\n\s+setSummary\(\(current\) => current && markNotificationSummaryItemRead\(current, key\)\)\n\s+notifyNotificationSummaryChanged\(\)\n\s+\}\n\s+return saved/)
  assert.match(source, /const next = await markAllNotificationsRead\(locale\)\n\s+if \(!next\) return false/)
})

test("new work is announced once, in one polite status region (menu B shell task 3)", () => {
  const source = provider()
  assert.equal(source.match(/role="status"/g)?.length, 1)
  assert.match(source, /<p role="status" className="sr-only" data-shell-notification-announcement>\{announcement\}<\/p>/)
  assert.match(source, /describeNotificationIncrease\(previousSummaryRef\.current, next,/)
  assert.match(source, /previousSummaryRef\.current = next/)
  assert.match(source, /tNotifications\("increaseAnnouncement", \{ title: tNotifications\(key\), count \}\)/)
  assert.match(source, /window\.setTimeout\(\(\) => setAnnouncement\(""\), NOTIFICATION_ANNOUNCEMENT_CLEAR_MS\)/)
  assert.equal(messages("th").notifications.increaseAnnouncement, "{title} เพิ่ม {count} รายการ")
  assert.equal(messages("en").notifications.increaseAnnouncement, "{title}: {count} more")
})

test("the dashboard shell mounts the provider around the menu and the top bar (menu B shell task 3)", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /import \{ ShellNotificationsProvider \} from "@\/components\/layout\/shell-notifications"/)
  // Loose on purpose: Task 9's More sheet, Task 10's ShellBannerProvider and Task 12a's SessionKeeper go around or beside the shell div.
  assert.match(shell, /<ConfirmProvider>[\s\S]*<ShellNotificationsProvider>[\s\S]*<div ref=\{shellRef\}[\s\S]*<\/ShellNotificationsProvider>[\s\S]*<\/ConfirmProvider>/)
})
