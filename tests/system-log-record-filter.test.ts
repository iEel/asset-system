import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildSystemLogRecordHref } from "../src/lib/system-log-history.ts"

const pageSource = readFileSync("src/app/[locale]/(dashboard)/admin/logs/page.tsx", "utf8").replace(/\r\n/g, "\n")
// Group 12 plan 2 Task 3 (board AD-Logs): the filter form moved to its own part.
const barSource = readFileSync("src/components/admin/logs/log-filters-bar.tsx", "utf8").replace(/\r\n/g, "\n")

test("buildSystemLogRecordHref encodes module and record", () => {
  assert.equal(buildSystemLogRecordHref("th", "user", "a b"), "/th/admin/logs?module=user&recordId=a+b")
  assert.equal(buildSystemLogRecordHref("en", "role", "x&y=z"), "/en/admin/logs?module=role&recordId=x%26y%3Dz")
})

test("the logs page filters by recordId and keeps it", () => {
  // The page gate stays system:view.
  assert.match(pageSource, /await requirePagePermission\(locale, "system", "view"\)/)
  // The filters are parsed by parseSystemLogFilters (recordId among them) and the where comes from systemLogWhere, which
  // adds recordId when it is set (tests/system-log-filters.test.ts pins both).
  assert.match(pageSource, /const filters = parseSystemLogFilters\(rawFilters\)/)
  assert.match(pageSource, /const where = systemLogWhere\(filters, /)
  // listHref keeps recordId (buildSystemLogQuery writes it); recordId: null drops it.
  const listHref = pageSource.slice(pageSource.indexOf("const listHref"), pageSource.indexOf("const quickFilterHref"))
  assert.match(listHref, /hrefFor\(recordId === null \? \{ \.\.\.filters, recordId: "" \} : filters, next\)/)
  // The quick-filter hrefs keep recordId.
  const quickFilterHref = pageSource.slice(pageSource.indexOf("const quickFilterHref"), pageSource.indexOf("const where"))
  assert.match(quickFilterHref, /if \(filters\.recordId\) params\.set\("recordId", filters\.recordId\)/)
  // The filter form has a hidden recordId input.
  assert.match(pageSource, /recordId=\{filters\.recordId\}/)
  assert.match(barSource, /\{recordId \? <input type="hidden" name="recordId" value=\{recordId\} \/> : null\}/)
  // A FilterChipList chip removes it: its href is the list URL without recordId.
  assert.match(pageSource, /import \{ FilterChipList \} from "@\/components\/ui\/filter-chips"/)
  assert.match(pageSource, /<FilterChipList/)
  assert.match(pageSource, /key: "recordId"/)
  assert.match(pageSource, /label: t\("recordFilterChip", \{ label: recordFilterLabel \}\)/)
  assert.match(pageSource, /href: listHref\(\{ pageSize: listPage\.pageSize, recordId: null \}\)/)
  // hasFilters counts it.
  assert.match(pageSource, /const hasFilters = Boolean\(filters\.tag \|\| filters\.userId \|\| filters\.dateFrom \|\| filters\.dateTo \|\| filters\.module \|\| filters\.action \|\| filters\.recordId\)/)
})

test("the record filter chip message exists in Thai and English", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.systemLogPage.recordFilterChip, "รายการที่เลือก: {label}")
  assert.match(en.systemLogPage.recordFilterChip, /\{label\}/)
})
