// The report catalog (group 10 spec §6, board RP-Library): the reports grouped by who uses them, each with its scope,
// cadence, formats, the screen it opens and today's export routes with the permission each route requires. Pure and
// client-safe: `import type` and relative .ts imports only, so node --test imports it. Message keys are reportsPage's.
import { formatAsOf } from "./dashboard-overview-rules.ts"
import type { ReportExportKey } from "./report-export-log.ts"

export type CatalogAudience = "accounting" | "maintenance" | "approver" | "auditor" | "admin"

// The board's order of the groups, with each group's title and "สำหรับ …" line.
export const CATALOG_AUDIENCES: ReadonlyArray<{ key: CatalogAudience; titleKey: string; forKey: string }> = [
  { key: "accounting", titleKey: "catalogGroupAccounting", forKey: "catalogGroupAccountingFor" },
  { key: "maintenance", titleKey: "catalogGroupMaintenance", forKey: "catalogGroupMaintenanceFor" },
  { key: "approver", titleKey: "catalogGroupApprover", forKey: "catalogGroupApproverFor" },
  { key: "auditor", titleKey: "catalogGroupAuditor", forKey: "catalogGroupAuditorFor" },
  { key: "admin", titleKey: "catalogGroupAdmin", forKey: "catalogGroupAdminFor" },
]

// filters: the file follows the report's filters; filtersNoStatus: the same without the status filter (cross-scope);
// system: the module's own file, every company.
export type CatalogScope = "filters" | "filtersNoStatus" | "system"

export type CatalogFormat = "excel" | "pdf"

// The permission an export route requires (its requirePermission), as the role page names it: module and action.
export type CatalogPermission = { module: string; action: string }

export type CatalogExport = {
  // reportsPage key of the button's text.
  label: string
  href: string
  permission: CatalogPermission
  format: CatalogFormat
  // The key its route logs under (spec §6.1), when it differs from the report's own (the findings PDF).
  exportKey?: ReportExportKey
}

export type CatalogReport = {
  key: string
  audience: CatalogAudience
  titleKey: string
  descriptionKey: string
  descriptionValues?: Record<string, number>
  scope: CatalogScope
  cadenceKey?: "monthly" | "weekly"
  formats: CatalogFormat[]
  // The format badge's own words, when the file is a sheet of another (depreciation: the overview workbook).
  formatHintKey?: string
  exportKey: ReportExportKey | null
  openHref: string | null
  // The open link's words when it is not เปิดหน้าจอ (the accounting tab, the data-quality rules).
  openLabelKey?: string
  exports: CatalogExport[]
  // A line under the group: per-round audit results are exported from each round's page.
  note?: { textKey: string; linkKey: string; href: string }
}

export type ReportCatalogInput = {
  locale: string
  // The report's asset filters as a query (the header's export query): the register, the overview and its sheets.
  filterQuery: string
  // The same filters with crossScope=all and no status or dataQuality (today's cross-scope export).
  crossScopeQuery: string
  counts: {
    crossScope: number
    findingsByStatus: { pending: number; approved: number; rejected: number }
  }
}

const excelLabel = "catalogExportExcel"

