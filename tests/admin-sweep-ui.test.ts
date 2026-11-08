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
  // The danger boxes became each setting's error under its field (v-track plan 3 task 4, ST4).
  assert.doesNotMatch(source, /function ValidationMessage|<ValidationMessage\b/)
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

// Group 12 plan 4 Task 2 (board AD-Integrations) split the manager: the side panel (client-create-sheet), the row and
// card (client-row) and the tiles and chips (client-tiles) live under admin/integrations/, so this reads all four. The
// create panel is a Sheet (no ContentPanel), the row's rotate and status buttons moved into the ⋯ menu (RowActions, its
// confirms kept in the manager) and scopes show in Thai, with an unknown scope's code as a tag.
test("the integration client manager: StatStrip, ContentPanel, DataTable, shared badges and chips, and default Buttons in the row (spec 2D M27)", () => {
  const source = [
    read(`${C}admin/IntegrationClientManager.tsx`),
    read(`${C}admin/integrations/client-create-sheet.tsx`),
    read(`${C}admin/integrations/client-row.tsx`),
    read(`${C}admin/integrations/client-tiles.tsx`),
  ].join("\n")
  assert.doesNotMatch(source, /<button\b|disabled:opacity|text-white|rounded-full|border-dashed|<table\b|<thead\b|function (?:SummaryCard|OperationMetric|StatusBadge)\b|bg-(?:success|danger|warning)-soft|h-10 min-h-11/)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.match(source, /<Notice tone="warning">\{labels\.tokenPanelWarning\}<\/Notice>/)
  assert.match(source, /<Notice tone=\{copyFeedback\.tone === "success" \? "success" : "danger"\} role="status">/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{labels\.clientsTitle\}/)
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.match(source, /<StatusBadge label=\{enabled \? labels\.active : labels\.disabled\} tone=\{enabled \? "success" : "muted"\} \/>/)
  assert.match(source, /<Chip key=\{scope\}>\{scopeLabels\[scope\] \?\? <span className="tag">\{scope\}<\/span>\}<\/Chip>/)
  assert.equal(source.match(/<span className="tag">\{client\.(?:clientId|tokenPreview)\}<\/span>/g)?.length, 2, "the id and the token preview, one part each for the row and the phone card")
  assert.match(source, /<RowActions\n/, "rotate and the status action are ⋯ menu items with their confirms")
  assert.match(source, /<Button onClick=\{dismissToken\} disabled=\{!tokenAcknowledgement\}/)
  assert.match(source, /key: "copyPowerShell", label: labels\.copyPowerShell,\n\s+onSelect: \(\) => onCopyPowerShell\(example\)/)
  assert.equal(source.match(/<Loader2\b/g)?.length, 1, "only the loading status of the list head (I27)")
})

test("the role permission form: two ContentPanels, the system-role guard as a neutral Notice, DataTable and the module key as a tag (spec 2D D7, M27)", () => {
  // Group 11 plan 3 Task 4 (board US-Role-Edit): ข้อมูลบทบาท moved to role-form/role-details-section.tsx and the matrix
  // to role-form/role-permission-matrix.tsx; its panel title is เลือกสิทธิ์ (form.matrixTitle) and the table caption is
  // still permissionSelection, passed in by the form.
  const details = read(`${C}admin/role-form/role-details-section.tsx`)
  const matrix = read(`${C}admin/role-form/role-permission-matrix.tsx`)
  assert.match(details, /<ContentPanel divided title=\{t\("roleMetadata"\)\} description=\{t\("metadataSubtitle"\)\}>/)
  assert.match(details, /\{isSystemRole \? <Notice tone="neutral" className="mb-5">\{permissionsLocked \? t\("systemAdminGuard"\) : t\("systemRoleGuard"\)\}<\/Notice> : null\}/)
  assert.match(matrix, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{t\("form\.matrixTitle"\)\}/)
  assert.match(matrix, /<DataTable framed=\{false\} caption=\{caption\}>/)
  assert.match(read(`${C}admin/role-permission-form.tsx`), /caption=\{t\("permissionSelection"\)\}/)
  assert.match(matrix, /<span className="tag">\{module\}<\/span>/)
  for (const source of [details, matrix]) assert.doesNotMatch(source, /rounded-lg border|font-mono|bg-info-soft|text-info\b|\bInfo\b/)
})

