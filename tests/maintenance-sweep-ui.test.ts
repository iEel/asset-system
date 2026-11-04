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

test("repair attachments: a ContentPanel, a warning Notice, a plain count, EmptyNote and the shared buttons; the thumbnail stays a raw button (spec 2D M28, D7, D9, M21, M29; group 5 spec §8.5)", () => {
  const source = read(`${C}maintenance/maintenance-attachments.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("attachments"\)\}/)
  assert.match(source, /<Notice tone="warning"[^>]*>\{t\("closedEvidenceAppendOnlyHelp"\)\}<\/Notice>/)
  assert.match(source, /<EmptyNote>\{t\("noAttachments"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="text-meta num text-muted-foreground">\{formatCount\(group\.attachments\.length\)\}<\/span>/)
  // Group 5 plan 3 Task 4: download and delete moved into the preview; delete is the shared danger Button there.
  assert.match(source, /<Button\s+variant="danger"\s+size="sm"\s+onClick=\{\(\) => void handleDelete\(preview\.id\)\}\s+busy=\{deletingId === preview\.id\}\s*>/)
  // The tile that opens the preview stays a raw button: the image, the PDF or the named file is the control (2D-4, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(source, /Loader2|disabled:opacity|border-dashed|rounded-full|rounded-lg|hover:bg-accent|sm:h-8|sm:min-h-0|\btext-xs\b|\btext-lg\b|text-(?:info|danger|warning|primary)\b|bg-warning-soft|closeLabel=/)
})

// Group 5 plan 2 Task 3: the form moved onto the operation frame; section 3 is open (spec call 10) and the status effect
// became the status line, whose refusals are warning Notices (group 5 spec §7.3).
test("repair form: the operation frame, the open-record error and the refusals as Notices, the reporter hint on its select, and section 3 open with no disclosure (spec 2D D7, D9, M29; group 5 spec §7)", () => {
  const source = read(`${C}maintenance/repair-record-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{REPAIR_FORM_ID\}>\s*<OperationFormFrame/)
  assert.match(source, /<Notice tone="danger" role="alert">\s*\{tMaintenance\("errors\.MAINTENANCE_OPEN_RECORD_EXISTS"\)\}/)
  assert.match(source, /<Notice tone="warning" data-repair-ineligible>/)
  assert.match(source, /hint=\{t\("reporterHelp"\)\}/)
  assert.doesNotMatch(source, /assetStatusEffect|showDetails|aria-expanded|ContentPanel/)
  assert.doesNotMatch(source, /<button\b|<section\b|rounded-lg|bg-warning-soft|border-warning-border|text-warning|hover:bg-accent|\btext-xs\b|transition-transform|\bh-4 w-4\b/)
  const select = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(select, /\n\s+hint\?: React\.ReactNode\n/)
  assert.match(select, /\n\s+hint=\{hint\}\n/)
})

// Group 5 plan 4 Task 4: the PM form is the operation frame (spec §10), whose main panel and header replace the ContentPanel.
test("PM plan form: the operation frame's plain panel with no tinted frame and no heading of its own; the frame's header names the form (spec 2D D9; group 5 spec §10)", () => {
  const source = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{PM_PLAN_FORM_ID\}>\n\s+<OperationFormFrame\n/)
  assert.doesNotMatch(source, /ContentPanel|<section\b|<h[1-6]\b|primary-soft|primary-border|CalendarClock|t\("pmCreateTitle"\)|\bmt-4\b/)
})

const D = "src/app/[locale]/(dashboard)/"

