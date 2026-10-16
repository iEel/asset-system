import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D19, M20–M22, M25, M26, M29, M33): the audit pages and their parts on the shared
// parts. List frames take the panel classes, page sections are ContentPanel, number tiles StatStrip, label and value
// pairs KeyValueList, messages Notice by meaning, states StatusBadge, names the shared Chip, empty states EmptyNote,
// codes tag, empty values Nil, links linkVariants or buttonVariants. The audit mobile fix of the findings table (8
// columns, colgroup, sticky actions, the compact review actions) stays. Each test pins one file and fails before that
// commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("audit progress bar: no frame of its own, counts through formatCount, the breakdown as a legend with shape markers (spec 2D D9, M22)", () => {
  const source = read(`${C}audit/audit-progress-bar.tsx`)
  assert.match(source, /<div className=\{compact \? "min-w-44" : undefined\}>/)
  assert.match(source, /\{formatCount\(processed\)\}\/\{formatCount\(total\)\}/)
  assert.match(source, /\{formatCount\(pending\)\}/)
  assert.match(source, /\{formatCount\(percent\)\}%/)
  assert.match(source, /<span aria-hidden="true" className=\{statusMarkerVariants\(\{ tone: item\.tone \?\? "muted" \}\)\} \/>/)
  assert.match(source, /<dd className="text-count num text-foreground">\{formatCount\(item\.value\)\}<\/dd>/)
  assert.doesNotMatch(source, /rounded-lg|border-border|bg-surface|getBreakdownClass|-soft\b|\btext-xs\b|text-lg/)
})