const D = "src/app/[locale]/(dashboard)/"

test("roles: create is a header button, the role kinds and the matrix roles are Chips, and the status is a StatusBadge (spec 2D M13, D7, D11)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  assert.match(source, /actions=\{\n\s+canExport \|\| canCreate \? \(\n\s+<>\n\s+\{canExport \? \(/)
  assert.ok(source.indexOf("/api/admin/roles/export") < source.indexOf("/admin/roles/new"), "the primary create comes last")
  assert.match(source, /<Chip>\{role\.isSystem \? t\("systemRole"\) : t\("customRole"\)\}<\/Chip>/)
  assert.match(source, /<Chip key=\{role\.id\} title=\{role\.displayName\}>/)
  assert.match(source, /<StatusBadge label=\{role\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{role\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /rounded-full|ActiveBadge|bg-(?:info|warning|success)-soft|text-white|\bfixed\b/)
})

test("users: role chips are the shared Chip and the status is a StatusBadge (spec 2D D7, M22)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  // Group 11 plan 1 Task 2: the role chips moved to UserRolesCell (two, then +N); their label is still
  // displayNameTh || displayName, set in src/lib/admin-users-page-data.ts.
  const cell = read("src/components/admin/users/user-roles-cell.tsx")
  assert.match(cell, /<Chip key=\{role\.id\} title=\{role\.label\}>\{role\.label\}<\/Chip>/)
  assert.match(read("src/lib/admin-users-page-data.ts"), /label: role\.displayNameTh \|\| role\.displayName/)
  assert.match(source, /<StatusBadge label=\{row\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{row\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|bg-info-soft|text-white/)
  assert.doesNotMatch(cell, /ActiveBadge|bg-info-soft|text-white/)
})

// Group 11 plan 2 Task 4 (board US-User-Edit): the form is four panels in two columns, each with the shared panel classes
// and ContentPanel's padding; the role list shows each role's name and permission count (the board), and the login name
// in the edit header is the code-like value shown as a tag.
test("the admin user form's panels use the shared panel classes and the login name is a tag (spec 2D D9, M33)", () => {
  const source = read(`${C}admin/admin-user-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate>/)
  assert.equal(source.match(/<section className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\} aria-labelledby="admin-user-(?:account|employee)-heading">/g)?.length, 2)
  const roles = read(`${C}admin/user-form/user-roles-section.tsx`)
  const preview = read(`${C}admin/user-form/user-access-preview.tsx`)
  for (const part of [roles, preview]) assert.match(part, /className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}/)
  assert.match(read(`${C}admin/user-form/user-form-header.tsx`), /<span className="tag">\{user\.username\}<\/span>/)
  for (const part of [source, roles, preview]) assert.doesNotMatch(part, /rounded-lg border|font-mono/)
})

test("the storage archive button is an outline sm Button that stays busy while it archives (spec 2D M14)", () => {
  const source = read(`${C}admin/storage-archive-button.tsx`)
  assert.match(source, /<Button variant="outline" size="sm" busy=\{archiving\} onClick=\{handleClick\}>\n\s+<Archive aria-hidden="true" \/>\n\s+\{t\("archiveOrphanFile"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|Loader2|disabled=|opacity-|bg-warning-soft|sm:h-8/)
})

test("storage: its four panels are ContentPanel, with no icon box (spec 2D D9)", () => {
  const source = read(`${D}admin/storage/page.tsx`)
  // Group 12 plan 3 Task 4: the file check panel is divided and flush (its rows run edge to edge, board AD-Storage), and
  // the review list and largest files are written inline instead of through title/description helpers.
  assert.equal(source.match(/<ContentPanel (?:divided flush className="overflow-hidden" )?title=\{t\("(?:filesystemDryRun|moduleBreakdown|reviewList|largestFiles)"\)\} description=\{t\("(?:filesystemDryRunHelp|moduleBreakdownHelp|reviewListHelp|largestFilesHelp)"\)\}>/g)?.length, 4)
  assert.doesNotMatch(source, /getPanelClasses|FolderOpen|bg-primary-soft|<section className=\{`/)
})

test("the state review queue is a divided ContentPanel with an md scan button, shape markers and the asset tag as a tag link (spec 2D D9, R3 hand-on)", () => {
  const source = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{labels\.title\}\n\s+description=\{labels\.description\}/)
  assert.match(source, /<span aria-hidden="true" className=\{statusMarkerVariants\(\{ tone \}\)\} \/>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}><span className="tag font-medium">\{row\.asset\.assetTag\}<\/span><\/Link>/)
  assert.match(source, /<div className="space-y-3 p-4" role="status" aria-label=\{labels\.loading\}>/)
  assert.doesNotMatch(source, /rounded-full|hover:underline|ShieldAlert|AlertTriangle|text-lg font-semibold|size="lg"/)
})

