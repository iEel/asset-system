import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 10 plan 2 Task 2 (spec §3, §6, §8; board RP-Library): the catalog tab as reports grouped by who uses them: the
// chips line with "{k} จาก {n} รายงาน", one section per audience, cards with the scope, cadence and format badges, the
// last export or "ยังไม่เคยส่งออก", the open link and the export buttons, or "ไม่มีสิทธิ์ส่งออก" with the permission in
// words; then the scope legend, the saved presets and "สิทธิ์รายงานของคุณ" (kept, the E2E reads its summary).
// Sources are read with CRLF folded to LF, so the pins hold on a Windows checkout.

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/reports/page.tsx")
const view = read("src/components/reports/reports-catalog-view.tsx")
const lib = read("src/lib/report-catalog.ts")
const messages = (locale: string) => JSON.parse(read(`messages/${locale}.json`)) as { reportsPage: Record<string, string>; adminRolesPage: { actions: Record<string, string>; modules: Record<string, string> } }
const th = messages("th")
const en = messages("en")

test("the catalog shows the chips line, its scope line and the way to the filter bar", () => {
  assert.match(page, /const showsFilterBar = activeView !== "operations" && activeView !== "catalog"/)
  assert.match(page, /activeView === "catalog"\n\s+\? t\("catalogScopeLine", catalogScope\)/)
  assert.match(page, /catalogScope\.filtered = countFilteredReports\(reports\)\n\s+catalogScope\.count = reports\.length/)
  assert.equal(th.reportsPage.catalogScopeLine, "มีผลเฉพาะรายงานที่ติดป้าย ใช้ตัวกรองปัจจุบัน · {filtered, number} จาก {count, number} รายงาน")
  assert.ok(en.reportsPage.catalogScopeLine.includes("{count, plural,"))
  // The catalog counts its reports in the chips line, not the two shared numbers.
  assert.match(page, /\{activeView === "accounting" \? \(\n\s+<div data-report-shared-metrics>/)
})

test("the page builds the catalog from the lib with the counts, the last exports and the permission check", () => {
  assert.match(page, /import \{ buildReportCatalog, countFilteredReports \} from "@\/lib\/report-catalog"/)
  assert.match(page, /import \{ readLastReportExports \} from "@\/lib\/report-export-log"/)
  assert.match(page, /prisma\.auditFinding\.count\(\{ where: buildAuditFindingWhere\(\{ status: "pending" \}\) \}\)/)
  assert.match(page, /prisma\.auditFinding\.count\(\{ where: buildAuditFindingWhere\(\{ status: "approved" \}\) \}\)/)
  assert.match(page, /prisma\.auditFinding\.count\(\{ where: buildAuditFindingWhere\(\{ status: "rejected" \}\) \}\)/)
  assert.match(page, /readLastReportExports\(\),/)
  // Cross-scope as today's export: the filters with crossScope=all and no status or dataQuality.
  assert.match(page, /const crossScopeQuery = buildAssetQueryString\(filters, \{ crossScope: "all", dataQuality: "", statusId: "", page: 1 \}\)/)
  assert.match(page, /filterQuery: exportQuery,/)
  assert.match(page, /canExport=\{\(permission\) => hasPermission\(user, permission\.module, permission\.action\)\}/)
  assert.match(page, /withPerformanceTiming\("reports\.catalog-data", loadCatalogView, timingContext\)/)
  // The catalog's old inline list is gone from the page.
  assert.doesNotMatch(page, /recurringReports|ReportCatalogCategory|reportCatalog: ReportCatalog/)
})

test("one section per audience with its title, สำหรับ line and report count", () => {
  assert.match(view, /const sections = groupReportCatalog\(reports\)/)
  assert.match(view, /<section data-report-catalog-section=\{section\.audience\} aria-labelledby=\{headingId\}/)
  assert.match(view, /\{t\(section\.titleKey\)\}<\/h2>/)
  assert.match(view, /\{t\(section\.forKey\)\}<\/p>/)
  assert.match(view, /t\("catalogGroupCount", \{ count: section\.reports\.length \}\)/)
  for (const [key, text] of [
    ["catalogGroupAccounting", "บัญชีและทะเบียนทรัพย์สิน"],
    ["catalogGroupAccountingFor", "สำหรับผู้ดูแลทรัพย์สินและบัญชี"],
    ["catalogGroupMaintenance", "ช่างและซ่อมบำรุง"],
    ["catalogGroupApprover", "ผู้อนุมัติ"],
    ["catalogGroupAuditor", "ผู้ตรวจนับ"],
    ["catalogGroupAdmin", "ผู้ดูแลระบบ"],
    ["catalogGroupCount", "{count, number} รายงาน"],
  ]) assert.equal(th.reportsPage[key], text, key)
  // The per-round note under the auditors' cards, with the way to the rounds list.
  assert.match(view, /\{t\(note\.textKey\)\} ·\{" "\}\n\s+<Link href=\{note\.href\}/)
  assert.equal(th.reportsPage.catalogRoundsLink, "ไปที่รอบตรวจนับ")
})

test("each card: title, description, scope, cadence and format badges, last export, open and the exports", () => {
  assert.match(view, /const description = t\(report\.descriptionKey, report\.descriptionValues\)/)
  assert.match(view, /<StatusBadge label=\{scope\} tone=\{report\.scope === "system" \? "muted" : "info"\} wrap \/>/)
  assert.match(view, /: t\("catalogScopeFilters", \{ filters: filterSummary \}\)/)
  assert.match(view, /\? t\("catalogScopeFiltersNoStatus"\)/)
  assert.match(view, /\? t\("catalogScopeSystem"\)/)
  assert.match(view, /\{report\.cadenceKey \? <Chip>\{t\(report\.cadenceKey\)\}<\/Chip> : null\}/)
  assert.match(view, /const lastLine = catalogLastExportLine\(report, lastExports, locale\)/)
  assert.match(view, /\{t\("catalogLastExport"\)\}\n\s+<br \/>\n\s+\{lastLine\.at\}/)
  assert.match(view, /t\("catalogNeverExported"\)/)
  assert.match(view, /const openText = report\.openLabelKey \? t\(report\.openLabelKey\) : t\("openReport"\)/)
  // The open link is named by its visible text and the report, as the export buttons (final review finding 5).
  assert.match(view, /<Link href=\{report\.openHref\} aria-label=\{t\("catalogExportName", \{ label: openText, report: title \}\)\} className=\{[^\n]*\}>\n\s+\{openText\}\n\s+<\/Link>/)
  assert.match(view, /aria-label=\{t\("catalogExportName", \{ label: t\(entry\.label\), report: title \}\)\}/)
  assert.equal(th.reportsPage.catalogScopeFiltersNoStatus, "ใช้ตัวกรองปัจจุบัน · ไม่รวมตัวกรองสถานะ")
  assert.equal(th.reportsPage.catalogScopeSystem, "ทั้งระบบ · ไม่ใช้ตัวกรอง")
  assert.equal(th.reportsPage.catalogLastExport, "ส่งออกล่าสุด")
  assert.equal(th.reportsPage.catalogNeverExported, "ยังไม่เคยส่งออก")
  assert.equal(th.reportsPage.catalogExportExcel, "ส่งออก Excel")
  // The admin group is a list, as the board.
  assert.match(view, /variant=\{section\.audience === "admin" \? "row" : "card"\}/)
})

test("without permission: ไม่มีสิทธิ์ส่งออก and the permission in the role page's words, never a dead button", () => {
  assert.match(view, /const \{ allowed, missing \} = catalogExportState\(report, canExport\)/)
  assert.match(view, /<StatusBadge label=\{t\("catalogNoExportRight"\)\} tone="muted" \/>/)
  assert.match(view, /t\("catalogNeedsPermission", \{ action: tRoles\(`actions\.\$\{permission\.action\}`\), module: tRoles\(`modules\.\$\{permission\.module\}`\) \}\)/)
  assert.match(view, /\{allowed\.map\(\(entry\) => \(/)
  assert.equal(th.reportsPage.catalogNoExportRight, "ไม่มีสิทธิ์ส่งออก")
  assert.equal(th.reportsPage.catalogNeedsPermission, "ต้องมีสิทธิ์{action}ของ{module}")
  // Every permission the catalog names has role-page words in both languages.
  for (const match of lib.matchAll(/permission: \{ module: "(\w+)", action: "(\w+)" \}/g)) {
    for (const locale of [th, en]) {
      assert.equal(typeof locale.adminRolesPage.modules[match[1]], "string", match[1])
      assert.equal(typeof locale.adminRolesPage.actions[match[2]], "string", match[2])
    }
  }
  assert.equal(`ต้องมีสิทธิ์${th.adminRolesPage.actions.export}ของ${th.adminRolesPage.modules.role}`, "ต้องมีสิทธิ์ส่งออกของบทบาท")
})

test("after the sections: the scope legend, the saved presets and สิทธิ์รายงานของคุณ (kept)", () => {
  const sections = view.indexOf("data-report-catalog-sections")
  const legend = view.indexOf("data-report-scope-legend")
  const presets = view.indexOf("<ReportPresetControls")
  const permissions = view.indexOf("data-report-permissions")
  assert.ok(sections >= 0 && sections < legend && legend < presets && presets < permissions, String([sections, legend, presets, permissions]))
  assert.match(view, /<summary className="[^"]*">\{t\("permissionTitle"\)\}<\/summary>/)
  assert.match(view, /label=\{`\$\{permission\.label\}: \$\{permission\.allowed \? t\("allowed"\) : t\("notAllowed"\)\}`\}/)
  assert.equal(th.reportsPage.permissionTitle, "สิทธิ์รายงานของคุณ")
  // The six exports of the permission list, as the E2E helper reads them.
  for (const key of ["exportAssetOverview", "exportAssetRegister", "exportMaintenance", "exportAuditFindings", "exportDisposal", "exportRoleAudit"]) {
    assert.match(page, new RegExp(`label: t\\("${key}"\\), allowed: can\\w+Export`), key)
  }
  // Tokens only.
  assert.doesNotMatch(view, /#[0-9a-fA-F]{3,6}\b|text-white|bg-white|style=/)
})

// Group 10 plan 2 Task 3 (board RP-Phone): below md the cards stack one a column, their badges wrap, the export buttons
// are full width, and each audience keeps its header.
test("catalog cards stack below md", () => {
  assert.match(view, /className=\{cn\("grid min-w-0 grid-cols-1 gap-6", row\.length > 1 && "md:grid-cols-2 md:gap-3"\)\}/)
  assert.match(view, /<div className=\{cn\("grid grid-cols-1 gap-3", !paired && "md:grid-cols-2"\)\}>/)
  assert.match(view, /<div className="flex min-w-0 flex-wrap gap-1\.5">\n\s+<StatusBadge label=\{scope\}/)
  assert.match(view, /<div data-report-catalog-actions className="flex min-w-0 flex-col gap-2 md:ms-auto md:flex-row md:flex-wrap md:items-center">/)
  assert.match(view, /className=\{cn\(buttonVariants\(\{ variant: entry\.format === "pdf" \? "outline" : "default", size: "sm" \}\), "w-full md:w-auto"\)\}/)
  assert.match(view, /border-t border-border pt-2\.5 md:flex-row md:flex-wrap md:items-center">/)
  assert.match(view, /<div data-report-catalog-report=\{report\.key\} className="flex min-w-0 flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-3">/)
  // The section header (title, สำหรับ line, count) stays on every width.
  assert.match(view, /<div className="mb-2\.5 flex items-center gap-2\.5">\n\s+<div className="min-w-0">\n\s+<h2 id=\{headingId\}/)
  assert.doesNotMatch(view, /\bsm:/)
})
