import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D10, M21, M22, M24, M25, M28, M29, M33): the repair records, the PM plans and the
// repair print page on the shared parts. Panels are ContentPanel (or getPanelClasses where a section keeps an id),
// messages Notice by meaning, states StatusBadge, cadences the shared Chip, empty states EmptyNote, buttons Button and
// buttonVariants, text links linkVariants, codes tag, money formatMoney. Each test pins one file (or one tight pair) and
// fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("repair attachments: a ContentPanel, a warning Notice, a plain count, EmptyNote and the shared buttons; the thumbnail stays a raw button (spec 2D M28, D7, D9, M21, M29)", () => {
  const source = read(`${C}maintenance/maintenance-attachments.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("attachments"\)\}>/)
  assert.match(source, /<Notice tone="warning"[^>]*>\{t\("closedEvidenceAppendOnlyHelp"\)\}<\/Notice>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="text-meta num text-muted-foreground">\{formatCount\(group\.attachments\.length\)\}<\/span>/)
  assert.match(source, /<Button variant="outline" size="sm" className="flex-1" onClick=\{\(\) => setPreview\(attachment\)\}>/)
  assert.match(source, /<a\s+href=\{`\/api\/attachments\/\$\{attachment\.id\}`\}\s+className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /<Button\s+variant="danger"\s+size="icon-sm"\s+onClick=\{\(\) => void handleDelete\(attachment\.id\)\}\s+busy=\{deletingId === attachment\.id\}\s+aria-label=\{tCommon\("delete"\)\}\s+title=\{tCommon\("delete"\)\}\s*>/)
  // The thumbnail that opens the preview stays a raw button: the image or the PDF preview is the control (2D-4, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /className="mb-3 flex aspect-\[4\/3\] w-full items-center justify-center overflow-hidden rounded-md bg-surface text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/)
  assert.doesNotMatch(source, /Loader2|disabled:opacity|border-dashed|rounded-full|rounded-lg|hover:bg-accent|sm:h-8|sm:min-h-0|\btext-xs\b|\btext-lg\b|text-(?:info|danger|warning|primary)\b|bg-warning-soft|closeLabel=/)
})

test("repair form: a ContentPanel, the open-record error and the status effect as Notices, the reporter hint on its select, and an outline disclosure over a quiet grouping (spec 2D D7, D9, M29)", () => {
  const source = read(`${C}maintenance/repair-record-form.tsx`)
  assert.match(source, /<ContentPanel>\s*<form onSubmit=\{handleSubmit\} className="space-y-5">/)
  assert.match(source, /<Notice tone="danger" role="alert">\s*\{tMaintenance\("errors\.MAINTENANCE_OPEN_RECORD_EXISTS"\)\}/)
  assert.match(source, /<Notice tone="warning">\s*\{t\(`assetStatusEffect\.\$\{effectKey\}`\)\}\s*<\/Notice>/)
  assert.match(source, /hint=\{t\("reporterHelp"\)\}/)
  assert.match(source, /const detailsId = useId\(\)/)
  assert.match(source, /<Button\s+variant="outline"\s+aria-expanded=\{showDetails\}\s+aria-controls=\{showDetails \? detailsId : undefined\}\s+onClick=\{\(\) => setShowDetails\(\(open\) => !open\)\}\s+className="w-full justify-between"\s*>/)
  assert.match(source, /<div id=\{detailsId\} className="mt-3 grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-2">/)
  assert.doesNotMatch(source, /<button\b|<section\b|rounded-lg|bg-warning-soft|border-warning-border|text-warning|hover:bg-accent|\btext-xs\b|transition-transform|\bh-4 w-4\b/)
  const select = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(select, /\n\s+hint\?: React\.ReactNode\n/)
  assert.match(select, /\n\s+hint=\{hint\}\n/)
})

test("PM plan form: a plain ContentPanel with no tinted frame and no heading of its own; the page header names the form (spec 2D D9)", () => {
  const source = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assert.match(source, /<ContentPanel>\s*<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">/)
  assert.doesNotMatch(source, /<section\b|primary-soft|primary-border|CalendarClock|t\("pmCreateTitle"\)|\bmt-4\b/)
})

const D = "src/app/[locale]/(dashboard)/"

test("repair-record list: the stuck and PM-due sections keep their ids on the panel classes with a warning Notice and quiet rows, the list is a divided ContentPanel, and outcomes are StatusBadges (spec 2D D7, D9, M22, M25, M29, M33)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  assert.match(source, /<section id="stuck" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>\n\s+<h2 className="text-base font-semibold text-foreground">\{t\("stuckTitle"\)\} \(\{formatCount\(stuckTotal\)\}\)<\/h2>/)
  assert.match(source, /<Notice tone="warning" className="mt-3">\{t\("stuckHelp"\)\}<\/Notice>/)
  assert.match(source, /<li key=\{asset\.id\} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">/)
  assert.match(source, /<span className="tag">\{asset\.assetTag\}<\/span> - \{asset\.name\} <span className="text-meta text-muted-foreground">\(\{asset\.status\.nameTh\}\)<\/span>/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}>\n\s+\{t\("createTitle"\)\}/)
  assert.match(source, /<section id="pm-due" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<h2 className="text-base font-semibold text-foreground">\{t\("pmDueTitle"\)\} \(\{formatCount\(duePlans\.length\)\}\)<\/h2>/)
  assert.match(source, /<ul className="mt-3 divide-y divide-border-soft rounded-md border border-border bg-background">/)
  assert.match(source, /<span className="tag">\{plan\.planNo\}<\/span> · <span className="tag">\{plan\.asset\.assetTag\}<\/span> - \{plan\.asset\.name\}/)
  assert.match(source, /href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`, returnHref\)\} className=\{buttonVariants\(\)\}/)
  assert.match(source, /<Notice tone="danger" role="alert" className="mt-3">\{t\("invalidDateRange"\)\}<\/Notice>/)
  assert.match(source, /<ContentPanel\s+divided\s+flush\s+className="overflow-hidden"\s+title=\{t\("listTitle"\)\}\s+description=\{t\("resultCount", \{ count: total \}\)\}\s+actions=\{/)
  assert.match(source, /className="block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/)
  assert.match(source, /<StatusBadge label=\{label\} tone=\{outcome === "usable" \? "success" : outcome === "beyond_repair" \? "warning" : "muted"\} \/>/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap">\{orNil\(outcomeBadge\(record\.outcome, record\.repairStatus\)\)\}<\/DataTableCell>/)
  assert.doesNotMatch(source, /AlertTriangle|CalendarClock|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|hover:text-primary|\bbg-primary\b|\btext-xs\b|rounded-lg|divide-border(?![\w-])|<section className=/)
})

test("review focus 1: a stuck asset with a long Thai name stays one cut line beside its button on a 375px phone (plan 2D-4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  const start = source.indexOf("{stuckAssets.map((asset) => (")
  const row = source.slice(start, source.indexOf('{t("createTitle")}', start))
  assert.match(row, /<li key=\{asset\.id\} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">/)
  assert.match(row, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 items-center md:min-h-0"\)\}>\n\s+<span className="truncate">\n\s+<span className="tag">\{asset\.assetTag\}<\/span>/)
  assert.match(row, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}/, "the button keeps its width; the name gives way")
})

test("repair record page: ContentPanels, the history section on the panel classes with status markers and EmptyNote, the outcome as a StatusBadge, a warning Notice with its action, and outline links (spec 2D D7, D9, M21, M22, M25, M29)", () => {
  const source = read(`${D}maintenance/[id]/page.tsx`)
  for (const title of ["detailTitle", "legacyTitle", "assetSection", "disposalReviewTitle"]) {
    assert.match(source, new RegExp(`<ContentPanel title=\\{t\\("${title}"\\)\\}>`), title)
  }
  assert.match(source, /<section id="history" className=\{cn\(getPanelClasses\(\), "scroll-mt-6 p-4 sm:p-5"\)\}>\n\s+<h2 className="mb-4 text-base font-semibold text-foreground">\{t\("history"\)\}<\/h2>/)
  assert.match(source, /<EmptyNote>\{t\("historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: "primary" \}\), "absolute top-2 -left-1"\)\} \/>/)
  assert.match(source, /<StatusBadge label=\{outcomeLabel\} tone=\{ticket\.outcome === "usable" \? "success" : ticket\.outcome === "beyond_repair" \? "warning" : "muted"\} \/>/)
  assert.match(source, /<Notice\s+tone="warning"\s+action=\{\s*<Link href=\{disposalRequestHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{ticket\.asset\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "w-full"\)\}>/)
  assert.doesNotMatch(source, /ActionEmptyState|AlertTriangle|rounded-lg|rounded-full|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|\btext-lg\b|\btext-xs\b|<section className=/)
})

test("PM plans page: the frequency is a Chip (a cadence, not a state), and the row's sub-line is text-meta (spec 2D M22, 2D-2 R2)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<Chip>\{t\(`pmFrequencies\.\$\{plan\.frequency\}`\)\}<\/Chip>/)
  assert.match(source, /<div className="mt-1 truncate text-meta text-muted-foreground">\n\s+<span className="tag">\{plan\.planNo\}<\/span>/)
  assert.doesNotMatch(source, /pmFrequencies[^\n]*tone=|\btext-xs\b/)
})