// Group 12 plan 3 Task 2 (board AD-DataQuality): the status cards and the rule form became one card per rule in
// data-quality/rule-card.tsx; it stays a panel with a severity badge, the count and a view link named after its rule.
test("data quality: rule cards are panels with a severity badge and a named view link, and the unread scanning label is gone (spec 2D D9, 2D-1 R6)", () => {
  const source = read(`${C}admin/data-quality/rule-card.tsx`)
  assert.match(source, /className=\{cn\(getPanelClasses\(\), "flex flex-col gap-4 p-4 sm:p-5", !rule\.enabled && "bg-background"\)\}/)
  assert.match(source, /<StatusBadge label=\{rule\.severity === "danger" \? labels\.danger : labels\.warning\} tone=\{count > 0 \? rule\.severity : "muted"\} \/>/)
  assert.match(source, /<span className="text-count num text-foreground">\{formatCount\(count\)\}<\/span>/)
  assert.match(source, /<Link href=\{href\} aria-label=\{`\$\{viewText\} \$\{name\}`\} className=\{cn\(linkVariants\(\), "ms-auto inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  for (const path of [`${D}admin/data-quality/page.tsx`, `${C}admin/data-quality/rule-card.tsx`]) {
    assert.doesNotMatch(read(path), /function severityClass\b|bg-(?:danger|warning)-soft|text-2xl font-bold|hover:underline|scanning: t\(/, path)
  }
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).dataQualityPage.assetStateReviews.scanning, undefined, `${locale}: the key no code reads is deleted`)
  }
})

