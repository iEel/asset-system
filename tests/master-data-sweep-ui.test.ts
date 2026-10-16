import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M7, M21, M22, M25, M29, M32 a, M33): the master-data lists, detail pages and forms
// on the shared parts. The drill-down counts are text links with a 44px phone target, the active state is a
// StatusBadge (M7), panels are ContentPanel (or the panel classes where the element cannot be one). Each test pins one
// file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
// The 2D-2 precedent (reports, work center): a stand-alone text link adds the 44px phone target at the call site.
const drilldownLink = /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g

test("branches list: drill-down counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/branches/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
