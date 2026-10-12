import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileSpreadsheet, ImageIcon, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { summarizeModelSpecs } from "@/lib/model-specs"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
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
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

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

  const modelWhere: Prisma.AssetModelWhereInput = {
    isActive: true,
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
  ] = await Promise.all([
    prisma.assetBrand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { models: true, assets: true } },
      },
      orderBy: { name: "asc" },
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
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
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
  const brandOptions = brandNavigatorItems.map((brand) => ({ id: brand.id, name: brand.name }))
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
  const hasActiveFilters = Boolean(searchText || listState.modelCategoryId || listState.modelPhoto !== "all" || listState.modelUsage !== "all")
  const modelColumnCount = selectedBrand ? 6 : 7

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href="/api/brand-models/export" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadBrandModelExport")}
            </Link>
            <Link href="/api/brand-models/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadBrandModelTemplate")}
            </Link>
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
        <aside className="overflow-hidden rounded-lg border border-border bg-surface lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">{t("brandNavigatorTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("brandNavigatorSubtitle")}</p>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: "", modelPage: 1 })}`}
              aria-current={!selectedBrand ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                !selectedBrand ? "border-primary bg-primary-soft text-primary" : "border-transparent text-foreground hover:bg-accent"
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
                      isSelected ? "border-primary bg-primary-soft" : "border-transparent hover:bg-accent"
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
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {brand._count.models > 0 ? (
                        <Link
                          prefetch={false}
                          href={brandModelsHref}
                          className="inline-flex h-7 items-center rounded-md px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
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
                          className="inline-flex h-7 items-center rounded-md px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                        >
                          {t("assetCountInline", { count: brand._count.assets })}
                        </Link>
                      ) : (
                        <span>{t("assetCountInline", { count: 0 })}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {selectedBrand ? (
            <div className="border-t border-border p-2.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <RowActions
                code={selectedBrand.name}
                menuLabel={tCommon("moreActionsFor", { code: selectedBrand.name })}
                next={{ label: t("editSelectedBrand"), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" /> }}
                groups={[]}
                deleteAction={{ endpoint: `/api/brands/${selectedBrand.id}` }}
                className="justify-start"
              />
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("modelWorkspaceTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedBrand || selectedCategory
                    ? t("modelsFilteredBy", {
                        brand: selectedBrand?.name ?? t("allBrands"),
                        category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : t("allCategories"),
                      })
                    : t("modelWorkspaceSubtitle")}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("modelResultSummary", { count: modelTotal })}
              </div>
            </div>
            <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
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
              <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
            </form>
          </div>

          {totalDuplicateGroups > 0 ? (
            <details className="rounded-lg border border-warning-border bg-warning-soft p-4">
              <summary className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
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
              <Link href={createModelHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Plus aria-hidden="true" />
                {t("createModel")}
              </Link>
            }
          >
            <DataTable
              framed={false}
              caption={t("modelsTitle")}
              scrollHint={tCommon("tableScrollHint")}
              footer={
                modelTotal > 0 ? (
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
                ) : undefined
              }
            >
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("modelName")}</DataTableHead>
                  {!selectedBrand ? <DataTableHead>{t("brand")}</DataTableHead> : null}
                  <DataTableHead>{t("category")}</DataTableHead>
                  <DataTableHead>{t("specs")}</DataTableHead>
                  <DataTableHead align="right">{t("assets")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
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
                    const photo = primaryPhotoByModelId.get(model.id)
                    const canPreviewPhoto = photo ? previewableModelPhotoTypes.has(photo.fileType) : false
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
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                              {photo && canPreviewPhoto ? (
                                <Image
                                  src={`/api/attachments/${photo.id}?inline=1`}
                                  alt=""
                                  fill
                                  unoptimized
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                              )}
                            </div>
                            <span className="min-w-0 truncate">{model.name}</span>
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
                              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                            >
                              {formatCount(model._count.assets)}
                            </Link>
                          ) : (
                            <span className="px-2">{formatCount(0)}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <ActiveBadge label={tCommon("active")} />
                        </DataTableCell>
                        <DataTableCell align="right">
                          <RowActions
                            code={model.name}
                            menuLabel={tCommon("moreActionsFor", { code: model.name })}
                            next={{ label: tCommon("edit"), href: editModelHref, icon: <Pencil aria-hidden="true" /> }}
                            groups={[]}
                            deleteAction={{ endpoint: `/api/models/${model.id}` }}
                          />
                        </DataTableCell>
                      </ClickableTableRow>
                    )
                  })
                )}
              </DataTableBody>
            </DataTable>
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
    <div className="rounded-md border border-border bg-surface p-3">
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
