import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const activeFiltersSource = readFileSync(new URL("../src/components/reports/report-active-filters.tsx", import.meta.url), "utf8")
const viewTabsSource = readFileSync(new URL("../src/components/reports/report-view-tabs.tsx", import.meta.url), "utf8")

test("report filter actions stay at least 44px tall below the md breakpoint", () => {
  assert.doesNotMatch(activeFiltersSource, /sm:min-h-9/)
  assert.match(activeFiltersSource, /md:min-h-9/)
})

test("the active report tab has a non-color indicator", () => {
  assert.match(viewTabsSource, /import \{ Check \} from "lucide-react"/)
  assert.match(viewTabsSource, /isActive \? <Check aria-hidden="true"/)
  assert.match(viewTabsSource, /aria-current=\{isActive \? "page" : undefined\}/)
})

test("mobile report tabs snap and reveal the active view after direct navigation", () => {
  assert.match(viewTabsSource, /^"use client"/)
  assert.match(viewTabsSource, /useEffect/)
  assert.match(viewTabsSource, /activeTabRef/)
  assert.match(viewTabsSource, /scrollTo\(\{[\s\S]*?left:/)
  assert.match(viewTabsSource, /snap-x/)
  assert.match(viewTabsSource, /snap-mandatory/)
  assert.match(viewTabsSource, /snap-start/)
})
