import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildAssetOrderBy,
  buildAssetWhere,
  parseAssetListParams,
  type AssetListParams,
} from "@/lib/asset-list-query"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { AssetRegisterTable, type AssetRegisterRow } from "@/components/assets/asset-register-table"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
import { assetOwnershipTypes, normalizeAssetOwnershipType } from "@/lib/asset-ownership"

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
  ownershipType: string
  rowsPerPage: string
  ownershipTypes: Record<string, string>
}

export default async function AssetsPage({ params, searchParams }: AssetsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const filters = parseAssetListParams(rawSearchParams)
  const where = buildAssetWhere(filters)
  const [assets, total, companies, branches, categories, statuses, conditions, locations, employees] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { nameTh: true, colorCode: true } },
        condition: { select: { nameTh: true, colorCode: true } },
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
      select: { id: true, nameTh: true },
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
  ])
  const modelIds = Array.from(
    new Set(assets.map((asset) => asset.model?.id).filter((modelId): modelId is string => Boolean(modelId)))
  )
  const modelPhotos = modelIds.length
    ? await prisma.attachment.findMany({
        where: {
          module: "asset_model",
          referenceId: { in: modelIds },
          isActive: true,
          fileType: { startsWith: "image/" },
        },
        select: { id: true, referenceId: true, originalName: true, fileType: true },
        orderBy: { uploadedAt: "desc" },
      })
    : []
  const modelPhotoByModelId = new Map<string, (typeof modelPhotos)[number]>()
  for (const photo of modelPhotos) {
    if (!modelPhotoByModelId.has(photo.referenceId)) {
      modelPhotoByModelId.set(photo.referenceId, photo)
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const fromRow = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1
  const toRow = Math.min(total, filters.page * filters.pageSize)
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
    status: { label: asset.status.nameTh, color: asset.status.colorCode },
    condition: { label: asset.condition.nameTh, color: asset.condition.colorCode },
    purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
    photo: asset.attachments[0]
      ? {
          id: asset.attachments[0].id,
          alt: asset.attachments[0].originalName,
          fileType: asset.attachments[0].fileType,
        }
      : asset.model?.id && modelPhotoByModelId.get(asset.model.id)
        ? {
            id: modelPhotoByModelId.get(asset.model.id)!.id,
            alt: modelPhotoByModelId.get(asset.model.id)!.originalName,
            fileType: modelPhotoByModelId.get(asset.model.id)!.fileType,
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

      <AssetFilters
        locale={locale}
        filters={filters}
        companies={companies}
        branches={branches}
        categories={categories}
        statuses={statuses}
        conditions={conditions}
        labels={{
          search: tCommon("search"),
          filter: tCommon("filter"),
          all: tCommon("all"),
          company: t("company"),
          branch: t("branch"),
          category: t("category"),
          status: t("status"),
          condition: t("condition"),
          ownershipType: t("ownershipType"),
          rowsPerPage: tCommon("rowsPerPage"),
          ownershipTypes: Object.fromEntries(assetOwnershipTypes.map((type) => [type, t(`ownershipType_${type}`)])) as Record<string, string>,
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
          of: tCommon("of"),
          page: tCommon("page"),
          previous: tCommon("previous"),
          purchasePrice: t("purchasePrice"),
          selectedCount: t("selectedCount"),
          status: t("status"),
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
  labels,
}: {
  locale: string
  filters: ReturnType<typeof parseAssetListParams>
  companies: { id: string; code: string; nameTh: string }[]
  branches: { id: string; code: string; name: string; companyId: string; company: { code: string } }[]
  categories: { id: string; code: string; name: string }[]
  statuses: { id: string; nameTh: string }[]
  conditions: { id: string; nameTh: string }[]
  labels: AssetFilterLabels
}) {
  const filteredBranches = filters.companyId
    ? branches.filter((branch) => branch.companyId === filters.companyId)
    : branches

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6" action={`/${locale}/assets`}>
        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{labels.search}</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
        <FilterSelect name="statusId" label={labels.status} defaultValue={filters.statusId}>
          <option value="">{labels.all}</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.nameTh}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="conditionId" label={labels.condition} defaultValue={filters.conditionId}>
          <option value="">{labels.all}</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.nameTh}
            </option>
          ))}
        </FilterSelect>
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
        {filters.custodianId ? <input type="hidden" name="custodianId" value={filters.custodianId} /> : null}
        {filters.supplierId ? <input type="hidden" name="supplierId" value={filters.supplierId} /> : null}
        {filters.dataQuality ? <input type="hidden" name="dataQuality" value={filters.dataQuality} /> : null}
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="direction" value={filters.direction} />
        <button
          type="submit"
          className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {labels.filter}
        </button>
      </form>
    </div>
  )
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string
  label: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </label>
  )
}