// The board's 11 reports in its order and groups. Every export of today keeps its route and permission; the four
// recurring "run now" cards are the reports with a cadence (G10P2-R1).
export function buildReportCatalog({ locale, filterQuery, crossScopeQuery, counts }: ReportCatalogInput): CatalogReport[] {
  const overviewExport: CatalogExport = {
    label: excelLabel,
    href: `/api/reports/assets-overview/export?${filterQuery}`,
    permission: { module: "report", action: "export" },
    format: "excel",
  }
  const accountingQuery = new URLSearchParams(filterQuery)
  accountingQuery.delete("view")
  accountingQuery.set("view", "accounting")
  const findings = counts.findingsByStatus

  return [
    {
      key: "assets-overview",
      audience: "accounting",
      titleKey: "monthlyAssetOverview",
      descriptionKey: "catalogOverviewDescription",
      scope: "filters",
      cadenceKey: "monthly",
      formats: ["excel"],
      exportKey: "assets-overview",
      openHref: `/${locale}/reports?${filterQuery}`,
      exports: [overviewExport],
    },
    {
      key: "assets-register",
      audience: "accounting",
      titleKey: "assetRegister",
      descriptionKey: "catalogRegisterDescription",
      scope: "filters",
      formats: ["excel"],
      exportKey: "assets-register",
      openHref: `/${locale}/assets?${filterQuery}`,
      exports: [{ label: excelLabel, href: `/api/assets/export?${filterQuery}`, permission: { module: "asset", action: "view" }, format: "excel" }],
    },
    {
      key: "depreciation",
      audience: "accounting",
      titleKey: "catalogDepreciationTitle",
      descriptionKey: "catalogDepreciationDescription",
      scope: "filters",
      formats: ["excel"],
      formatHintKey: "catalogFormatOverviewSheet",
      exportKey: "assets-overview",
      openHref: `/${locale}/reports?${accountingQuery.toString()}`,
      openLabelKey: "catalogOpenAccounting",
      exports: [overviewExport],
    },
    {
      key: "cross-scope",
      audience: "accounting",
      titleKey: "crossScopeTitle",
      descriptionKey: "catalogCrossScopeDescription",
      descriptionValues: { count: counts.crossScope },
      scope: "filtersNoStatus",
      formats: ["excel"],
      exportKey: "cross-scope",
      openHref: `/${locale}/assets?${crossScopeQuery}`,
      exports: [{ label: excelLabel, href: `/api/assets/export?${crossScopeQuery}`, permission: { module: "asset", action: "view" }, format: "excel" }],
    },
    {
      key: "maintenance",
      audience: "maintenance",
      titleKey: "weeklyMaintenanceFollowUp",
      descriptionKey: "catalogMaintenanceFollowUpDescription",
      scope: "system",
      cadenceKey: "weekly",
      formats: ["excel"],
      exportKey: "maintenance",
      openHref: `/${locale}/maintenance`,
      exports: [{ label: "exportMaintenance", href: "/api/maintenance-tickets/export", permission: { module: "maintenance", action: "export" }, format: "excel" }],
    },
    {
      key: "disposal",
      audience: "approver",
      titleKey: "monthlyDisposalFollowUp",
      descriptionKey: "catalogDisposalFollowUpDescription",
      scope: "system",
      cadenceKey: "monthly",
      formats: ["excel"],
      exportKey: "disposal",
      openHref: `/${locale}/disposal`,
      exports: [{ label: "exportDisposal", href: "/api/disposal-requests/export", permission: { module: "disposal", action: "export" }, format: "excel" }],
    },
    {
      key: "audit-findings",
      audience: "auditor",
      titleKey: "catalogFindingsTitle",
      descriptionKey: "catalogFindingsDescription",
      descriptionValues: {
        total: findings.pending + findings.approved + findings.rejected,
        pending: findings.pending,
        approved: findings.approved,
        rejected: findings.rejected,
      },
      scope: "system",
      formats: ["excel", "pdf"],
      exportKey: "audit-findings",
      openHref: `/${locale}/audit/findings?status=all`,
      exports: [
        { label: "catalogExportPdf", href: `/api/audit-findings/export-pdf?status=all&locale=${locale}`, permission: { module: "audit", action: "export" }, format: "pdf", exportKey: "audit-findings-pdf" },
        { label: excelLabel, href: `/api/audit-findings/export?status=all&locale=${locale}`, permission: { module: "audit", action: "export" }, format: "excel" },
      ],
    },
    {
      key: "audit-findings-pending",
      audience: "auditor",
      titleKey: "catalogFindingsPendingTitle",
      descriptionKey: "catalogFindingsPendingDescription",
      descriptionValues: { count: findings.pending },
      scope: "system",
      cadenceKey: "weekly",
      formats: ["excel"],
      exportKey: "audit-findings-pending",
      openHref: `/${locale}/audit/findings?status=pending`,
      exports: [{ label: excelLabel, href: `/api/audit-findings/export?status=pending&locale=${locale}`, permission: { module: "audit", action: "export" }, format: "excel" }],
      note: { textKey: "catalogRoundsNote", linkKey: "catalogRoundsLink", href: `/${locale}/audit/rounds` },
    },
    {
      key: "role-audit",
      audience: "admin",
      titleKey: "rolePermissionAudit",
      descriptionKey: "catalogRoleAuditDescription",
      scope: "system",
      formats: ["excel"],
      exportKey: "role-audit",
      openHref: `/${locale}/admin/roles`,
      exports: [{ label: excelLabel, href: "/api/admin/roles/export", permission: { module: "role", action: "export" }, format: "excel" }],
    },
    {
      key: "system-logs",
      audience: "admin",
      titleKey: "systemLogs",
      descriptionKey: "catalogSystemLogsDescription",
      scope: "system",
      formats: [],
      exportKey: null,
      openHref: `/${locale}/admin/logs`,
      exports: [],
    },
    {
      key: "data-quality",
      audience: "admin",
      titleKey: "dataQuality",
      descriptionKey: "catalogDataQualityRulesDescription",
      scope: "system",
      formats: [],
      exportKey: null,
      openHref: `/${locale}/admin/data-quality`,
      openLabelKey: "openDataQualityRules",
      exports: [],
    },
  ]
}

