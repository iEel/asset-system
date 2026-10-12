import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Download, FileSpreadsheet, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
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
  const categoryReturnHref = `${basePath}?${buildCategoryQueryString(listState, {})}`
  const healthSummary = buildCategoryHealthSummary(summaryCategories, { categoryIdsWithChecklist, categoryIdsWithPrefix })
  const listHref = (next: Partial<CategoryListState>) => `${basePath}?${buildCategoryQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (categories.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(
    searchText ||
      listState.assetUsage !== "all" ||
      listState.modelStatus !== "all" ||
      listState.customFieldStatus !== "all" ||
      listState.checklistStatus !== "all" ||
      listState.prefixStatus !== "all",
  )
  const sortBy = (field: CategorySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href="/api/categories/export" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadCategoryExport")}
            </Link>
            <Link href="/api/categories/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadCategoryTemplate")}
            </Link>
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/categories/new`, categoryReturnHref)} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {tCommon("create")}
            </Link>
          </>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(healthSummary.total),
            foot: t("summaryUsed", { count: healthSummary.used }),
            footTitle: t("summaryUsed", { count: healthSummary.used }),
            href: basePath,
          },
          {
            key: "missingModels",
            label: t("summaryMissingModels"),
            value: formatCount(healthSummary.missingModels),
            foot: t("summaryMissingModelsHelp"),
            footTitle: t("summaryMissingModelsHelp"),
            href: listHref({ modelStatus: "withoutModels", page: 1 }),
            current: listState.modelStatus === "withoutModels",
            attention: healthSummary.missingModels > 0,
          },
          {
            key: "missingChecklist",
            label: t("summaryMissingChecklist"),
            value: formatCount(healthSummary.missingChecklist),
            foot: t("summaryMissingChecklistHelp"),
            footTitle: t("summaryMissingChecklistHelp"),
            href: listHref({ checklistStatus: "withoutChecklist", page: 1 }),
            current: listState.checklistStatus === "withoutChecklist",
            attention: healthSummary.missingChecklist > 0,
          },
          {
            key: "missingPrefix",
            label: t("summaryMissingPrefix"),
            value: formatCount(healthSummary.missingPrefix),
            foot: t("summaryMissingPrefixHelp"),
            footTitle: t("summaryMissingPrefixHelp"),
            href: listHref({ prefixStatus: "withoutPrefix", page: 1 }),
            current: listState.prefixStatus === "withoutPrefix",
            attention: healthSummary.missingPrefix > 0,
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
          </Field>
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
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("description")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("models")}>{t("models")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("customFields")}>{t("customFieldsShort")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {categories.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={8} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            categories.map((category) => {
              const drilldown = buildCategoryDrilldownHrefs({ locale, categoryId: category.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/categories/${category.id}/edit`, categoryReturnHref)
              return (
                <ClickableTableRow
                  key={category.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${category.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{category.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{category.name}</DataTableCell>
                  <DataTableCell className="min-w-64 text-muted-foreground">{orNil(category.description)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {category._count.models > 0 ? (
                      <Link
                        prefetch={false}
                        href={drilldown.models}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.models)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {category._count.assets > 0 ? (
                      <Link
                        prefetch={false}
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(category._count.customFieldDefs)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
                      code={category.code}
                      name={category.name}
                      menuLabel={tCommon("moreActionsFor", { code: category.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[
                        {
                          key: "related",
                          items: [
                            { kind: "link", key: "assets", label: t("viewAssets"), href: drilldown.assets },
                            { kind: "link", key: "models", label: t("viewModels"), href: drilldown.models },
                          ],
                        },
                      ]}
                      deleteAction={{ endpoint: `/api/categories/${category.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
