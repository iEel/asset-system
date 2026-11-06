import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Download, FileSpreadsheet, Monitor, Package, Pencil, Plus, Settings } from "lucide-react"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RecordStatusSegmented } from "@/components/ui/record-status-segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { MasterDataReactivateButton, MasterDataRowActions, type MasterDataReactivate } from "@/components/master-data/master-data-row-actions"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { getCategoryDeleteBlockReason } from "@/lib/category-delete-guard"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { paginationRange } from "@/lib/master-data-query"
import { chunkListIds, formatDeactivatedAt, readDeactivatedAt, readRecordStatusCounts, recordStatusCountWheres } from "@/lib/master-data-list-ui"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildCategoryOrderBy,
  buildCategoryHealthSummary,
  buildCategoryDrilldownHrefs,
  buildCategoryPrefixCells,
  buildCategoryPrefixSettingsHref,
  buildCategoryQueryString,
  buildCategoryWhere,
  categoryFooterTotalWheres,
  categorySorts,
  isCategoryCountSort,
  parseCategoryListParams,
  parseCategoryPrefixMap,
  readCategoryPageIdsByActiveCount,
  sharedPrefixCategoryIds,
  type CategoryActiveCountRow,
  type CategoryCountSort,
  type CategoryListParams,
  type CategoryListState,
  type CategorySort,
} from "@/lib/category-list-query"

type CategoriesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<CategoryListParams>
}