export type CatalogSection = { audience: CatalogAudience; titleKey: string; forKey: string; reports: CatalogReport[] }

// One section per audience in the board's order; an audience with no report is left out.
export function groupReportCatalog(reports: readonly CatalogReport[]): CatalogSection[] {
  return CATALOG_AUDIENCES.map((audience) => ({
    audience: audience.key,
    titleKey: audience.titleKey,
    forKey: audience.forKey,
    reports: reports.filter((report) => report.audience === audience.key),
  })).filter((section) => section.reports.length > 0)
}

// "{k} จาก {n} รายงาน" of the chips line: the reports whose files follow the current filters.
export function countFilteredReports(reports: readonly CatalogReport[]): number {
  return reports.filter((report) => report.scope !== "system").length
}

// The latest export of the report's files (its own key and any export's own key, as the findings PDF), or null.
export function catalogLastExport(report: CatalogReport, lastExports: Partial<Record<ReportExportKey, Date>>): Date | null {
  const keys = new Set<ReportExportKey>()
  if (report.exportKey) keys.add(report.exportKey)
  for (const entry of report.exports) if (entry.exportKey) keys.add(entry.exportKey)
  let latest: Date | null = null
  for (const key of keys) {
    const at = lastExports[key]
    if (at && (!latest || at > latest)) latest = at
  }
  return latest
}

export type CatalogLastExportLine =
  | { key: "catalogLastExport"; at: string }
  | { key: "catalogNeverExported" }
  | null

// "ส่งออกล่าสุด {date time}" (Bangkok, Buddhist year in Thai, G10P2-R3) or "ยังไม่เคยส่งออก", never a blank; null for a
// report with no file (screen only).
export function catalogLastExportLine(
  report: CatalogReport,
  lastExports: Partial<Record<ReportExportKey, Date>>,
  locale: string,
): CatalogLastExportLine {
  if (report.exports.length === 0) return null
  const at = catalogLastExport(report, lastExports)
  return at ? { key: "catalogLastExport", at: formatAsOf(at, locale) } : { key: "catalogNeverExported" }
}

// What a card offers this person: the exports they may use, and each distinct permission they lack (named in words as
// "ต้องมีสิทธิ์{action}ของ{module}" beside "ไม่มีสิทธิ์ส่งออก"), so a card never shows a dead button.
export function catalogExportState(
  report: CatalogReport,
  canExport: (permission: CatalogPermission) => boolean,
): { allowed: CatalogExport[]; missing: CatalogPermission[] } {
  const allowed: CatalogExport[] = []
  const missing: CatalogPermission[] = []
  for (const entry of report.exports) {
    if (canExport(entry.permission)) {
      allowed.push(entry)
    } else if (!missing.some((permission) => permission.module === entry.permission.module && permission.action === entry.permission.action)) {
      missing.push(entry.permission)
    }
  }
  return { allowed, missing }
}
