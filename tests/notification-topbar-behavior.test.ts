import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const topbarSource = () => readFileSync("src/components/layout/topbar.tsx", "utf8")
const centerActionsSource = () => readFileSync("src/components/notifications/notification-center-actions.tsx", "utf8")

test("topbar refetches its client summary when notification state changes", () => {
  const source = topbarSource()

  assert.match(source, /window\.addEventListener\(notificationSummaryChangedEvent,\s*loadNotificationSummary\)/)
  assert.match(source, /window\.removeEventListener\(notificationSummaryChangedEvent,\s*loadNotificationSummary\)/)
  assert.match(source, /notificationRequestGuard\.begin\(\)/)
  assert.match(source, /notificationRequestGuard\.isLatest\(requestId\)/)
  assert.doesNotMatch(source, /\.catch\(\(\)\s*=>\s*\{\s*if \(!cancelled\) setNotificationSummary\(\{ total: 0, items: \[\] \}\)/)
})

test("plain notification clicks mark the item read before navigating", () => {
  const source = topbarSource()

  assert.match(source, /isPlainPrimaryClick\(event\)/)
  assert.match(source, /event\.preventDefault\(\)/)
  assert.match(source, /markNotificationRead\(item\)/)
  assert.match(source, /removeNotificationSummaryItem/)
  assert.match(source, /notifyNotificationSummaryChanged\(\)/)
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
