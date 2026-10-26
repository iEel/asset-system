import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1, §3.5): the fixes handed to the last plan of 2D, one test per commit, each failing before its
// commit: the asset state help's phone target, two-line StatStrip feet, the dashboard skeleton, the settings labels no
// one read, words instead of English codes on the settings screens, Thai loading and result lines, export links that
// download and the message keys no code reads. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"

test("the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)", () => {
  const source = read(`${C}assets/asset-state-help-popover.tsx`)
  const trigger = source.match(/<button\b[\s\S]*?className="([^"]+)"/)?.[1].split(/\s+/) ?? []
  // Below md: 10 + 24 + 10 = 44px wide and 16 + 24 + 4 = 44px tall. The box stops 4px under the circle, where the
  // field's own control starts (a 20px label row, the circle's -2px margins, the field's 6px gap). From md it is off.
  for (const token of ["inline-flex", "h-6", "w-6", "rounded-full", "relative", "after:absolute", "after:-inset-x-2.5", "after:-top-4", "after:-bottom-1", "md:after:hidden"]) {
    assert.ok(trigger.includes(token), `trigger class ${token}`)
  }
  assert.doesNotMatch(source, /\b(?:min-h-11|min-w-11|size-11|h-11|w-11)\b|-m-2\.5|-mx-2\.5|-my-2\.5/, "the circle itself does not grow or shift")
  assert.equal(source.match(/<button\b/g)?.length, 1, "still one raw button (plan 2D-3 R5)")
  // Every caller stays as it is: two field labels each in the asset form and the register filter sheet, the asset page
  // header and the register table head (shown from md only, where the hit area is off).
  const callers: Array<[string, number]> = [
    [`${C}assets/asset-form.tsx`, 2],
    [`${C}assets/asset-register-filter-sheet.tsx`, 2],
    [`${D}assets/[id]/page.tsx`, 2],
    [`${C}assets/asset-register-table.tsx`, 1],
  ]
  for (const [path, count] of callers) assert.equal(read(path).match(/<AssetStateHelpPopover \{\.\.\.\w+\} \/>/g)?.length, count, path)
})

