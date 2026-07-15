import type React from "react"
import { ClipboardCheck, DatabaseZap, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { formatCurrency } from "@/lib/utils"
import { buildAssetQueryString, buildAssetWhere, parseAssetListParams, type AssetListParams } from "@/lib/asset-list-query"
import { getAssetActivityWhere } from "@/lib/asset-activity-filter"
import { applyAssetCrossScopeFilter, buildAssetCrossScopeSummary } from "@/lib/asset-cross-scope"
import { assetMissingResponsibilityWhere, assetOwnershipTypes, hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { buildCostInsights } from "@/lib/cost-insights"
import { buildDepreciationSummary, depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { MetricCard } from "@/components/ui/metric-card"
import { ReportActiveFilters } from "@/components/reports/report-active-filters"
import { ReportFilterPanel, type ReportFilterOptions as ReportFilterPanelOptions } from "@/components/reports/report-filter-panel"
import { ReportHeader, type ReportHeaderAction } from "@/components/reports/report-header"
import { ReportViewTabs } from "@/components/reports/report-view-tabs"
import { ReportsAccountingView } from "@/components/reports/reports-accounting-view"
import { ReportsCatalogView, type ReportCatalogCategory } from "@/components/reports/reports-catalog-view"
import { ReportsOperationsView, type ReportDataQualityRow } from "@/components/reports/reports-operations-view"
import { ReportsOverviewView } from "@/components/reports/reports-overview-view"
import { buildReportActiveFilters } from "@/lib/report-active-filters"
import { buildReportHref, parseReportView, type ReportView } from "@/lib/report-view"
import { withPerformanceTiming } from "@/lib/performance-timing"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams & { view?: string | string[] }>
}

type ReportFilterOptions = {
  companies: Array<{ id: string; code: string; nameTh: string }>
  branches: Array<{ id: string; code: string; name: string; company: { code: string } }>
  categories: Array<{ id: string; code: string; name: string }>
  statuses: Array<{ id: string; nameTh: string }>
  conditions: Array<{ id: string; nameTh: string }>
  selectedLabels: {
    brand?: string
    model?: string
    custodian?: string
    supplier?: string
  }
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
  const activeView = parseReportView(rawSearchParams.view)
  const assetSearchParams = { ...rawSearchParams }
  delete assetSearchParams.view
  const filters = parseAssetListParams(assetSearchParams)
  const baseAssetWhere = buildAssetWhere(filters)
  const assetWhere = await applyAssetCrossScopeFilter(baseAssetWhere, filters.crossScope)
  const exportQuery = buildAssetQueryString(filters, { page: 1, pageSize: 100 })
  const timingContext = {
    route: "/reports",
    locale,
    hasSearch: Boolean(filters.search),
    crossScope: filters.crossScope || "none",
  }

  async function loadReportFilterOptions(): Promise<ReportFilterOptions> {
    const [companies, branches, categories, statuses, conditions, selectedBrand, selectedModel, selectedCustodian, selectedSupplier] = await Promise.all([
      prisma.company.findMany({ where: { isActive: true }, select: { id: true, code: true, nameTh: true }, orderBy: { code: "asc" } }),
      prisma.branch.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, company: { select: { code: true } } }, orderBy: { code: "asc" } }),
      prisma.assetCategory.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
      prisma.assetStatus.findMany({ where: { isActive: true }, select: { id: true, nameTh: true }, orderBy: { nameTh: "asc" } }),
      prisma.assetCondition.findMany({ where: { isActive: true }, select: { id: true, nameTh: true }, orderBy: { nameTh: "asc" } }),
      filters.brandId
        ? prisma.assetBrand.findUnique({ where: { id: filters.brandId }, select: { name: true } })
        : Promise.resolve(null),
      filters.modelId
        ? prisma.assetModel.findUnique({ where: { id: filters.modelId }, select: { name: true, brand: { select: { name: true } } } })
        : Promise.resolve(null),
      filters.custodianId
        ? prisma.employee.findUnique({ where: { id: filters.custodianId }, select: { code: true, fullNameTh: true } })
        : Promise.resolve(null),
      filters.supplierId
        ? prisma.supplier.findUnique({ where: { id: filters.supplierId }, select: { code: true, name: true } })
        : Promise.resolve(null),
    ])

    return {
      companies,
      branches,
      categories,
      statuses,
      conditions,
      selectedLabels: {
        brand: selectedBrand?.name,
        model: selectedModel ? `${selectedModel.brand.name} / ${selectedModel.name}` : undefined,
        custodian: selectedCustodian ? `${selectedCustodian.code} - ${selectedCustodian.fullNameTh}` : undefined,
        supplier: selectedSupplier ? `${selectedSupplier.code} - ${selectedSupplier.name}` : undefined,
      },
    }
  }

  const [totalAssets, totalValue, reportFilterOptions] = await withPerformanceTiming(
    "reports.shared-data",
    () => Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.aggregate({ where: assetWhere, _sum: { purchasePrice: true } }),
      loadReportFilterOptions(),
    ]),
    timingContext
  )
  const {
    companies: filterCompanies,
    branches: filterBranches,
    categories: filterCategories,
    statuses: filterStatuses,
    conditions: filterConditions,
    selectedLabels,
  } = reportFilterOptions
  const totalPurchaseValue = totalValue._sum.purchasePrice ? Number(totalValue._sum.purchasePrice) : 0
  const filterOptions: ReportFilterPanelOptions = {
    companies: filterCompanies.map((company) => ({ value: company.id, label: `${company.code} - ${company.nameTh}` })),
    branches: filterBranches.map((branch) => ({ value: branch.id, label: `${branch.company.code} / ${branch.code} - ${branch.name}` })),
    categories: filterCategories.map((category) => ({ value: category.id, label: `${category.code} - ${category.name}` })),
    statuses: filterStatuses.map((status) => ({ value: status.id, label: status.nameTh })),
    conditions: filterConditions.map((condition) => ({ value: condition.id, label: condition.nameTh })),
    ownershipTypes: assetOwnershipTypes.map((type) => ({ value: type, label: tAsset("ownershipType_" + type) })),
  }
  const viewLabels: Record<ReportView, string> = {
    overview: t("viewOverview"),
    accounting: t("viewAccounting"),
    operations: t("viewOperations"),
    catalog: t("viewCatalog"),
  }
  const activeFilters = buildReportActiveFilters({
    locale,
    view: activeView,
    filters,
    names: {
      search: t("search"),
      companyId: t("company"),
      branchId: t("branch"),
      categoryId: t("category"),
      brandId: tAsset("brand"),
      modelId: tAsset("model"),
      statusId: t("status"),
      conditionId: t("condition"),
      ownershipType: tAsset("ownershipType"),
      custodianId: t("custodian"),
      supplierId: tAsset("supplier"),
      dataQuality: t("dataQuality"),
      crossScope: t("crossScopeTitle"),
      activity: t("idleAssets"),
    },
    values: {
      companyId: filterOptions.companies.find((option) => option.value === filters.companyId)?.label,
      branchId: filterOptions.branches.find((option) => option.value === filters.branchId)?.label,
      categoryId: filterOptions.categories.find((option) => option.value === filters.categoryId)?.label,
      brandId: selectedLabels.brand,
      modelId: selectedLabels.model,
      statusId: filterOptions.statuses.find((option) => option.value === filters.statusId)?.label,
      conditionId: filterOptions.conditions.find((option) => option.value === filters.conditionId)?.label,
      ownershipType: filterOptions.ownershipTypes.find((option) => option.value === filters.ownershipType)?.label,
      custodianId: selectedLabels.custodian,
      supplierId: selectedLabels.supplier,
      activity: filters.activity === "idle_180d" ? tAsset("activityIdle180d") : undefined,
    },
  })
  const hasActiveFilters = activeFilters.length > 0
  const headerActions: ReportHeaderAction[] = [
    ...(canReportExport
      ? [{ href: "/api/reports/assets-overview/export?" + exportQuery, label: t("exportAssetOverview"), variant: "primary" as const }]
      : []),
    ...(canAssetExport
      ? [{ href: "/api/assets/export?" + exportQuery, label: t("exportAssetRegister"), variant: "secondary" as const }]
      : []),
  ]

  let viewContent: React.ReactNode
  switch (activeView) {
    case "overview": {
      async function loadOverviewView(): Promise<React.ReactNode> {
        const [byStatus, byCategory, byCompany, byBranch, byDepartment, byOwnership, previewAssets] = await Promise.all([
          prisma.asset.groupBy({ by: ["statusId"], where: assetWhere, _count: { _all: true } }),
          prisma.asset.groupBy({ by: ["categoryId"], where: assetWhere, _count: { _all: true } }),
          prisma.asset.groupBy({ by: ["companyId"], where: assetWhere, _count: { _all: true } }),
          prisma.asset.groupBy({ by: ["branchId"], where: assetWhere, _count: { _all: true } }),
          prisma.asset.groupBy({ by: ["departmentId"], where: { ...assetWhere, departmentId: { not: null } }, _count: { _all: true } }),
          prisma.asset.groupBy({ by: ["ownershipType"], where: assetWhere, _count: { _all: true } }),
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
        ])
        const [statuses, categories, companies, branches, departments] = await Promise.all([
          prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
          prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
          prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
          prisma.branch.findMany({ where: { id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, code: true, name: true, company: { select: { code: true } } } }),
          prisma.department.findMany({ where: { id: { in: byDepartment.map((item) => item.departmentId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, name: true } }),
        ])
        const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
        const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
        const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))
        const branchMap = new Map(branches.map((branch) => [branch.id, `${branch.company.code} / ${branch.code} - ${branch.name}`]))
        const departmentMap = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))

        return (
          <ReportsOverviewView
            locale={locale}
            hasActiveFilters={hasActiveFilters}
            hasMatchingAssets={totalAssets > 0}
            emptyCopy={{ filtered: t("previewEmpty"), dataset: tAsset("importBatchStatusEmpty") }}
            previewRows={previewAssets.map((asset) => ({
              id: asset.id,
              assetTag: asset.assetTag,
              name: asset.name,
              category: asset.category.code + " - " + asset.category.name,
              branch: asset.branch.code + " - " + asset.branch.name,
              department: asset.department ? asset.department.code + " - " + asset.department.name : t("unassigned"),
              custodian: asset.custodian ? asset.custodian.code + " - " + asset.custodian.fullNameTh : t("unassigned"),
              ownership: tAsset("ownershipType_" + normalizeAssetOwnershipType(asset.ownershipType)),
              status: asset.status.nameTh,
            }))}
            breakdowns={{
              status: byStatus.map((item) => ({ key: item.statusId, label: statusMap.get(item.statusId) ?? item.statusId, count: item._count._all })),
              category: byCategory.map((item) => ({ key: item.categoryId, label: categoryMap.get(item.categoryId) ?? item.categoryId, count: item._count._all })),
              company: byCompany.map((item) => ({ key: item.companyId, label: companyMap.get(item.companyId) ?? item.companyId, count: item._count._all })),
              branch: byBranch.map((item) => ({ key: item.branchId, label: branchMap.get(item.branchId) ?? item.branchId, count: item._count._all })),
              department: byDepartment.map((item) => ({
                key: item.departmentId ?? "unassigned",
                label: departmentMap.get(item.departmentId ?? "") ?? item.departmentId ?? t("unassigned"),
                count: item._count._all,
              })),
              ownership: byOwnership.map((item) => ({
                key: normalizeAssetOwnershipType(item.ownershipType),
                label: tAsset("ownershipType_" + normalizeAssetOwnershipType(item.ownershipType)),
                count: item._count._all,
              })),
            }}
            labels={{
              previewTitle: t("previewTitle"),
              previewHelp: t("previewHelp"),
              previewCount: t("previewCount", { count: previewAssets.length }),
              assetTag: t("assetTag"),
              assetName: t("assetName"),
              category: t("category"),
              branch: t("branch"),
              department: t("department"),
              custodian: t("custodian"),
              ownership: tAsset("ownershipType"),
              status: t("status"),
              byStatus: t("byStatus"),
              byCategory: t("byCategory"),
              byCompany: t("byCompany"),
              byBranch: t("byBranch"),
              byDepartment: t("byDepartment"),
              byOwnership: t("byOwnership"),
            }}
          />
        )
      }

      viewContent = await withPerformanceTiming("reports.overview-data", loadOverviewView, timingContext)
      break
    }
    case "accounting": {
      async function loadAccountingView(): Promise<React.ReactNode> {
        const [costAssets, costRepairGroups, depreciationPolicySetting] = await Promise.all([
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
        ])
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

        return (
          <ReportsAccountingView
            locale={locale}
            hasActiveFilters={hasActiveFilters}
            hasMatchingAssets={totalAssets > 0}
            filteredEmptyCopy={t("previewEmpty")}
            costInsights={costInsights}
            depreciationSummary={depreciationSummary}
            labels={{
              costTitle: t("costInsightTitle"),
              costHelp: t("costInsightHelp"),
              totalRepair: t("costTotalRepair"),
              repairRatio: t("costRepairRatio"),
              missingPrice: t("costMissingPrice"),
              highValueAssets: t("costHighValueAssets"),
              highRepairRisk: t("costHighRepairRisk"),
              asset: t("assetName"),
              repairCost: t("costRepairCost"),
              purchasePrice: t("costPurchasePrice"),
              ratio: t("costRepairRatioShort"),
              repairCount: t("costRepairCount"),
              noRepairRisk: t("costNoRepairRisk"),
              accountingTitle: t("accountingInsightTitle"),
              accountingHelp: t("accountingInsightHelp"),
              acquisitionCost: t("accountingAcquisitionCost"),
              residualValue: t("accountingResidualValue"),
              accumulatedDepreciation: t("accountingAccumulatedDepreciation"),
              netBookValue: t("accountingNetBookValue"),
              fullyDepreciated: t("accountingFullyDepreciated"),
              missingInfo: t("accountingMissingInfo"),
              topBookValueAssets: t("accountingTopBookValueAssets"),
              bookValue: t("accountingBookValue"),
              depreciationRatio: t("accountingDepreciationRatio"),
              usefulLife: t("accountingUsefulLife"),
              ageMonths: t("accountingAgeMonths"),
              noAssets: t("accountingNoAssets"),
            }}
          />
        )
      }

      viewContent = await withPerformanceTiming("reports.accounting-data", loadAccountingView, timingContext)
      break
    }
    case "operations": {
      async function loadOperationsView(): Promise<React.ReactNode> {
        const warrantyThreshold = new Date()
        warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
        const operationsQualityFilters = parseAssetListParams({ ...filters, dataQuality: "", activity: "", page: 1 })
        const operationsQualityWhere = await applyAssetCrossScopeFilter(buildAssetWhere(operationsQualityFilters), operationsQualityFilters.crossScope)
        const crossScopeFilters = parseAssetListParams({ ...filters, dataQuality: "", statusId: "", page: 1 })
        const idleAssetWhere = getAssetActivityWhere("idle_180d")
        const [
          missingCustodian,
          missingSerial,
          missingPhoto,
          warrantyExpiring,
          dataQualityAssets,
          byCustodian,
          byLocation,
          repairGroups,
          idleAssetsCount,
          crossScopeSummary,
        ] = await Promise.all([
          prisma.asset.count({ where: { AND: [operationsQualityWhere, assetMissingResponsibilityWhere] } }),
          prisma.asset.count({ where: { AND: [operationsQualityWhere, { OR: [{ serialNumber: null }, { serialNumber: "" }] }] } }),
          prisma.asset.count({
            where: {
              AND: [
                operationsQualityWhere,
                { ownershipType: { not: "software_license" } },
                { attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
              ],
            },
          }),
          prisma.asset.count({ where: { AND: [operationsQualityWhere, { warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } }] } }),
          prisma.asset.findMany({
            where: {
              AND: [
                operationsQualityWhere,
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
          prisma.maintenanceTicket.groupBy({
            by: ["assetId"],
            where: { isActive: true, asset: assetWhere },
            _count: { _all: true },
            _sum: { repairCost: true },
            orderBy: { _count: { assetId: "desc" } },
            take: 5,
          }),
          prisma.asset.count({
            where: { AND: [operationsQualityWhere, ...(idleAssetWhere ? [idleAssetWhere] : [])] },
          }),
          buildAssetCrossScopeSummary(buildAssetWhere(crossScopeFilters), 8),
        ])
        const [custodianOptions, locationOptions, repairAssets] = await Promise.all([
          prisma.employee.findMany({ where: { id: { in: byCustodian.map((item) => item.custodianId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, fullNameTh: true } }),
          prisma.location.findMany({ where: { id: { in: byLocation.map((item) => item.currentLocationId) } }, select: { id: true, code: true, name: true } }),
          prisma.asset.findMany({ where: { id: { in: repairGroups.map((item) => item.assetId) } }, select: { id: true, assetTag: true, name: true } }),
        ])
        const custodianMap = new Map(custodianOptions.map((employee) => [employee.id, `${employee.code} - ${employee.fullNameTh}`]))
        const locationMap = new Map(locationOptions.map((location) => [location.id, `${location.code} - ${location.name}`]))
        const repairAssetMap = new Map(repairAssets.map((asset) => [asset.id, `${asset.assetTag} - ${asset.name}`]))
        const crossScopeCards = [
          {
            key: "all",
            label: t("crossScopeAll"),
            value: crossScopeSummary.all,
            href: `/${locale}/assets?${buildAssetQueryString(crossScopeFilters, { crossScope: "all", page: 1 })}`,
          },
          {
            key: "custodian_company",
            label: t("crossScopeCustodianCompany"),
            value: crossScopeSummary.custodianCompany,
            href: `/${locale}/assets?${buildAssetQueryString(crossScopeFilters, { crossScope: "custodian_company", page: 1 })}`,
          },
          {
            key: "custodian_branch",
            label: t("crossScopeCustodianBranch"),
            value: crossScopeSummary.custodianBranch,
            href: `/${locale}/assets?${buildAssetQueryString(crossScopeFilters, { crossScope: "custodian_branch", page: 1 })}`,
          },
          {
            key: "location_branch",
            label: t("crossScopeLocationBranch"),
            value: crossScopeSummary.locationBranch,
            href: `/${locale}/assets?${buildAssetQueryString(crossScopeFilters, { crossScope: "location_branch", page: 1 })}`,
          },
        ]
        const dataQualityRows: ReportDataQualityRow[] = dataQualityAssets.map((asset) => {
          const issues = getDataQualityIssues(asset, warrantyThreshold, t, locale)
          return {
            id: asset.id,
            assetTag: asset.assetTag,
            name: asset.name,
            context: asset.category.code + " - " + asset.category.name + " · " + asset.branch.code + " - " + asset.branch.name,
            issues: issues.map((issue, index) => ({ ...issue, key: String(index) + ":" + issue.label })),
            primaryFixHref: issues[0]?.href ?? "/" + locale + "/assets/" + asset.id + "/edit",
          }
        })

        return (
          <ReportsOperationsView
            locale={locale}
            filters={operationsQualityFilters}
            hasActiveFilters={hasActiveFilters}
            hasMatchingAssets={totalAssets > 0}
            filteredEmptyCopy={t("previewEmpty")}
            dataQuality={{ missingCustodian, missingSerial, missingPhoto, warrantyExpiring, rows: dataQualityRows }}
            crossScope={{
              cards: crossScopeCards,
              rows: crossScopeSummary.rows,
              exportHref: canAssetExport
                ? "/api/assets/export?" + buildAssetQueryString(crossScopeFilters, { crossScope: "all", page: 1 })
                : undefined,
            }}
            insights={{
              custodians: byCustodian.map((item) => ({
                key: item.custodianId ?? "unassigned",
                label: custodianMap.get(item.custodianId ?? "") ?? t("unassigned"),
                count: item._count._all,
              })),
              locations: byLocation.map((item) => ({
                key: item.currentLocationId,
                label: locationMap.get(item.currentLocationId) ?? item.currentLocationId,
                count: item._count._all,
              })),
              repairs: repairGroups.map((item) => ({
                key: item.assetId,
                label: repairAssetMap.get(item.assetId) ?? item.assetId,
                count: item._count._all,
                href: `/${locale}/assets/${item.assetId}`,
              })),
              idleAssetsCount,
            }}
            labels={{
              dataQuality: t("dataQuality"),
              missingCustodian: t("missingCustodian"),
              missingSerial: t("missingSerial"),
              missingPhoto: t("missingPhoto"),
              warrantyExpiring: t("warrantyExpiring"),
              crossScopeTitle: t("crossScopeTitle"),
              crossScopeHelp: t("crossScopeHelp"),
              exportCrossScopeAssets: t("exportCrossScopeAssets"),
              crossScopePreviewTitle: t("crossScopePreviewTitle"),
              crossScopeEmpty: t("crossScopeEmpty"),
              asset: t("assetName"),
              ownerBranch: t("crossScopeOwnerBranch"),
              custodianBranch: t("crossScopeCustodianBranchColumn"),
              locationBranch: t("crossScopeLocationBranchColumn"),
              flags: t("crossScopeFlags"),
              custodianCompanyDifference: t("crossScopeCustodianCompany"),
              custodianBranchDifference: t("crossScopeCustodianBranch"),
              locationBranchDifference: t("crossScopeLocationBranch"),
              dataQualityActionTitle: t("dataQualityActionTitle"),
              dataQualityActionHelp: t("dataQualityActionHelp"),
              openDataQualityRules: t("openDataQualityRules"),
              dataQualityEmpty: t("dataQualityEmpty"),
              openAsset: t("openAsset"),
              fixData: t("fixData"),
              operationInsightsTitle: t("operationInsightsTitle"),
              operationInsightsHelp: t("operationInsightsHelp"),
              byCustodian: t("byCustodian"),
              byLocation: t("byLocation"),
              frequentRepairAssets: t("frequentRepairAssets"),
              idleAssets: t("idleAssets"),
              idleAssetsHelp: t("idleAssetsHelp"),
              noActivity: tAsset("importBatchStatusEmpty"),
            }}
          />
        )
      }

      viewContent = await withPerformanceTiming("reports.operations-data", loadOperationsView, timingContext)
      break
    }
    case "catalog": {
      async function loadCatalogView(): Promise<React.ReactNode> {
        const recurringReports = [
          { key: "asset-overview", name: t("monthlyAssetOverview"), cadence: t("monthly"), href: `/api/reports/assets-overview/export?${exportQuery}`, owner: t("ownerAccounting"), allowed: canReportExport },
          { key: "maintenance-follow-up", name: t("weeklyMaintenanceFollowUp"), cadence: t("weekly"), href: "/api/maintenance-tickets/export", owner: t("ownerMaintenance"), allowed: canMaintenanceExport },
          { key: "disposal-follow-up", name: t("monthlyDisposalFollowUp"), cadence: t("monthly"), href: "/api/disposal-requests/export", owner: t("ownerApprover"), allowed: canDisposalExport },
          { key: "audit-findings", name: t("weeklyAuditFindings"), cadence: t("weekly"), href: "/api/audit-findings/export?status=pending", owner: t("ownerAudit"), allowed: canAuditExport },
        ]
        const reportCatalog: ReportCatalogCategory[] = [
          {
            key: "assets",
            title: t("catalogAssetTitle"),
            description: t("catalogAssetDescription"),
            audience: t("catalogAssetAudience"),
            icon: <FileSpreadsheet className="h-5 w-5" />,
            reports: [
              { key: "asset-register", label: t("assetRegister"), viewHref: `/${locale}/assets?${exportQuery}`, exportHref: `/api/assets/export?${exportQuery}`, exportLabel: t("exportAssetRegister"), exportAllowed: canAssetExport },
              { key: "asset-overview", label: t("assetOverviewExcel"), viewHref: `/${locale}/reports?${exportQuery}`, exportHref: `/api/reports/assets-overview/export?${exportQuery}`, exportLabel: t("exportAssetOverview"), exportAllowed: canReportExport },
              { key: "cross-scope-assets", label: t("crossScopeAssetsExcel"), viewHref: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`, exportHref: `/api/assets/export?${buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })}`, exportLabel: t("exportCrossScopeAssets"), exportAllowed: canAssetExport },
            ],
          },
          {
            key: "data-quality",
            title: t("catalogDataQualityTitle"),
            description: t("catalogDataQualityDescription"),
            audience: t("catalogDataQualityAudience"),
            icon: <DatabaseZap className="h-5 w-5" />,
            reports: [
              { key: "data-quality", label: t("dataQuality"), viewHref: `/${locale}/admin/data-quality`, exportHref: `/api/reports/assets-overview/export?${exportQuery}`, exportLabel: t("exportAssetOverview"), exportAllowed: canReportExport },
            ],
          },
          {
            key: "maintenance",
            title: t("catalogMaintenanceTitle"),
            description: t("catalogMaintenanceDescription"),
            audience: t("catalogMaintenanceAudience"),
            icon: <Wrench className="h-5 w-5" />,
            reports: [
              { key: "maintenance", label: t("maintenanceReport"), viewHref: `/${locale}/maintenance`, exportHref: "/api/maintenance-tickets/export", exportLabel: t("exportMaintenance"), exportAllowed: canMaintenanceExport },
            ],
          },
          {
            key: "audit",
            title: t("catalogAuditTitle"),
            description: t("catalogAuditDescription"),
            audience: t("catalogAuditAudience"),
            icon: <ClipboardCheck className="h-5 w-5" />,
            reports: [
              { key: "audit-findings", label: t("auditFindingsReport"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export?status=all", exportLabel: t("exportAuditFindings"), exportAllowed: canAuditExport },
              { key: "audit-findings-pdf", label: t("auditFindingsPdf"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export-pdf?status=all", exportLabel: t("exportPdf"), exportAllowed: canAuditExport },
            ],
          },
          {
            key: "disposal",
            title: t("catalogDisposalTitle"),
            description: t("catalogDisposalDescription"),
            audience: t("catalogDisposalAudience"),
            icon: <Trash2 className="h-5 w-5" />,
            reports: [
              { key: "disposal", label: t("disposalReport"), viewHref: `/${locale}/disposal`, exportHref: "/api/disposal-requests/export", exportLabel: t("exportDisposal"), exportAllowed: canDisposalExport },
            ],
          },
          {
            key: "system",
            title: t("catalogSystemTitle"),
            description: t("catalogSystemDescription"),
            audience: t("catalogSystemAudience"),
            icon: <ShieldCheck className="h-5 w-5" />,
            reports: [
              { key: "role-permission-audit", label: t("rolePermissionAudit"), viewHref: `/${locale}/admin/roles`, exportHref: "/api/admin/roles/export", exportLabel: t("exportRoleAudit"), exportAllowed: canRoleExport },
              { key: "system-logs", label: t("systemLogs"), viewHref: `/${locale}/admin/logs` },
            ],
          },
        ]
        const reportCount = reportCatalog.reduce((sum, category) => sum + category.reports.length, 0)

        return (
          <ReportsCatalogView
            locale={locale}
            currentQuery={exportQuery}
            hasActiveFilters={hasActiveFilters}
            emptyCopy={{ filtered: t("previewEmpty"), dataset: t("savedPresetsEmpty") }}
            reportCount={reportCount}
            recurringReports={recurringReports}
            categories={reportCatalog}
            permissions={[
              { key: "report", label: t("exportAssetOverview"), allowed: canReportExport },
              { key: "asset", label: t("exportAssetRegister"), allowed: canAssetExport },
              { key: "maintenance", label: t("exportMaintenance"), allowed: canMaintenanceExport },
              { key: "audit", label: t("exportAuditFindings"), allowed: canAuditExport },
              { key: "disposal", label: t("exportDisposal"), allowed: canDisposalExport },
              { key: "role", label: t("exportRoleAudit"), allowed: canRoleExport },
            ]}
            labels={{
              catalogItems: t("catalogItems"),
              savedReportsTitle: t("savedReportsTitle"),
              savedReportsHelp: t("savedReportsHelp"),
              presetName: t("presetName"),
              saveCurrentPreset: t("saveCurrentPreset"),
              savedPresetsEmpty: t("savedPresetsEmpty"),
              savedPresetsDeviceOnly: t("savedPresetsDeviceOnly"),
              deletePreset: t("deletePreset"),
              presetNameRequired: t("presetNameRequired"),
              runNow: t("runNow"),
              notAllowed: t("notAllowed"),
              reportCatalog: t("reportCatalog"),
              reportCatalogHelp: t("reportCatalogHelp"),
              openReport: t("openReport"),
              permissionTitle: t("permissionTitle"),
              permissionHelp: t("permissionHelp"),
              allowed: t("allowed"),
            }}
          />
        )
      }

      viewContent = await withPerformanceTiming("reports.catalog-data", loadCatalogView, timingContext)
      break
    }
    default: {
      const exhaustiveView: never = activeView
      viewContent = exhaustiveView
    }
  }

  return (
    <div className="space-y-5" data-report-page>
      <ReportHeader title={t("title")} subtitle={t("subtitle")} actions={headerActions} />
      <div data-report-tabs>
        <ReportViewTabs
          locale={locale}
          activeView={activeView}
          filters={filters}
          labels={viewLabels}
          navigationLabel={t("viewNavigation")}
        />
      </div>
      <div data-report-filters>
        <ReportFilterPanel
          locale={locale}
          activeView={activeView}
          filters={filters}
          options={filterOptions}
          labels={{
            title: t("filterTitle"),
            help: t("filterHelp"),
            search: t("search"),
            searchPlaceholder: t("searchPlaceholder"),
            company: t("company"),
            branch: t("branch"),
            category: t("category"),
            status: t("status"),
            condition: t("condition"),
            ownershipType: tAsset("ownershipType"),
            all: t("all"),
            apply: t("applyFilters"),
            clear: t("clearFilters"),
          }}
        />
      </div>
      {activeFilters.length > 0 ? (
        <div data-report-active-filters>
          <ReportActiveFilters
            filters={activeFilters}
            clearAllHref={buildReportHref(locale, activeView, parseAssetListParams({}))}
            clearLabel={t("clearFilters")}
            removeLabel={t("clearActiveFilter")}
          />
        </div>
      ) : null}
      <div data-report-shared-metrics className="grid grid-cols-2 gap-3">
        <MetricCard label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <MetricCard label={t("totalValue")} value={formatCurrency(totalPurchaseValue)} />
      </div>
      <div data-report-view-content>{viewContent}</div>
    </div>
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
  const editHref = "/" + locale + "/assets/" + asset.id + "/edit"
  const detailHref = "/" + locale + "/assets/" + asset.id
  const issues: Array<{ label: string; href: string }> = []
  if (!hasAssetResponsibility(asset)) issues.push({ label: t("missingCustodian"), href: editHref })
  if (!asset.serialNumber) issues.push({ label: t("missingSerial"), href: editHref })
  if (asset.ownershipType !== "software_license" && asset.attachments.length === 0) {
    issues.push({ label: t("missingPhoto"), href: detailHref + "#photos" })
  }
  if (asset.warrantyEndDate && asset.warrantyEndDate >= new Date() && asset.warrantyEndDate <= warrantyThreshold) {
    issues.push({ label: t("warrantyExpiring"), href: detailHref + "#purchase" })
  }
  return issues
}
