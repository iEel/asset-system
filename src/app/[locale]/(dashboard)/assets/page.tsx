import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildAssetOrderBy,
  buildAssetQueryString,
  buildAssetWhere,
  parseAssetListParams,
  type AssetListParams,
} from "@/lib/asset-list-query"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { AssetRegisterTable, type AssetRegisterRow } from "@/components/assets/asset-register-table"
import { AssetRegisterViewMemory } from "@/components/assets/asset-register-view-memory"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
import { applyAssetCrossScopeFilter } from "@/lib/asset-cross-scope"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import { assetOwnershipTypes, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { FilterPanel } from "@/components/ui/filter-panel"
import { ActionButton } from "@/components/ui/action-button"
import { getFieldControlClasses } from "@/lib/design-system"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { withPerformanceTiming } from "@/lib/performance-timing"

type AssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams>
}

type AssetFilterLabels = {
  search: string
  filter: string
  all: string
  company: string
  branch: string
  category: string
  status: string
  condition: string
  brand: string
  model: string
  ownershipType: string
  rowsPerPage: string
  ownershipTypes: Record<string, string>
  quickFilters: string
  quickFiltersHelp: string
  activeDrilldownFilters: string
  clearDrilldownFilter: string
  activeFilters: string
  clearAllFilters: string
  quickFilterAll: string
  dataQualitySerial: string
  dataQualityPhoto: string
  dataQualityPurchase: string
  dataQualityWarranty: string
  dataQualityResponsibility: string
  quickFilterCrossScopeAll: string
  quickFilterCustodianCrossCompany: string
  quickFilterCustodianCrossBranch: string
  quickFilterLocationCrossBranch: string
  quickFilterReady: string
  quickFilterCheckedOut: string
  quickFilterInUse: string
  quickFilterPendingRepair: string
  quickFilterUnderMaintenance: string
  quickFilterGroupDataQuality: string
  quickFilterGroupCrossScope: string
  quickFilterGroupLifecycle: string
  advancedFilters: string
  advancedFiltersHelp: string
  statusHelpTitle: string
  statusHelpDescription: string
  statusHelpReady: string
  statusHelpPendingRepair: string
  statusHelpUnderMaintenance: string
  statusHelpPendingDisposal: string
  statusHelpLostMissing: string
  statusHelpUnderInspection: string
  assetStateFilterGroup: string
  conditionHelpTitle: string
  conditionHelpDescription: string
  conditionHelpGood: string
  conditionHelpDamaged: string
  conditionHelpNeedsReview: string
  conditionHelpMissing: string
}

type AssetModelPhotoPreview = {
  id: string
  referenceId: string
  originalName: string
  fileType: string
}

