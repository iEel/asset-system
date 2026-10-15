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
  // The tabs are the shared TabNav (spec 2B I9, table A): its current link has aria-current="page" and a 2px underline
  // drawn as an inset shadow, a shape and not only a color, so the wrapper sets neither.
  const tabNavSource = readFileSync(new URL("../src/components/ui/tab-nav.tsx", import.meta.url), "utf8")
  assert.match(viewTabsSource, /<TabNav\b/)
  assert.match(tabNavSource, /shadow-\[inset_0_-2px_0_var\(--primary\)\]/)
  assert.match(tabNavSource, /aria-current=\{selected \? "page" : undefined\}/)
  assert.doesNotMatch(viewTabsSource, /aria-current=\{|<Link\b|\bCheck\b/)
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

// Plan 2B-5 Task 10 (spec 2B I9, §8.9 row 8, B3(5)): the report views are the shared TabNav, underlined at every width
// and 44px on phones. This client wrapper keeps the scrolling: the nav ref, the snap row, snap-start on every link and
// the effect that brings the current tab into view below md. This file reads the source raw (CRLF): no line breaks here.
test("report view tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)", () => {
  assert.match(viewTabsSource, /import \{ TabNav \} from "@\/components\/ui\/tab-nav"/)
  assert.match(viewTabsSource, /<TabNav\s+ref=\{tabsRef\}\s+data-report-tabs\s+aria-label=\{navigationLabel\}\s+current=\{activeView\}\s+className="snap-x snap-mandatory"\s+linkClassName="snap-start"/)
  assert.match(viewTabsSource, /items=\{reportViews\.map\(\(view\) => \(\{ key: view, label: labels\[view\], href: buildReportHref\(locale, view, filters\) \}\)\)\}/)
  assert.match(viewTabsSource, /tabs\?\.querySelector<HTMLElement>\('\[aria-current="page"\]'\)/)
})
