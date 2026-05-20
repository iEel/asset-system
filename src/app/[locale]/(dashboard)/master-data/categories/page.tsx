import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Download, Edit, FileSpreadsheet } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryDeleteButton } from "@/components/master-data/category-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { paginationRange } from "@/lib/master-data-query"
import {
  buildCategoryOrderBy,
  buildCategoryHealthSummary,
  buildCategoryDrilldownHrefs,
  buildCategoryQueryString,
  buildCategoryWhere,
  parseCategoryListParams,
  parseCategoryPrefixMap,
  type CategoryListState,
  type CategorySort,
} from "@/lib/category-list-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type CategoriesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
    page?: string
    pageSize?: string
    sort?: string
    direction?: string
    assetUsage?: string
    modelStatus?: string
    customFieldStatus?: string
    checklistStatus?: string
    prefixStatus?: string
  }>
}

export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "category", "view")

  const t = await getTranslations("category")
  const tCommon = await getTranslations("common")
  const listState = parseCategoryListParams(rawSearchParams)
  const searchText = listState.search
  const [photoChecklistSettings, prefixSetting] = await Promise.all([
    prisma.systemSetting.findMany({
      where: { key: { startsWith: categoryPhotoChecklistKey("") } },
      select: { key: true, value: true },
    }),
    prisma.systemSetting.findUnique({
      where: { key: assetTagCategoryPrefixesKey },
      select: { value: true },
    }),
  ])
  const categoryIdsWithChecklist = photoChecklistSettings
    .filter((setting) => parsePhotoChecklist(setting.value).length > 0)
    .map((setting) => setting.key.replace(categoryPhotoChecklistKey(""), ""))
  const categoryIdsWithPrefix = Object.keys(parseCategoryPrefixMap(prefixSetting?.value))
  const where = buildCategoryWhere(listState, { categoryIdsWithChecklist, categoryIdsWithPrefix })

  const [categories, total, summaryCategories] = await Promise.all([
    prisma.assetCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            models: true,
            assets: true,
            customFieldDefs: true,
          },
        },
      },
      orderBy: buildCategoryOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.assetCategory.count({ where }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        _count: {
          select: {
            assets: true,
            models: true,
            customFieldDefs: true,
          },
        },
      },
    }),
  ])
  const basePath = `/${locale}/master-data/categories`
  const healthSummary = buildCategoryHealthSummary(summaryCategories, { categoryIdsWithChecklist, categoryIdsWithPrefix })

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/categories/new`}
        createLabel={tCommon("create")}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("categoryTools")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("categoryToolsHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api/categories/export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("downloadCategoryExport")}
          </Link>
          <Link
            href="/api/categories/import-template"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t("downloadCategoryTemplate")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={healthSummary.total}
          detail={t("summaryUsed", { count: healthSummary.used })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryMissingModels")}
          value={healthSummary.missingModels}
          detail={t("summaryMissingModelsHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { modelStatus: "withoutModels", page: 1 })}`}
          tone={healthSummary.missingModels > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryMissingChecklist")}
          value={healthSummary.missingChecklist}
          detail={t("summaryMissingChecklistHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { checklistStatus: "withoutChecklist", page: 1 })}`}
          tone={healthSummary.missingChecklist > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryMissingPrefix")}
          value={healthSummary.missingPrefix}
          detail={t("summaryMissingPrefixHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { prefixStatus: "withoutPrefix", page: 1 })}`}
          tone={healthSummary.missingPrefix > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={searchText}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <FilterSelect
            label={t("assetUsageFilter")}
            name="assetUsage"
            defaultValue={listState.assetUsage}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withAssets", label: t("withAssets") },
              { value: "withoutAssets", label: t("withoutAssets") },
            ]}
          />
          <FilterSelect
            label={t("modelStatusFilter")}
            name="modelStatus"
            defaultValue={listState.modelStatus}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withModels", label: t("withModels") },
              { value: "withoutModels", label: t("withoutModels") },
            ]}
          />
          <FilterSelect
            label={t("customFieldStatusFilter")}
            name="customFieldStatus"
            defaultValue={listState.customFieldStatus}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withCustomFields", label: t("withCustomFields") },
              { value: "withoutCustomFields", label: t("withoutCustomFields") },
            ]}
          />
          <FilterSelect
            label={t("checklistStatusFilter")}
            name="checklistStatus"
            defaultValue={listState.checklistStatus}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withChecklist", label: t("withChecklist") },
              { value: "withoutChecklist", label: t("withoutChecklist") },
            ]}
          />
          <FilterSelect
            label={t("prefixStatusFilter")}
            name="prefixStatus"
            defaultValue={listState.prefixStatus}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withPrefix", label: t("withPrefix") },
              { value: "withoutPrefix", label: t("withoutPrefix") },
            ]}
          />
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
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

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <CategorySortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</CategorySortableColumnHeader>
                <ColumnHeader>{t("description")}</ColumnHeader>
                <CategorySortableColumnHeader field="models" current={listState} basePath={basePath}>{t("models")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="customFields" current={listState} basePath={basePath}>{t("customFieldsShort")}</CategorySortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                categories.map((category) => {
                  const drilldown = buildCategoryDrilldownHrefs({ locale, categoryId: category.id })
                  return (
                    <ClickableTableRow
                      key={category.id}
                      href={drilldown.edit}
                      label={`${tCommon("edit")}: ${category.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{category.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{category.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">
                        {category.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.models}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.assets}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.customFieldDefs}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={drilldown.assets}
                            title={t("viewAssets")}
                            className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {t("viewAssets")}
                          </Link>
                          <Link
                            href={drilldown.models}
                            title={t("viewModels")}
                            className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {t("viewModels")}
                          </Link>
                          <Link
                            href={drilldown.edit}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <CategoryDeleteButton id={category.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <CategoryPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        tone === "warning" ? "border-warning/40" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function CategorySortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: CategorySort
  current: CategoryListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildCategoryQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function CategoryPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: CategoryListState
  total: number
  basePath: string
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildCategoryQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildCategoryQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildCategoryQueryString(current, { page: nextPage })}`}
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

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
