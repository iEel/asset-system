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
