import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M12, M15, M22, M23, M25, M27, M29, M32, M33): the asset pages, the asset tools and
// my assets on the shared parts. Panels are ContentPanel (or getPanelClasses where the element cannot be one), tables
// DataTable, numbers StatStrip, label and value pairs KeyValueList, messages Notice by meaning, states StatusBadge, names
// the shared Chip, empty states EmptyNote or ActionEmptyState, codes tag, empty values Nil. Each test pins one file (or
// one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("activity drawer: each item's marker is a status shape and its label has no capitals (spec 2D M22)", () => {
  const source = read(`${C}ui/activity-drawer.tsx`)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: item\.tone \?\? "neutral" \}\), "mt-2"\)\} \/>/)
  assert.match(source, /<div className="text-meta font-medium text-muted-foreground">\{item\.label\}<\/div>/)
  assert.doesNotMatch(source, /uppercase|tracking-normal|rounded-full|getToneDotClass|\bbg-info\b|\btext-xs\b/)
})

test("QR code: no frame of its own inside the QR panel, and the asset tag under it is a tag (spec 2D D9, M33)", () => {
  const source = read(`${C}assets/asset-qr-code.tsx`)
  assert.match(source, /<div className="inline-flex flex-col items-center gap-3">/)
  assert.match(source, /<div className="max-w-44 text-center text-sm text-foreground">\n\s+<span className="tag font-medium">\{label\}<\/span>\n\s+<\/div>/)
  assert.doesNotMatch(source, /bg-white|rounded-lg|border|text-xs/)
})

test("status correction: the trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (spec 2D M27, D7)", () => {
  const source = read(`${C}assets/asset-status-correction-button.tsx`)
  assert.match(source, /const panelId = useId\(\)/)
  assert.match(source, /aria-expanded=\{open\}\n\s+aria-controls=\{open \? panelId : undefined\}/, "aria-controls only while the panel exists (axe aria-valid-attr-value)")
  assert.match(source, /<div id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<Notice tone="neutral" className="mt-1">\{labels\.description\}<\/Notice>/)
  assert.doesNotMatch(source, /border-warning-border|<p className="mt-1 text-sm text-muted-foreground">/)
})
