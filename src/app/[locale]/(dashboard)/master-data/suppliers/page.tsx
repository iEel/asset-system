import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil, Plus, SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { MasterDataReactivate } from "@/components/master-data/master-data-row-actions"
import { SupplierListView, type SupplierListRow } from "@/components/master-data/supplier-list-view"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RecordStatusSegmented } from "@/components/ui/record-status-segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import {
  formatDeactivatedAt,
  readDeactivatedAt,
  readPageIdsByCount,
  readRecordStatusCounts,
  recordStatusCountWheres,
  type ListIdCount,
} from "@/lib/master-data-list-ui"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildSupplierDrilldownHrefs,
  buildSupplierFilterChips,
  buildSupplierOrderBy,
  buildSupplierQueryString,
  buildSupplierWhere,
  getSupplierDeactivateBlockReason,
  isSupplierCountSort,
  parseSupplierListParams,
  supplierListHasFieldFilters,
  supplierSorts,
  supplierSummaryLineWheres,
  type SupplierCountSort,
  type SupplierListParams,
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"
import { requirePagePermission } from "@/lib/page-auth"
import { readSupplierOpenRepairCounts } from "@/lib/supplier-detail"
import { cn } from "@/lib/utils"

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<SupplierListParams>
}

// Board MD-Suppliers (group 8 plan 3 Task 1, spec §3, §7): plan 1's shared list pattern. Name first with the code and the
// address under it, the contact in one column (or "ยังไม่มีข้อมูลติดต่อ" with "เพิ่มข้อมูลติดต่อ"), the asset, purchase
// document and repair counts with "ค้าง {n}", the record-status segmented control with counts, the filter chips and the
// summary line; the row opens the supplier page and ⋯ holds แก้ไข and ปิดใช้งาน / เปิดใช้งาน. The phone cards and the
// phone filter disclosure are kept (spec §8).
export default async function SuppliersPage({ params, searchParams }: SuppliersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "supplier", "view")
  // Spec §3: ปิดใช้งาน needs supplier:delete (DELETE only deactivates), เปิดใช้งาน supplier:edit (PATCH isActive true).
  // Without supplier:edit no แก้ไข in ⋯ and no "เพิ่มข้อมูลติดต่อ"; the row still opens the supplier page (supplier:view).
  const canDeactivate = hasPermission(user, "supplier", "delete")
  const canEdit = hasPermission(user, "supplier", "edit")
  const canCreate = hasPermission(user, "supplier", "create")
  // The asset count links to the register only with asset:view.
  const canViewAssets = hasPermission(user, "asset", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const listState = parseSupplierListParams(rawSearchParams)
  const where = buildSupplierWhere(listState)
  const summaryLineWheres = supplierSummaryLineWheres(where)

  // Active records only, as the board says (spec §3); the PM plans are read for the ปิดใช้งาน reason (the route's guard).
  const rowInclude = {
    _count: {
      select: {
        assets: { where: { isActive: true } },
        maintenanceTickets: { where: { isActive: true } },
        maintenancePlans: { where: { isActive: true } },
        purchaseDocuments: { where: { isActive: true } },
      },
    },
  } as const
  const sort = listState.sort
  // ทรัพย์สิน and เอกสารจัดซื้อ order by the active counts the columns show (as the categories list): the filtered ids'
  // counts are read in chunks of 2,000 and ordered in memory, then the page's rows are read by id in that order.
  const readRows = isSupplierCountSort(sort)
    ? async () => {
        const ids = (await prisma.supplier.findMany({ where, select: { id: true } })).map((row) => row.id)
        const pageIds = await readPageIdsByCount({
          ids,
          direction: listState.direction,
          page: listState.page,
          pageSize: listState.pageSize,
          readCounts: (chunk) => readActiveSupplierCounts(sort, chunk),
        })
        if (pageIds.length === 0) return []
        const rows = await prisma.supplier.findMany({ where: { id: { in: pageIds } }, include: rowInclude })
        const position = new Map(pageIds.map((id, index) => [id, index]))
        return rows.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
      }
    : () =>
        prisma.supplier.findMany({
          where,
          include: rowInclude,
          orderBy: buildSupplierOrderBy({ sort, direction: listState.direction }),
          skip: (listState.page - 1) * listState.pageSize,
          take: listState.pageSize,
        })

  const [
    suppliers,
    total,
    recordStatusCounts,
    summaryTotal,
    summaryWithAssets,
    summaryWithoutAssets,
    summaryWithoutPurchaseDocuments,
    summaryWithoutDocumentsWithAssets,
    summaryLinkedAssets,
    summaryLineAssets,
    summaryLineOpenRepairs,
  ] = await Promise.all([
    readRows(),
    prisma.supplier.count({ where }),
    // ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}, the list's other filters kept.
    readRecordStatusCounts(prisma.supplier, recordStatusCountWheres(listState, buildSupplierWhere)),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { isActive: true, assets: { some: { isActive: true } } } }),
    prisma.supplier.count({ where: { isActive: true, assets: { none: { isActive: true } } } }),
    prisma.supplier.count({ where: { isActive: true, purchaseDocuments: { none: { isActive: true } } } }),
    // "ในจำนวนนี้มีทรัพย์สินผูกอยู่ {n} ราย" under ยังไม่มีเอกสารจัดซื้อ.
    prisma.supplier.count({ where: { isActive: true, purchaseDocuments: { none: { isActive: true } }, assets: { some: { isActive: true } } } }),
    // "ผูกทรัพย์สินรวม {n} รายการ" under มีทรัพย์สิน: the active assets of the active suppliers.
    prisma.asset.count({ where: { isActive: true, supplier: { is: { isActive: true } } } }),
    prisma.asset.count({ where: summaryLineWheres.assets }),
    prisma.maintenanceTicket.count({ where: summaryLineWheres.openRepairs }),
  ])
  const [deactivatedAt, openRepairCounts] = await Promise.all([
    // "· ปิดใช้งานเมื่อ {date}" on the inactive rows (G8P1-R2).
    readDeactivatedAt(
      prisma,
      "supplier",
      suppliers.filter((supplier) => !supplier.isActive).map((supplier) => supplier.id)
    ),
    // "ค้าง {n}": the page's suppliers' open repairs, grouped by vendor 2,000 ids a query.
    readSupplierOpenRepairCounts(prisma, suppliers.map((supplier) => supplier.id)),
  ])

  const basePath = `/${locale}/master-data/suppliers`
  const supplierReturnHref = `${basePath}?${buildSupplierQueryString(listState, {})}`
  const createHref = appendMasterDataReturnTo(`/${locale}/master-data/suppliers/new`, supplierReturnHref)
  // The phone disclosure opens on a filter field; the record status is the segmented control now, which the clear link
  // still resets. The sort is not a filter.
  const hasFieldFilters = supplierListHasFieldFilters(listState)
  const hasActiveFilters = listState.status !== "active" || hasFieldFilters
  const listHref = (next: Partial<SupplierListState>) => `${basePath}?${buildSupplierQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (suppliers.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const sortLabel = (sort: SupplierSort) => (sort === "createdAt" ? t("list.sortCreatedAt") : t(sort))
  const filterChips = buildSupplierFilterChips({
    basePath,
    state: listState,
    labels: {
      assets: t("assetUsageFilter"),
      purchaseDocuments: t("purchaseDocumentUsageFilter"),
      assetUsage: { withAssets: t("withAssets"), withoutAssets: t("withoutAssets") },
      purchaseDocumentUsage: { withPurchaseDocuments: t("withPurchaseDocuments"), withoutPurchaseDocuments: t("withoutPurchaseDocuments") },
    },
  })
  const filterLabels: FilterLabels = {
    search: tCommon("search"),
    searchPlaceholder: t("searchPlaceholder"),
    assetUsage: t("assetUsageFilter"),
    purchaseDocumentUsage: t("purchaseDocumentUsageFilter"),
    all: tCommon("all"),
    withAssets: t("withAssets"),
    withoutAssets: t("withoutAssets"),
    withPurchaseDocuments: t("withPurchaseDocuments"),
    withoutPurchaseDocuments: t("withoutPurchaseDocuments"),
    sort: t("list.sortLabel"),
    sortOptions: supplierSorts.map((sort) => ({ value: sort, label: sortLabel(sort) })),
    direction: t("list.sortDirection"),
    asc: t("list.sortAsc"),
    desc: t("list.sortDesc"),
    filter: tCommon("filter"),
    clear: t("clearFilters"),
  }
  const deactivateClearItems = (["assets", "maintenanceTickets", "maintenancePlans", "purchaseDocuments"] as const).map((key) => t(`deactivate.clear.${key}`))

  const rows: SupplierListRow[] = suppliers.map((supplier) => {
    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}/edit`, supplierReturnHref)
    const endpoint = `/api/suppliers/${supplier.id}`
    const at = supplier.isActive ? null : deactivatedAt.get(supplier.id)
    // PATCH /api/suppliers/[id] with { isActive: true } only (plan 1 final review: no snapshot of the record goes back).
    const reactivate: MasterDataReactivate | null =
      canEdit && !supplier.isActive
        ? {
            endpoint,
            labels: {
              action: t("reactivate.action"),
              confirmTitle: t("reactivate.confirmTitle", { name: supplier.name }),
              confirmBody: t("reactivate.confirmBody"),
              success: t("reactivate.success"),
            },
          }
        : null
    return {
      supplier,
      counts: {
        assets: supplier._count.assets,
        purchaseDocuments: supplier._count.purchaseDocuments,
        maintenanceTickets: supplier._count.maintenanceTickets,
        openRepairs: openRepairCounts.get(supplier.id) ?? 0,
      },
      hrefs: {
        detail: appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}`, supplierReturnHref),
        edit: editHref,
        assets: buildSupplierDrilldownHrefs({ locale, supplierId: supplier.id }).assets,
      },
      deactivatedLine: supplier.isActive ? null : tCommon("recordStatus.deactivatedAt", { date: at ? formatDeactivatedAt(at, locale) : "–" }),
      links: canEdit ? [{ key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : [],
      // The reason is the DELETE route's (shouldBlockSupplierLifecycleChange): the active assets, repairs, PM plans and
      // purchase documents of the supplier.
      deactivate:
        canDeactivate && supplier.isActive
          ? {
              endpoint,
              blocked: getSupplierDeactivateBlockReason({
                assets: supplier._count.assets,
                maintenanceTickets: supplier._count.maintenanceTickets,
                maintenancePlans: supplier._count.maintenancePlans,
                purchaseDocuments: supplier._count.purchaseDocuments,
              }),
              labels: {
                action: t("deactivate.action"),
                hint: t("deactivate.hint"),
                confirmTitle: t("deactivate.confirmTitle", { name: supplier.name }),
                confirmBody: t("deactivate.confirmBody"),
                clearItems: deactivateClearItems,
                success: t("deactivate.success"),
              },
            }
          : null,
      reactivate,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canCreate ? (
            <Link href={createHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />

      <section aria-label={t("summaryLabel")}>
        <StatStrip
          items={[
            {
              key: "total",
              label: t("summaryTotal"),
              value: formatCount(summaryTotal),
              foot: t("list.totalFoot"),
              footTitle: t("list.totalFoot"),
              href: basePath,
            },
            {
              key: "withAssets",
              label: t("summaryAssetLinked"),
              value: formatCount(summaryWithAssets),
              foot: t("list.withAssetsFoot", { assets: summaryLinkedAssets }),
              footTitle: t("list.withAssetsFoot", { assets: summaryLinkedAssets }),
              href: listHref({ assetUsage: "withAssets", page: 1 }),
              current: listState.assetUsage === "withAssets",
            },
            {
              key: "withoutAssets",
              label: t("summaryWithoutAssets"),
              value: formatCount(summaryWithoutAssets),
              foot: t("list.withoutAssetsFoot", { withAssets: summaryWithAssets, withoutAssets: summaryWithoutAssets, total: summaryTotal }),
              footTitle: t("list.withoutAssetsFoot", { withAssets: summaryWithAssets, withoutAssets: summaryWithoutAssets, total: summaryTotal }),
              href: listHref({ assetUsage: "withoutAssets", page: 1 }),
              current: listState.assetUsage === "withoutAssets",
            },
            {
              key: "withoutPurchaseDocuments",
              label: t("summaryWithoutPurchaseDocuments"),
              value: formatCount(summaryWithoutPurchaseDocuments),
              // The card filters the list; its foot opens the ones of them that hold assets (board).
              foot:
                summaryWithoutDocumentsWithAssets > 0 ? (
                  <Link href={listHref({ purchaseDocumentUsage: "withoutPurchaseDocuments", assetUsage: "withAssets", page: 1 })} className={cn(linkVariants({ size: "inherit" }), "relative z-10")}>
                    {t("list.withoutDocumentsFoot", { count: summaryWithoutDocumentsWithAssets })}
                  </Link>
                ) : (
                  t("summaryWithoutPurchaseDocumentsHelp")
                ),
              footTitle:
                summaryWithoutDocumentsWithAssets > 0
                  ? t("list.withoutDocumentsFoot", { count: summaryWithoutDocumentsWithAssets })
                  : t("summaryWithoutPurchaseDocumentsHelp"),
              href: listHref({ purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 }),
              current: listState.purchaseDocumentUsage === "withoutPurchaseDocuments",
              attention: summaryWithoutPurchaseDocuments > 0,
            },
          ]}
        />
      </section>

      {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). */}
      <details className={cn(getPanelClasses(), "md:hidden")} open={hasFieldFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        <SupplierFilterForm key={supplierReturnHref} basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid gap-3 border-t border-border p-4" />
      </details>

      <FilterPanel className="hidden md:block">
        <SupplierFilterForm key={supplierReturnHref} basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3" />
      </FilterPanel>

      <RecordStatusSegmented value={listState.status} counts={recordStatusCounts} hrefFor={(status) => listHref({ status, page: 1 })} />

      {/* Board MD-Suppliers: the chips of the filters in use with ล้างตัวกรอง, then the summary line over the whole
          filtered set. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterChipList
          chips={filterChips}
          label={t("activeFilters")}
          removeLabel={t("clearFilter")}
          clearAll={{ href: basePath, label: t("clearFilters") }}
        />
        <p className="num text-meta text-muted-foreground md:ml-auto">
          {t("list.summaryLine", { suppliers: total, assets: summaryLineAssets, openRepairs: summaryLineOpenRepairs, sort: sortLabel(listState.sort) })}
        </p>
      </div>

      <SupplierListView
        rows={rows}
        current={listState}
        basePath={basePath}
        createHref={canCreate ? createHref : null}
        hasActiveFilters={hasActiveFilters}
        showRecordStatus={listState.status === "all"}
        canEdit={canEdit}
        canViewAssets={canViewAssets}
        pagination={
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
              range: `${tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) })} · ${tCommon("recordStatus.footerCounts", { active: recordStatusCounts.active, inactive: recordStatusCounts.inactive })}`,
              pageSizeGroup: tCommon("pageSizeLabel"),
              rowsPerPage: tCommon("rowsPerPage"),
            }}
          />
        }
        labels={{
          title: t("title"),
          tableScrollHint: tCommon("tableScrollHint"),
          name: t("name"),
          contactPerson: t("contactPerson"),
          assets: t("list.assets"),
          purchaseDocuments: t("purchaseDocuments"),
          maintenanceTickets: t("maintenanceTickets"),
          status: tCommon("status"),
          active: tCommon("active"),
          inactive: tCommon("inactive"),
          actions: tCommon("actions"),
          view: tCommon("view"),
          create: t("createTitle"),
          clearFilters: t("clearFilters"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          filteredEmptyTitle: t("filteredEmptyTitle"),
          filteredEmptyDescription: t("filteredEmptyDescription"),
          noContact: t("noContactDetail"),
          addContact: t("list.addContact"),
          none: t("list.none"),
          countsNote: t("list.countsNote"),
          openRepairs: (count) => t("list.openRepairs", { count }),
          moreActionsFor: (code) => tCommon("moreActionsFor", { code }),
        }}
      />
    </div>
  )
}

// The active assets or purchase documents of these suppliers, counted per supplier (one chunk of at most 2,000 ids).
async function readActiveSupplierCounts(sort: SupplierCountSort, chunk: string[]): Promise<ListIdCount[]> {
  const where = { isActive: true, supplierId: { in: chunk } }
  const rows =
    sort === "assets"
      ? await prisma.asset.groupBy({ by: ["supplierId"], where, _count: { _all: true } })
      : await prisma.purchaseDocument.groupBy({ by: ["supplierId"], where, _count: { _all: true } })
  return rows.flatMap((row) => (row.supplierId ? [{ id: row.supplierId, count: row._count._all }] : []))
}

type FilterLabels = {
  search: string
  searchPlaceholder: string
  assetUsage: string
  purchaseDocumentUsage: string
  all: string
  withAssets: string
  withoutAssets: string
  withPurchaseDocuments: string
  withoutPurchaseDocuments: string
  sort: string
  sortOptions: { value: string; label: string }[]
  direction: string
  asc: string
  desc: string
  filter: string
  clear: string
}

// Rendered twice: in the phone disclosure and in the desktop panel. Field gives each copy its own ids (useId), and
// the copy that is display: none leaves the accessibility tree, so the page keeps one search landmark (spec 2B §6.2 6-ช).
// Keyed on the list's query by the page: a header sort, a card, a chip or the segmented control changes the URL without
// this form, and the uncontrolled selects would otherwise send the old sort and filters with the next search (plan 1
// final review). Every sort stays reachable here (code, phone, email and date added too), on phones as well.
function SupplierFilterForm({
  basePath,
  current,
  labels,
  hasActiveFilters,
  className,
}: {
  basePath: string
  current: SupplierListState
  labels: FilterLabels
  hasActiveFilters: boolean
  className: string
}) {
  return (
    <form role="search" className={className} action={basePath}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={current.pageSize} />
      {/* The record status is the segmented control (spec §3); a search keeps it. */}
      {current.status !== "active" ? <input type="hidden" name="status" value={current.status} /> : null}
      <Field label={labels.search}>
        <SearchField name="search" defaultValue={current.search} placeholder={labels.searchPlaceholder} />
      </Field>
      <FilterSelect label={labels.assetUsage} name="assetUsage" defaultValue={current.assetUsage}>
        <option value="all">{labels.all}</option>
        <option value="withAssets">{labels.withAssets}</option>
        <option value="withoutAssets">{labels.withoutAssets}</option>
      </FilterSelect>
      <FilterSelect label={labels.purchaseDocumentUsage} name="purchaseDocumentUsage" defaultValue={current.purchaseDocumentUsage}>
        <option value="all">{labels.all}</option>
        <option value="withPurchaseDocuments">{labels.withPurchaseDocuments}</option>
        <option value="withoutPurchaseDocuments">{labels.withoutPurchaseDocuments}</option>
      </FilterSelect>
      <FilterSelect label={labels.sort} name="sort" defaultValue={current.sort} options={labels.sortOptions} />
      <FilterSelect
        label={labels.direction}
        name="direction"
        defaultValue={current.direction}
        options={[
          { value: "asc", label: labels.asc },
          { value: "desc", label: labels.desc },
        ]}
      />
      <FilterFormActions submitLabel={labels.filter} clear={hasActiveFilters ? { href: basePath, label: labels.clear } : undefined} />
    </form>
  )
}