// Board MD-Categories (group 8 plan 2 Task 1, spec §3, §6): plan 1's shared list pattern. Name first with the code under
// it, the record-status segmented control with counts, the status column only under ทั้งหมด; the prefix (from the
// settings), custom-field and photo-checklist columns say what is missing; the row opens the edit page and ⋯ holds แก้ไข,
// ดูรุ่น, ดูทรัพย์สิน, the prefix in the settings and ปิดใช้งาน / เปิดใช้งาน. The description column goes; it stays searchable.
export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "category", "view")
  // Spec §3: ปิดใช้งาน needs category:delete (DELETE only deactivates), เปิดใช้งาน category:edit (PATCH isActive true).
  // Without category:edit no แก้ไข in ⋯ and the row is a plain row; no เพิ่มหมวดหมู่ without category:create.
  const canDeactivate = hasPermission(user, "category", "delete")
  const canEdit = hasPermission(user, "category", "edit")
  const canCreate = hasPermission(user, "category", "create")
  // A count links to its list only with that list's view permission: the models drilldown opens the brands page.
  const canViewModels = hasPermission(user, "brand", "view")
  const canViewAssets = hasPermission(user, "asset", "view")
  // The prefixes are edited on the settings page (setting:view opens it).
  const canViewSettings = hasPermission(user, "setting", "view")

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
  // รูปที่ต้องถ่าย: the number of checklist items of each category.
  const photoCounts = new Map(
    photoChecklistSettings.map((setting) => [setting.key.replace(categoryPhotoChecklistKey(""), ""), parsePhotoChecklist(setting.value).length])
  )
  const categoryIdsWithChecklist = [...photoCounts].filter(([, count]) => count > 0).map(([categoryId]) => categoryId)
  const categoryIdsWithPrefix = Object.keys(parseCategoryPrefixMap(prefixSetting?.value))
  const buildWhere = (state: CategoryListState) => buildCategoryWhere(state, { categoryIdsWithChecklist, categoryIdsWithPrefix })
  const where = buildWhere(listState)
  const footerWheres = categoryFooterTotalWheres(where)
  const sharedIds = sharedPrefixCategoryIds(prefixSetting?.value)

  // Active records only, as the board footers say (spec §3).
  const rowInclude = {
    _count: {
      select: {
        models: { where: { isActive: true } },
        assets: { where: { isActive: true } },
        customFieldDefs: { where: { isActive: true } },
      },
    },
  } as const
  const sort = listState.sort
  // รุ่น, ทรัพย์สิน and ข้อมูลเพิ่ม order by the active counts the columns show (final review fix 1): the filtered ids'
  // counts are read in chunks and ordered in memory, then the page's rows are read by id in that order.
  const readRows = isCategoryCountSort(sort)
    ? async () => {
        const ids = (await prisma.assetCategory.findMany({ where, select: { id: true } })).map((row) => row.id)
        const pageIds = await readCategoryPageIdsByActiveCount({
          ids,
          direction: listState.direction,
          page: listState.page,
          pageSize: listState.pageSize,
          readCounts: (chunk) => readActiveCategoryCounts(sort, chunk),
        })
        if (pageIds.length === 0) return []
        const rows = await prisma.assetCategory.findMany({ where: { id: { in: pageIds } }, include: rowInclude })
        const position = new Map(pageIds.map((id, index) => [id, index]))
        return rows.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
      }
    : () =>
        prisma.assetCategory.findMany({
          where,
          include: rowInclude,
          orderBy: buildCategoryOrderBy({ sort, direction: listState.direction }),
          skip: (listState.page - 1) * listState.pageSize,
          take: listState.pageSize,
        })

  const [categories, total, summaryCategories, recordStatusCounts, footerModels, footerAssets, sharedPrefixCategories] = await Promise.all([
    readRows(),
    prisma.assetCategory.count({ where }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        _count: {
          select: {
            assets: { where: { isActive: true } },
            models: { where: { isActive: true } },
            customFieldDefs: { where: { isActive: true } },
          },
        },
      },
    }),
    // ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}, the list's other filters kept.
    readRecordStatusCounts(prisma.assetCategory, recordStatusCountWheres(listState, buildWhere)),
    prisma.assetModel.count({ where: footerWheres.models }),
    prisma.asset.count({ where: footerWheres.assets }),
    // "ใช้ร่วมกับ {other}": the names of the active categories in a shared prefix group, read in id chunks of 2,000.
    Promise.all(
      chunkListIds(sharedIds).map((chunk) =>
        prisma.assetCategory.findMany({ where: { id: { in: chunk }, isActive: true }, select: { id: true, name: true } })
      )
    ).then((parts) => parts.flat()),
  ])
  const activeRowIds = categories.filter((category) => category.isActive).map((category) => category.id)
  const [deactivatedAt, blockCountRows] = await Promise.all([
    // "· ปิดใช้งานเมื่อ {date}" on the inactive rows (G8P1-R2).
    readDeactivatedAt(
      prisma,
      "category",
      categories.filter((category) => !category.isActive).map((category) => category.id)
    ),
    // The ปิดใช้งาน reason is the DELETE route's: every model and asset of the category counts, inactive ones too.
    canDeactivate && activeRowIds.length
      ? prisma.assetCategory.findMany({ where: { id: { in: activeRowIds } }, select: { id: true, _count: { select: { assets: true, models: true } } } })
      : Promise.resolve([] as { id: string; _count: { assets: number; models: number } }[]),
  ])
  const blockCounts = new Map(blockCountRows.map((row) => [row.id, row._count]))
  const prefixNames = new Map(sharedPrefixCategories.map((category) => [category.id, category.name]))
  const prefixCells = buildCategoryPrefixCells(prefixSetting?.value, categories.map((category) => category.id), prefixNames)
  const prefixSettingsHref = buildCategoryPrefixSettingsHref(locale)
  const footerTotals = { models: footerModels, assets: footerAssets }

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
  // The record status is the segmented control now, not a form field; the clear link still resets it. The sort is not a
  // filter (as on the companies list).
  const hasActiveFilters = listState.status !== "active" || Boolean(
    searchText ||
      listState.assetUsage !== "all" ||
      listState.modelStatus !== "all" ||
      listState.customFieldStatus !== "all" ||
      listState.checklistStatus !== "all" ||
      listState.prefixStatus !== "all",
  )
  // Spec §3: the status column shows only under ทั้งหมด.
  const showRecordStatus = listState.status === "all"
  const columnCount = showRecordStatus ? 8 : 7
  const sortBy = (field: CategorySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const sortLabel = (sort: CategorySort) => {
    if (sort === "createdAt") return t("list.sortCreatedAt")
    if (sort === "code") return t("code")
    if (sort === "name") return t("name")
    if (sort === "customFields") return t("list.customFields")
    return t(`list.${sort}`)
  }
  const deactivateClearItems = (["models", "assets"] as const).map((key) => t(`deactivate.clear.${key}`))

  const rows = categories.map((category) => {
    const drilldown = buildCategoryDrilldownHrefs({ locale, categoryId: category.id })
    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/categories/${category.id}/edit`, categoryReturnHref)
    const endpoint = `/api/categories/${category.id}`
    const at = category.isActive ? null : deactivatedAt.get(category.id)
    const prefixCell = prefixCells.get(category.id) ?? { prefix: null, sharedWith: [] }
    // PATCH /api/categories/[id] with { isActive: true } only (plan 1 final review: no snapshot of the record goes back).
    const reactivate: MasterDataReactivate | null =
      canEdit && !category.isActive
        ? {
            endpoint,
            labels: {
              action: t("reactivate.action"),
              confirmTitle: t("reactivate.confirmTitle", { name: category.name }),
              confirmBody: t("reactivate.confirmBody"),
              success: t("reactivate.success"),
            },
          }
        : null
    return {
      category,
      drilldown,
      editHref,
      reactivate,
      prefixCell,
      photoCount: photoCounts.get(category.id) ?? 0,
      deactivatedLine: category.isActive ? null : tCommon("recordStatus.deactivatedAt", { date: at ? formatDeactivatedAt(at, locale) : "–" }),
      links: [
        ...(canEdit ? [{ key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : []),
        ...(canViewModels
          ? [{ key: "models", label: t("list.viewModels", { count: category._count.models }), href: drilldown.models, icon: <Monitor aria-hidden="true" /> }]
          : []),
        ...(canViewAssets
          ? [{ key: "assets", label: t("list.viewAssets", { count: category._count.assets }), href: drilldown.assets, icon: <Package aria-hidden="true" /> }]
          : []),
        ...(canViewSettings
          ? [
              {
                key: "prefix",
                label: prefixCell.prefix ? t("list.prefixInSettings", { prefix: prefixCell.prefix }) : t("list.setPrefixInSettings"),
                href: prefixSettingsHref,
                icon: <Settings aria-hidden="true" />,
              },
            ]
          : []),
      ],
      deactivate:
        canDeactivate && category.isActive
          ? {
              endpoint,
              blocked: getCategoryDeleteBlockReason(blockCounts.get(category.id) ?? { assets: 0, models: 0 }),
              labels: {
                action: t("deactivate.action"),
                hint: t("deactivate.hint"),
                confirmTitle: t("deactivate.confirmTitle", { name: category.name }),
                confirmBody: t("deactivate.confirmBody"),
                clearItems: deactivateClearItems,
                success: t("deactivate.success"),
              },
            }
          : null,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <a href="/api/categories/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadCategoryExport")}
            </a>
            <a href="/api/categories/import-template" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadCategoryTemplate")}
            </a>
            {canCreate ? (
              <Link href={appendMasterDataReturnTo(`/${locale}/master-data/categories/new`, categoryReturnHref)} className={buttonVariants({ size: "md" })}>
                <Plus aria-hidden="true" />
                {t("createTitle")}
              </Link>
            ) : null}
          </>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(healthSummary.total),
            foot: t("list.totals", { models: healthSummary.modelTotal, assets: healthSummary.assetTotal }),
            footTitle: t("list.totals", { models: healthSummary.modelTotal, assets: healthSummary.assetTotal }),
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
            // The card filters the list; "ตั้งในการตั้งค่า ›" in its foot opens the settings where prefixes are set (board).
            foot: canViewSettings ? (
              <>
                {t("summaryMissingPrefixHelp")}
                {" · "}
                <Link href={prefixSettingsHref} className={cn(linkVariants({ size: "inherit" }), "relative z-10")}>
                  {t("list.prefixSettingsLink")}
                </Link>
              </>
            ) : (
              t("summaryMissingPrefixHelp")
            ),
            footTitle: t("summaryMissingPrefixHelp"),
            href: listHref({ prefixStatus: "withoutPrefix", page: 1 }),
            current: listState.prefixStatus === "withoutPrefix",
            attention: healthSummary.missingPrefix > 0,
          },
        ]}
      />

      <FilterPanel>
        {/* Search, the five health filters, the sort and its order: every sort stays reachable here (code and date added
            too, which no header carries), on phones as well. */}
        {/* Keyed on the list's query: a header sort, a card or the segmented control changes the URL without this form, and
            the uncontrolled selects would otherwise send the old sort and filters with the next search (plan 1 final review). */}
        <form key={categoryReturnHref} role="search" action={basePath} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          {/* The record status is the segmented control below (spec §3); a search keeps it. */}
          {listState.status !== "active" ? <input type="hidden" name="status" value={listState.status} /> : null}
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
          <FilterSelect
            label={t("list.sortLabel")}
            name="sort"
            defaultValue={listState.sort}
            options={categorySorts.map((sort) => ({ value: sort, label: sortLabel(sort) }))}
          />
          <FilterSelect
            label={t("list.sortDirection")}
            name="direction"
            defaultValue={listState.direction}
            options={[
              { value: "asc", label: t("list.sortAsc") },
              { value: "desc", label: t("list.sortDesc") },
            ]}
          />
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <RecordStatusSegmented value={listState.status} counts={recordStatusCounts} hrefFor={(status) => listHref({ status, page: 1 })} />

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <div className="space-y-2">
              <p>{t("list.countsNote")}</p>
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
                  range: `${tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) })} · ${t("list.totals", { models: footerTotals.models, assets: footerTotals.assets })} · ${tCommon("recordStatus.footerCounts", { active: recordStatusCounts.active, inactive: recordStatusCounts.inactive })}`,
                  pageSizeGroup: tCommon("pageSizeLabel"),
                  rowsPerPage: tCommon("rowsPerPage"),
                }}
              />
            </div>
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("list.prefix")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("models")}>{t("list.models")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("list.assets")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("customFields")}>{t("list.customFields")}</DataTableHead>
            <DataTableHead align="right">{t("list.photoChecklist")}</DataTableHead>
            {showRecordStatus ? <DataTableHead>{tCommon("status")}</DataTableHead> : null}
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={columnCount} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={columnCount}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            rows.map(({ category, drilldown, editHref, reactivate, prefixCell, photoCount, deactivatedLine, links, deactivate }) => {
              const cells = (
                <>
                <DataTableCell className="min-w-56">
                  <div className={cn("font-semibold", category.isActive ? "text-foreground" : "text-muted-foreground")}>{category.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="tag">{category.code}</span>
                    {deactivatedLine ? <> · {deactivatedLine}</> : null}
                  </div>
                </DataTableCell>
                <DataTableCell className="min-w-44 text-muted-foreground">
                  {prefixCell.prefix ? (
                    <>
                      <span className="tag font-medium text-foreground">{prefixCell.prefix}</span>
                      {prefixCell.sharedWith.length > 0 ? (
                        <span className="block text-xs">{t("list.prefixSharedWith", { names: prefixCell.sharedWith.join(", ") })}</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <StatusBadge label={t("list.prefixMissing")} tone="warning" />
                      <span className="mt-0.5 block text-xs">{t("list.prefixFallback", { code: category.code })}</span>
                    </>
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewModels && category._count.models > 0 ? (
                    <Link
                      prefetch={false}
                      href={drilldown.models}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(category._count.models)}
                    </Link>
                  ) : (
                    formatCount(category._count.models)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewAssets && category._count.assets > 0 ? (
                    <Link
                      prefetch={false}
                      href={drilldown.assets}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(category._count.assets)}
                    </Link>
                  ) : (
                    formatCount(category._count.assets)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="whitespace-nowrap text-muted-foreground">
                  {category._count.customFieldDefs > 0 ? t("list.customFieldCount", { count: category._count.customFieldDefs }) : t("list.none")}
                </DataTableCell>
                <DataTableCell numeric className="whitespace-nowrap text-muted-foreground">
                  {photoCount > 0 ? t("list.photoCount", { count: photoCount }) : t("list.none")}
                </DataTableCell>
                {showRecordStatus ? (
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={category.isActive ? tCommon("active") : tCommon("inactive")} tone={category.isActive ? "success" : "muted"} />
                    {reactivate ? <MasterDataReactivateButton reactivate={reactivate} /> : null}
                  </DataTableCell>
                ) : null}
                <DataTableCell align="right" sticky="right">
                  <MasterDataRowActions
                    code={category.code}
                    name={category.name}
                    menuLabel={tCommon("moreActionsFor", { code: category.code })}
                    links={links}
                    deactivate={deactivate}
                    reactivate={reactivate}
                  />
                </DataTableCell>
                </>
              )
              // Without category:edit the row is plain: it opens nothing (⋯ has no แก้ไข either).
              return canEdit ? (
                <ClickableTableRow key={category.id} href={editHref} label={`${tCommon("edit")}: ${category.code}`}>
                  {cells}
                </ClickableTableRow>
              ) : (
                <DataTableRow key={category.id}>{cells}</DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

// The active models, assets or custom fields of these categories, counted per category (one chunk of at most 2,000 ids).
async function readActiveCategoryCounts(sort: CategoryCountSort, chunk: string[]): Promise<CategoryActiveCountRow[]> {
  const where = { isActive: true, categoryId: { in: chunk } }
  const rows =
    sort === "models"
      ? await prisma.assetModel.groupBy({ by: ["categoryId"], where, _count: { _all: true } })
      : sort === "assets"
        ? await prisma.asset.groupBy({ by: ["categoryId"], where, _count: { _all: true } })
        : await prisma.customFieldDefinition.groupBy({ by: ["categoryId"], where, _count: { _all: true } })
  return rows.map((row) => ({ categoryId: row.categoryId, count: row._count._all }))
}
