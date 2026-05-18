import Link from "next/link"
import type React from "react"
import { ClipboardCheck, DatabaseZap, Download, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { formatCurrency } from "@/lib/utils"
import { buildAssetQueryString, buildAssetWhere, parseAssetListParams, type AssetListParams } from "@/lib/asset-list-query"
import { assetMissingResponsibilityWhere, hasAssetResponsibility } from "@/lib/asset-ownership"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams>
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "report", "view")
  const t = await getTranslations("reportsPage")
  const canReportExport = hasPermission(user, "report", "export")
  const canAssetExport = hasPermission(user, "asset", "view")
  const canMaintenanceExport = hasPermission(user, "maintenance", "export")
  const canAuditExport = hasPermission(user, "audit", "export")
  const canDisposalExport = hasPermission(user, "disposal", "export")
  const canRoleExport = hasPermission(user, "role", "export")
  const filters = parseAssetListParams(rawSearchParams)
  const assetWhere = buildAssetWhere(filters)
  const exportQuery = buildAssetQueryString(filters, { page: 1, pageSize: 100 })
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const [
    totalAssets,
    totalValue,
    byStatus,
    byCategory,
    byCompany,
    byBranch,
    byDepartment,
    missingCustodian,
    missingSerial,
    missingPhoto,
    warrantyExpiring,
    filterCompanies,
    filterBranches,
    filterCategories,
    filterStatuses,
    filterConditions,
    previewAssets,
    dataQualityAssets,
    byCustodian,
    byLocation,
    repairGroups,
    idleAssetsCount,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.aggregate({ where: assetWhere, _sum: { purchasePrice: true } }),
    prisma.asset.groupBy({ by: ["statusId"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["categoryId"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["companyId"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["branchId"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["departmentId"], where: { ...assetWhere, departmentId: { not: null } }, _count: { _all: true } }),
    prisma.asset.count({ where: { AND: [assetWhere, assetMissingResponsibilityWhere] } }),
    prisma.asset.count({ where: { AND: [assetWhere, { OR: [{ serialNumber: null }, { serialNumber: "" }] }] } }),
    prisma.asset.count({
      where: {
        AND: [
          assetWhere,
          { ownershipType: { not: "software_license" } },
          { attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
        ],
      },
    }),
    prisma.asset.count({ where: { AND: [assetWhere, { warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } }] } }),
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, code: true, nameTh: true }, orderBy: { code: "asc" } }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, company: { select: { code: true } } }, orderBy: { code: "asc" } }),
    prisma.assetCategory.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    prisma.assetStatus.findMany({ where: { isActive: true }, select: { id: true, nameTh: true }, orderBy: { nameTh: "asc" } }),
    prisma.assetCondition.findMany({ where: { isActive: true }, select: { id: true, nameTh: true }, orderBy: { nameTh: "asc" } }),
    prisma.asset.findMany({
      where: assetWhere,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        status: { select: { nameTh: true } },
      },
    }),
    prisma.asset.findMany({
      where: {
        AND: [
          assetWhere,
          {
            OR: [
              assetMissingResponsibilityWhere,
              { serialNumber: null },
              { serialNumber: "" },
              {
                AND: [
                  { ownershipType: { not: "software_license" } },
                  { attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
                ],
              },
              { warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } },
            ],
          },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        category: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        installedInLinks: { where: { status: "installed", removedAt: null }, select: { id: true }, take: 1 },
        attachments: { where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true }, select: { id: true }, take: 1 },
      },
    }),
    prisma.asset.groupBy({ by: ["custodianId"], where: { ...assetWhere, custodianId: { not: null } }, _count: { _all: true }, orderBy: { _count: { custodianId: "desc" } }, take: 5 }),
    prisma.asset.groupBy({ by: ["currentLocationId"], where: assetWhere, _count: { _all: true }, orderBy: { _count: { currentLocationId: "desc" } }, take: 5 }),
    prisma.maintenanceTicket.groupBy({ by: ["assetId"], where: { isActive: true }, _count: { _all: true }, _sum: { repairCost: true }, orderBy: { _count: { assetId: "desc" } }, take: 5 }),
    prisma.asset.count({ where: { AND: [assetWhere, { movements: { none: { performedAt: { gte: daysAgo(180) } } } }] } }),
  ])
  const [custodianOptions, locationOptions, repairAssets] = await Promise.all([
    prisma.employee.findMany({ where: { id: { in: byCustodian.map((item) => item.custodianId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, fullNameTh: true } }),
    prisma.location.findMany({ where: { id: { in: byLocation.map((item) => item.currentLocationId) } }, select: { id: true, code: true, name: true } }),
    prisma.asset.findMany({ where: { id: { in: repairGroups.map((item) => item.assetId) } }, select: { id: true, assetTag: true, name: true } }),
  ])
  const [statuses, categories, companies, branches, departments] = await Promise.all([
    prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
    prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
    prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
    prisma.branch.findMany({ where: { id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: byDepartment.map((item) => item.departmentId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, name: true } }),
  ])

  const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
  const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
  const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))
  const branchMap = new Map(branches.map((branch) => [branch.id, `${branch.code} - ${branch.name}`]))
  const departmentMap = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))
  const custodianMap = new Map(custodianOptions.map((employee) => [employee.id, `${employee.code} - ${employee.fullNameTh}`]))
  const locationMap = new Map(locationOptions.map((location) => [location.id, `${location.code} - ${location.name}`]))
  const repairAssetMap = new Map(repairAssets.map((asset) => [asset.id, `${asset.assetTag} - ${asset.name}`]))
  const savedFilterUrl = `/${locale}/reports?${exportQuery}`
  const recurringReports = [
    { name: t("monthlyAssetOverview"), cadence: t("monthly"), href: `/api/reports/assets-overview/export?${exportQuery}`, owner: t("ownerAccounting"), allowed: canReportExport },
    { name: t("weeklyMaintenanceFollowUp"), cadence: t("weekly"), href: "/api/maintenance-tickets/export", owner: t("ownerMaintenance"), allowed: canMaintenanceExport },
    { name: t("monthlyDisposalFollowUp"), cadence: t("monthly"), href: "/api/disposal-requests/export", owner: t("ownerApprover"), allowed: canDisposalExport },
    { name: t("weeklyAuditFindings"), cadence: t("weekly"), href: "/api/audit-findings/export?status=pending", owner: t("ownerAudit"), allowed: canAuditExport },
  ]
  const reportCatalog = [
    {
      title: t("catalogAssetTitle"),
      description: t("catalogAssetDescription"),
      audience: t("catalogAssetAudience"),
      icon: <FileSpreadsheet className="h-5 w-5" />,
      reports: [
        { label: t("assetRegister"), viewHref: `/${locale}/assets?${exportQuery}`, exportHref: `/api/assets/export?${exportQuery}`, exportLabel: t("exportAssetRegister"), exportAllowed: canAssetExport },
        { label: t("assetOverviewExcel"), viewHref: `/${locale}/reports?${exportQuery}`, exportHref: `/api/reports/assets-overview/export?${exportQuery}`, exportLabel: t("exportAssetOverview"), exportAllowed: canReportExport },
      ],
    },
    {
      title: t("catalogDataQualityTitle"),
      description: t("catalogDataQualityDescription"),
      audience: t("catalogDataQualityAudience"),
      icon: <DatabaseZap className="h-5 w-5" />,
      reports: [
        { label: t("dataQuality"), viewHref: `/${locale}/admin/data-quality`, exportHref: `/api/reports/assets-overview/export?${exportQuery}`, exportLabel: t("exportAssetOverview"), exportAllowed: canReportExport },
      ],
    },
    {
      title: t("catalogMaintenanceTitle"),
      description: t("catalogMaintenanceDescription"),
      audience: t("catalogMaintenanceAudience"),
      icon: <Wrench className="h-5 w-5" />,
      reports: [
        { label: t("maintenanceReport"), viewHref: `/${locale}/maintenance`, exportHref: "/api/maintenance-tickets/export", exportLabel: t("exportMaintenance"), exportAllowed: canMaintenanceExport },
      ],
    },
    {
      title: t("catalogAuditTitle"),
      description: t("catalogAuditDescription"),
      audience: t("catalogAuditAudience"),
      icon: <ClipboardCheck className="h-5 w-5" />,
      reports: [
        { label: t("auditFindingsReport"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export?status=all", exportLabel: t("exportAuditFindings"), exportAllowed: canAuditExport },
        { label: t("auditFindingsPdf"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export-pdf?status=all", exportLabel: t("exportPdf"), exportAllowed: canAuditExport },
      ],
    },
    {
      title: t("catalogDisposalTitle"),
      description: t("catalogDisposalDescription"),
      audience: t("catalogDisposalAudience"),
      icon: <Trash2 className="h-5 w-5" />,
      reports: [
        { label: t("disposalReport"), viewHref: `/${locale}/disposal`, exportHref: "/api/disposal-requests/export", exportLabel: t("exportDisposal"), exportAllowed: canDisposalExport },
      ],
    },
    {
      title: t("catalogSystemTitle"),
      description: t("catalogSystemDescription"),
      audience: t("catalogSystemAudience"),
      icon: <ShieldCheck className="h-5 w-5" />,
      reports: [
        { label: t("rolePermissionAudit"), viewHref: `/${locale}/admin/roles`, exportHref: "/api/admin/roles/export", exportLabel: t("exportRoleAudit"), exportAllowed: canRoleExport },
        { label: t("systemLogs"), viewHref: `/${locale}/admin/logs` },
      ],
    },
  ]
  const reportCount = reportCatalog.reduce((sum, category) => sum + category.reports.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReportExport ? (
            <Link
              href={`/api/reports/assets-overview/export?${exportQuery}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              {t("exportAssetOverview")}
            </Link>
          ) : null}
          {canAssetExport ? (
            <Link
              href={`/api/assets/export?${exportQuery}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("exportAssetRegister")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <Metric label={t("totalValue")} value={formatCurrency(totalValue._sum.purchasePrice ? Number(totalValue._sum.purchasePrice) : 0)} />
        <Metric label={t("reportsReady")} value={reportCount.toLocaleString("th-TH")} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("filterTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("filterHelp")}</p>
        </div>
        <form action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <ReportSelect name="companyId" label={t("company")} value={filters.companyId} options={filterCompanies.map((company) => ({ value: company.id, label: `${company.code} - ${company.nameTh}` }))} allLabel={t("all")} />
          <ReportSelect name="branchId" label={t("branch")} value={filters.branchId} options={filterBranches.map((branch) => ({ value: branch.id, label: `${branch.company.code} / ${branch.code} - ${branch.name}` }))} allLabel={t("all")} />
          <ReportSelect name="categoryId" label={t("category")} value={filters.categoryId} options={filterCategories.map((category) => ({ value: category.id, label: `${category.code} - ${category.name}` }))} allLabel={t("all")} />
          <ReportSelect name="statusId" label={t("status")} value={filters.statusId} options={filterStatuses.map((status) => ({ value: status.id, label: status.nameTh }))} allLabel={t("all")} />
          <ReportSelect name="conditionId" label={t("condition")} value={filters.conditionId} options={filterConditions.map((condition) => ({ value: condition.id, label: condition.nameTh }))} allLabel={t("all")} />
          <div className="flex flex-wrap gap-2 self-end md:col-span-2 xl:col-span-3">
            <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90">
              {t("applyFilters")}
            </button>
            <Link href={`/${locale}/reports`} className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent">
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("permissionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("permissionHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionPill label={t("exportAssetOverview")} allowed={canReportExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
          <PermissionPill label={t("exportAssetRegister")} allowed={canAssetExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
          <PermissionPill label={t("exportMaintenance")} allowed={canMaintenanceExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
          <PermissionPill label={t("exportAuditFindings")} allowed={canAuditExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
          <PermissionPill label={t("exportDisposal")} allowed={canDisposalExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
          <PermissionPill label={t("exportRoleAudit")} allowed={canRoleExport} allowedLabel={t("allowed")} deniedLabel={t("notAllowed")} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("savedReportsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("savedReportsHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-sm font-semibold text-foreground">{t("currentFilterPreset")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("currentFilterPresetHelp")}</p>
            <Link href={savedFilterUrl} className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90">
              {t("openSavedFilter")}
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recurringReports.map((report) => (
              <div key={report.name} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{report.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{report.owner}</div>
                  </div>
                  <span className="rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">{report.cadence}</span>
                </div>
                {report.allowed ? (
                  <Link href={report.href} className="mt-4 inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                    <Download className="h-3.5 w-3.5" />
                    {t("runNow")}
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                    {t("notAllowed")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t("dataQuality")}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric label={t("missingCustodian")} value={missingCustodian.toLocaleString("th-TH")} compact />
          <Metric label={t("missingSerial")} value={missingSerial.toLocaleString("th-TH")} compact />
          <Metric label={t("missingPhoto")} value={missingPhoto.toLocaleString("th-TH")} compact />
          <Metric label={t("warrantyExpiring")} value={warrantyExpiring.toLocaleString("th-TH")} compact />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("dataQualityActionTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("dataQualityActionHelp")}</p>
          </div>
          <Link href={`/${locale}/admin/data-quality`} className="inline-flex h-9 w-fit items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent">
            {t("openDataQualityRules")}
          </Link>
        </div>
        <div className="grid gap-3">
          {dataQualityAssets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("dataQualityEmpty")}
            </div>
          ) : (
            dataQualityAssets.map((asset) => {
              const issues = getDataQualityIssues(asset, warrantyThreshold, t)

              return (
                <div key={asset.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/${locale}/assets/${asset.id}`} className="font-semibold text-primary hover:underline">
                          {asset.assetTag}
                        </Link>
                        <span className="text-sm text-foreground">{asset.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {asset.category.code} - {asset.category.name} · {asset.branch.code} - {asset.branch.name}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issues.map((issue) => (
                          <span key={issue} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                        {t("openAsset")}
                      </Link>
                      <Link href={`/${locale}/assets/${asset.id}/edit`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90">
                        {t("fixData")}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("previewTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("previewHelp")}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t("previewCount", { count: previewAssets.length })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{t("assetTag")}</PreviewHead>
                <PreviewHead>{t("assetName")}</PreviewHead>
                <PreviewHead>{t("category")}</PreviewHead>
                <PreviewHead>{t("branch")}</PreviewHead>
                <PreviewHead>{t("department")}</PreviewHead>
                <PreviewHead>{t("custodian")}</PreviewHead>
                <PreviewHead>{t("status")}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previewAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {t("previewEmpty")}
                  </td>
                </tr>
              ) : (
                previewAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{asset.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.category.code} - {asset.category.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.branch.code} - {asset.branch.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.department ? `${asset.department.code} - ${asset.department.name}` : t("unassigned")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : t("unassigned")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.status.nameTh}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={t("byStatus")} rows={byStatus.map((item) => [statusMap.get(item.statusId) ?? item.statusId, item._count._all])} />
        <ReportTable title={t("byCategory")} rows={byCategory.map((item) => [categoryMap.get(item.categoryId) ?? item.categoryId, item._count._all])} />
        <ReportTable title={t("byCompany")} rows={byCompany.map((item) => [companyMap.get(item.companyId) ?? item.companyId, item._count._all])} />
        <ReportTable title={t("byBranch")} rows={byBranch.map((item) => [branchMap.get(item.branchId) ?? item.branchId, item._count._all])} />
        <ReportTable title={t("byDepartment")} rows={byDepartment.map((item) => [departmentMap.get(item.departmentId ?? "") ?? item.departmentId ?? t("unassigned"), item._count._all])} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("operationInsightsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("operationInsightsHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportTable title={t("byCustodian")} rows={byCustodian.map((item) => [custodianMap.get(item.custodianId ?? "") ?? t("unassigned"), item._count._all])} />
          <ReportTable title={t("byLocation")} rows={byLocation.map((item) => [locationMap.get(item.currentLocationId) ?? item.currentLocationId, item._count._all])} />
          <ReportTable title={t("frequentRepairAssets")} rows={repairGroups.map((item) => [repairAssetMap.get(item.assetId) ?? item.assetId, item._count._all])} />
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t("idleAssets")}</h2>
            <Link href={`/${locale}/assets?${exportQuery}`} className="block rounded-md border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10">
              <div className="text-sm text-muted-foreground">{t("idleAssetsHelp")}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{idleAssetsCount.toLocaleString("th-TH")}</div>
            </Link>
          </section>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">{t("reportCatalog")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reportCatalogHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reportCatalog.map((category) => (
            <div key={category.title} className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">{category.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  <p className="mt-2 text-xs font-medium text-primary">{category.audience}</p>
                </div>
              </div>
              <div className="grid gap-2">
                {category.reports.map((report) => (
                  <div key={report.label} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">{report.label}</span>
                    <div className="flex flex-wrap gap-2">
                      <Link href={report.viewHref} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent">
                        {t("openReport")}
                      </Link>
                      {report.exportHref && report.exportAllowed ? (
                        <Link href={report.exportHref} className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90">
                          <Download className="h-3.5 w-3.5" />
                          {report.exportLabel}
                        </Link>
                      ) : report.exportHref ? (
                        <span className="inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                          {t("notAllowed")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 font-bold text-foreground ${compact ? "text-xl" : "text-2xl"}`}>{value}</div>
    </div>
  )
}

function ReportSelect({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  allLabel: string
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PreviewHead({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

function PermissionPill({
  label,
  allowed,
  allowedLabel,
  deniedLabel,
}: {
  label: string
  allowed: boolean
  allowedLabel: string
  deniedLabel: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${allowed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {label}: {allowed ? allowedLabel : deniedLabel}
    </span>
  )
}

function getDataQualityIssues(
  asset: {
    ownershipType?: string | null
    custodian: { code: string; fullNameTh: string } | null
    department?: { code: string; name: string } | null
    installedInLinks?: Array<{ id: string }>
    serialNumber: string | null
    warrantyEndDate: Date | null
    attachments: Array<{ id: string }>
  },
  warrantyThreshold: Date,
  t: (key: string) => string
) {
  const issues: string[] = []
  if (!hasAssetResponsibility(asset)) issues.push(t("missingCustodian"))
  if (!asset.serialNumber) issues.push(t("missingSerial"))
  if (asset.ownershipType !== "software_license" && asset.attachments.length === 0) issues.push(t("missingPhoto"))
  if (asset.warrantyEndDate && asset.warrantyEndDate >= new Date() && asset.warrantyEndDate <= warrantyThreshold) {
    issues.push(t("warrantyExpiring"))
  }
  return issues
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function ReportTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">-</div>
        ) : (
          rows.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{count.toLocaleString("th-TH")}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
