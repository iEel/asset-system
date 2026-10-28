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

test("audit round close: the shared busy Button only; the next-step card writes the conditions (spec 2D D7; group 2 spec §8, §13 bug 2)", () => {
  const source = read(`${C}audit/audit-round-close-button.tsx`)
  assert.match(source, /<Button onClick=\{closeRound\} busy=\{saving\} disabled=\{disabled\}>\s*<Lock aria-hidden="true" \/>\s*\{t\("closeRound"\)\}/)
  assert.doesNotMatch(source, /<ContentPanel\b|<StatStrip\b|<Notice\b|checklist/)
  assert.doesNotMatch(source, /<button\b|Loader2|CheckCircle2|disabled:opacity|text-white|-soft\b|rounded-lg|rounded-md|text-2xl|\btext-xs\b/)
})

test("audit round cancel dialog: the impact counts are a KeyValueList through formatCount and the no-rollback line is a warning Notice (spec 2D M26, D7, D19)", () => {
  const source = read(`${C}audit/audit-round-cancel-button.tsx`)
  assert.match(source, /<Notice tone="warning">\{t\("cancelNoRollbackWarning"\)\}<\/Notice>/)
  assert.match(source, /<KeyValueList\b/)
  for (const field of ["processedItems", "pendingItems", "pendingFindings", "approvedFindings", "openActions", "scanHistoryRows"]) {
    assert.match(source, new RegExp(`value: formatCount\\(impact\\.${field}\\)`), field)
  }
  assert.doesNotMatch(source, /function ImpactItem\b|<ImpactItem\b|border-warning-border|bg-warning-soft|text-xl font-bold|\btext-xs\b/)
})

test("audit round form: the sections in one panel and the summary in another, codes as tag, an EmptyNote, the components Notice and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33; group 2 spec §7)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-\[minmax\(0,1fr\)_20rem\]">/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "grid min-w-0 content-start gap-8 p-4 sm:p-5"\)\}>/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"\)\}>/)
  assert.match(source, /<p className="text-metric num text-foreground">\{formatCount\(preview\.sampledAssets\)\}<\/p>/)
  assert.match(source, /<Notice tone="info">\{t\("previewComponentHelp", \{ count: formatCount\(componentItems\) \}\)\}<\/Notice>/)
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(source, /<EmptyNote className="mt-2">\{t\("previewEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"\s+label=\{t\("includeClosedAssets"\)\}\s+description=\{t\("includeClosedAssetsHelp"\)\}/)
  // The summary is a panel, not a landmark: an <aside> inside <main> fails axe's landmark-complementary-is-top-level.
  assert.doesNotMatch(source, /<StatStrip\b|<aside\b|<section\b|function PreviewMetric\b|uppercase|tracking-|primary-soft|primary-border|info-soft|info-border|text-info|warning-soft|warning-border|rounded-lg|\btext-xs\b|<input\b|checkboxVariants/)
})