export default async function AssetsPage({ params, searchParams }: AssetsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const filters = parseAssetListParams(rawSearchParams)
  const registerReturnHref = `/${locale}/assets?${buildAssetQueryString(filters)}`
  const where = await applyAssetCrossScopeFilter(buildAssetWhere(filters), filters.crossScope)
  const [assets, total, companies, branches, categories, statuses, conditions, locations, employees, selectedBrand, selectedModel] = await withPerformanceTiming(
    "assets.initial-data",
    () => Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { code: true, name: true } },
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          status: { select: { name: true, nameTh: true, colorCode: true } },
          condition: { select: { name: true, nameTh: true, colorCode: true } },
          attachments: {
            where: {
              isActive: true,
              module: "asset",
              fileType: { startsWith: "image/" },
            },
            select: { id: true, originalName: true, fileType: true },
            orderBy: { uploadedAt: "desc" },
            take: 1,
          },
          model: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: buildAssetOrderBy(filters),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.asset.count({ where }),
      prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, code: true, nameTh: true },
        orderBy: { code: "asc" },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, companyId: true, company: { select: { code: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.assetCategory.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.assetStatus.findMany({
        where: { isActive: true },
        select: { id: true, name: true, nameTh: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.assetCondition.findMany({
        where: { isActive: true },
        select: { id: true, nameTh: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, code: true, fullNameTh: true },
        orderBy: { code: "asc" },
      }),
      filters.brandId
        ? prisma.assetBrand.findUnique({
            where: { id: filters.brandId },
            select: { name: true },
          })
        : Promise.resolve(null),
      filters.modelId
        ? prisma.assetModel.findUnique({
            where: { id: filters.modelId },
            select: { name: true, brand: { select: { name: true } } },
          })
        : Promise.resolve(null),
    ]),
    {
      route: "/assets",
      locale,
      page: filters.page,
      pageSize: filters.pageSize,
      hasSearch: Boolean(filters.search),
      crossScope: filters.crossScope || "none",
    }
  )
  const modelIds = Array.from(
    new Set(assets.map((asset) => asset.model?.id).filter((modelId): modelId is string => Boolean(modelId)))
  )
  const modelPhotos = await withPerformanceTiming<AssetModelPhotoPreview[]>(
    "assets.model-photos",
    () => modelIds.length
      ? prisma.attachment.findMany({
          where: {
            module: "asset_model",
            referenceId: { in: modelIds },
            isActive: true,
            fileType: { startsWith: "image/" },
          },
          select: { id: true, referenceId: true, originalName: true, fileType: true },
          orderBy: { uploadedAt: "desc" },
        })
      : Promise.resolve<AssetModelPhotoPreview[]>([]),
    { route: "/assets", locale, modelCount: modelIds.length }
  )
  const modelPhotoByModelId = new Map<string, (typeof modelPhotos)[number]>()
  for (const photo of modelPhotos) {
    if (!modelPhotoByModelId.has(photo.referenceId)) {
      modelPhotoByModelId.set(photo.referenceId, photo)
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const fromRow = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1
  const toRow = Math.min(total, filters.page * filters.pageSize)
  const activeDrilldownFilters = [
    filters.brandId
      ? {
          key: "brand",
          label: `${t("brand")}: ${selectedBrand?.name ?? filters.brandId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { brandId: "", page: 1 })}`,
        }
      : null,
    filters.modelId
      ? {
          key: "model",
          label: `${t("model")}: ${selectedModel ? `${selectedModel.brand.name} / ${selectedModel.name}` : filters.modelId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { modelId: "", page: 1 })}`,
        }
      : null,
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item))
  const tableAssets: AssetRegisterRow[] = assets.map((asset) => ({
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber,
    category: `${asset.category.code} - ${asset.category.name}`,
    companyBranch: `${asset.company.code} / ${asset.branch.code}`,
    currentLocation: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
    custodian: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
    ownershipType: {
      value: normalizeAssetOwnershipType(asset.ownershipType),
      label: t(`ownershipType_${normalizeAssetOwnershipType(asset.ownershipType)}`),
    },
    status: { value: asset.status.name, label: asset.status.nameTh },
    condition: { value: asset.condition.name, label: asset.condition.nameTh },
    purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
    photo: asset.model?.id && modelPhotoByModelId.get(asset.model.id)
      ? {
          id: modelPhotoByModelId.get(asset.model.id)!.id,
          alt: modelPhotoByModelId.get(asset.model.id)!.originalName,
          fileType: modelPhotoByModelId.get(asset.model.id)!.fileType,
        }
      : asset.attachments[0]
        ? {
            id: asset.attachments[0].id,
            alt: asset.attachments[0].originalName,
            fileType: asset.attachments[0].fileType,
          }
        : null,
  }))

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/assets/new`}
        createLabel={tCommon("create")}
      />
      <AssetRegisterViewMemory locale={locale} returnHref={registerReturnHref} />

      <AssetFilters
        locale={locale}
        filters={filters}
        companies={companies}
        branches={branches}
        categories={categories}
        statuses={statuses}
        conditions={conditions}
        activeDrilldownFilters={activeDrilldownFilters}
        labels={{
          search: tCommon("search"),
          filter: tCommon("filter"),
          all: tCommon("all"),
          company: t("company"),
          branch: t("branch"),
          category: t("category"),
          brand: t("brand"),
          model: t("model"),
          status: t("status"),
          condition: t("condition"),
          ownershipType: t("ownershipType"),
          rowsPerPage: tCommon("rowsPerPage"),
          ownershipTypes: Object.fromEntries(assetOwnershipTypes.map((type) => [type, t(`ownershipType_${type}`)])) as Record<string, string>,
          quickFilters: t("quickFilters"),
          quickFiltersHelp: t("quickFiltersHelp"),
          activeDrilldownFilters: t("activeDrilldownFilters"),
          clearDrilldownFilter: t("clearDrilldownFilter"),
          activeFilters: t("activeFilters"),
          clearAllFilters: t("clearAllFilters"),
          quickFilterAll: t("quickFilterAll"),
          dataQualitySerial: t("dataQualitySerial"),
          dataQualityPhoto: t("dataQualityPhoto"),
          dataQualityPurchase: t("dataQualityPurchase"),
          dataQualityWarranty: t("dataQualityWarranty"),
          dataQualityResponsibility: t("dataQualityResponsibility"),
          quickFilterCrossScopeAll: t("quickFilterCrossScopeAll"),
          quickFilterCustodianCrossCompany: t("quickFilterCustodianCrossCompany"),
          quickFilterCustodianCrossBranch: t("quickFilterCustodianCrossBranch"),
          quickFilterLocationCrossBranch: t("quickFilterLocationCrossBranch"),
          quickFilterReady: t("quickFilterReady"),
          quickFilterCheckedOut: t("quickFilterCheckedOut"),
          quickFilterInUse: t("quickFilterInUse"),
          quickFilterPendingRepair: t("quickFilterPendingRepair"),
          quickFilterUnderMaintenance: t("quickFilterUnderMaintenance"),
          quickFilterGroupDataQuality: t("quickFilterGroupDataQuality"),
          quickFilterGroupCrossScope: t("quickFilterGroupCrossScope"),
          quickFilterGroupLifecycle: t("quickFilterGroupLifecycle"),
          advancedFilters: t("advancedFilters"),
          advancedFiltersHelp: t("advancedFiltersHelp"),
          statusHelpTitle: t("statusHelpTitle"),
          statusHelpDescription: t("statusHelpDescription"),
          statusHelpReady: t("statusHelpReady"),
          statusHelpPendingRepair: t("statusHelpPendingRepair"),
          statusHelpUnderMaintenance: t("statusHelpUnderMaintenance"),
          statusHelpPendingDisposal: t("statusHelpPendingDisposal"),
          statusHelpLostMissing: t("statusHelpLostMissing"),
          statusHelpUnderInspection: t("statusHelpUnderInspection"),
          assetStateFilterGroup: t("assetStateFilterGroup"),
          conditionHelpTitle: t("conditionHelpTitle"),
          conditionHelpDescription: t("conditionHelpDescription"),
          conditionHelpGood: t("conditionHelpGood"),
          conditionHelpDamaged: t("conditionHelpDamaged"),
          conditionHelpNeedsReview: t("conditionHelpNeedsReview"),
          conditionHelpMissing: t("conditionHelpMissing"),
        }}
      />

      <AssetRegisterTable
        locale={locale}
        assets={tableAssets}
        filters={filters}
        total={total}
        totalPages={totalPages}
        fromRow={fromRow}
        toRow={toRow}
        bulkOptions={{
          locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}` })),
          employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
        }}
        labels={{
          actions: tCommon("actions"),
          all: tCommon("all"),
          assetName: t("assetName"),
          assetTag: t("assetTag"),
          columnPresets: t("columnPresets"),
          columnPresetAll: t("columnPresetAll"),
          columnPresetOperations: t("columnPresetOperations"),
          columnPresetAccounting: t("columnPresetAccounting"),
          columnPresetAudit: t("columnPresetAudit"),
          tableScrollHint: t("tableScrollHint"),
          category: t("category"),
          columns: t("columns"),
          company: t("company"),
          condition: t("condition"),
          currentLocation: t("currentLocation"),
          custodian: t("custodian"),
          ownershipType: t("ownershipType"),
          detail: t("detailTitle"),
          downloadTemplate: t("downloadTemplate"),
          edit: tCommon("edit"),
          cloneAsset: t("cloneAsset"),
          exportFiltered: t("exportFiltered"),
          exportSelected: t("exportSelected"),
          bulkActions: t("bulkActions"),
          bulkUpdate: t("bulkUpdate"),
          bulkUpdateTitle: t("bulkUpdateTitle"),
          bulkUpdateDescription: t("bulkUpdateDescription"),
          clearSelection: t("clearSelection"),
          selectLocation: t("selectLocation"),
          selectCustodian: t("selectCustodian"),
          noChange: t("noChange"),
          reason: t("reason"),
          remark: t("remark"),
          applyBulkUpdate: t("applyBulkUpdate"),
          bulkUpdateSuccess: t("bulkUpdateSuccess"),
          bulkUpdateFailed: t("bulkUpdateFailed"),
          cancel: tCommon("cancel"),
          close: tCommon("close"),
          printSelectedLabels: t("printSelectedLabels"),
          next: tCommon("next"),
          noData: tCommon("noData"),
          noResultsTitle: t("noResultsTitle"),
          noResultsDescription: t("noResultsDescription"),
          noAssetsTitle: t("noAssetsTitle"),
          noAssetsDescription: t("noAssetsDescription"),
          clearAllFilters: t("clearAllFilters"),
          of: tCommon("of"),
          page: tCommon("page"),
          previous: tCommon("previous"),
          purchasePrice: t("purchasePrice"),
          selectedCount: t("selectedCount"),
          status: t("status"),
          statusHelpTitle: t("statusHelpTitle"),
          statusHelpDescription: t("statusHelpDescription"),
          statusHelpReady: t("statusHelpReady"),
          statusHelpPendingRepair: t("statusHelpPendingRepair"),
          statusHelpUnderMaintenance: t("statusHelpUnderMaintenance"),
          statusHelpPendingDisposal: t("statusHelpPendingDisposal"),
          statusHelpLostMissing: t("statusHelpLostMissing"),
          statusHelpUnderInspection: t("statusHelpUnderInspection"),
          conditionHelpTitle: t("conditionHelpTitle"),
          conditionHelpDescription: t("conditionHelpDescription"),
          conditionHelpGood: t("conditionHelpGood"),
          conditionHelpDamaged: t("conditionHelpDamaged"),
          conditionHelpNeedsReview: t("conditionHelpNeedsReview"),
          conditionHelpMissing: t("conditionHelpMissing"),
        }}
      />

      <AssetImportPreviewPanel
        labels={{
          importPreview: t("importPreview"),
          chooseFile: t("chooseImportFile"),
          previewReady: t("previewReady"),
          previewErrors: t("previewErrors"),
          previewRows: t("previewRows"),
          row: t("row"),
          status: t("status"),
          errors: t("errors"),
          assetName: t("assetName"),
          assetTag: t("assetTag"),
          confirmImport: t("confirmImport"),
          fileRequired: t("fileRequired"),
          importSuccess: t("importSuccess"),
          importing: t("importing"),
          wizardTitle: t("importWizardTitle"),
          wizardHelp: t("importWizardHelp"),
          wizardStepTemplate: t("importWizardStepTemplate"),
          wizardStepUpload: t("importWizardStepUpload"),
          wizardStepReview: t("importWizardStepReview"),
          wizardStepImport: t("importWizardStepImport"),
          wizardStepComplete: t("importWizardStepComplete"),
          currentStep: t("importWizardCurrentStep"),
          selectedFile: t("selectedImportFile"),
          issueSummaryTitle: t("importIssueSummaryTitle"),
          issueSummaryHelp: t("importIssueSummaryHelp"),
          affectedRows: t("affectedRows"),
          mappingTitle: t("importMappingTitle"),
          mappingHelp: t("importMappingHelp"),
          mappingMatched: t("importMappingMatched"),
          mappingMissing: t("importMappingMissing"),
          sourceColumn: t("importSourceColumn"),
          importBatchTitle: t("importBatchTitle"),
          importBatchHelp: t("importBatchHelp"),
          importBatchId: t("importBatchId"),
          importBatchStatusReady: t("importBatchStatusReady"),
          importBatchStatusPartial: t("importBatchStatusPartial"),
          importBatchStatusBlocked: t("importBatchStatusBlocked"),
          importBatchStatusEmpty: t("importBatchStatusEmpty"),
          openImportWizard: t("openImportWizard"),
          collapseImportWizard: t("collapseImportWizard"),
        }}
      />
    </div>
  )
}

