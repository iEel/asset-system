import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, D19, M21, M22, M29, M30, M31, R5 hand-on): notifications, reports, the dashboard and
// the work center on the shared parts. Panels are ContentPanel, numbers StatStrip, states StatusBadge, names Chip,
// buttons and button-shaped links Button or buttonVariants, text links linkVariants, empty states EmptyNote, and an
// /api download a plain <a>. Each test pins one file and fails before its commit. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

// Group 9 plan 3 Task 2 (board NT): the commands moved into the row's ⋯ (RowActions); read-all and the assign dialog's
// save are Button parts with the shared disabled look; no raw <button> and no fading.
test("notification center actions: ⋯ is RowActions, read-all and the assign save are Buttons with the shared disabled look (spec 2D M29; board NT)", () => {
  const source = read(`${C}notifications/notification-center-actions.tsx`)
  assert.match(source, /<RowActions code=\{item\.title\} menuLabel=\{labels\.menu\} groups=\{groups\} openerRef=\{openerRef\}/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{readAll\} disabled=\{isPending\}>/)
  assert.equal(source.match(/disabled=\{isPending\}/g)?.length, 3, "read-all, the assignee select and the assign save")
  assert.doesNotMatch(source, /<button|disabled:opacity|h-9|hover:bg-accent/)
})

const D = "src/app/[locale]/(dashboard)/"

test("notifications: the list and the digest use the panel classes and states are StatusBadges (spec 2D D9, M30; board NT)", () => {
  const source = read(`${D}notifications/page.tsx`)
  assert.match(source, /className=\{cn\(getPanelClasses\(\), "min-w-0 overflow-hidden"\)\}/)
  assert.match(read(`${C}notifications/notification-digest-panel.tsx`), /className=\{cn\(getPanelClasses\(\), "min-w-0"\)\}/)
  assert.match(read(`${C}notifications/notification-topic-row.tsx`), /<StatusBadge label=\{t\(pill\.key, pill\.values\)\} tone="muted" \/>/)
  assert.doesNotMatch(source, /function toneClass|rounded-lg border/)
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

// Group 10 plan 1 Task 2: the breakdowns are divided flush ContentPanels with a DataTable now, and the overview has its
// own sections (the strip, the group tables, the phone export card), each named.
test("report overview: the preview is a divided flush ContentPanel, the breakdowns ContentPanels, and the asset link a text link (spec 2D D9, M29)", () => {
  const source = read(`${C}reports/reports-overview-view.tsx`)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{t\("previewShortTitle"\)\}/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+title=\{title\}/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "line-clamp-2 min-h-11 md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /hover:underline/)
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

// Rebuilt on board WC (group 9 plan 2 Task 2): the ข้อมูลไม่ครบ tab keeps its ContentPanel with D19 text links, its
// EmptyNote and the shape marker; the table's empty queues are a clear TableEmptyRow and its urgency is a shape marker.
test("the work center: the assets panel is a ContentPanel with text links (D19), empty queues say so, and the dots are shape markers (spec 2D D9, D19, M21)", () => {
  const panel = read("src/components/work-center/work-center-assets-panel.tsx")
  const table = read("src/components/work-center/work-rows-table.tsx")
  assert.match(panel, /<ContentPanel\n\s+title=\{t\("assetDataTitle"\)\}\n\s+description=\{t\("assetDataSubtitle"\)\}/)
  assert.ok((panel.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center(?: gap-1)? md:min-h-0"\)\}/g)?.length ?? 0) >= 2, "the D19 links")
  assert.match(panel, /<EmptyNote tone="clear">\{t\("noAssetDataIssues"\)\}<\/EmptyNote>/)
  assert.match(panel, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: "warning" \}\), "mt-2"\)\} \/>/)
  assert.match(table, /<TableEmptyRow colSpan=\{5\} tone="clear">\{t\(emptyKeys\[queue \?\? "overview"\]\)\}<\/TableEmptyRow>/)
  assert.match(table, /<span aria-hidden="true" className=\{statusMarkerVariants\(\{ tone: urgencyTones\[row\.urgency\] \}\)\} \/>/)
  for (const source of [panel, table]) {
    assert.doesNotMatch(source, /function (?:EmptyState|followUpDotClass|splitStatRows)\b|border-dashed|rounded-full|sm:min-h-0|sm:border-0|hover:underline|text-xs text-warning/)
  }
})
