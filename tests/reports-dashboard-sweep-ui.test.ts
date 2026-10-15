import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, D19, M21, M22, M29, M30, M31, R5 hand-on): notifications, reports, the dashboard and
// the work center on the shared parts. Panels are ContentPanel, numbers StatStrip, states StatusBadge, names Chip,
// buttons and button-shaped links Button or buttonVariants, text links linkVariants, empty states EmptyNote, and an
// /api download a plain <a>. Each test pins one file and fails before its commit. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("notification center actions: the open link and the two commands are outline md, with the shared disabled look (spec 2D M29)", () => {
  const source = read(`${C}notifications/notification-center-actions.tsx`)
  assert.match(source, /className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}/)
  assert.equal(source.match(/<Button\s+variant="outline"\s+size="md"/g)?.length, 2)
  assert.equal(source.match(/disabled=\{isPending\}/g)?.length, 3, "the two buttons and the assignee select")
  assert.doesNotMatch(source, /<button\b|disabled:opacity|\bh-9\b|hover:bg-accent/)
})

const D = "src/app/[locale]/(dashboard)/"

test("notifications: the cards use the panel classes and the count is a StatusBadge (spec 2D D9, M30)", () => {
  const source = read(`${D}notifications/page.tsx`)
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}/g)?.length, 2)
  assert.match(source, /<StatusBadge label=\{formatCount\(item\.count\)\} tone=\{item\.tone\} \/>/)
  assert.doesNotMatch(source, /function toneClass\b|rounded-full|rounded-lg border/)
})

test("report presets: lg save beside the 40px field, an outline icon-sm delete, a text-link row, an error Notice and EmptyNote (spec 2D M29, D5, D7)", () => {
  const source = read(`${C}reports/report-preset-controls.tsx`)
  assert.match(source, /<Button size="lg" onClick=\{savePreset\}>\n\s+<BookmarkPlus aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="icon-sm" onClick=\{\(\) => deletePreset\(preset\.id\)\} aria-label=\{`\$\{labels\.deletePreset\}: \$\{preset\.name\}`\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "flex min-h-11 min-w-0 flex-1 items-center px-2 text-sm md:min-h-0 md:py-1"\)\}>\n\s+<span className="truncate">\{preset\.name\}<\/span>/)
  assert.match(source, /\{message \? <Notice tone="danger" role="alert" className="mt-2">\{message\}<\/Notice> : null\}/)
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.savedPresetsEmpty\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /<button\b|text-white|sm:h-|sm:w-8|sm:min-h-0|text-danger|hover:bg-danger-soft|rounded-md border border-border bg-background p-4/)
})

test("report catalog: three ContentPanels, /api downloads as plain <a>, the cadence a Chip and permissions as status badges (spec 2D D9, M29, M31)", () => {
  const source = read(`${C}reports/reports-catalog-view.tsx`)
  assert.equal(source.match(/<ContentPanel title=\{labels\.\w+\} description=\{labels\.\w+\}>/g)?.length, 3)
  assert.match(source, /<a href=\{report\.href\} download className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "mt-4 w-full sm:w-auto"\)\}>/)
  assert.match(source, /<a href=\{report\.exportHref\} download className=\{buttonVariants\(\{ size: "sm" \}\)\}>/)
  assert.match(source, /<Link href=\{report\.viewHref\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>/)
  assert.match(source, /<Chip>\{report\.cadence\}<\/Chip>/)
  assert.match(source, /<EmptyNote>\{emptyLabel\}<\/EmptyNote>/)
  assert.match(source, /tone=\{permission\.allowed \? "success" : "muted"\}/)
  assert.doesNotMatch(source, /<Link href=\{report\.(?:href|exportHref)\}|border-dashed|rounded-full|function PermissionPill\b|text-white|sm:h-8|bg-(?:info|primary|success)-soft|rounded-lg border/)
})

test("report operations: ContentPanels, the cross-scope export as a plain <a>, text links for the fixes and warning badges for the flags (spec 2D D9, M29, M30, M31)", () => {
  const source = read(`${C}reports/reports-operations-view.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 4)
  assert.match(source, /<a href=\{crossScope\.exportHref\} download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Link key=\{issue\.key\} href=\{issue\.href\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(source, /<StatusBadge key=\{label\} label=\{label\} tone="warning" \/>/)
  assert.match(source, /<Link href=\{asset\.primaryFixHref\} className=\{buttonVariants\(\{ size: "sm" \}\)\}>/)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{title\}<\/h3>/)
  assert.doesNotMatch(source, /border-dashed|rounded-full|bg-warning-soft|text-white|sm:h-|hover:underline|<Link\s+href=\{crossScope\.exportHref\}|rounded-lg border/)
})

test("report overview: the preview is a divided flush ContentPanel, the breakdowns ContentPanels, and the asset link a text link (spec 2D D9, M29)", () => {
  const source = read(`${C}reports/reports-overview-view.tsx`)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{labels\.previewTitle\}/)
  assert.match(source, /<ContentPanel title=\{title\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /rounded-lg border|hover:underline|<section\b/)
})
