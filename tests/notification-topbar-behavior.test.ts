import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const topbarSource = () => readFileSync("src/components/layout/notification-bell.tsx", "utf8")
const centerActionsSource = () => readFileSync("src/components/notifications/notification-center-actions.tsx", "utf8")

test("the bell reads the shell's summary and fetches nothing itself (menu B shell task 3)", () => {
  const source = topbarSource()

  assert.match(source, /const \{ summary, markRead, markAllRead \} = useShellNotifications\(\)/)
  assert.match(source, /\{total > 99 \? "99\+" : total\}/)
  assert.doesNotMatch(source, /fetch\(|notificationSummaryChangedEvent|createLatestNotificationRequestGuard/)
})

test("plain notification clicks mark the item read before navigating", () => {
  const source = topbarSource()

  assert.match(source, /isPlainPrimaryClick\(event\)/)
  assert.match(source, /event\.preventDefault\(\)/)
  assert.match(source, /await markRead\(item\.key\)/)
  assert.match(source, /finally\s*\{[\s\S]*router\.push\(item\.href\)/)
})

test("notification center open action also marks the item read before navigating", () => {
  const source = centerActionsSource()

  assert.match(source, /isPlainPrimaryClick\(event\)/)
  assert.match(source, /event\.preventDefault\(\)/)
  assert.match(source, /markNotificationRead\(item\)/)
  assert.match(source, /finally\s*\{[\s\S]*router\.push\(item\.href\)/)
})

test("notification center mutations notify the topbar after a successful save", () => {
  const source = centerActionsSource()

  assert.match(source, /notifyNotificationSummaryChanged\(\)/)
  assert.match(source, /notifyNotificationSummaryChanged\(\)[\s\S]*router\.refresh\(\)/)
  assert.match(source, /catch\s*\{[\s\S]*toast\.error\(labels\.error\)/)
})

// Phase 2C batch 4 (spec 2C §8.2 O17, §4.3 F4): the assignee select is the shared NativeSelect at the md size, the
// height of the buttons beside it, and it stays inside its one-line label.
test("the notification assignee select is the shared NativeSelect at the md size (2C batch 4)", () => {
  const source = centerActionsSource().replace(/\r\n/g, "\n")
  assert.match(source, /import \{ NativeSelect \} from "@\/components\/ui\/native-select"/)
  assert.match(source, /<label className="flex min-w-0 items-center gap-2 text-sm">[\s\S]*?<NativeSelect\n\s+fieldSize="md"\n\s+value=\{assignedToUserId\}\n\s+disabled=\{isPending\}/)
  assert.match(source, /className="min-w-44"\n\s+>[\s\S]*?<\/NativeSelect>\n\s+<\/label>/)
  assert.doesNotMatch(source, /<select\b|focus:border-ring/)
})
