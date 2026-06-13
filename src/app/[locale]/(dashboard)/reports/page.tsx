import Link from "next/link"
import type React from "react"
import { ClipboardCheck, DatabaseZap, Download, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { formatCurrency } from "@/lib/utils"
import { buildAssetQueryString, buildAssetWhere, parseAssetListParams, type AssetListParams } from "@/lib/asset-list-query"
import { applyAssetCrossScopeFilter, buildAssetCrossScopeSummary, type AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
import { assetMissingResponsibilityWhere, assetOwnershipTypes, hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { buildCostInsights, type CostExposureAsset } from "@/lib/cost-insights"
import { buildDepreciationSummary, depreciationPolicySettingKey, parseDepreciationPolicySetting, type DepreciableAsset } from "@/lib/asset-depreciation"
import { ContentPanel } from "@/components/ui/content-panel"
import { MetricCard } from "@/components/ui/metric-card"
import { FilterPanel } from "@/components/ui/filter-panel"
import { ActionButton } from "@/components/ui/action-button"
import { getActionButtonClasses, getFieldControlClasses } from "@/lib/design-system"
import { withPerformanceTiming } from "@/lib/performance-timing"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams>
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "report", "view")
  const t = await getTranslations("reportsPage")
  const tAsset = await getTranslations("asset")
  const canReportExport = hasPermission(user, "report", "export")
  const canAssetExport = hasPermission(user, "asset", "view")
  const canMaintenanceExport = hasPermission(user, "maintenance", "export")
  const canAuditExport = hasPermission(user, "audit", "export")
  const canDisposalExport = hasPermission(user, "disposal", "export")
  const canRoleExport = hasPermission(user, "role", "export")
  const filters = parseAssetListParams(rawSearchParams)
  const baseAssetWhere = buildAssetWhere(filters)
  const assetWhere = await applyAssetCrossScopeFilter(baseAssetWhere, filters.crossScope)
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
    byOwnership,
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
    costAssets,
    costRepairGroups,
    depreciationPolicySetting,
    crossScopeSummary,
  ] = await withPerformanceTiming(
    "reports.initial-data",
    () => Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.aggregate({ where: assetWhere, _sum: { purchasePrice: true } }),
      prisma.asset.groupBy({ by: ["statusId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["categoryId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["companyId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["branchId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["departmentId"], where: { ...assetWhere, departmentId: { not: null } }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["ownershipType"], where: assetWhere, _count: { _all: true } }),
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
      prisma.asset.findMany({
        where: assetWhere,
        select: {
          id: true,
          assetTag: true,
          name: true,
          ownershipType: true,
          purchasePrice: true,
          purchaseDate: true,
          category: { select: { code: true, name: true } },
        },
      }),
      prisma.maintenanceTicket.groupBy({
        by: ["assetId"],
        where: { isActive: true, asset: assetWhere },
        _count: { _all: true },
        _sum: { repairCost: true },
      }),
      prisma.systemSetting.findUnique({ where: { key: depreciationPolicySettingKey }, select: { value: true } }),
      buildAssetCrossScopeSummary(baseAssetWhere, 8),
    ]),
    {
      route: "/reports",
      locale,
      hasSearch: Boolean(filters.search),
      crossScope: filters.crossScope || "none",
    }
  )
  const [custodianOptions, locationOptions, repairAssets] = await withPerformanceTiming(
    "reports.lookup-data",
    () => Promise.all([
      prisma.employee.findMany({ where: { id: { in: byCustodian.map((item) => item.custodianId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, fullNameTh: true } }),
      prisma.location.findMany({ where: { id: { in: byLocation.map((item) => item.currentLocationId) } }, select: { id: true, code: true, name: true } }),
      prisma.asset.findMany({ where: { id: { in: repairGroups.map((item) => item.assetId) } }, select: { id: true, assetTag: true, name: true } }),
    ]),
    {
      route: "/reports",
      locale,
      custodians: byCustodian.length,
      locations: byLocation.length,
      repairs: repairGroups.length,
    }
  )
  const [statuses, categories, companies, branches, departments] = await withPerformanceTiming(
    "reports.dimension-labels",
    () => Promise.all([
      prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
      prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
      prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
      prisma.branch.findMany({ where: { id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, code: true, name: true, company: { select: { code: true } } } }),
      prisma.department.findMany({ where: { id: { in: byDepartment.map((item) => item.departmentId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, name: true } }),
    ]),
    {
      route: "/reports",
      locale,
      statuses: byStatus.length,
      categories: byCategory.length,
      companies: byCompany.length,
      branches: byBranch.length,
      departments: byDepartment.length,
    }
  )

  const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
  const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
  const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))
  const branchMap = new Map(branches.map((branch) => [branch.id, `${branch.company.code} / ${branch.code} - ${branch.name}`]))
  const departmentMap = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))
  const custodianMap = new Map(custodianOptions.map((employee) => [employee.id, `${employee.code} - ${employee.fullNameTh}`]))
  const locationMap = new Map(locationOptions.map((location) => [location.id, `${location.code} - ${location.name}`]))
  const repairAssetMap = new Map(repairAssets.map((asset) => [asset.id, `${asset.assetTag} - ${asset.name}`]))
  const costRepairMap = new Map(costRepairGroups.map((group) => [group.assetId, group]))
  const costInsights = buildCostInsights(
    costAssets.map((asset) => {
      const repairGroup = costRepairMap.get(asset.id)
      return {
        id: asset.id,
        label: `${asset.assetTag} - ${asset.name}`,
        purchasePrice: asset.purchasePrice == null ? null : Number(asset.purchasePrice),
        repairCost: Number(repairGroup?._sum.repairCost ?? 0),
        repairCount: repairGroup?._count._all ?? 0,
      }
    })
  )
  const depreciationSummary = buildDepreciationSummary(
    costAssets.map((asset) => ({
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name}`,
      categoryCode: asset.category.code,
      categoryName: asset.category.name,
      ownershipType: asset.ownershipType,
      purchasePrice: asset.purchasePrice == null ? null : Number(asset.purchasePrice),
      purchaseDate: asset.purchaseDate,
    })),
    new Date(),
    { policy: parseDepreciationPolicySetting(depreciationPolicySetting?.value).policy }
  )
  const savedFilterUrl = `/${locale}/reports?${exportQuery}`
  const crossScopeCards = [
    {
      key: "all",
      label: t("crossScopeAll"),
      value: crossScopeSummary.all,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`,
    },
    {
      key: "custodian_company",
      label: t("crossScopeCustodianCompany"),
      value: crossScopeSummary.custodianCompany,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "custodian_company", dataQuality: "", statusId: "", page: 1 })}`,
    },
    {
      key: "custodian_branch",
      label: t("crossScopeCustodianBranch"),
      value: crossScopeSummary.custodianBranch,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "custodian_branch", dataQuality: "", statusId: "", page: 1 })}`,
    },
    {
      key: "location_branch",
      label: t("crossScopeLocationBranch"),
      value: crossScopeSummary.locationBranch,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "location_branch", dataQuality: "", statusId: "", page: 1 })}`,
    },
  ]
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
        { label: t("crossScopeAssetsExcel"), viewHref: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`, exportHref: `/api/assets/export?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`, exportLabel: t("exportCrossScopeAssets"), exportAllowed: canAssetExport },
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
        <MetricCard label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <MetricCard label={t("totalValue")} value={formatCurrency(totalValue._sum.purchasePrice ? Number(totalValue._sum.purchasePrice) : 0)} />
        <MetricCard label={t("reportsReady")} value={reportCount.toLocaleString("th-TH")} />
      </div>

      <ContentPanel title={t("costInsightTitle")} description={t("costInsightHelp")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("costTotalRepair")} value={formatCurrency(costInsights.totalRepairCost)} compact />
          <MetricCard label={t("costRepairRatio")} value={formatPercent(costInsights.repairToPurchaseRatio)} compact />
          <MetricCard label={t("costMissingPrice")} value={costInsights.missingPurchasePriceCount.toLocaleString("th-TH")} compact />
          <MetricCard label={t("costHighValueAssets")} value={costInsights.highValueAssetCount.toLocaleString("th-TH")} compact />
        </div>
        <CostExposureTable
          title={t("costHighRepairRisk")}
          rows={costInsights.highRepairExposureAssets}
          locale={locale}
          labels={{
            asset: t("assetName"),
            repairCost: t("costRepairCost"),
            purchasePrice: t("costPurchasePrice"),
            ratio: t("costRepairRatioShort"),
            repairCount: t("costRepairCount"),
            empty: t("costNoRepairRisk"),
          }}
        />
      </ContentPanel>

      <ContentPanel title={t("accountingInsightTitle")} description={t("accountingInsightHelp")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t("accountingAcquisitionCost")} value={formatCurrency(depreciationSummary.totalAcquisitionCost)} compact />
          <MetricCard label={t("accountingResidualValue")} value={formatCurrency(depreciationSummary.totalResidualValue)} compact />
          <MetricCard label={t("accountingAccumulatedDepreciation")} value={formatCurrency(depreciationSummary.totalAccumulatedDepreciation)} compact />
          <MetricCard label={t("accountingNetBookValue")} value={formatCurrency(depreciationSummary.totalNetBookValue)} compact />
          <MetricCard label={t("accountingFullyDepreciated")} value={depreciationSummary.fullyDepreciatedCount.toLocaleString("th-TH")} compact />
          <MetricCard label={t("accountingMissingInfo")} value={depreciationSummary.missingAccountingInfoCount.toLocaleString("th-TH")} compact />
        </div>
        <DepreciationTable
          title={t("accountingTopBookValueAssets")}
          rows={depreciationSummary.topNetBookValueAssets}
          locale={locale}
          labels={{
            asset: t("assetName"),
            bookValue: t("accountingBookValue"),
            accumulated: t("accountingAccumulatedDepreciation"),
            ratio: t("accountingDepreciationRatio"),
            usefulLife: t("accountingUsefulLife"),
            ageMonths: t("accountingAgeMonths"),
            empty: t("accountingNoAssets"),
          }}
        />
      </ContentPanel>

      <FilterPanel title={t("filterTitle")} description={t("filterHelp")} className="p-5">
        <form action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search}
              placeholder={t("searchPlaceholder")}
              className={getFieldControlClasses()}
            />
          </label>
          <ReportSelect name="companyId" label={t("company")} value={filters.companyId} options={filterCompanies.map((company) => ({ value: company.id, label: `${company.code} - ${company.nameTh}` }))} allLabel={t("all")} />
          <ReportSelect name="branchId" label={t("branch")} value={filters.branchId} options={filterBranches.map((branch) => ({ value: branch.id, label: `${branch.company.code} / ${branch.code} - ${branch.name}` }))} allLabel={t("all")} />
          <ReportSelect name="categoryId" label={t("category")} value={filters.categoryId} options={filterCategories.map((category) => ({ value: category.id, label: `${category.code} - ${category.name}` }))} allLabel={t("all")} />
          <ReportSelect name="statusId" label={t("status")} value={filters.statusId} options={filterStatuses.map((status) => ({ value: status.id, label: status.nameTh }))} allLabel={t("all")} />
          <ReportSelect name="conditionId" label={t("condition")} value={filters.conditionId} options={filterConditions.map((condition) => ({ value: condition.id, label: condition.nameTh }))} allLabel={t("all")} />
          <ReportSelect name="ownershipType" label={tAsset("ownershipType")} value={filters.ownershipType} options={assetOwnershipTypes.map((type) => ({ value: type, label: tAsset(`ownershipType_${type}`) }))} allLabel={t("all")} />
          <div className="flex min-w-0 flex-col gap-2 self-end sm:flex-row sm:flex-wrap md:col-span-2 xl:col-span-3">
            <ActionButton type="submit" variant="primary" className="min-h-11 w-full sm:h-10 sm:min-h-0 sm:w-auto">
              {t("applyFilters")}
            </ActionButton>
            <Link href={`/${locale}/reports`} className={`${getActionButtonClasses("secondary")} min-h-11 w-full sm:h-10 sm:min-h-0 sm:w-auto`}>
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </FilterPanel>

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
            <Link href={savedFilterUrl} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-9 sm:min-h-0 sm:w-auto">
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
                  <Link href={report.href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0 sm:w-auto">
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
          <MetricCard label={t("missingCustodian")} value={missingCustodian.toLocaleString("th-TH")} compact />
          <MetricCard label={t("missingSerial")} value={missingSerial.toLocaleString("th-TH")} compact />
          <MetricCard label={t("missingPhoto")} value={missingPhoto.toLocaleString("th-TH")} compact />
          <MetricCard label={t("warrantyExpiring")} value={warrantyExpiring.toLocaleString("th-TH")} compact />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("crossScopeTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("crossScopeHelp")}</p>
          </div>
          {canAssetExport ? (
            <Link
              href={`/api/assets/export?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0"
            >
              <Download className="h-4 w-4" />
              {t("exportCrossScopeAssets")}
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crossScopeCards.map((card) => (
            <Link key={card.key} href={card.href} className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</div>
            </Link>
          ))}
        </div>
        <CrossScopePreviewTable
          rows={crossScopeSummary.rows}
          locale={locale}
          labels={{
            title: t("crossScopePreviewTitle"),
            empty: t("crossScopeEmpty"),
            asset: t("assetName"),
            ownerBranch: t("crossScopeOwnerBranch"),
            custodianBranch: t("crossScopeCustodianBranchColumn"),
            locationBranch: t("crossScopeLocationBranchColumn"),
            flags: t("crossScopeFlags"),
            custodianCompany: t("crossScopeCustodianCompany"),
            custodianBranchDifference: t("crossScopeCustodianBranch"),
            locationBranchDifference: t("crossScopeLocationBranch"),
          }}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("dataQualityActionTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("dataQualityActionHelp")}</p>
          </div>
          <Link href={`/${locale}/admin/data-quality`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit">
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
              const issues = getDataQualityIssues(asset, warrantyThreshold, t, locale)
              const primaryFixHref = issues[0]?.href ?? `/${locale}/assets/${asset.id}/edit`

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
                          <Link key={issue.label} href={issue.href} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20">
                            {issue.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                        {t("openAsset")}
                      </Link>
                      <Link href={primaryFixHref} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 sm:h-8 sm:min-h-0">
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
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{t("assetTag")}</PreviewHead>
                <PreviewHead>{t("assetName")}</PreviewHead>
                <PreviewHead>{t("category")}</PreviewHead>
                <PreviewHead>{t("branch")}</PreviewHead>
                <PreviewHead>{t("department")}</PreviewHead>
                <PreviewHead>{t("custodian")}</PreviewHead>
                <PreviewHead>{tAsset("ownershipType")}</PreviewHead>
                <PreviewHead>{t("status")}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previewAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{tAsset(`ownershipType_${normalizeAssetOwnershipType(asset.ownershipType)}`)}</td>
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
        <ReportTable title={t("byOwnership")} rows={byOwnership.map((item) => [tAsset(`ownershipType_${normalizeAssetOwnershipType(item.ownershipType)}`), item._count._all])} />
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
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link href={report.viewHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                        {t("openReport")}
                      </Link>
                      {report.exportHref && report.exportAllowed ? (
                        <Link href={report.exportHref} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 sm:h-8 sm:min-h-0">
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

function CostExposureTable({
  title,
  rows,
  locale,
  labels,
}: {
  title: string
  rows: CostExposureAsset[]
  locale: string
  labels: {
    asset: string
    repairCost: string
    purchasePrice: string
    ratio: string
    repairCount: string
    empty: string
  }
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.repairCost}</PreviewHead>
                <PreviewHead>{labels.purchasePrice}</PreviewHead>
                <PreviewHead>{labels.ratio}</PreviewHead>
                <PreviewHead>{labels.repairCount}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                    <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                      {asset.label}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.repairCost)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.purchasePrice)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPercent(asset.repairToPurchaseRatio)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.repairCount.toLocaleString("th-TH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DepreciationTable({
  title,
  rows,
  locale,
  labels,
}: {
  title: string
  rows: DepreciableAsset[]
  locale: string
  labels: {
    asset: string
    bookValue: string
    accumulated: string
    ratio: string
    usefulLife: string
    ageMonths: string
    empty: string
  }
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.bookValue}</PreviewHead>
                <PreviewHead>{labels.accumulated}</PreviewHead>
                <PreviewHead>{labels.ratio}</PreviewHead>
                <PreviewHead>{labels.usefulLife}</PreviewHead>
                <PreviewHead>{labels.ageMonths}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                    <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                      {asset.label}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.netBookValue)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.accumulatedDepreciation)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPercent(asset.depreciatedRatio)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.usefulLifeMonths.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.ageMonths.toLocaleString("th-TH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CrossScopePreviewTable({
  rows,
  locale,
  labels,
}: {
  rows: AssetCrossScopeSummaryRow[]
  locale: string
  labels: {
    title: string
    empty: string
    asset: string
    ownerBranch: string
    custodianBranch: string
    locationBranch: string
    flags: string
    custodianCompany: string
    custodianBranchDifference: string
    locationBranchDifference: string
  }
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{labels.title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.ownerBranch}</PreviewHead>
                <PreviewHead>{labels.custodianBranch}</PreviewHead>
                <PreviewHead>{labels.locationBranch}</PreviewHead>
                <PreviewHead>{labels.flags}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => {
                const flagLabels = getAssetCrossScopeFlagLabels(asset.flags, {
                  custodianCompany: labels.custodianCompany,
                  custodianBranch: labels.custodianBranchDifference,
                  locationBranch: labels.locationBranchDifference,
                })

                return (
                  <tr key={asset.id}>
                    <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                      <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                      <div className="mt-1 text-xs font-normal text-muted-foreground">{asset.name}</div>
                    </td>
                    <td className="min-w-48 px-4 py-3 text-muted-foreground">{asset.ownerBranch}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      <div>{asset.custodian}</div>
                      <div className="mt-1 text-xs">{asset.custodianBranch}</div>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      <div>{asset.currentLocation}</div>
                      <div className="mt-1 text-xs">{asset.currentLocationBranch}</div>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {flagLabels.map((label) => (
                          <span key={label} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatPercent(value: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
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
        className={getFieldControlClasses()}
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
    id: string
    ownershipType?: string | null
    custodian: { code: string; fullNameTh: string } | null
    department?: { code: string; name: string } | null
    installedInLinks?: Array<{ id: string }>
    serialNumber: string | null
    warrantyEndDate: Date | null
    attachments: Array<{ id: string }>
  },
  warrantyThreshold: Date,
  t: (key: string) => string,
  locale: string
) {
  const editHref = `/${locale}/assets/${asset.id}/edit`
  const detailHref = `/${locale}/assets/${asset.id}`
  const issues: Array<{ label: string; href: string }> = []
  if (!hasAssetResponsibility(asset)) issues.push({ label: t("missingCustodian"), href: editHref })
  if (!asset.serialNumber) issues.push({ label: t("missingSerial"), href: editHref })
  if (asset.ownershipType !== "software_license" && asset.attachments.length === 0) {
    issues.push({ label: t("missingPhoto"), href: `${detailHref}#photos` })
  }
  if (asset.warrantyEndDate && asset.warrantyEndDate >= new Date() && asset.warrantyEndDate <= warrantyThreshold) {
    issues.push({ label: t("warrantyExpiring"), href: `${detailHref}#purchase` })
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
          rows.map(([label, count], index) => (
            <div key={`${index}:${label}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{count.toLocaleString("th-TH")}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
