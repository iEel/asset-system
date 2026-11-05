import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileSpreadsheet, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { summarizeModelSpecs } from "@/lib/model-specs"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Button } from "@/components/ui/button"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange, recordStatusWhere } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  appendBrandModelReturnTo,
  buildBrandDrilldownHrefs,
  buildBrandModelQueryString,
  buildBrandNavigatorItems,
  buildDuplicateNameGroups,
  buildModelDrilldownHrefs,
  parseBrandModelListParams,
  type BrandModelListState,
} from "@/lib/brand-model-query"
import { readRecentBrandModels, recentAddedWindowStart, type RecentBrandModel } from "@/lib/brand-model-recent"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { BrandModelDeactivateButton } from "@/components/master-data/brand-model-deactivate-button"
import { ModelPhoto } from "@/components/master-data/model-photo"

type BrandsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
    brandPage?: string
    brandPageSize?: string
    modelPage?: string
    modelPageSize?: string
    modelBrandId?: string
    modelCategoryId?: string
    modelPhoto?: string
    modelUsage?: string
    added?: string
  }>
}

const previewableModelPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])

export default async function BrandsPage({ params, searchParams }: BrandsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "brand", "view")

  const t = await getTranslations("brandModel")
  const tCommon = await getTranslations("common")
  const listState = parseBrandModelListParams(rawSearchParams)
  const searchText = listState.search
  const basePath = `/${locale}/master-data/brands`
  const now = new Date()
  // "เพิ่มล่าสุด" (G7P1-R3): one createdAt window for the brand list and the model table, like the status filter.
  const addedWhere = listState.added ? { createdAt: { gte: recentAddedWindowStart(listState.added, now) } } : {}

  const modelIdsWithPhotos = listState.modelPhoto === "all"
    ? []
    : Array.from(new Set((await prisma.attachment.findMany({
        where: {
          module: "asset_model",
          isActive: true,
          fileType: { startsWith: "image/" },
        },
        select: { referenceId: true },
      })).map((attachment) => attachment.referenceId)))

  // One status filter for the brand list and the model table: "ไม่ใช้งาน" finds a deleted brand or model again (critique 2026-10-20 E1).
  const recordStatus = recordStatusWhere(listState.status)
  const modelWhere: Prisma.AssetModelWhereInput = {
    ...recordStatus,
    ...addedWhere,
    ...(searchText
      ? {
          OR: [
            { name: { contains: searchText } },
            { specs: { contains: searchText } },
            { brand: { name: { contains: searchText } } },
            { category: { code: { contains: searchText } } },
            { category: { name: { contains: searchText } } },
          ],
        }
      : {}),
    ...(listState.modelBrandId ? { brandId: listState.modelBrandId } : {}),
    ...(listState.modelCategoryId ? { categoryId: listState.modelCategoryId } : {}),
    ...(listState.modelUsage === "used" ? { assets: { some: { isActive: true } } } : {}),
    ...(listState.modelUsage === "unused" ? { assets: { none: { isActive: true } } } : {}),
    ...(listState.modelPhoto === "with"
      ? { id: { in: modelIdsWithPhotos.length ? modelIdsWithPhotos : ["__no_model_photo__"] } }
      : {}),
    ...(listState.modelPhoto === "without" && modelIdsWithPhotos.length ? { id: { notIn: modelIdsWithPhotos } } : {}),
  }

  const [
    rawBrandNavigatorItems,
    activeModelCountGroups,
    activeAssetCountGroups,
    models,
    modelTotal,
    categoryOptions,
    duplicateModelSource,
    recentRows,
  ] = await Promise.all([
    prisma.assetBrand.findMany({
      where: { ...recordStatus, ...addedWhere },
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: { select: { models: true, assets: true } },
      },
      // Newest first while "เพิ่มล่าสุด" is on (spec §4.3).
      orderBy: listState.added ? [{ createdAt: "desc" }, { name: "asc" }] : { name: "asc" },
    }),
    prisma.assetModel.groupBy({
      by: ["brandId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.asset.groupBy({
      by: ["brandId"],
      where: { isActive: true, brandId: { not: null } },
      _count: { _all: true },
    }),
    prisma.assetModel.findMany({
      where: modelWhere,
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true } },
      },
      orderBy: listState.added ? [{ createdAt: "desc" }, { name: "asc" }] : [{ brand: { name: "asc" } }, { name: "asc" }],
      skip: (listState.modelPage - 1) * listState.modelPageSize,
      take: listState.modelPageSize,
    }),
    prisma.assetModel.count({ where: modelWhere }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        brand: { select: { name: true } },
        category: { select: { code: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    listState.added ? readRecentBrandModels(prisma, listState.added, now) : Promise.resolve([] as RecentBrandModel[]),
  ])

  const listHref = (next: Partial<BrandModelListState>) => `${basePath}?${buildBrandModelQueryString(listState, next)}`
  // A model page past the last one (an old link, or the last model of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(modelTotal, listState.modelPageSize)
  if (models.length === 0 && modelTotal > 0 && listState.modelPage > lastPage) {
    redirect(listHref({ modelPage: lastPage }))
  }

  const brandNavigatorItems = buildBrandNavigatorItems(
    rawBrandNavigatorItems,
    activeModelCountGroups.map((group) => ({ brandId: group.brandId, count: group._count._all })),
    activeAssetCountGroups.map((group) => ({ brandId: group.brandId, count: group._count._all }))
  )
  const brandOptions = brandNavigatorItems.filter((brand) => brand.isActive).map((brand) => ({ id: brand.id, name: brand.name }))
  const modelPhotos = models.length
    ? await prisma.attachment.findMany({
        where: {
          module: "asset_model",
          referenceId: { in: models.map((model) => model.id) },
          isActive: true,
          fileType: { startsWith: "image/" },
        },
        select: { id: true, referenceId: true, originalName: true, fileType: true },
        orderBy: { uploadedAt: "desc" },
      })
    : []
  const primaryPhotoByModelId = new Map<string, (typeof modelPhotos)[number]>()
  for (const photo of modelPhotos) {
    if (!primaryPhotoByModelId.has(photo.referenceId)) {
      primaryPhotoByModelId.set(photo.referenceId, photo)
    }
  }
  // The newest active image of the model, when the browser can show it; ModelPhoto shows the placeholder otherwise.
  const modelPhotoSrc = (modelId: string) => {
    const photo = primaryPhotoByModelId.get(modelId)
    return photo && previewableModelPhotoTypes.has(photo.fileType) ? `/api/attachments/${photo.id}?inline=1` : null
  }

  // Who added a record and where, from its create entry of the system log; "–" when the log no longer holds it (G7P1-R3).
  const recentByKey = new Map(recentRows.map((row) => [`${row.kind}:${row.id}`, row]))
  const addedByLine = (kind: RecentBrandModel["kind"], id: string) => {
    const row = recentByKey.get(`${kind}:${id}`)
    const source = row?.source === "asset-form" ? t("recent.sourceAssetForm") : row?.source === "master-data" ? t("recent.sourceMasterData") : "–"
    return t("recent.addedBy", { name: row?.addedByName ?? "–", source })
  }

  const brandDuplicateGroups = buildDuplicateNameGroups(brandOptions)
  const modelDuplicateGroups = buildDuplicateNameGroups(duplicateModelSource)
  const totalDuplicateGroups = brandDuplicateGroups.length + modelDuplicateGroups.length
  const selectedBrand = brandNavigatorItems.find((brand) => brand.id === listState.modelBrandId)
  const selectedCategory = categoryOptions.find((category) => category.id === listState.modelCategoryId)
  const brandModelReturnHref = `${basePath}?${buildBrandModelQueryString(listState, {})}`
  const brandReturnHref = brandModelReturnHref
  const createModelHref = appendBrandModelReturnTo(`/${locale}/master-data/brands/models/new`, brandModelReturnHref)
  const selectedBrandEditHref = selectedBrand
    ? appendMasterDataReturnTo(`/${locale}/master-data/brands/${selectedBrand.id}/edit`, brandReturnHref)
    : ""
  const { start, end, totalPages } = paginationRange(listState.modelPage, listState.modelPageSize, modelTotal)
  // modelBrandId is not a filter of this form: the brand list beside it has its own "all brands" link.
  const hasActiveFilters = listState.status !== "active" || Boolean(searchText || listState.modelCategoryId || listState.modelPhoto !== "all" || listState.modelUsage !== "all" || listState.added)
  const modelColumnCount = selectedBrand ? 6 : 7
  // A model's edit link and ⋯ "ปิดใช้งาน", in its table row and its phone card.
  const modelActions = (model: (typeof models)[number], editModelHref: string) => (
    <BrandModelDeactivateButton
      kind="model"
      endpoint={`/api/models/${model.id}`}
      name={model.name}
      isActive={model.isActive}
      models={0}
      assets={model._count.assets}
      menuLabel={tCommon("moreActionsFor", { code: model.name })}
      next={{ label: tCommon("edit"), href: editModelHref, icon: <Pencil aria-hidden="true" /> }}
    />
  )
  // The picker's panel and the phone's brand select both show these.
  const selectedBrandActions = selectedBrand ? (
    <BrandModelDeactivateButton
      kind="brand"
      endpoint={`/api/brands/${selectedBrand.id}`}
      name={selectedBrand.name}
      isActive={selectedBrand.isActive}
      models={selectedBrand._count.models}
      assets={selectedBrand._count.assets}
      menuLabel={tCommon("moreActionsFor", { code: selectedBrand.name })}
      next={{ label: t("editSelectedBrand"), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" /> }}
      className="justify-start"
    />
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <a href="/api/brand-models/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadBrandModelExport")}
            </a>
            <a href="/api/brand-models/import-template" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadBrandModelTemplate")}
            </a>
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/brands/new`, brandReturnHref)} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createBrand")}
            </Link>
            <Link href={createModelHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createModel")}
            </Link>
          </>
        }
      />

      <StatStrip
        items={[
          {
            key: "brands",
            label: t("brandTotal"),
            value: formatCount(brandNavigatorItems.length),
            foot: t("brandNavigatorSummaryHelp"),
            footTitle: t("brandNavigatorSummaryHelp"),
          },
          {
            key: "models",
            label: t("modelTotal"),
            value: formatCount(modelTotal),
            foot: t("filteredBySearchAndFilters"),
            footTitle: t("filteredBySearchAndFilters"),
          },
          {
            key: "duplicates",
            label: t("duplicateReviewTitle"),
            value: formatCount(totalDuplicateGroups),
            foot: t("duplicateReviewShort"),
            footTitle: t("duplicateReviewShort"),
            attention: totalDuplicateGroups > 0,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        {/* An aside (the picker) cannot be ContentPanel, so it takes the panel classes (2D-2 R4). */}
        {/* Phones get the brand select at the top of the workspace in place of this picker (spec §4.3). */}
        <aside className={cn(getPanelClasses(), "hidden overflow-hidden md:block lg:sticky lg:top-4 lg:self-start")}>
          <div className="border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">{t("brandNavigatorTitle")}</h2>
            <p className="mt-1 text-meta text-muted-foreground">{t("brandNavigatorSubtitle")}</p>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: "", modelPage: 1 })}`}
              aria-current={!selectedBrand ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                !selectedBrand ? "border-primary bg-primary-soft text-primary" : "border-transparent text-foreground hover:bg-row-hover"
              }`}
            >
              <span className="min-w-0 truncate font-medium">{t("allBrandNavigator")}</span>
              <span className="text-meta text-muted-foreground num">{formatCount(duplicateModelSource.length)}</span>
            </Link>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {brandNavigatorItems.map((brand) => {
                const isSelected = listState.modelBrandId === brand.id
                const brandModelsHref = `${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: brand.id, modelPage: 1 })}`
                const brandDrilldown = buildBrandDrilldownHrefs({ locale, brandId: brand.id })
                return (
                  <div
                    key={brand.id}
                    className={`rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected ? "border-primary bg-primary-soft" : "border-transparent hover:bg-row-hover"
                    }`}
                  >
                    <Link
                      prefetch={false}
                      href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: brand.id, modelPage: 1 })}`}
                      aria-current={isSelected ? "page" : undefined}
                      className={`block truncate text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {brand.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-meta text-muted-foreground">
                      {brand._count.models > 0 ? (
                        <Link
                          prefetch={false}
                          href={brandModelsHref}
                          className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
                        >
                          {t("modelCountInline", { count: brand._count.models })}
                        </Link>
                      ) : (
                        <span>{t("modelCountInline", { count: 0 })}</span>
                      )}
                      <span>/</span>
                      {brand._count.assets > 0 ? (
                        <Link
                          prefetch={false}
                          href={brandDrilldown.assets}
                          className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
                        >
                          {t("assetCountInline", { count: brand._count.assets })}
                        </Link>
                      ) : (
                        <span>{t("assetCountInline", { count: 0 })}</span>
                      )}
                    </div>
                    {listState.added ? <p className="mt-1 text-meta text-muted-foreground">{addedByLine("brand", brand.id)}</p> : null}
                  </div>
                )
              })}
            </div>
          </div>
          {selectedBrand ? (
            <div className="border-t border-border p-2.5">
              <div className="mb-2 text-meta font-medium text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              {selectedBrandActions}
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className={cn(getPanelClasses(), "space-y-3 p-4 md:hidden")}>
            <form role="search" action={basePath} className="grid gap-3">
              {listState.search ? <input type="hidden" name="search" value={listState.search} /> : null}
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
              <input type="hidden" name="modelPage" value="1" />
              <input type="hidden" name="modelPageSize" value={listState.modelPageSize} />
              {listState.modelCategoryId ? <input type="hidden" name="modelCategoryId" value={listState.modelCategoryId} /> : null}
              <input type="hidden" name="modelPhoto" value={listState.modelPhoto} />
              <input type="hidden" name="modelUsage" value={listState.modelUsage} />
              <input type="hidden" name="status" value={listState.status} />
              {listState.added ? <input type="hidden" name="added" value={listState.added} /> : null}
              <FilterSelect
                label={t("phoneBrandSelect")}
                name="modelBrandId"
                defaultValue={listState.modelBrandId}
                allLabel={t("allBrandNavigator")}
                options={brandNavigatorItems.map((brand) => ({ value: brand.id, label: brand.name }))}
              />
              <Button type="submit" variant="outline">{tCommon("filter")}</Button>
            </form>
            {selectedBrandActions}
          </div>
          <ContentPanel
            title={t("modelWorkspaceTitle")}
            description={
              selectedBrand || selectedCategory
                ? t("modelsFilteredBy", {
                    brand: selectedBrand?.name ?? t("allBrands"),
                    category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : t("allCategories"),
                  })
                : t("modelWorkspaceSubtitle")
            }
            actions={<span className="text-sm text-muted-foreground">{t("modelResultSummary", { count: modelTotal })}</span>}
          >
            <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(140px,1fr))_auto]">
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
              <input type="hidden" name="modelPage" value="1" />
              <input type="hidden" name="modelPageSize" value={listState.modelPageSize} />
              <input type="hidden" name="modelBrandId" value={listState.modelBrandId} />
              <Field label={t("modelFiltersTitle")}>
                <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
              </Field>
              <FilterSelect
                label={t("category")}
                name="modelCategoryId"
                defaultValue={listState.modelCategoryId}
                allLabel={t("allCategories")}
                options={categoryOptions.map((category) => ({
                  value: category.id,
                  label: `${category.code} - ${category.name}`,
                }))}
              />
              <FilterSelect
                label={t("modelPhoto")}
                name="modelPhoto"
                defaultValue={listState.modelPhoto}
                options={[
                  { value: "all", label: t("allPhotos") },
                  { value: "with", label: t("withPhoto") },
                  { value: "without", label: t("withoutPhoto") },
                ]}
              />
              <FilterSelect
                label={t("modelUsage")}
                name="modelUsage"
                defaultValue={listState.modelUsage}
                options={[
                  { value: "all", label: t("allUsage") },
                  { value: "used", label: t("usedModels") },
                  { value: "unused", label: t("unusedModels") },
                ]}
              />
              <FilterSelect
                label={tCommon("status")}
                name="status"
                defaultValue={listState.status}
                options={[
                  { value: "active", label: tCommon("active") },
                  { value: "inactive", label: tCommon("inactive") },
                  { value: "all", label: tCommon("all") },
                ]}
              />
              <FilterSelect
                label={t("recent.label")}
                name="added"
                defaultValue={listState.added ? String(listState.added) : ""}
                allLabel={t("recent.any")}
                options={[
                  { value: "7", label: t("recent.days7") },
                  { value: "30", label: t("recent.days30") },
                ]}
              />
              <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
            </form>
          </ContentPanel>

          {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). The warning lives in its icon, not a tint. */}
          {totalDuplicateGroups > 0 ? (
            <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground md:min-h-0">
                <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" />
                {t("duplicateReviewCompact", { count: totalDuplicateGroups })}
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DuplicateGroupList title={t("duplicateBrands")} groups={brandDuplicateGroups.slice(0, 4)} />
                <DuplicateGroupList title={t("duplicateModels")} groups={modelDuplicateGroups.slice(0, 4)} />
              </div>
            </details>
          ) : null}

          <ContentPanel
            divided
            flush
            className="overflow-hidden"
            title={t("modelsTitle")}
            description={t("modelsSubtitle")}
            actions={
              <Link href={createModelHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <Plus aria-hidden="true" />
                {t("createModel")}
              </Link>
            }
          >
            {/* Phones: one card per model (name, photo, category, asset count); the table from md (spec §4.3). */}
            {models.length === 0 ? (
              <EmptyNote padded className="md:hidden">{tCommon("noData")}</EmptyNote>
            ) : (
              <ContentPanelRows className="md:hidden">
                {models.map((model) => {
                  const editModelHref = appendBrandModelReturnTo(`/${locale}/master-data/brands/models/${model.id}/edit`, brandModelReturnHref)
                  return (
                    <li key={model.id}>
                      <article className="flex gap-3">
                        <ModelPhoto src={modelPhotoSrc(model.id)} size="lg" />
                        <div className="min-w-0 flex-1">
                          <Link href={editModelHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm font-medium text-foreground [overflow-wrap:anywhere]")}>
                            {model.name}
                          </Link>
                          <p className="text-meta text-muted-foreground">
                            {model.brand.name} · <span className="tag">{model.category.code}</span> {model.category.name}
                          </p>
                          <p className="text-meta text-muted-foreground">
                            {t("assetCountInline", { count: model._count.assets })}
                            {model.isActive ? null : <> · {tCommon("inactive")}</>}
                          </p>
                          {listState.added ? <p className="text-meta text-muted-foreground">{addedByLine("model", model.id)}</p> : null}
                          <div className="mt-2">{modelActions(model, editModelHref)}</div>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ContentPanelRows>
            )}
            <DataTable
              framed={false}
              className="hidden md:block"
              caption={t("modelsTitle")}
              scrollHint={tCommon("tableScrollHint")}
            >
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("modelName")}</DataTableHead>
                  {!selectedBrand ? <DataTableHead>{t("brand")}</DataTableHead> : null}
                  <DataTableHead>{t("category")}</DataTableHead>
                  <DataTableHead>{t("specs")}</DataTableHead>
                  <DataTableHead align="right">{t("assets")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {models.length === 0 ? (
                  hasActiveFilters ? (
                    <TableEmptyRow colSpan={modelColumnCount} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
                  ) : (
                    <TableEmptyRow colSpan={modelColumnCount}>{tCommon("noData")}</TableEmptyRow>
                  )
                ) : (
                  models.map((model) => {
                    const editModelHref = appendBrandModelReturnTo(`/${locale}/master-data/brands/models/${model.id}/edit`, brandModelReturnHref)
                    const modelDrilldown = buildModelDrilldownHrefs({ locale, modelId: model.id })

                    return (
                      <ClickableTableRow
                        key={model.id}
                        href={editModelHref}
                        label={`${tCommon("edit")}: ${model.name}`}
                      >
                        <DataTableCell className="min-w-[220px] font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <ModelPhoto src={modelPhotoSrc(model.id)} />
                            <div className="min-w-0">
                              <span className="block truncate">{model.name}</span>
                              {listState.added ? <span className="block text-meta font-normal text-muted-foreground">{addedByLine("model", model.id)}</span> : null}
                            </div>
                          </div>
                        </DataTableCell>
                        {!selectedBrand ? (
                          <DataTableCell className="min-w-32 text-muted-foreground">{model.brand.name}</DataTableCell>
                        ) : null}
                        <DataTableCell className="min-w-44 text-muted-foreground">
                          <span className="tag">{model.category.code}</span> - {model.category.name}
                        </DataTableCell>
                        <DataTableCell className="min-w-[220px] max-w-lg text-muted-foreground">
                          <span className="line-clamp-2">{orNil(summarizeModelSpecs(model.specs))}</span>
                        </DataTableCell>
                        <DataTableCell numeric className="text-muted-foreground">
                          {model._count.assets > 0 ? (
                            <Link
                              prefetch={false}
                              href={modelDrilldown.assets}
                              className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                            >
                              {formatCount(model._count.assets)}
                            </Link>
                          ) : (
                            formatCount(0)
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <StatusBadge label={model.isActive ? tCommon("active") : tCommon("inactive")} tone={model.isActive ? "success" : "muted"} />
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          {modelActions(model, editModelHref)}
                        </DataTableCell>
                      </ClickableTableRow>
                    )
                  })
                )}
              </DataTableBody>
            </DataTable>
            {modelTotal > 0 ? (
              <DataTableFoot>
                <Pagination
                  page={listState.modelPage}
                  totalPages={totalPages}
                  previousHref={listHref({ modelPage: listState.modelPage - 1 })}
                  nextHref={listHref({ modelPage: listState.modelPage + 1 })}
                  pageSize={listState.modelPageSize}
                  pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ modelPageSize: value, modelPage: 1 }) }))}
                  labels={{
                    navigation: tCommon("pagination"),
                    previous: tCommon("previous"),
                    next: tCommon("next"),
                    pageOf: tCommon("pageOf", { page: listState.modelPage, total: totalPages }),
                    range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(modelTotal) }),
                    pageSizeGroup: tCommon("pageSizeLabel"),
                    rowsPerPage: tCommon("rowsPerPage"),
                  }}
                />
              </DataTableFoot>
            ) : null}
          </ContentPanel>
        </section>
      </div>
    </div>
  )
}

function DuplicateGroupList({
  title,
  groups,
}: {
  title: string
  groups: Array<{ displayName: string; items: Array<{ id: string; name: string }> }>
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {groups.length === 0 ? (
        <div className="mt-2 text-sm">
          <Nil />
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {groups.map((group) => (
            <div key={`${group.displayName}-${group.items.length}`} className="text-sm">
              <div className="font-medium text-foreground">{group.displayName}</div>
              <div className="mt-0.5 text-muted-foreground">
                {group.items.map((item) => item.name).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