test("finding review actions: a warning Notice on the phone card, KeyValueLists with Nil in the dialog, the impact and the conflict as Notices by meaning, no typed dash (spec 2D D7, D19, LV2)", () => {
  const source = read(`${C}audit/audit-finding-review-actions.tsx`)
  assert.match(source, /<Notice tone="warning">\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/Notice>/)
  assert.match(source, /<p className="flex items-start gap-1\.5 text-left text-meta text-warning">/, "the table keeps the small note of the audit mobile fix")
  assert.match(source, /<div className="rounded-md border border-border bg-background p-4">/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the finding summary and the conflict dates")
  assert.match(source, /\{ key: "systemValue", label: t\("systemValue"\), value: expectedValue \}/)
  assert.match(source, /<Notice tone=\{action === "approve" \? "warning" : "neutral"\} title=\{t\(`reviewDecisionImpactTitle_\$\{action\}`\)\}>/)
  assert.match(source, /<Notice tone="warning" role="alert" title=\{t\("reviewConflictTitle"\)\}>\{t\("reviewConflictHelp"\)\}<\/Notice>/)
  assert.match(source, /value: conflict\.findingReportedAt \? formatDateTime\(conflict\.findingReportedAt\) : null/)
  assert.match(source, /<p className="text-sm text-muted-foreground">\{t\("closureEvidenceCount", \{ count: uploadedCount \}\)\}<\/p>/)
  assert.doesNotMatch(source, /"-"|function (?:ReviewPreviewField|formatClientDateTime)\b|rounded-lg|border-warning-border|border-danger-border|bg-danger-soft|\btext-xs\b/)
})

test("findings batch panel: a ContentPanel, the pending findings as checkbox ChoiceCards in a quiet grouping (spec 2D D9, M25)", () => {
  const source = read(`${C}audit/audit-findings-batch-actions.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("batchReview"\)\}\s+description=\{t\("batchReviewHelp"\)\}\s+actions=\{/)
  assert.match(source, /<div className="rounded-md border border-border bg-background p-3">/)
  assert.match(source, /<ChoiceCard\s+key=\{finding\.id\}\s+type="checkbox"\s+label=\{finding\.label\}\s+description=\{finding\.detail\}/)
  assert.doesNotMatch(source, /<section\b|<label\b|<input\b|checkboxVariants|hover:bg-accent|rounded-lg|\bmb-4\b|\btext-xs\b/)
})

const D = "src/app/[locale]/(dashboard)/"

test("findings page: the list frame on the panel classes, the phone card one link with the resolution badge and a Chip, the evidence as text links, text-meta sub-lines (spec 2D D9, D19, M22, M29, M33; group 2 spec §10)", () => {
  const source = read(`${D}audit/findings/page.tsx`)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /<StatusBadge className="shrink-0" label=\{resolutionStateLabels\[resolutionState\]\} tone=\{RESOLUTION_STATE_TONES\[resolutionState\]\} \/>/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(/g)?.length, 2, "the evidence links and the table row's open link")
  assert.match(source, /<DataTable framed=\{false\} layout="fixed" minWidth=\{[^}]+\} /)
  assert.match(source, /<Chip data-audit-finding-subject>\{topic\}<\/Chip>/, "เรื่อง names the field: a Chip, not a status (DESIGN.md Chip, P4-R2)")
  assert.doesNotMatch(source, /function (?:FindingComparison|ResolutionStateBadge|ReviewStatusBadge|ActionStatusBadge)\b|info-soft|info-border|text-info|hover:underline|hover:bg-accent|text-primary|\btext-xs\b|rounded-lg border/)
})

test("audit rounds list: the coverage a folded `<details>` on the panel classes with frameless gap lists, the next actions a StatStrip, the list frame on the panel classes, one StatusBadge state, KeyValueList facts, outline sm workflow links, text links and tag scopes (spec 2D §3.4, D7, D9, D19, M21, M22, M29, M33; group 2 spec §6)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  assert.match(source, /\{\/\* A <details> cannot be ContentPanel: the panel classes \(2D-2 R4\)\.[^*]*\*\/\}\n\s+<details className=\{cn\(getPanelClasses\(\), "group\/coverage p-4 sm:p-5"\)\}>/)
  assert.match(source, /\{t\("coverageRoundCount"\)\}: <span className="num font-semibold text-foreground">\{formatCount\(currentYearRoundCount\)\}<\/span>/)
  assert.match(source, /<section aria-labelledby="audit-round-next-actions-title" className="space-y-3">/)
  assert.match(source, /attention: action\.tone === "warning" && action\.count > 0/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /<StatusBadge label=\{labels\.status\} status=\{effectiveAuditRoundStatus\(status\)\} \/>/)
  assert.equal(source.match(/<RoundStatusBadges\b/g)?.length, 2, "the phone card and the table")
  for (const [label, tone] of [["ready", "success"], ["pendingReview", "warning"]]) {
    assert.match(source, new RegExp(`<StatusBadge label=\\{labels\\.${label}\\} tone="${tone}" \\/>`), label)
  }
  assert.match(source, /<KeyValueList\s+className="mt-3"/)
  assert.match(source, /className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 3, "the round code of the phone card and the two gap-list links")
  assert.match(source, /<EmptyNote tone="clear">\{emptyLabel\}<\/EmptyNote>/)
  assert.match(source, /<dl className="mt-2 grid grid-cols-3 gap-x-3">/)
  assert.match(source, /formatScope\(round, t\("all"\), scopeLabels\)/)
  assert.match(source, /<span className="tag">\{/)
  assert.doesNotMatch(source, /function (?:AuditStatusBadge|MobileAuditField)\b|"All assets"|rounded-full|rounded-lg|\b(?:bg|border)-(?:success|warning|danger|info)-(?:soft|border)\b|\btext-info\b|hover:underline|hover:text-primary|text-2xl font-bold|\btext-xs\b|CheckCircle2|ClipboardCheck/)
})

test("audit round page: ContentPanels, the cancelled state as an info Notice with its facts in a KeyValueList, the result list head without a frame, the list frame on the panel classes, Chips and info Notices instead of the info tint (spec 2D §3.4, D7, D9, M22, M29; group 2 spec §8: the next-step card, the result card and ไม่ตรงเรื่องอะไร)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("statusCancelled"\)\} className="mb-6">\s*<Notice tone="info">\{t\("cancelledReadOnlyNotice"\)\}<\/Notice>/)
  assert.match(source, /value: round\.cancelledAt \? formatDateTime\(round\.cancelledAt\) : null/)
  assert.match(source, /<ContentPanel\s+divided\s+title=\{stepsState\.current \?/)
  for (const key of ["resultDashboard", "mismatchFieldsTitle"]) assert.match(source, new RegExp(`<ContentPanel divided title=\\{t\\("${key}"\\)\\}`), key)
  assert.match(source, /<span className="num font-medium text-foreground">\{formatCount\(resultListTotal\)\}<\/span> \{t\("items"\)\}/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  assert.equal(source.match(/<Chip key=\{line\} title=\{line\}>\{line\}<\/Chip>/g)?.length, 2)
  assert.equal(source.match(/<Notice tone="info" className="mt-2">/g)?.length, 2)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-info(?:-soft|-border)?\b|bg-danger-soft|border-danger-border|rounded-full|rounded-lg border|hover:text-primary|\btext-xs\b/)
  assert.equal(source.match(/text-danger/g)?.length, 1, "only the overdue line")
})

test("audit pending page: the count in the title and the rooms as TabNav chips, the list frame on the panel classes, the phone card facts in a KeyValueList and the codes as tag (spec 2D D9, D19, M29, M33; group 2 spec §9)", () => {
  const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  assert.doesNotMatch(source, /<ContentPanel\b|t\("pendingCount"/)
  assert.match(source, /<TabNav aria-label=\{t\("roomChips"\)\}/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /<KeyValueList\s+className="mt-3"/)
  assert.match(source, /<span className="tag">\{location\.code\}<\/span> - \{location\.name\}/)
  assert.match(source, /<span className="tag">\{custodian\.code\}<\/span> - \{custodian\.name\}/)
  assert.doesNotMatch(source, /function PendingInfo\b|rounded-lg border|hover:underline|text-primary|\btext-xs\b|\borNil\b/)
})
