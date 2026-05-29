import Link from "next/link"
import Image from "next/image"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, Edit, FileSpreadsheet, Filter, ImageIcon, Plus, Search } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BrandDeleteButton } from "@/components/master-data/brand-delete-button"
import { AssetModelDeleteButton } from "@/components/master-data/asset-model-delete-button"
import { summarizeModelSpecs } from "@/lib/model-specs"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { paginationRange } from "@/lib/master-data-query"
import {
  buildBrandModelQueryString,
  buildBrandNavigatorItems,
  buildDuplicateNameGroups,
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

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/brands/models/new`}
        createLabel={t("createModel")}
        actions={
          <>
            <Link
              href="/api/brand-models/export"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("downloadBrandModelExport")}
            </Link>
            <Link
              href="/api/brand-models/import-template"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("downloadBrandModelTemplate")}
            </Link>
            <Link
              href={`/${locale}/master-data/brands/new`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("createBrand")}
            </Link>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label={t("brandTotal")} value={brandNavigatorItems.length} detail={t("brandNavigatorSummaryHelp")} />
        <SummaryTile label={t("modelTotal")} value={modelTotal} detail={t("filteredBySearchAndFilters")} />
        <SummaryTile
          label={t("duplicateReviewTitle")}
          value={totalDuplicateGroups}
          detail={t("duplicateReviewShort")}
          tone={totalDuplicateGroups > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">{t("brandNavigatorTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("brandNavigatorSubtitle")}</p>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: "", modelPage: 1 })}`}
              aria-current={!selectedBrand ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                !selectedBrand ? "border-primary bg-primary/10 text-primary" : "border-transparent text-foreground hover:bg-accent"
              }`}
            >
              <span className="min-w-0 truncate font-medium">{t("allBrandNavigator")}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{duplicateModelSource.length}</span>
            </Link>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {brandNavigatorItems.map((brand) => {
                const isSelected = listState.modelBrandId === brand.id
                return (
                  <Link
                    key={brand.id}
                    href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: brand.id, modelPage: 1 })}`}
                    aria-current={isSelected ? "page" : undefined}
                    className={`block rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                    }`}
                  >
                    <span className={`block truncate text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {brand.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("brandNavigatorCounts", { models: brand._count.models, assets: brand._count.assets })}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
          {selectedBrand ? (
            <div className="border-t border-border p-2.5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/master-data/brands/${selectedBrand.id}/edit`}
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Edit className="h-4 w-4" />
                  <span className="truncate">{t("editSelectedBrand")}</span>
                </Link>
                <BrandDeleteButton id={selectedBrand.id} />
              </div>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
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
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]" action={basePath}>
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
              <input type="hidden" name="modelPage" value="1" />
              <input type="hidden" name="modelPageSize" value={listState.modelPageSize} />
              <input type="hidden" name="modelBrandId" value={listState.modelBrandId} />
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{t("modelFiltersTitle")}</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    name="search"
                    defaultValue={searchText}
                    placeholder={t("searchPlaceholder")}
                    className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </span>
              </label>
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
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Filter className="h-4 w-4" />
                  {tCommon("filter")}
                </button>
                <Link
                  href={basePath}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {t("clearFilters")}
                </Link>
              </div>
            </form>
          </div>

          {totalDuplicateGroups > 0 ? (
            <details className="rounded-lg border border-warning/30 bg-warning/5 p-4">
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

          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("modelsTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("modelsSubtitle")}</p>
              </div>
              <Link
                href={`/${locale}/master-data/brands/models/new`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                {t("createModel")}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <ColumnHeader>{t("modelName")}</ColumnHeader>
                    {!selectedBrand ? <ColumnHeader>{t("brand")}</ColumnHeader> : null}
                    <ColumnHeader>{t("category")}</ColumnHeader>
                    <ColumnHeader>{t("specs")}</ColumnHeader>
                    <ColumnHeader>{t("assets")}</ColumnHeader>
                    <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan={selectedBrand ? 6 : 7} className="h-32 px-4 text-center text-muted-foreground">
                        {tCommon("noData")}
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => {
                      const photo = primaryPhotoByModelId.get(model.id)
                      const canPreviewPhoto = photo ? previewableModelPhotoTypes.has(photo.fileType) : false

                      return (
                        <ClickableTableRow
                          key={model.id}
                          href={`/${locale}/master-data/brands/models/${model.id}/edit`}
                          label={`${tCommon("edit")}: ${model.name}`}
                        >
                          <td className="min-w-[220px] px-4 py-3 font-medium text-foreground">
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
                          </td>
                          {!selectedBrand ? (
                            <td className="min-w-32 px-4 py-3 text-muted-foreground">{model.brand.name}</td>
                          ) : null}
                          <td className="min-w-44 px-4 py-3 text-muted-foreground">
                            {model.category.code} - {model.category.name}
                          </td>
                          <td className="min-w-[220px] max-w-lg px-4 py-3 text-muted-foreground">
                            <span className="line-clamp-2">{summarizeModelSpecs(model.specs) || "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{model._count.assets}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <ActiveBadge label={tCommon("active")} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                href={`/${locale}/master-data/brands/models/${model.id}/edit`}
                                title={tCommon("edit")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <AssetModelDeleteButton id={model.id} />
                            </div>
                          </td>
                        </ClickableTableRow>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <BrandModelPagination
              current={listState}
              total={modelTotal}
              basePath={basePath}
              pageKey="modelPage"
              pageSizeKey="modelPageSize"
              labels={{
                rowsPerPage: tCommon("rowsPerPage"),
                page: tCommon("page"),
                of: tCommon("of"),
                previous: tCommon("previous"),
                next: tCommon("next"),
              }}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  tone?: "neutral" | "warning"
}) {
  return (
    <div className={`rounded-lg border bg-surface p-4 shadow-sm ${tone === "warning" ? "border-warning/40" : "border-border"}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  allLabel,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  allLabel?: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
        <div className="mt-2 text-sm text-muted-foreground">-</div>
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

function BrandModelPagination({
  current,
  total,
  basePath,
  pageKey,
  pageSizeKey,
  labels,
}: {
  current: BrandModelListState
  total: number
  basePath: string
  pageKey: "brandPage" | "modelPage"
  pageSizeKey: "brandPageSize" | "modelPageSize"
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const page = current[pageKey]
  const pageSize = current[pageSizeKey]
  const { start, end, totalPages } = paginationRange(page, pageSize, total)
  const safePage = Math.min(page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((nextPageSize) => (
          <Link
            key={nextPageSize}
            href={`${basePath}?${buildBrandModelQueryString(current, {
              [pageKey]: 1,
              [pageSizeKey]: nextPageSize,
            } as Partial<BrandModelListState>)}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              pageSize === nextPageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {nextPageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildBrandModelQueryString(current, { [pageKey]: previousPage } as Partial<BrandModelListState>)}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildBrandModelQueryString(current, { [pageKey]: nextPage } as Partial<BrandModelListState>)}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}