function AssetFilters({
  locale,
  filters,
  companies,
  branches,
  categories,
  statuses,
  conditions,
  activeDrilldownFilters,
  labels,
}: {
  locale: string
  filters: ReturnType<typeof parseAssetListParams>
  companies: { id: string; code: string; nameTh: string }[]
  branches: { id: string; code: string; name: string; companyId: string; company: { code: string } }[]
  categories: { id: string; code: string; name: string }[]
  statuses: { id: string; name: string; nameTh: string }[]
  conditions: { id: string; nameTh: string }[]
  activeDrilldownFilters: Array<{ key: string; label: string; href: string }>
  labels: AssetFilterLabels
}) {
  const filteredBranches = filters.companyId
    ? branches.filter((branch) => branch.companyId === filters.companyId)
    : branches
  const readyStatus = statuses.find((status) => status.name === "Ready")
  const inUseStatus = statuses.find((status) => status.name === "In Use")
  const checkedOutStatus = statuses.find((status) => status.name === "Checked Out")
  const pendingRepairStatus = statuses.find((status) => status.name === "Pending Repair")
  const underMaintenanceStatus = statuses.find((status) => status.name === "Under Maintenance")
  const assetStatusHelp = {
    title: labels.statusHelpTitle,
    description: labels.statusHelpDescription,
    items: [
      labels.statusHelpReady,
      labels.statusHelpPendingRepair,
      labels.statusHelpUnderMaintenance,
      labels.statusHelpPendingDisposal,
      labels.statusHelpLostMissing,
      labels.statusHelpUnderInspection,
    ],
  }
  const assetConditionHelp = {
    title: labels.conditionHelpTitle,
    description: labels.conditionHelpDescription,
    items: [
      labels.conditionHelpGood,
      labels.conditionHelpDamaged,
      labels.conditionHelpNeedsReview,
      labels.conditionHelpMissing,
    ],
  }
  const allQuickFilter = {
    key: "all",
    label: labels.quickFilterAll,
    href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "", statusId: "", crossScope: "", page: 1 })}`,
    active: !filters.dataQuality && !filters.statusId && !filters.crossScope,
  }
  const dataQualityQuickFilters = [
    {
      key: "data-quality-serial",
      label: labels.dataQualitySerial,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "serial", statusId: "", crossScope: "", page: 1 })}`,
      active: filters.dataQuality === "serial",
    },
    {
      key: "data-quality-photo",
      label: labels.dataQualityPhoto,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "photo", statusId: "", crossScope: "", page: 1 })}`,
      active: filters.dataQuality === "photo",
    },
    {
      key: "data-quality-purchase",
      label: labels.dataQualityPurchase,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "purchase", statusId: "", crossScope: "", page: 1 })}`,
      active: filters.dataQuality === "purchase",
    },
    {
      key: "data-quality-warranty",
      label: labels.dataQualityWarranty,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "warranty", statusId: "", crossScope: "", page: 1 })}`,
      active: filters.dataQuality === "warranty",
    },
    {
      key: "data-quality-responsibility",
      label: labels.dataQualityResponsibility,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "responsibility", statusId: "", crossScope: "", page: 1 })}`,
      active: filters.dataQuality === "responsibility",
    },
  ]
  const crossScopeQuickFilters = [
    buildCrossScopeQuickFilter("cross-scope-all", labels.quickFilterCrossScopeAll, "all"),
    buildCrossScopeQuickFilter("cross-scope-custodian-company", labels.quickFilterCustodianCrossCompany, "custodian_company"),
    buildCrossScopeQuickFilter("cross-scope-custodian-branch", labels.quickFilterCustodianCrossBranch, "custodian_branch"),
    buildCrossScopeQuickFilter("cross-scope-location-branch", labels.quickFilterLocationCrossBranch, "location_branch"),
  ].filter((quickFilter): quickFilter is { key: string; label: string; href: string; active: boolean } => Boolean(quickFilter))
  const lifecycleQuickFilters = [
    buildStatusQuickFilter("ready", labels.quickFilterReady, readyStatus),
    buildStatusQuickFilter("in-use", labels.quickFilterInUse, inUseStatus),
    buildStatusQuickFilter("checked-out", labels.quickFilterCheckedOut, checkedOutStatus),
    buildStatusQuickFilter("pending-repair", labels.quickFilterPendingRepair, pendingRepairStatus),
    buildStatusQuickFilter("under-maintenance", labels.quickFilterUnderMaintenance, underMaintenanceStatus),
  ].filter((quickFilter): quickFilter is { key: string; label: string; href: string; active: boolean } => Boolean(quickFilter))
  const quickFilters = [allQuickFilter, ...dataQualityQuickFilters, ...crossScopeQuickFilters, ...lifecycleQuickFilters]
  const quickFilterGroups = [
    { key: "data-quality", label: labels.quickFilterGroupDataQuality, filters: dataQualityQuickFilters },
    { key: "cross-scope", label: labels.quickFilterGroupCrossScope, filters: crossScopeQuickFilters },
    { key: "lifecycle", label: labels.quickFilterGroupLifecycle, filters: lifecycleQuickFilters },
  ].filter((group) => group.filters.length > 0)
  const hasAdvancedFilters = Boolean(filters.statusId || filters.conditionId || filters.ownershipType || filters.pageSize !== 25)
  const selectedCompany = companies.find((company) => company.id === filters.companyId)
  const selectedBranch = branches.find((branch) => branch.id === filters.branchId)
  const selectedCategory = categories.find((category) => category.id === filters.categoryId)
  const selectedStatus = statuses.find((status) => status.id === filters.statusId)
  const selectedCondition = conditions.find((condition) => condition.id === filters.conditionId)
  const selectedDataQualityFilter = dataQualityQuickFilters.find((quickFilter) => quickFilter.active)
  const selectedCrossScopeFilter = crossScopeQuickFilters.find((quickFilter) => quickFilter.active)
  const clearAllFiltersHref = `/${locale}/assets?${buildAssetQueryString(filters, {
    search: "",
    companyId: "",
    branchId: "",
    categoryId: "",
    brandId: "",
    modelId: "",
    statusId: "",
    conditionId: "",
    ownershipType: "",
    custodianId: "",
    supplierId: "",
    dataQuality: "",
    crossScope: "",
    page: 1,
    pageSize: 25,
  })}`
  const activeFilterChips = [
    filters.search
      ? {
          key: "search",
          label: `${labels.search}: ${filters.search}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { search: "", page: 1 })}`,
        }
      : null,
    filters.companyId
      ? {
          key: "company",
          label: `${labels.company}: ${selectedCompany ? `${selectedCompany.code} - ${selectedCompany.nameTh}` : filters.companyId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { companyId: "", branchId: "", page: 1 })}`,
        }
      : null,
    filters.branchId
      ? {
          key: "branch",
          label: `${labels.branch}: ${selectedBranch ? `${selectedBranch.company.code} / ${selectedBranch.code} - ${selectedBranch.name}` : filters.branchId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { branchId: "", page: 1 })}`,
        }
      : null,
    filters.categoryId
      ? {
          key: "category",
          label: `${labels.category}: ${selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : filters.categoryId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { categoryId: "", page: 1 })}`,
        }
      : null,
    filters.statusId
      ? {
          key: "status",
          label: `${labels.status}: ${selectedStatus?.nameTh ?? filters.statusId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { statusId: "", page: 1 })}`,
        }
      : null,
    filters.conditionId
      ? {
          key: "condition",
          label: `${labels.condition}: ${selectedCondition?.nameTh ?? filters.conditionId}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { conditionId: "", page: 1 })}`,
        }
      : null,
    filters.ownershipType
      ? {
          key: "ownershipType",
          label: `${labels.ownershipType}: ${labels.ownershipTypes[filters.ownershipType] ?? filters.ownershipType}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { ownershipType: "", page: 1 })}`,
        }
      : null,
    filters.dataQuality
      ? {
          key: "dataQuality",
          label: selectedDataQualityFilter?.label ?? filters.dataQuality,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: "", page: 1 })}`,
        }
      : null,
    filters.crossScope
      ? {
          key: "crossScope",
          label: selectedCrossScopeFilter?.label ?? filters.crossScope,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope: "", page: 1 })}`,
        }
      : null,
    filters.pageSize !== 25
      ? {
          key: "pageSize",
          label: `${labels.rowsPerPage}: ${filters.pageSize}`,
          href: `/${locale}/assets?${buildAssetQueryString(filters, { pageSize: 25, page: 1 })}`,
        }
      : null,
    ...activeDrilldownFilters,
  ].filter((chip): chip is { key: string; label: string; href: string } => Boolean(chip))

  function buildStatusQuickFilter(key: string, label: string, status?: { id: string; name: string; nameTh: string }) {
    if (!status) return null

    return {
      key,
      label,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { statusId: status.id, dataQuality: "", crossScope: "", page: 1 })}`,
      active: filters.statusId === status.id,
    }
  }

  function buildCrossScopeQuickFilter(key: string, label: string, crossScope: AssetCrossScopeFilter) {
    return {
      key,
      label,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { crossScope, dataQuality: "", statusId: "", page: 1 })}`,
      active: filters.crossScope === crossScope,
    }
  }

  return (
    <FilterPanel className="mb-4">
      <div data-asset-filter-layout className="flex min-w-0 max-w-full flex-col">
      <div data-asset-quick-filters className="order-2 mt-4 mb-4 border-b border-border pb-4 md:order-1 md:mt-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{labels.quickFilters}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.quickFiltersHelp}</p>
          </div>
          <QuickFilterLink quickFilter={quickFilters[0]} />
        </div>
        <div className="mt-3 grid auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 xl:grid-flow-row xl:grid-cols-3 xl:overflow-visible xl:pb-0">
          {quickFilterGroups.map((group) => (
            <div key={group.key} className="rounded-md border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">{group.label}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.filters.map((quickFilter) => (
                  <QuickFilterLink key={quickFilter.key} quickFilter={quickFilter} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {activeFilterChips.length > 0 ? (
        <div data-asset-active-filters className="order-3 mb-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 md:order-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-normal text-primary">{labels.activeFilters}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeFilterChips.map((filter) => (
                  <Link
                    key={filter.key}
                    href={filter.href}
                    aria-label={`${labels.clearDrilldownFilter}: ${filter.label}`}
                    className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <span className="truncate">{filter.label}</span>
                    <span aria-hidden="true" className="text-xs text-primary/70">x</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href={clearAllFiltersHref}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {labels.clearAllFilters}
            </Link>
          </div>
        </div>
      ) : null}
      <form data-asset-search-form className="order-1 space-y-3 md:order-3" action={`/${locale}/assets`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
          <label className="col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{labels.search}</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search}
              className={getFieldControlClasses()}
            />
          </label>
          <FilterSelect name="companyId" label={labels.company} defaultValue={filters.companyId}>
            <option value="">{labels.all}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.code} - {company.nameTh}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect name="branchId" label={labels.branch} defaultValue={filters.branchId}>
            <option value="">{labels.all}</option>
            {filteredBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.company.code} / {branch.code} - {branch.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect name="categoryId" label={labels.category} defaultValue={filters.categoryId}>
            <option value="">{labels.all}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.code} - {category.name}
              </option>
            ))}
          </FilterSelect>
          <ActionButton type="submit" variant="primary" className="self-end">
            {labels.filter}
          </ActionButton>
        </div>
        <details
          data-asset-advanced-filters
          className="group rounded-md border border-border bg-background/60 px-3 py-2"
          open={hasAdvancedFilters}
        >
          <summary className="flex cursor-pointer list-none flex-col gap-1 text-sm font-medium text-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{labels.advancedFilters}</span>
            <span className="text-xs font-normal text-muted-foreground">{labels.advancedFiltersHelp}</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2" aria-label={labels.assetStateFilterGroup}>
                <FilterSelect name="statusId" label={labels.status} defaultValue={filters.statusId} help={assetStatusHelp}>
                  <option value="">{labels.all}</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.nameTh}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect name="conditionId" label={labels.condition} defaultValue={filters.conditionId} help={assetConditionHelp}>
                  <option value="">{labels.all}</option>
                  {conditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.nameTh}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>
            <FilterSelect name="ownershipType" label={labels.ownershipType} defaultValue={filters.ownershipType}>
              <option value="">{labels.all}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>
                  {labels.ownershipTypes[type] ?? type}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="pageSize" label={labels.rowsPerPage} defaultValue={String(filters.pageSize)}>
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </FilterSelect>
          </div>
        </details>
        {filters.custodianId ? <input type="hidden" name="custodianId" value={filters.custodianId} /> : null}
        {filters.supplierId ? <input type="hidden" name="supplierId" value={filters.supplierId} /> : null}
        {filters.brandId ? <input type="hidden" name="brandId" value={filters.brandId} /> : null}
        {filters.modelId ? <input type="hidden" name="modelId" value={filters.modelId} /> : null}
        {filters.dataQuality ? <input type="hidden" name="dataQuality" value={filters.dataQuality} /> : null}
        {filters.crossScope ? <input type="hidden" name="crossScope" value={filters.crossScope} /> : null}
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="direction" value={filters.direction} />
      </form>
      </div>
    </FilterPanel>
  )
}

function QuickFilterLink({
  quickFilter,
}: {
  quickFilter: { key: string; label: string; href: string; active: boolean }
}) {
  return (
    <Link
      href={quickFilter.href}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
        quickFilter.active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {quickFilter.label}
    </Link>
  )
}

function FilterSelect({
  name,
  label,
  defaultValue,
  help,
  children,
}: {
  name: string
  label: string
  defaultValue: string
  help?: { title: string; description: string; items: string[] }
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {help ? <AssetStateHelpPopover {...help} size="compact" /> : null}
      </div>
      <select
        name={name}
        defaultValue={defaultValue}
        className={getFieldControlClasses()}
      >
        {children}
      </select>
    </div>
  )
}