test("a StatStrip foot wraps to two lines before its ellipsis, and the label, value and foot rows stay aligned (the user, 2026-10-17)", () => {
  const source = read(`${C}ui/stat-strip.tsx`)
  assert.match(source, /<span className="line-clamp-2 break-words" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)
  assert.doesNotMatch(source, /className="truncate"/, "no one-line cut")
  // The warning icon sits in a 20px box (the 13/20 line): centred on the first line however many lines follow.
  assert.match(source, /cn\("flex min-w-0 items-start gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)
  assert.match(source, /<span className="flex h-5 shrink-0 items-center">\s*<AttentionIcon className="size-3\.5" aria-hidden="true" \/>\s*<\/span>/)
  // Unchanged: the subgrid of three rows per cell, so a two-line foot lowers the whole row of feet, never a value.
  assert.match(source, /const statClasses = "group relative row-span-3 grid grid-rows-subgrid /)
  assert.match(source, /lg:grid-rows-\[repeat\(3,auto\)\]/)
})

test("the dashboard skeleton has the page's shape: the title and its as-of line, the company links from md, four KPIs with feet, then the sections at 7 + 5 (group 1 dashboard task 9)", () => {
  const source = read(`${C}ui/page-skeleton.tsx`)
  const dashboard = source.slice(source.indexOf("export function DashboardPageSkeleton()"), source.indexOf("export function AssetRegisterPageSkeleton()"))
  const strips = [...dashboard.matchAll(/<MetricGridSkeleton count=\{(\d+)\}( foot)? \/>/g)].map((match) => `${match[1]}${match[2] ?? ""}`)
  assert.deepEqual(strips, ["4 foot"])
  assert.match(dashboard, /<PageHeaderSkeleton actions=\{false\} \/>/)
  assert.match(dashboard, /<div className="hidden md:block">\s*<TabNavSkeleton count=\{4\} \/>\s*<\/div>/)
  assert.match(dashboard, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">/)
  assert.deepEqual([...dashboard.matchAll(/<DividedPanelSkeleton rows=\{(\d+)\} className="([^"]+)" \/>/g)].map((match) => `${match[1]} ${match[2]}`), ["4 lg:col-span-7", "4 lg:col-span-5", "5 lg:col-span-7", "5 hidden md:block lg:col-span-5"])
  assert.match(source, /function DividedPanelSkeleton\(\{ rows, className \}: \{ rows: number; className\?: string \}\)/)
  assert.match(source, /<div className="flex min-h-14 items-center border-b border-border px-4 md:px-5">/, "the divided ContentPanel head")
  assert.match(source, /\{foot \? <SkeletonBlock className="h-4 w-32 max-w-full" \/> : null\}/, "a StatStrip foot line")
  assert.doesNotMatch(source, /function PanelSkeleton\b|<PanelSkeleton\b/, "the undivided panel skeleton went with the old dashboard")
})

const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the settings page passes only labels its form reads: the four it never read and their messages are gone (plan 2D-2 R14)", () => {
  const page = read(`${D}admin/settings/page.tsx`)
  const form = read(`${C}admin/system-settings-form.tsx`)
  for (const name of ["generalSettings", "selectCategory", "accountingDepreciationPolicy", "ldapSyncSchedulePreset"]) {
    assert.doesNotMatch(page, new RegExp(`\\b${name}: t\\("${name}"\\)`), `page passes ${name}`)
    assert.doesNotMatch(form, new RegExp(`\\n\\s+${name}: string\\n`), `form labels type has ${name}`)
    assert.doesNotMatch(form, new RegExp(`labels\\.${name}\\b`), `form reads labels.${name}`)
    for (const locale of ["th", "en"] as const) assert.equal(messages(locale).systemSettingsPage[name], undefined, `${locale}: systemSettingsPage.${name}`)
  }
  // Their neighbours stay: the description the form does read, the schedule label and the advanced settings list.
  assert.match(page, /accountingDepreciationPolicyDescription: t\("accountingDepreciationPolicyDescription"\)/)
  assert.match(form, /\{labels\.accountingDepreciationPolicyDescription\}/)
  assert.match(page, /ldapSyncSchedule: t\("ldapSyncSchedule"\)/)
  assert.match(form, /const generalSettings = settings\.filter\(/)
})

test("the settings screens name the LDAP sync modes, the legacy rules' months and the overview's day counts in words (plan 2D-2 R14)", () => {
  const form = read(`${C}admin/system-settings-form.tsx`)
  const builder = read(`${C}admin/depreciation-policy-builder.tsx`)
  const page = read(`${D}admin/settings/page.tsx`)
  assert.match(form, /<option value="preview">\{labels\.ldapSyncModePreview\}<\/option>\s*<option value="manual">\{labels\.ldapSyncModeManual\}<\/option>\s*<option value="scheduled">\{labels\.ldapSyncModeScheduled\}<\/option>/)
  // The overview names the saved mode; a code with no words yet shows as it is (docs/19_THAI_GLOSSARY.md).
  assert.match(form, /const ldapSyncMode = getValue\("ldap_sync_mode"\) \|\| "preview"/)
  assert.match(form, /`\$\{labels\.enabled\} \(\$\{ldapSyncModeLabels\[ldapSyncMode\] \?\? ldapSyncMode\}\)`/)
  assert.match(form, /const formatDays = \(days: string \| number\) => labels\.overviewDays\.replace\("\{count\}", String\(days\)\)/)
  assert.equal(form.match(/formatDays\(/g)?.length, 4, "return due soon, warranty, the approval SLA and the retention days")
  assert.doesNotMatch(form, />(?:Preview|Manual|Scheduled)</)
  assert.doesNotMatch(form, /\}d\b/, "no English day suffix")
  assert.match(builder, /\{rule\.match\}: \{labels\.depreciationLegacyRuleMonths\.replace\("\{months\}", formatCount\(rule\.usefulLifeMonths\)\)\}/)
  assert.doesNotMatch(builder, / months</)
  assert.match(page, /overviewDays: t\("overviewDays", \{ count: "\{count\}" \}\)/)
  assert.match(page, /depreciationLegacyRuleMonths: t\("depreciationLegacyRuleMonths", \{ months: "\{months\}" \}\)/)
  const keys = ["overviewDays", "depreciationLegacyRuleMonths", "ldapSyncModePreview", "ldapSyncModeManual", "ldapSyncModeScheduled"]
  for (const key of keys.slice(2)) assert.match(page, new RegExp(`\\b${key}: t\\("${key}"\\)`))
  for (const key of keys) {
    const text = String(messages("th").systemSettingsPage[key]).replace(/\{\w+\}/g, "")
    assert.match(text, /[฀-๿]/, `th ${key} is Thai`)
    assert.doesNotMatch(text, /[A-Za-z]/, `th ${key} has no English`)
    assert.equal(typeof messages("en").systemSettingsPage[key], "string", `en ${key}`)
  }
})

test("the integration client list's screen-reader loading line is Thai on the Thai page (plan 2D-2 hand-on)", () => {
  assert.equal(messages("th").integrationApiPage.loading, "กำลังโหลดรายการ")
  assert.equal(messages("en").integrationApiPage.loading, "Loading clients")
  // The line itself is unchanged: a status beside the list title while the clients load.
  assert.match(read(`${C}admin/IntegrationClientManager.tsx`), /<span role="status" className="inline-flex">\s*<Loader2 [^>]*\/>\s*<span className="sr-only">\{labels\.loading\}<\/span>/)
  assert.equal(messages("th").integrationApiPage.loadFailed, "โหลดรายการไม่สำเร็จ")
})

test("the maintenance option select announces loading and its result count from messages, never in English (plan 2D-4 open issue 10 c)", () => {
  const source = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(source, /import \{ useTranslations \} from "next-intl"/)
  assert.match(source, /const tCommon = useTranslations\("common"\)/)
  assert.match(source, /<span className="sr-only" aria-live="polite">\s*\{loading \? loadingLabel \?\? tCommon\("loading"\) : tCommon\("searchSelectResultCount", \{ count: displayOptions\.length \}\)\}\s*<\/span>/)
  assert.doesNotMatch(source, /"Loading"|results`/)
  assert.equal(messages("th").common.searchSelectResultCount, "พบ {count} รายการ")
  assert.equal(messages("en").common.searchSelectResultCount, "{count, plural, one {# result} other {# results}}")
})

test("every export link is an <a download>, as the report cards' (spec 2D M31)", () => {
  const page = read(`${D}reports/page.tsx`)
  const header = page.slice(page.indexOf("const headerActions"), page.indexOf("let viewContent"))
  assert.match(header, /<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(header, /<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.doesNotMatch(header, /<Link\b/)
  // The other export screens (open issue CF-c, the user 2026-10-17).
  const findings = read(`${D}audit/findings/page.tsx`)
  assert.match(findings, /<a href=\{`\/api\/audit-findings\/export\?\$\{exportParams\.toString\(\)\}`\} download className=/)
  assert.match(findings, /<a href=\{`\/api\/audit-findings\/export-pdf\?\$\{exportParams\.toString\(\)\}`\} download className=/)
  const round = read(`${D}audit/rounds/[id]/page.tsx`)
  assert.match(round, /<a href=\{auditRoundExportHref\} download className=/)
  assert.match(round, /<a href=\{auditRoundExportPdfHref\} download className=/)
  assert.match(round, /<a href=\{`\/api\/audit-rounds\/\$\{round\.id\}\/variance-export`\} download className=/)
  assert.match(read(`${D}disposal/page.tsx`), /<a href=\{`\/api\/disposal-requests\/export\$\{query \? `\?\$\{query\}` : ""\}`\} download className=/)
  assert.match(read(`${D}maintenance/page.tsx`), /<a href=\{`\/api\/maintenance-tickets\/export\?\$\{listQuery\}`\} download className=/)
  const menu = read(`${C}assets/asset-register-export-menu.tsx`)
  assert.match(menu, /<a href=\{exportHref\} download>/)
  assert.match(menu, /<a href=\{templateHref\} download>/)
})

// The 76 keys of messages/th.json that no code in src reads at 388d4d5 (plan 2D-5 Task CF-9: a namespace-aware search
// that follows each translator into the files it reaches; every leaf that collides with a data code was checked by hand).
test("message keys that no code reads are gone from both languages; keys built at run time stay (plan 2D-5)", () => {
  const unread = [
    "common.of",
    "nav.auditScan", "nav.auditResult", "nav.pendingAssets", "nav.notification",
    "asset.attachments", "asset.purchaseDocumentAmount", "asset.latestAudit", "asset.detailSections.nav",
    "asset.detailSections.ownership", "asset.detailSections.specs", "asset.detailSections.photos",
    "asset.detailSections.movement", "asset.detailSections.notes", "asset.removedAt",
    "brandModel.fileRequired", "brandModel.viewModels",
    "supplier.totalAmount",
    "auditScan.asset", "auditScan.selectAsset", "auditScan.cameraDevice", "auditScan.cameraDeviceFallback",
    "auditScan.cameraRear", "auditScan.actualLocation", "auditScan.actualCustodian", "auditScan.actualDepartment",
    "auditScan.actualCondition", "auditScan.wrongLocation", "auditScan.wrongCustodian", "auditScan.wrongCondition",
    "auditFinding.expectedValue", "auditFinding.actualValue", "auditFinding.comparison",
    "maintenancePage.subtitle", "maintenancePage.createTitle", "maintenancePage.createSubtitle",
    "maintenancePage.createSuccess", "maintenancePage.searchPlaceholder", "maintenancePage.clearFilters",
    "maintenancePage.dateFrom", "maintenancePage.dateTo", "maintenancePage.evidence", "maintenancePage.resultCount",
    "maintenancePage.invalidDateRange", "maintenancePage.activeFilters", "maintenancePage.filterStatus",
    "maintenancePage.queue.open", "maintenancePage.queue.completed", "maintenancePage.emptyTitle",
    "maintenancePage.emptyHelp", "maintenancePage.summaryOverdue", "maintenancePage.assignedTo",
    "maintenancePage.selectEmployee", "maintenancePage.unassigned", "maintenancePage.fileRequired",
    "maintenancePage.movementLabels.create", "maintenancePage.movementLabels.close",
    "maintenancePage.movementLabels.cancel", "maintenancePage.emptyHistoryTitle", "maintenancePage.emptyHistoryHelp",
    "maintenancePage.currentStatus", "maintenancePage.currentCondition", "maintenancePage.openAsset",
    "maintenancePage.disposalReviewTitle", "maintenancePage.disposalReviewCount", "maintenancePage.disposalReviewCost",
    "maintenancePage.disposalReviewRatio", "maintenancePage.openDisposalRequest", "maintenancePage.signatureDate",
    "maintenancePage.approver", "maintenancePage.closeSuccess", "maintenancePage.cancelSuccess",
    "maintenancePage.statusConsequences.completed", "maintenancePage.nextStatus",
    "disposalPage.resultCount", "disposalPage.selectAsset",
  ]
  const has = (tree: unknown, key: string) =>
    typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree) === "string"
  assert.equal(unread.length, 76)
  for (const locale of ["th", "en"] as const) assert.deepEqual(unread.filter((key) => has(messages(locale), key)), [], locale)
  // Built at run time, so a literal search misses them: the system log presenter and the notification details.
  for (const key of ["systemLogPage.action_preview_notification_digest", "notifications.returnsDueSoonDetail", "notifications.licenseExpiringSoonDetail"]) {
    assert.ok(has(messages("th"), key) && has(messages("en"), key), key)
  }
})
