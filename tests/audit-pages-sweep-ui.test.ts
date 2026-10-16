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

test("audit round close: a ContentPanel with the shared busy Button, the checklist counts as a StatStrip with attention, and a blocking rule as a neutral Notice (spec 2D D7, D9, M22, M29)", () => {
  const source = read(`${C}audit/audit-round-close-button.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("closeChecklist"\)\}\s+description=\{t\("closeChecklistHelp"\)\}\s+actions=\{/)
  assert.match(source, /<Button onClick=\{closeRound\} busy=\{saving\} disabled=\{disabled\}>\s*<Lock aria-hidden="true" \/>\s*\{t\("closeRound"\)\}/)
  assert.match(source, /<StatStrip\b/)
  assert.match(source, /value: formatCount\(item\.value\)/)
  assert.match(source, /href: item\.href && item\.value > 0 \? item\.href : undefined/)
  assert.match(source, /attention: !item\.ok/)
  assert.match(source, /<Notice key=\{item\.label\} tone="neutral" className="mt-3">\{item\.label\}<\/Notice>/)
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

test("audit round form: the form is the panel, the sampling box a quiet grouping, the preview a StatStrip with an info Notice, codes as tag, an EmptyNote and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2"\)\}>/)
  assert.match(source, /<div className="md:col-span-2 rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<StatStrip\b/)
  for (const value of ["formatCount\\(preview\\.matchedAssets\\)", "formatCount\\(preview\\.sampledAssets\\)", "formatCount\\(componentItems\\)", "`\\$\\{formatCount\\(preview\\.sampleRate\\)\\}%`"]) {
    assert.match(source, new RegExp(`value: ${value}`), value)
  }
  assert.match(source, /<Notice tone="info">\{t\("previewComponentHelp", \{ count: componentItems \}\)\}<\/Notice>/)
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(source, /<EmptyNote className="mt-2">\{t\("previewEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"\s+label=\{t\("includeClosedAssets"\)\}\s+description=\{t\("includeClosedAssetsHelp"\)\}/)
  assert.doesNotMatch(source, /<section\b|function PreviewMetric\b|uppercase|tracking-|primary-soft|primary-border|info-soft|info-border|text-info|warning-soft|warning-border|rounded-lg|\btext-xs\b|<input\b|checkboxVariants/)
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
