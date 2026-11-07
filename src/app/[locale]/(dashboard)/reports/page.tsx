import type React from "react"
import { ClipboardCheck, DatabaseZap, Download, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buildAssetQueryString, buildAssetWhere, parseAssetListParams, type AssetListParams } from "@/lib/asset-list-query"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { getAssetActivityWhere } from "@/lib/asset-activity-filter"
import { getAssetWhereOptions } from "@/lib/asset-list-where-options"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { startOfBangkokDay, warrantyExpiringSoonWhere } from "@/lib/waiting-work-rules"
import { applyAssetCrossScopeFilter, buildAssetCrossScopeSummary } from "@/lib/asset-cross-scope"
import { assetMissingResponsibilityWhere, assetOwnershipTypes, hasAssetResponsibility } from "@/lib/asset-ownership"
import { buildAssetDetailSectionHref } from "@/lib/asset-detail-view"
import { buildCostInsights } from "@/lib/cost-insights"
import { buildDepreciationSummary, depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { buttonVariants } from "@/components/ui/button-variants"
import { FilterChipList } from "@/components/ui/filter-chips"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { REPORT_FILTER_BAR_PHONE_ID, ReportFilterPanel, type ReportFilterOptions as ReportFilterPanelOptions } from "@/components/reports/report-filter-panel"
import { ReportFilterToggle } from "@/components/reports/report-filter-toggle"
import { ReportViewTabs } from "@/components/reports/report-view-tabs"
import { ReportsAccountingView } from "@/components/reports/reports-accounting-view"
import { ReportsCatalogView, type ReportCatalogCategory } from "@/components/reports/reports-catalog-view"
import { ReportsOperationsView, type ReportDataQualityRow } from "@/components/reports/reports-operations-view"
import { ReportsOverviewView } from "@/components/reports/reports-overview-view"
import { buildReportActiveFilters } from "@/lib/report-active-filters"
import { buildReportQueryString, parseReportView, type ReportView } from "@/lib/report-view"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { cn } from "@/lib/utils"
import { installedOrOutstandingLinkWhere } from "@/lib/asset-component-outstanding"
import {
  getReportsOverviewData,
  parseReportBreakdownDimension,
  parseReportBreakdownQuery,
  parseReportPhoneGroup,
  type ReportsOverviewDb,
} from "@/lib/reports-overview-data"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams & { view?: string | string[]; breakdown?: string | string[]; bq?: string | string[]; group?: string | string[] }>
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
  const activeView = parseReportView(rawSearchParams.view)
  const assetSearchParams = { ...rawSearchParams }
  delete assetSearchParams.view
  delete assetSearchParams.breakdown
  delete assetSearchParams.bq
  delete assetSearchParams.group
  // The overview's own params (group 10 spec §4.2, §7): the full list of one dimension, its search and the phone's group.
  const breakdown = parseReportBreakdownDimension(rawSearchParams.breakdown)
  const breakdownQuery = breakdown ? parseReportBreakdownQuery(rawSearchParams.bq) : ""
  const phoneGroup = parseReportPhoneGroup(rawSearchParams.group)
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
  }).map((chip) => (overviewViewQuery ? { ...chip, href: `${chip.href}&${overviewViewQuery}` } : chip))
  const hasActiveFilters = activeFilters.length > 0
  // "ส่งออก {n} รายการ · ตัวกรอง: …" under the header's exports (group 10 spec §3): the chips as text, as the files use them.
  const filterSummary = hasActiveFilters ? activeFilters.map((chip) => chip.label).join(" · ") : t("noFilters")
  const exportCaption = hasActiveFilters
    ? t("exportCaption", { count: totalAssets, filters: filterSummary })
    : t("exportCaptionNoFilters", { count: totalAssets })
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
      </div>
    ) : undefined

  let viewContent: React.ReactNode
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
        const warrantyWhere = warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), await getWaitingWorkRules())
        const warrantyWindow = warrantyWhere.warrantyEndDate as { gte: Date; lte: Date }
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
          prisma.asset.count({ where: { AND: [operationsQualityWhere, warrantyWhere] } }),
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
                    warrantyWhere,
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
              installedInLinks: { where: installedOrOutstandingLinkWhere, select: { id: true }, take: 1 },
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
          const issues = getDataQualityIssues(asset, warrantyWindow, t, locale)
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
          { key: "audit-findings", name: t("weeklyAuditFindings"), cadence: t("weekly"), href: `/api/audit-findings/export?status=pending&locale=${locale}`, owner: t("ownerAudit"), allowed: canAuditExport },
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
              { key: "audit-findings", label: t("auditFindingsReport"), viewHref: `/${locale}/audit/findings`, exportHref: `/api/audit-findings/export?status=all&locale=${locale}`, exportLabel: t("exportAuditFindings"), exportAllowed: canAuditExport },
              { key: "audit-findings-pdf", label: t("auditFindingsPdf"), viewHref: `/${locale}/audit/findings`, exportHref: `/api/audit-findings/export-pdf?status=all&locale=${locale}`, exportLabel: t("exportPdf"), exportAllowed: canAuditExport },
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
            currentQuery={buildReportQueryString(activeView, filters)}
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
              assetPresetScopeTitle: t("assetPresetScopeTitle"),
              assetPresetScopeHelp: t("assetPresetScopeHelp"),
              moduleExportScopeTitle: t("moduleExportScopeTitle"),
              moduleExportScopeHelp: t("moduleExportScopeHelp"),
              presetName: t("presetName"),
              saveCurrentPreset: t("saveCurrentPreset"),
              savedPresetsEmpty: t("savedPresetsEmpty"),
              savedPresetsDeviceOnly: t("savedPresetsDeviceOnly"),
              deletePreset: t("deletePreset"),
              presetNameRequired: t("presetNameRequired"),
              presetStorageFailed: t("presetStorageFailed"),
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
      {/* Phones: "ตัวกรอง (n)" opens the phone copy of the filter bar, which starts closed (board RP-Phone). */}
      <div className="md:hidden">
        <ReportFilterToggle
          targetId={REPORT_FILTER_BAR_PHONE_ID}
          label={hasActiveFilters ? t("filterButton", { count: activeFilters.length }) : t("filterTitle")}
          className="w-full"
        />
      </div>
      {activeFilters.length > 0 ? (
        <div data-report-active-filters>
          <FilterChipList chips={activeFilters} label={t("activeFilters")} removeLabel={t("clearActiveFilter")} />
        </div>
      ) : null}
      {/* The overview has its own strip that adds up (group 10 spec §4.1); the other views keep the two shared numbers. */}
      {activeView !== "overview" ? (
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
  warrantyWindow: { gte: Date; lte: Date },
  t: (key: string) => string,
  locale: string
) {
  const editHref = "/" + locale + "/assets/" + asset.id + "/edit"
  const issues: Array<{ label: string; href: string }> = []
  if (!hasAssetResponsibility(asset)) issues.push({ label: t("missingCustodian"), href: editHref })
  if (!asset.serialNumber) issues.push({ label: t("missingSerial"), href: editHref })
  if (asset.ownershipType !== "software_license" && asset.attachments.length === 0) {
    issues.push({ label: t("missingPhoto"), href: buildAssetDetailSectionHref(locale, asset.id, null, "photos") })
  }
  if (asset.ownershipType !== "software_license" && asset.warrantyEndDate && asset.warrantyEndDate >= warrantyWindow.gte && asset.warrantyEndDate <= warrantyWindow.lte) {
    issues.push({ label: t("warrantyExpiring"), href: buildAssetDetailSectionHref(locale, asset.id, null, "purchase") })
  }
  return issues
}
