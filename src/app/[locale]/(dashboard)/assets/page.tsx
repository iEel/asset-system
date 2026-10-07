import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildAssetOrderBy,
  buildAssetQueryString,
  buildAssetStatusCountWhere,
  parseAssetListParams,
  type AssetListParams,
} from "@/lib/asset-list-query"
import { buildStatusTabs } from "@/lib/asset-register-status-tabs"
import { buildAssetRegisterChips, buildAssetRegisterClearAllHref } from "@/lib/asset-register-chips"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { AssetRegisterNavigationProvider } from "@/components/assets/asset-register-navigation"
import { AssetRegisterToolbar } from "@/components/assets/asset-register-toolbar"
import { AssetRegisterStatusTabs } from "@/components/assets/asset-register-status-tabs"
import { AssetRegisterFilterChips } from "@/components/assets/asset-register-filter-chips"
import { AssetRegisterTable, type AssetRegisterRow } from "@/components/assets/asset-register-table"
import { AssetRegisterViewMemory } from "@/components/assets/asset-register-view-memory"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
import { applyAssetCrossScopeFilter } from "@/lib/asset-cross-scope"
import { assetOwnershipTypes, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { hasPermission } from "@/lib/auth-utils"
import {
  buildAssetRegisterTransactionHref,
  getAssetRegisterTransactionActions,
} from "@/lib/asset-operation-policy"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"

type AssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams>
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
  const user = await requirePagePermission(locale, "asset", "view")
  const canEditAssets = hasPermission(user, "asset", "edit")
  const canCreateAssets = hasPermission(user, "asset", "create")
  const canDeleteAssets = hasPermission(user, "asset", "delete")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const filters = parseAssetListParams(rawSearchParams)
  const registerReturnHref = `/${locale}/assets?${buildAssetQueryString(filters)}`
  const statusCountWhere = await applyAssetCrossScopeFilter(buildAssetStatusCountWhere(filters), filters.crossScope)
  const where: Prisma.AssetWhereInput = filters.statusId ? { AND: [statusCountWhere, { statusId: filters.statusId }] } : statusCountWhere
  const [assets, total, companies, branches, categories, statuses, conditions, locations, employees, selectedBrand, selectedModel, statusCounts, selectedSupplier] = await withPerformanceTiming(
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
      prisma.asset.groupBy({
        by: ["statusId"],
        where: statusCountWhere,
        _count: { _all: true },
      }),
      filters.supplierId
        ? prisma.supplier.findUnique({
            where: { id: filters.supplierId },
            select: { code: true, name: true },
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
  const assetIds = assets.map((asset) => asset.id)
  const [modelPhotos, openCheckouts, activeMaintenanceTickets] = await Promise.all([
    withPerformanceTiming<AssetModelPhotoPreview[]>(
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
    ),
    assetIds.length
      ? prisma.assetCheckout.findMany({
          where: { assetId: { in: assetIds }, isReturned: false, transactionStatus: "active" },
          select: { id: true, assetId: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    assetIds.length
      ? prisma.maintenanceTicket.findMany({
          where: { ...openRepairRecordWhere, assetId: { in: assetIds } },
          select: { assetId: true },
        })
      : Promise.resolve([]),
  ])
  const modelPhotoByModelId = new Map<string, (typeof modelPhotos)[number]>()
  for (const photo of modelPhotos) {
    if (!modelPhotoByModelId.has(photo.referenceId)) {
      modelPhotoByModelId.set(photo.referenceId, photo)
    }
  }
  const openCheckoutByAssetId = new Map<string, string>()
  for (const checkout of openCheckouts) {
    if (!openCheckoutByAssetId.has(checkout.assetId)) openCheckoutByAssetId.set(checkout.assetId, checkout.id)
  }
  const activeMaintenanceAssetIds = new Set(activeMaintenanceTickets.map((ticket) => ticket.assetId))
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const fromRow = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1
  const toRow = Math.min(total, filters.page * filters.pageSize)
  const numberLocale = locale === "th" ? "th-TH" : "en-US"
  const basePath = `/${locale}/assets`
  const statusTabs = buildStatusTabs({
    statuses,
    counts: statusCounts.map((row) => ({ statusId: row.statusId, count: row._count._all })),
    statusId: filters.statusId,
  })
  const statusTabLabelKeys = {
    all: "quickFilterAll",
    ready: "quickFilterReady",
    inUse: "quickFilterInUse",
    checkedOut: "quickFilterCheckedOut",
    pendingRepair: "quickFilterPendingRepair",
    underMaintenance: "quickFilterUnderMaintenance",
  } as const
  const selectedCompany = companies.find((company) => company.id === filters.companyId)
  const selectedBranch = branches.find((branch) => branch.id === filters.branchId)
  const selectedCategory = categories.find((category) => category.id === filters.categoryId)
  const selectedCustodian = employees.find((employee) => employee.id === filters.custodianId)
  const filterChips = buildAssetRegisterChips({
    basePath,
    filters,
    tabStatusIds: statusTabs.tabStatusIds,
    names: {
      company: selectedCompany ? `${selectedCompany.code} - ${selectedCompany.nameTh}` : undefined,
      branch: selectedBranch ? `${selectedBranch.company.code} / ${selectedBranch.code} - ${selectedBranch.name}` : undefined,
      category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : undefined,
      status: statuses.find((status) => status.id === filters.statusId)?.nameTh,
      condition: conditions.find((condition) => condition.id === filters.conditionId)?.nameTh,
      brand: selectedBrand?.name,
      model: selectedModel ? `${selectedModel.brand.name} / ${selectedModel.name}` : undefined,
      custodian: selectedCustodian ? `${selectedCustodian.code} - ${selectedCustodian.fullNameTh}` : undefined,
      supplier: selectedSupplier ? `${selectedSupplier.code} - ${selectedSupplier.name}` : undefined,
    },
    labels: {
      company: t("company"),
      branch: t("branch"),
      category: t("category"),
      status: t("status"),
      condition: t("condition"),
      ownershipType: t("ownershipType"),
      brand: t("brand"),
      model: t("model"),
      custodian: t("custodian"),
      supplier: t("supplier"),
      rowsPerPage: t("pageSizeLabel"),
      ownershipTypes: Object.fromEntries(assetOwnershipTypes.map((type) => [type, t(`ownershipType_${type}`)])) as Record<string, string>,
      dataQuality: {
        serial: t("dataQualitySerial"),
        photo: t("dataQualityPhoto"),
        purchase: t("dataQualityPurchase"),
        warranty: t("dataQualityWarranty"),
        responsibility: t("dataQualityResponsibility"),
        department: t("dataQualityDepartment"),
      },
      crossScope: {
        all: t("quickFilterCrossScopeAll"),
        custodian_company: t("quickFilterCustodianCrossCompany"),
        custodian_branch: t("quickFilterCustodianCrossBranch"),
        location_branch: t("quickFilterLocationCrossBranch"),
      },
      activity: { idle_180d: t("activityIdle180d") },
    },
  })
  const tableAssets: AssetRegisterRow[] = assets.map((asset) => {
    const openCheckoutId = openCheckoutByAssetId.get(asset.id) ?? null
    const transactions = getAssetRegisterTransactionActions({
      statusName: asset.status.name,
      custodianId: asset.custodianId,
      openCheckoutId,
      hasActiveMaintenance: activeMaintenanceAssetIds.has(asset.id),
      canEdit: canEditAssets,
    }).map((transaction) => ({
      ...transaction,
      href: buildAssetRegisterTransactionHref(
        locale,
        asset.id,
        transaction.action,
        registerReturnHref,
        openCheckoutId,
      ),
    }))

    return ({
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
    transactions,
  })})

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/assets/new`}
        createLabel={tCommon("create")}
      />
      <AssetRegisterViewMemory locale={locale} returnHref={registerReturnHref} />

      <AssetRegisterNavigationProvider filters={filters}>
        <AssetRegisterToolbar
          locale={locale}
          options={{ companies, branches, categories, statuses, conditions }}
          tabStatusIds={statusTabs.tabStatusIds}
          total={total}
        />
        <AssetRegisterStatusTabs
          label={t("statusTabsLabel")}
          items={statusTabs.tabs.map((tab) => ({
            key: tab.key,
            label: t(statusTabLabelKeys[tab.key]),
            count: tab.count.toLocaleString(numberLocale),
            href: `${basePath}?${buildAssetQueryString(filters, { statusId: tab.statusId, page: 1 })}`,
            active: tab.active,
          }))}
        />
        <AssetRegisterFilterChips
          chips={filterChips}
          clearAllHref={buildAssetRegisterClearAllHref(`/${locale}/assets`, filters)}
          labels={{ activeFilters: t("activeFilters"), remove: t("clearDrilldownFilter"), clearAll: t("clearAllFilters") }}
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
          permissions={{ canEdit: canEditAssets, canCreate: canCreateAssets, canDelete: canDeleteAssets }}
          labels={{
            actions: tCommon("actions"),
            all: tCommon("all"),
            assetName: t("assetName"),
            assetTag: t("assetTag"),
            tableScrollHint: t("tableScrollHint"),
            category: t("category"),
            company: t("company"),
            condition: t("condition"),
            currentLocation: t("currentLocation"),
            custodian: t("custodian"),
            ownershipType: t("ownershipType"),
            detail: t("detailTitle"),
            exportSelected: t("exportSelected"),
            bulkActions: t("bulkActions"),
            bulkUpdate: t("bulkUpdate"),
            bulkUpdateTitle: t("bulkUpdateTitle"),
            bulkUpdateDescription: t("bulkUpdateDescription"),
            clearSelection: t("clearSelection"),
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
            noResultsTitle: t("noResultsTitle"),
            noResultsDescription: t("noResultsDescription"),
            noAssetsTitle: t("noAssetsTitle"),
            noAssetsDescription: t("noAssetsDescription"),
            clearAllFilters: t("clearAllFilters"),
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
      </AssetRegisterNavigationProvider>

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
