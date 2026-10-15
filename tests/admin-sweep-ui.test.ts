import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, M13, M14, M20–M22, M25, M27, M29, M30, M33): the admin screens on the shared parts.
// Panels are ContentPanel, tables DataTable, messages Notice by meaning, states StatusBadge, names the shared Chip,
// empty states EmptyNote or ActionEmptyState, codes tag, empty values Nil. Each test pins one file (or one tight pair)
// and fails before that file's commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("settings: panels are ContentPanel, notes are Notice, tables DataTable, no raw colors, and the tab row fits at 1440 (spec 2D §3.2, D18)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.doesNotMatch(source, /function (?:SectionHeader|Head|StatusCard|Metric|MiniMetric|EmptyTransferState)\b|<button\b|<table\b|border-dashed|rounded-full|\b(?:bg|text|border)-(?:slate|amber|blue|emerald|rose)-\d|bg-white|uppercase tracking-normal|opacity-80|md:min-h-10|role="list"/)
  assert.doesNotMatch(source, /className="(?:overflow-(?:hidden|visible) )?rounded-lg border/, "every panel is ContentPanel")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 16)
  assert.match(source, /<div id="settings-workspace">\n\s+<ContentPanel divided title=\{labels\.settingsOverview\} description=\{labels\.settingsOverviewDescription\}>/)
  assert.equal(source.match(/<KeyValueList items=\{overviewItems\.slice\((?:0, 5|5)\)\} \/>/g)?.length, 2)
  for (const [tone, text] of [["info", "labels.workflowApprovalFoundationNote"], ["neutral", "labels.schedulerHeartbeatNote"], ["neutral", "labels.retentionDaysHelp"], ["neutral", "labels.ldapSyncRecommendation"]]) {
    assert.ok(source.includes(`<Notice tone="${tone}">{${text}}</Notice>`), `${text} is a ${tone} Notice`)
  }
  assert.match(source, /<Notice tone="warning">\{labels\.ldapDefaultRoleMissing\.replace\("\{role\}", getValue\("ldap_default_role"\)\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="danger" role="alert">\n\s+<ApiErrorText error=\{syncError\} \/>\n\s+<\/Notice>/)
  assert.match(source, /function ValidationMessage\(\{ message \}: \{ message: string \}\) \{\n\s+return \(\n\s+<Notice tone="danger" className="my-2">/)
  assert.match(source, /className="h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-9"/, "R3 hand-on: the presets are 36px from md")
  assert.match(source, /<span className="tag">\{result\.key\}<\/span>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{group\.prefix\}<\/span>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{setting\.key\}<\/span>/)
  assert.match(source, /\{orNil\(formatReviewValue\(setting\.key, initialValues\[setting\.key\]\)\)\}/)
  assert.match(source, /return normalized \|\| null\n/)
  assert.match(source, /onNavigate=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+openSettingGroup\(tab\)\n\s+\}\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the preview counts and the applied counts")
  assert.match(source, /className="overflow-hidden rounded border border-control-border bg-surface text-foreground shadow-sm"/, "the label paper uses tokens and keeps its paper shadow")
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).systemSettingsPage.tabDocuments, locale === "th" ? "เลขเอกสาร" : "Documents", `${locale}: the shorter tab label keeps the row inside 1440 (D18)`)
  }
})

test("the depreciation builder has no frame of its own in the settings panel, and its facts and preview are KeyValueLists (spec 2D D7, D9)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.match(source, /<div className="space-y-5 border-t border-border pt-5">/)
  assert.doesNotMatch(source, /function (?:ReadonlyFact|PreviewMetric)\b|space-y-5 rounded-md|bg-warning-soft|min-h-\[66px\]|<p className="px-2 py-3/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the method facts and the preview")
  assert.match(source, /<Notice tone="warning" title=\{labels\.depreciationLegacyRules\}>/)
  assert.match(source, /<EmptyNote className="px-2 py-3">\{emptyLabel\}<\/EmptyNote>/)
})

test("the integration client manager: StatStrip, ContentPanel, DataTable, shared badges and chips, and default Buttons in the row (spec 2D M27)", () => {
  const source = read(`${C}admin/IntegrationClientManager.tsx`)
  assert.doesNotMatch(source, /<button\b|disabled:opacity|text-white|rounded-full|border-dashed|<table\b|<thead\b|function (?:SummaryCard|OperationMetric|StatusBadge)\b|bg-(?:success|danger|warning)-soft|h-10 min-h-11/)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.match(source, /<ContentPanel divided title=\{labels\.tokenPanelTitle\}>\n\s+<div className="space-y-4">\n\s+<Notice tone="warning">\{labels\.tokenPanelWarning\}<\/Notice>/)
  assert.match(source, /<Notice tone=\{copyFeedback\.tone === "success" \? "success" : "danger"\} role="status">/)
  assert.match(source, /<ContentPanel divided title=\{labels\.createTitle\}>/)
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.match(source, /<StatusBadge label=\{enabled \? labels\.active : labels\.disabled\} tone=\{enabled \? "success" : "muted"\} \/>/)
  assert.match(source, /<Chip>\n\s+<span className="tag">\{scope\}<\/span>\n\s+<\/Chip>/)
  assert.equal(source.match(/<span className="tag">\{client\.(?:clientId|tokenPreview)\}<\/span>/g)?.length, 4, "the id and the token preview in the row and the phone card")
  assert.match(source, /<Button variant="outline" busy=\{busy\} onClick=\{onRotate\}>/, "R3 hand-on: the rotate button is the shared busy Button")
  assert.match(source, /<Button variant="danger" onClick=\{onDisable\} disabled=\{busy\}>/)
  assert.match(source, /<Button onClick=\{dismissToken\} disabled=\{!tokenAcknowledgement\}>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => onCopyPowerShell\(example\)\} className="w-fit">/)
  assert.equal(source.match(/<Loader2\b/g)?.length, 1, "only the loading status of the list head (I27)")
})

test("the role permission form: two ContentPanels, the system-role guard as a neutral Notice, DataTable and the module key as a tag (spec 2D D7, M27)", () => {
  const source = read(`${C}admin/role-permission-form.tsx`)
  assert.match(source, /<ContentPanel divided title=\{t\("roleMetadata"\)\} description=\{t\("metadataSubtitle"\)\}>/)
  assert.match(source, /\{isSystemRole \? <Notice tone="neutral" className="mb-5">\{permissionsLocked \? t\("systemAdminGuard"\) : t\("systemRoleGuard"\)\}<\/Notice> : null\}/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{t\("permissionSelection"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("permissionSelection"\)\}>/)
  assert.match(source, /<span className="tag">\{moduleName\}<\/span>/)
  assert.doesNotMatch(source, /rounded-lg border|font-mono|bg-info-soft|text-info\b|\bInfo\b/)
})
