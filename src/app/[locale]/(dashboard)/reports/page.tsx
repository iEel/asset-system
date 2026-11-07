import type React from "react"
import { Download } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buildAssetQueryString, buildAssetWhere, parseAssetListParams, type AssetListParams } from "@/lib/asset-list-query"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { ASSET_EXPORT_MAX_ROWS, assetExportCapped } from "@/lib/asset-export-limits"
import { getAssetWhereOptions } from "@/lib/asset-list-where-options"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"
import { applyAssetCrossScopeFilter, buildAssetCrossScopeSummary } from "@/lib/asset-cross-scope"
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildCostInsights } from "@/lib/cost-insights"
import { buildDepreciationSummary, depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { buttonVariants } from "@/components/ui/button-variants"
import { FilterChipList } from "@/components/ui/filter-chips"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { REPORT_FILTER_BAR_PHONE_ID, REPORT_FILTER_TOGGLE_ID, ReportChipsLine, ReportFilterPanel, type ReportFilterOptions as ReportFilterPanelOptions } from "@/components/reports/report-filter-panel"
import { ReportFilterToggle } from "@/components/reports/report-filter-toggle"
import { ReportViewTabs } from "@/components/reports/report-view-tabs"
import { ReportsAccountingView } from "@/components/reports/reports-accounting-view"
import { ReportsCatalogView } from "@/components/reports/reports-catalog-view"
import { ReportsOperationsView } from "@/components/reports/reports-operations-view"
import { ReportsOverviewView } from "@/components/reports/reports-overview-view"
import { buildReportActiveFilters } from "@/lib/report-active-filters"
import { buildReportCatalog, countFilteredReports } from "@/lib/report-catalog"
import { readLastReportExports } from "@/lib/report-export-log"
import { buildAuditFindingWhere } from "@/lib/audit-finding-filters"
import { buildReportHref, buildReportQueryString, parseReportView, type ReportView } from "@/lib/report-view"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { cn } from "@/lib/utils"
import { getReportsOperationsData, parseOperationsParams, type ReportsOperationsDb } from "@/lib/reports-operations-data"
import {
  getReportsOverviewData,
  parseReportBreakdownDimension,
  parseReportBreakdownQuery,
  parseReportPhoneGroup,
  type ReportsOverviewDb,
} from "@/lib/reports-overview-data"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams & { view?: string | string[]; breakdown?: string | string[]; bq?: string | string[]; group?: string | string[]; issue?: string | string[]; qpage?: string | string[]; others?: string | string[] }>
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
  const tCommon = await getTranslations("common")
  const canReportExport = hasPermission(user, "report", "export")
  const canAssetExport = hasPermission(user, "asset", "view")
  const canMaintenanceExport = hasPermission(user, "maintenance", "export")
  const canAuditExport = hasPermission(user, "audit", "export")
  const canDisposalExport = hasPermission(user, "disposal", "export")
  const canRoleExport = hasPermission(user, "role", "export")
  const canAssetEdit = hasPermission(user, "asset", "edit")
  const activeView = parseReportView(rawSearchParams.view)
  const assetSearchParams = { ...rawSearchParams }
  delete assetSearchParams.view
  delete assetSearchParams.breakdown
  delete assetSearchParams.bq
  delete assetSearchParams.group
  delete assetSearchParams.issue
  delete assetSearchParams.qpage
  delete assetSearchParams.others
  // The overview's own params (group 10 spec §4.2, §7): the full list of one dimension, its search and the phone's group.
  const breakdown = parseReportBreakdownDimension(rawSearchParams.breakdown)
  const breakdownQuery = breakdown ? parseReportBreakdownQuery(rawSearchParams.bq) : ""
  const phoneGroup = parseReportPhoneGroup(rawSearchParams.group)
  // The operations queue's own params (group 10 spec §5): the chosen issue, its page and the "other issues" toggle.
  const operationsParams = parseOperationsParams(rawSearchParams)
  const filters = parseAssetListParams(assetSearchParams)
  const baseAssetWhere = buildAssetWhere(filters, await getAssetWhereOptions(filters))
  const assetWhere = await applyAssetCrossScopeFilter(baseAssetWhere, filters.crossScope)
  const exportQuery = buildAssetQueryString(filters, { page: 1, pageSize: 100 })
  // The report's filters as a register query: the overview's row links add their group to it.
  const registerBaseQuery = new URLSearchParams(buildAssetQueryString(filters, { page: 1 }))
  registerBaseQuery.delete("page")
  registerBaseQuery.delete("pageSize")
  // Kept in the tab, chip and filter-form links only while on the overview (plan task 2).
  const overviewViewParams: Array<[string, string]> = activeView === "overview"
    ? [
        ...(breakdown ? [["breakdown", breakdown] as [string, string]] : []),
        ...(breakdownQuery ? [["bq", breakdownQuery] as [string, string]] : []),
        ...(phoneGroup !== "status" ? [["group", phoneGroup] as [string, string]] : []),
      ]
    : []
  const overviewViewQuery = overviewViewParams.length > 0 ? new URLSearchParams(overviewViewParams).toString() : ""
  // The operations tab's links (cells, toggle, paging) keep the report's filters; its chips keep the chosen issue.
  const operationsBaseQuery = new URLSearchParams(buildReportQueryString("operations", filters))
  operationsBaseQuery.delete("page")
  operationsBaseQuery.delete("pageSize")
  const operationsViewQuery = activeView === "operations"
    ? new URLSearchParams([
        ...(operationsParams.issue !== "all" ? [["issue", operationsParams.issue]] : []),
        ...(operationsParams.others ? [["others", "1"]] : []),
      ]).toString()
    : ""
  // Operations and the catalog show the chips line instead of the filter bar (spec §3, boards RP-Ops and RP-Library); the
  // overview and accounting keep it.
  const showsFilterBar = activeView !== "operations" && activeView !== "catalog"
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
  const dataQualityFilterLabels: Record<string, string> = {
    responsibility: t("missingCustodian"),
    serial: t("missingSerial"),
    photo: t("missingPhoto"),
    department: t("department"),
    purchase: tAsset("dataQualityPurchase"),
    warranty: t("warrantyExpiring"),
    licenseExpiry: tAsset("dataQualityLicenseExpiry"),
    returnDue: tAsset("dataQualityReturnDue"),
    noHandover: tAsset("dataQualityNoHandover"),
  } satisfies Record<AssetDataQualityFilter, string>
  const crossScopeFilterLabels: Record<string, string> = {
    all: t("crossScopeAll"),
    custodian_company: t("crossScopeCustodianCompany"),
    custodian_branch: t("crossScopeCustodianBranch"),
    location_branch: t("crossScopeLocationBranch"),
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
      dataQuality: dataQualityFilterLabels[filters.dataQuality],
      crossScope: crossScopeFilterLabels[filters.crossScope],
      activity: filters.activity === "idle_180d" ? tAsset("activityIdle180d") : undefined,
    },
  })
    .map((chip) => (overviewViewQuery ? { ...chip, href: `${chip.href}&${overviewViewQuery}` } : chip))
    .map((chip) => (operationsViewQuery ? { ...chip, href: `${chip.href}&${operationsViewQuery}` } : chip))
  const hasActiveFilters = activeFilters.length > 0
  // "ส่งออก {n} รายการ · ตัวกรอง: …" under the header's exports (group 10 spec §3): the chips as text, as the files use them.
  const filterSummary = hasActiveFilters ? activeFilters.map((chip) => chip.label).join(" · ") : t("noFilters")
  const exportCaption = hasActiveFilters
    ? t("exportCaption", { count: totalAssets, filters: filterSummary })
    : t("exportCaptionNoFilters", { count: totalAssets })
  // The register export stops at ASSET_EXPORT_MAX_ROWS (the overview workbook has no cap): above it a line of its own
  // says the register file holds the newest 5,000 of n (group 10 plan 1 final review).
  const registerCapped = assetExportCapped(totalAssets)
  // The header's buttons (spec 2B §4.4.6, K8): the register export (outline) first, the overview export (primary)
  // last. Plain <a href download> links to the export routes, like the report cards' (spec 2D M31): a download, not a
  // page to prefetch. Under them the caption of what they export (group 10 spec §3); on the overview below md the
  // export card takes their place (board RP-Phone).
  const headerActions =
    canAssetExport || canReportExport ? (
      <div data-report-header-exports className={cn("flex min-w-0 flex-col gap-1.5 md:items-end", activeView === "overview" && "max-md:hidden")}>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {canAssetExport ? (
          <a href={"/api/assets/export?" + exportQuery} download className={buttonVariants({ variant: "outline", size: "md" })}>
            <Download aria-hidden="true" />
            {t("exportAssetRegister")}
          </a>
        ) : null}
        {canReportExport ? (
          <a href={"/api/reports/assets-overview/export?" + exportQuery} download className={buttonVariants({ size: "md" })}>
            <Download aria-hidden="true" />
            {t("exportAssetOverview")}
          </a>
        ) : null}
        </div>
        <p data-report-export-caption className="max-w-md text-meta text-muted-foreground md:text-right">{exportCaption}</p>
        {canAssetExport && registerCapped ? (
          <p data-report-export-register-cap className="max-w-md text-meta text-muted-foreground md:text-right">{t("exportRegisterCappedCaption", { count: totalAssets, max: ASSET_EXPORT_MAX_ROWS })}</p>
        ) : null}
      </div>
    ) : undefined

  let viewContent: React.ReactNode
  // The catalog's chips line: "{k} จาก {n} รายงาน" follow the current filters (board RP-Library), set by its loader.
  const catalogScope = { filtered: 0, count: 0 }
  // The operations chips line counts the queue's scope (the filters without dataQuality and activity), set by its
  // loader, and names the filters the queue and idle count leave out when those chips are on (final review).
  const operationsScope = { count: totalAssets, skipsFilters: Boolean(filters.dataQuality || filters.activity) }
  switch (activeView) {
    case "overview": {
      async function loadOverviewView(): Promise<React.ReactNode> {
        const data = await getReportsOverviewData(
          assetWhere,
          {
            locale,
            baseQuery: registerBaseQuery,
            breakdown,
            bq: breakdownQuery,
            phoneGroup,
            labels: {
              unassignedDepartment: t("unassignedDepartment"),
              ownership: (type) => tAsset("ownershipType_" + type),
            },
          },
          prisma as unknown as ReportsOverviewDb,
        )

        return (
          <ReportsOverviewView
            locale={locale}
            hasActiveFilters={hasActiveFilters}
            hasMatchingAssets={totalAssets > 0}
            emptyCopy={{ filtered: t("previewEmpty"), dataset: tAsset("importBatchStatusEmpty") }}
            data={data}
            baseQuery={registerBaseQuery.toString()}
            breakdown={breakdown}
            bq={breakdownQuery}
            phoneGroup={phoneGroup}
            exports={{
              registerHref: canAssetExport ? "/api/assets/export?" + exportQuery : undefined,
              overviewHref: canReportExport ? "/api/reports/assets-overview/export?" + exportQuery : undefined,
              filterSummary,
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
              baht: tCommon("baht"),
            }}
          />
        )
      }

      viewContent = await withPerformanceTiming("reports.accounting-data", loadAccountingView, timingContext)
      break
    }
    case "operations": {
      async function loadOperationsView(): Promise<React.ReactNode> {
        // The register's windows with the notification days: the queue's four cells read the register's own
        // dataQuality wheres (group 10 plan 2 Task 1, spec §5), so each count is the length of its register list.
        const whereOptions = { today: startOfBangkokDay(new Date()), rules: await getWaitingWorkRules() }
        const operationsQualityFilters = parseAssetListParams({ ...filters, dataQuality: "", activity: "", page: 1 })
        const operationsQualityWhere = await applyAssetCrossScopeFilter(buildAssetWhere(operationsQualityFilters), operationsQualityFilters.crossScope)
        const crossScopeFilters = parseAssetListParams({ ...filters, dataQuality: "", statusId: "", page: 1 })
        const [data, scopeCount] = await Promise.all([
          getReportsOperationsData(
            operationsQualityWhere,
            {
              locale,
              ...operationsParams,
              baseQuery: operationsBaseQuery,
              canEdit: canAssetEdit,
              whereOptions,
              topsWhere: assetWhere,
              loadCrossScope: () => buildAssetCrossScopeSummary(buildAssetWhere(crossScopeFilters), 8),
              labels: { unassigned: t("unassigned") },
            },
            prisma as unknown as ReportsOperationsDb,
          ),
          // Without dataQuality and activity the queue's scope is the report's own: no second count.
          operationsScope.skipsFilters ? prisma.asset.count({ where: operationsQualityWhere }) : Promise.resolve(totalAssets),
        ])
        operationsScope.count = scopeCount
        const crossScopeSummary = data.crossScope
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

        return (
          <ReportsOperationsView
            locale={locale}
            filters={operationsQualityFilters}
            hasActiveFilters={hasActiveFilters}
            hasMatchingAssets={totalAssets > 0}
            filteredEmptyCopy={t("previewEmpty")}
            queue={data.queue}
            warrantyDays={data.warrantyDays}
            canAssetExport={canAssetExport}
            canEdit={canAssetEdit}
            crossScope={{
              cards: crossScopeCards,
              rows: crossScopeSummary.rows,
              exportHref: canAssetExport
                ? "/api/assets/export?" + buildAssetQueryString(crossScopeFilters, { crossScope: "all", page: 1 })
                : undefined,
              // The cross-scope counts keep their rule (no dataQuality, no status, spec §5): say so when status is set.
              statusNote: filters.statusId ? t("opsCrossScopeNoStatus") : undefined,
            }}
            insights={{
              custodians: data.tops.custodians,
              locations: data.tops.locations,
              repairs: data.tops.repairs,
              idleAssetsCount: data.idle.count,
            }}
            labels={{
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
              openDataQualityRules: t("openDataQualityRules"),
              dataQualityEmpty: t("dataQualityEmpty"),
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
        // The catalog as data (group 10 spec §6, board RP-Library): every export of today with its route and permission,
        // the live counts its descriptions show and the latest export per report (spec §6.1).
        const crossScopeFilters = parseAssetListParams({ ...filters, crossScope: "all", dataQuality: "", statusId: "", page: 1 })
        const crossScopeQuery = buildAssetQueryString(filters, { crossScope: "all", dataQuality: "", statusId: "", page: 1 })
        const [crossScopeCount, findingsPending, findingsApproved, findingsRejected, lastExports] = await Promise.all([
          applyAssetCrossScopeFilter(buildAssetWhere(crossScopeFilters), crossScopeFilters.crossScope).then((where) => prisma.asset.count({ where })),
          prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "pending" }) }),
          prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "approved" }) }),
          prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "rejected" }) }),
          readLastReportExports(),
        ])
        const reports = buildReportCatalog({
          locale,
          filterQuery: exportQuery,
          crossScopeQuery,
          counts: {
            crossScope: crossScopeCount,
            findingsByStatus: { pending: findingsPending, approved: findingsApproved, rejected: findingsRejected },
          },
        })
        catalogScope.filtered = countFilteredReports(reports)
        catalogScope.count = reports.length

        return (
          <ReportsCatalogView
            locale={locale}
            currentQuery={buildReportQueryString(activeView, filters)}
            hasActiveFilters={hasActiveFilters}
            filterSummary={filterSummary}
            totalAssets={totalAssets}
            emptyCopy={{ filtered: t("previewEmpty"), dataset: t("savedPresetsEmpty") }}
            reports={reports}
            lastExports={lastExports}
            canExport={(permission) => hasPermission(user, permission.module, permission.action)}
            permissions={[
              { key: "report", label: t("exportAssetOverview"), allowed: canReportExport },
              { key: "asset", label: t("exportAssetRegister"), allowed: canAssetExport },
              { key: "maintenance", label: t("exportMaintenance"), allowed: canMaintenanceExport },
              { key: "audit", label: t("exportAuditFindings"), allowed: canAuditExport },
              { key: "disposal", label: t("exportDisposal"), allowed: canDisposalExport },
              { key: "role", label: t("exportRoleAudit"), allowed: canRoleExport },
            ]}
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
    <div className="space-y-6" data-report-page>
      <PageHeader title={t("title")} meta={t("subtitle")} actions={headerActions} />
      <div data-report-tabs>
        <ReportViewTabs
          locale={locale}
          activeView={activeView}
          filters={filters}
          labels={viewLabels}
          navigationLabel={t("viewNavigation")}
          currentViewQuery={overviewViewQuery || undefined}
        />
      </div>
      {showsFilterBar ? (
        <div data-report-filters>
          <ReportFilterPanel
            locale={locale}
            activeView={activeView}
            filters={filters}
            options={filterOptions}
            hasActiveFilters={hasActiveFilters}
            viewParams={overviewViewParams}
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
              hide: t("hideFilters"),
              show: t("showFilters"),
              more: t("moreFilters"),
              moreLine: t("moreFiltersLine", { fields: [t("category"), t("condition"), tAsset("ownershipType")].join(" · ") }),
            }}
          />
        </div>
      ) : null}
      {/* Phones: "ตัวกรอง (n)" opens the phone copy of the filter bar, which starts closed (board RP-Phone). */}
      {showsFilterBar ? (
        <div className="md:hidden">
          <ReportFilterToggle
            id={REPORT_FILTER_TOGGLE_ID}
            targetId={REPORT_FILTER_BAR_PHONE_ID}
            label={hasActiveFilters ? t("filterButton", { count: activeFilters.length }) : t("filterTitle")}
            className="w-full"
          />
        </div>
      ) : null}
      {showsFilterBar && activeFilters.length > 0 ? (
        <div data-report-active-filters>
          <FilterChipList chips={activeFilters} label={t("activeFilters")} removeLabel={t("clearActiveFilter")} />
        </div>
      ) : null}
      {/* Operations and the catalog: the chips line with what the queue (or which report) counts, ล้างตัวกรอง and the way to the filter bar (spec §3, §5). */}
      {!showsFilterBar ? (
        <div data-report-chips-line>
          <ReportChipsLine
            chips={activeFilters}
            scopeLine={
              activeView === "catalog"
                ? t("catalogScopeLine", catalogScope)
                : hasActiveFilters
                  ? [t("opsScopeLine", { count: operationsScope.count }), ...(operationsScope.skipsFilters ? [t("opsScopeLineSkips")] : [])].join(" · ")
                  : t("opsScopeLineNoFilters", { count: totalAssets })
            }
            clearHref={hasActiveFilters ? buildReportHref(locale, activeView, parseAssetListParams({})) : undefined}
            editHref={buildReportHref(locale, "overview", filters)}
            labels={{
              activeFilters: t("activeFilters"),
              clearActiveFilter: t("clearActiveFilter"),
              clear: t("clearFilters"),
              editFilters: t("opsEditFilters"),
            }}
          />
        </div>
      ) : null}
      {/* The overview has its own strip that adds up (group 10 spec §4.1), operations counts in its chips line (board
          RP-Ops) and the catalog counts its reports there (board RP-Library); accounting keeps the two shared numbers. */}
      {activeView === "accounting" ? (
        <div data-report-shared-metrics>
          {/* A total in the 28px metric size needs about 230px: one tile a row below sm. */}
          <StatStrip
            className="max-sm:grid-cols-1"
            items={[
              { key: "totalAssets", label: t("totalAssets"), value: formatCount(totalAssets) },
              { key: "totalValue", label: t("totalValue"), value: formatMoney(totalPurchaseValue), unit: tCommon("baht") },
            ]}
          />
        </div>
      ) : null}
      <div data-report-view-content>{viewContent}</div>
    </div>
  )
}
