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
  assert.match(source, /<Button type="submit" size="lg" className="sm:mt-6\.5">\n\s+<BookmarkPlus aria-hidden="true" \/>/)
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

test("report accounting: an empty ratio is Nil through StatStrip, and the asset links are text links (2D-1 R5 hand-on, M29)", () => {
  const source = read(`${C}reports/reports-accounting-view.tsx`)
  assert.match(source, /\{ key: "repairRatio", label: labels\.repairRatio, value: formatPercent\(costInsights\.repairToPurchaseRatio\) \},/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 2)
  assert.doesNotMatch(source, /"—"|hover:underline/)
})

test("the dashboard: one KPI StatStrip at the top level, divided ContentPanels on a 7 + 5 grid, the data bar and no tone fills (spec 2026-10-25 §6.1, §6.6; 2B R-d)", () => {
  const source = read(`${D}dashboard/page.tsx`)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 1)
  assert.match(source, /<StatStrip items=\{kpiItems\} \/>/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 4, "งานที่รอคุณ, ตรวจนับแยกสาขา, ตามสถานะ, ล่าสุด")
  assert.equal(source.match(/<ContentPanel\n?\s*divided\n?\s*flush\b/g)?.length, 4)
  // Each segment links to its status's list with the row's own exact href and names it on hover (spec §2 decision 3, R17).
  assert.match(source, /<DistributionBar segments=\{statusRows\.map\(\(row\) => \(\{ key: row\.key, count: row\.count, tone: row\.tone, href: row\.href, title: t\("statusSegmentTitle", \{ status: row\.name, count: formatCount\(row\.count\), note: withCompany\(t\("noteStatus", \{ status: row\.name \}\)\) \}\) \}\)\)\} \/>/)
  assert.match(source, /<Link href=\{row\.href\} title=\{withCompany\(t\("noteStatus", \{ status: row\.name \}\)\)\}/, "the table row opens the same list, for everyone")
  assert.doesNotMatch(source, /<DistributionBar label=/, "the bar is aria-hidden: no name")
  assert.match(source, /className=\{cn\("size-2\.5 shrink-0 rounded-xs", statusFillVariants\(\{ tone: row\.tone \}\)\)\}/, "the row's swatch is its segment's fill (Task 7, R20)")
  assert.doesNotMatch(source, /splitStatRows|formatTrendDelta|StatusBadge|statusMarkerVariants|DashboardCrossScopePreview|style=\{/)
  assert.doesNotMatch(source, /bg-(?:primary|success|warning|danger|info)-soft|rounded-full|rounded-lg border|text-3xl|text-2xl|hover:underline|dark:/)
})

test("the work center: follow-up panels are ContentPanels with text links (D19), empty queues are EmptyNote, and the dots are shape markers (spec 2D D9, D19, M21)", () => {
  const source = read(`${D}work-center/page.tsx`)
  assert.match(source, /<ContentPanel\n\s+title=\{title\}\n\s+description=\{subtitle\}\n\s+className=\{isExpanded \? "border-primary-border" : undefined\}/)
  assert.ok((source.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center(?: gap-1)? md:min-h-0"\)\}/g)?.length ?? 0) >= 4, "the four D19 links")
  assert.equal(source.match(/<EmptyNote tone="clear">\{t\("no\w+Issues"\)\}<\/EmptyNote>/g)?.length, 5)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone \}\), "mt-2"\)\} \/>/)
  assert.doesNotMatch(source, /function (?:EmptyState|followUpDotClass|splitStatRows)\b|border-dashed|rounded-full|sm:min-h-0|sm:border-0|hover:underline|text-xs text-warning/)
})