// Group 5 plan 5 Task 2: the stuck and PM-due sections became RepairStuckCard and RepairPmDueCard, divided ContentPanels
// that keep the ids, with rows split by soft lines (ContentPanelRows) and the count as a badge. Task 3: the records part
// is a divided ContentPanel with the status as a StatusBadge and the outcome as the plain line under it (G5P5-R6).
test("repair-record list: the stuck and PM-due cards keep their ids on divided ContentPanels with a warning Notice and quiet rows, the list is a divided ContentPanel, and statuses are StatusBadges (spec 2D D7, D9, M22, M25, M29, M33; group 5 spec §11.2, §11.3)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  const stuck = read(`${C}maintenance/repair-stuck-card.tsx`)
  const pm = read(`${C}maintenance/repair-pm-due-card.tsx`)
  assert.match(stuck, /<ContentPanel\n\s+id="stuck"\n\s+divided\n\s+flush\n/)
  assert.match(stuck, /<Notice tone="warning" className="mx-4 mt-3 md:mx-5">\{t\("stuckHelp"\)\}<\/Notice>/)
  assert.match(stuck, /<ContentPanelRows>/)
  assert.match(stuck, /<li key=\{asset\.id\} data-repair-stuck-row className="flex min-w-0 items-center justify-between gap-3">/)
  assert.match(stuck, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}>\n\s+\{t\("createTitle"\)\}/)
  assert.match(pm, /<ContentPanel\n\s+id="pm-due"\n\s+divided\n\s+flush\n/)
  assert.match(pm, /<ContentPanelRows>/)
  assert.match(pm, /<StatusBadge\s+label=\{row\.badge\.kind === "overdue"/)
  assert.match(pm, /className=\{cn\(buttonVariants\(\), "shrink-0"\)\}>\n\s+\{t\("pmRecordDone"\)\}/)
  for (const card of [stuck, pm]) {
    assert.doesNotMatch(card, /AlertTriangle|CalendarClock|bg-warning-soft|border-warning-border|text-(?:warning|success|danger|primary)\b|hover:bg-accent|\bbg-primary\b|\btext-xs\b|rounded-lg|border-dashed|dark:|#[0-9a-fA-F]{3,6}\b|rgba?\(|<section\b/)
  }
  assert.match(source, /<Notice tone="danger" role="alert">\{t\("invalidDateRange"\)\}<\/Notice>/)
  assert.match(source, /<ContentPanel divided flush className="overflow-hidden" title=\{t\("listTitle"\)\}>/)
  assert.match(source, /className="block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/)
  assert.match(source, /<StatusBadge label=\{t\(`status\.\$\{row\.status\}`\)\} tone=\{getRepairRecordStatusTone\(row\.status\)\} \/>/)
  assert.doesNotMatch(source, /outcomeBadge|orNil/, "the outcome is the plain line under the status badge (G5P5-R6)")
  assert.doesNotMatch(source, /AlertTriangle|CalendarClock|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|hover:text-primary|\bbg-primary\b|\btext-xs\b|rounded-lg|divide-border(?![\w-])|<section className=/)
})

test("review focus 1: a stuck asset with a long Thai name stays one cut line beside its button on a 375px phone (plan 2D-4; group 5 plan 5)", () => {
  const source = read(`${C}maintenance/repair-stuck-card.tsx`)
  const start = source.indexOf("{rows.map((asset) => (")
  const row = source.slice(start, source.indexOf('{t("createTitle")}', start))
  assert.match(row, /<li key=\{asset\.id\} data-repair-stuck-row className="flex min-w-0 items-center justify-between gap-3">\n\s+<div className="min-w-0">/)
  assert.match(row, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 max-w-full items-center md:min-h-0"\)\}>\n\s+<span className="truncate">\{asset\.name\}<\/span>/)
  assert.match(row, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}/, "the button keeps its width; the name gives way")
})

test("repair record page: ContentPanels, the history section on the panel classes with status markers and EmptyNote, the outcome as a StatusBadge, a warning Notice with its action, and outline links (spec 2D D7, D9, M21, M22, M25, M29)", () => {
  const source = read(`${D}maintenance/[id]/page.tsx`)
  // The asset panel is RepairRecordAssetPanel since group 5 plan 3 Task 2; its name links to the asset.
  // The details panel is RepairRecordDetails since group 5 plan 3 Task 3, with the outcome as a StatusBadge.
  const details = read("src/components/maintenance/repair-record-details.tsx")
  assert.match(details, /<ContentPanel title=\{t\("detailTitle"\)\}>/)
  assert.match(details, /<StatusBadge label=\{outcomeLabel\} tone=\{ticket\.outcome === "usable" \? "success" : ticket\.outcome === "beyond_repair" \? "warning" : "muted"\} \/>/)
  for (const title of ["legacyTitle", "disposalReviewTitle"]) {
    assert.match(source, new RegExp(`<ContentPanel title=\\{t\\("${title}"\\)\\}>`), title)
  }
  // The history moved to RepairRecordHistory (group 5 plan 3 Task 3); it keeps the panel classes, the markers and EmptyNote.
  const history = read("src/components/maintenance/repair-record-history.tsx")
  assert.match(history, /<section id="history" className=\{cn\(getPanelClasses\(\), "scroll-mt-6 p-4 sm:p-5"\)\}>/)
  assert.match(history, /<h2 className="text-base font-semibold text-foreground">\{t\("history"\)\}<\/h2>/)
  assert.match(history, /<EmptyNote>\{t\("historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(history, /statusMarkerVariants\(\{ tone: "primary" \}\), "absolute top-1\.5 -left-\[3px\]"/)
  assert.match(source, /<RepairRecordHistory\b/)
  assert.match(source, /<Notice\s+tone="warning"\s+action=\{\s*cardOffersDisposal \? null : \(\s*<Link href=\{disposalRequestHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(read("src/components/maintenance/repair-record-asset-panel.tsx"), /<ContentPanel title=\{t\("assetSection"\)\}>/)
  assert.doesNotMatch(source, /ActionEmptyState|AlertTriangle|rounded-lg|rounded-full|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|\btext-lg\b|\btext-xs\b|<section className=/)
})

test("PM plans page: the frequency is a Chip (a cadence, not a state), and the row's sub-line is text-meta (spec 2D M22, 2D-2 R2)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<Chip>\{t\(`pmFrequencies\.\$\{plan\.frequency\}`\)\}<\/Chip>/)
  assert.match(source, /<div className="mt-1 text-meta text-muted-foreground"><span className="tag">\{plan\.planNo\}<\/span><\/div>/)
  assert.doesNotMatch(source, /pmFrequencies[^\n]*tone=|\btext-xs\b/)
})

const P = "src/app/[locale]/(print)/"

test("repair print page: the cost goes through formatMoney, as on the screen, without a unit (its label ends in บาท) (spec 2D D10, M24)", () => {
  const source = read(`${P}maintenance/[id]/print/page.tsx`)
  assert.match(source, /^import \{ formatDate \} from "@\/lib\/utils"$/m)
  assert.match(source, /^import \{ formatMoney \} from "@\/lib\/display-format"$/m)
  assert.match(source, /\{ label: tRecord\("cost"\), value: ticket\.repairCost == null \? null : formatMoney\(Number\(ticket\.repairCost\)\) \}/)
  assert.doesNotMatch(source, /formatCurrency/)
})

test("formatCurrency is gone from src/lib/utils.ts once both print pages show money through formatMoney (spec 2D D10, §4.1)", () => {
  assert.doesNotMatch(read("src/lib/utils.ts"), /formatCurrency/)
  for (const path of [`${P}disposal/[id]/print/page.tsx`, `${P}maintenance/[id]/print/page.tsx`]) {
    const source = read(path)
    assert.match(source, /\bformatMoney\(/, path)
    assert.doesNotMatch(source, /formatCurrency/, path)
  }
})

// Group 5 plan 5 Task 2 (G5P5-R7): the PM card counts the reminder set as its overdue and week buckets and shows 3
// rows; its foot links to the PM page filtered to the list it names, so "และอีก N แผน" (pmDueMore) and stuckMore went.
test("PM due card counts the reminder set and its foot names the list it opens (critique 2026-10-20 D2; group 5 decision 6)", () => {
  const pm = read(`${C}maintenance/repair-pm-due-card.tsx`)
  assert.match(pm, /const total = overdue \+ week/)
  assert.match(pm, /const footLink = pmCardFootLink\(overdue, week\)/)
  assert.doesNotMatch(read(`${D}maintenance/page.tsx`), /pmDueMore|stuckMore|formatCount\(duePlans\.length\)/)
  for (const l of ["th", "en"]) {
    const record = JSON.parse(read(`messages/${l}.json`)).repairRecord
    assert.equal(record.pmDueMore, undefined)
    assert.equal(record.stuckMore, undefined)
  }
})