// Group 12 plan 3 Task 2 (board AD-DataQuality): the panel title "กฎที่เปิดใช้งาน: n" became the save bar's
// "กฎที่เปิด {before} → {after}"; its counts still go through formatCount.
test("the data-quality rule form's enabled counts go through formatCount (spec 2D D9; 2B R-f)", () => {
  const source = read(`${C}admin/data-quality-rule-form.tsx`)
  assert.match(source, /labels\.changeEnabled\.replace\("\{before\}", formatCount\(change\.enabledBefore\)\)\.replace\("\{after\}", formatCount\(change\.enabledAfter\)\)/)
  assert.doesNotMatch(source, /toLocaleString|<section className="rounded-lg/)
})

test("readiness: the checklist is a ContentPanel of neutral cards with a status badge, and the scope note is an info Notice (spec 2D D7, D9)", () => {
  const source = read(`${D}admin/readiness/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("checklistTitle"\)\} description=\{t\("checklistDescription"\)\}>/)
  assert.match(source, /<Notice tone="info" title=\{t\("scopeTitle"\)\}>/)
  assert.match(source, /<article className="min-w-0 rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<StatusBadge label=\{labels\.status\} tone=\{checkTone\(check\.status\)\} \/>/)
  assert.doesNotMatch(source, /rounded-full|rounded-lg border|bg-(?:success|warning|danger|primary)-soft|function (?:checkCardClass|statusPillClass|statusIcon)\b/)
})

test("approval inbox: the policy is a KeyValueList with status badges, matrix cards are neutral, modules and approvers are Chips (spec 2D D7, D9, M30)", () => {
  // Group 6 plan 2 Task 2: the policy panel and the matrix moved, unchanged, into the page's policy fold.
  const policy = read("src/components/approvals/approval-inbox-policy.tsx")
  assert.match(policy, /<ContentPanel title=\{t\("policyTitle"\)\} description=\{t\("policyDescription"\)\}>\n\s+<KeyValueList/)
  assert.match(policy, /<ContentPanel\n\s+title=\{t\("approverMatrixTitle"\)\}/)
  assert.match(policy, /<StatusBadge label=\{labels\.status\} tone=\{matrixTone\(item\.status\)\} \/>/)
  assert.match(policy, /<Chip key=\{approver\}>\{approver\}<\/Chip>/)
  assert.doesNotMatch(policy, /rounded-full|rounded-lg border|bg-(?:success|warning|danger|primary)-soft|text-danger|function (?:PolicyBadge|moduleLabel|toneClass|pillClass|matrixCardClass|matrixStatusClass|matrixStatusIcon)\b|hover:bg-accent|"ตัดจำหน่าย"/)
  // The queue: the kind is a Chip, the age an SLA badge (danger only when overdue). The pressed overdue toggle takes the
  // Segmented pressed look (primary-soft), the only tint on the page.
  const source = read(`${D}admin/approvals/page.tsx`)
  assert.match(source, /<Chip>\{kindLabel\(row\)\}<\/Chip>/)
  assert.match(source, /tone=\{row\.age\.isOverdue \? "danger" : "muted"\}/)
  assert.doesNotMatch(source, /rounded-full|rounded-lg border|bg-(?:success|warning|danger)-soft|text-danger|hover:bg-accent|"ตัดจำหน่าย"/)
})

// Group 12 plan 2 Task 4 (board AD-ApprovalHistory): the row moved to approval-decision-row.tsx; its badge is the
// decision word (the logged action reads in the sentence), and the <details> toggle became a Button with aria-expanded.
test("approval history: the filter panel is a ContentPanel, a row shows a module Chip and a decision badge, and its changes are a DataTable (spec 2D D7, D9)", () => {
  const source = read(`${D}admin/approvals/history/page.tsx`)
  const row = read("src/components/admin/approvals/approval-decision-row.tsx")
  assert.match(source, /<ContentPanel title=\{t\("filterTitle"\)\} description=\{t\("filterDescription"\)\}>/)
  assert.match(source, /tone: decisionTone\(item\.decision\),/)
  assert.match(row, /<Chip>\{row\.moduleLabel\}<\/Chip>/)
  assert.match(row, /<StatusBadge label=\{row\.decisionLabel\} tone=\{row\.tone\} \/>/)
  assert.match(row, /aria-expanded=\{open\}/)
  assert.match(row, /<DataTable caption=\{labels\.viewDetails\}>/)
  for (const file of [source, row]) {
    assert.doesNotMatch(file, /<table\b|<thead\b|<th\b|rounded-full|hover:underline|rounded-lg border|function (?:decisionClass|decisionPillClass)\b|bg-(?:success|warning|danger|primary)-soft/)
  }
})

// Group 12 plan 2 Task 3 (board AD-Logs): the row lives in log-event-row.tsx, and the <details> toggle became the row's
// arrow Button (aria-expanded), which opens a detail row holding the changes table.
test("system log: the record link and the details toggle are text links, and the changes inside a row are a DataTable (spec 2D M29)", () => {
  const source = read("src/components/admin/logs/log-event-row.tsx")
  assert.match(source, /<Link href=\{log\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /<Button\n\s+type="button"\n\s+variant="ghost"\n\s+size="icon-sm"\n\s+aria-expanded=\{open\}/)
  assert.match(source, /<DataTable caption=\{labels\.changesCaption\}>/)
  assert.doesNotMatch(source, /<table\b|<thead\b|<th\b|hover:underline|rounded-md border border-border bg-background p-3/)
  assert.doesNotMatch(read(`${D}admin/logs/page.tsx`), /<table\b|<thead\b|<th\b|<details\b/)
})

test("readiness: an unlinked check shows its fix line instead of a link (critique 2026-10-20 F1)", () => {
  const src = read(`${D}admin/readiness/page.tsx`)
  assert.match(src, /fix: check\.href \? null : t\(`check_\$\{check\.key\}_fix`\)/)
  assert.match(src, /action: check\.href \? t\(`check_\$\{check\.key\}_action`\) : null/)
  assert.match(src, /\{check\.href \? \(\n\s+<Link/)
  assert.match(src, /\{labels\.fix \? <p className="mt-2 text-xs text-muted-foreground">\{labels\.fix\}<\/p> : null\}/)
  assert.doesNotMatch(read("src/lib/production-readiness.ts"), /"\/admin\/readiness"/)
})
