import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const filterPanel = readFileSync("src/components/reports/report-filter-panel.tsx", "utf8")

test("reports renders the adaptive shell before one active view", () => {
  const order = ["data-report-tabs", "data-report-filters", "data-report-active-filters", "data-report-shared-metrics", "data-report-view-content"]
  const indexes = order.map((token) => page.indexOf(token))
  assert.ok(indexes.every((index) => index >= 0))
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b))
  assert.match(page, /parseReportView/)
  assert.match(page, /switch \(activeView\)/)
})

test("filter form keeps view state and uses adaptive columns", () => {
  assert.match(filterPanel, /name="view" value=\{activeView\}/)
  assert.match(filterPanel, /grid-cols-1/)
  assert.match(filterPanel, /md:grid-cols-2/)
  assert.match(filterPanel, /xl:grid-cols-3/)
})
