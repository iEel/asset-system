import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { SupplierListView } from "@/components/master-data/supplier-list-view"
import { buttonVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildSupplierOrderBy,
  buildSupplierQueryString,
  buildSupplierWhere,
  parseSupplierListParams,
  type SupplierListParams,
  type SupplierListState,
} from "@/lib/organization-master-query"
import { requirePagePermission } from "@/lib/page-auth"

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<SupplierListParams>
}

export default async function SuppliersPage({ params, searchParams }: SuppliersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "supplier", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const listState = parseSupplierListParams(rawSearchParams)
  const where = buildSupplierWhere(listState)

  const [suppliers, total, summaryTotal, summaryWithAssets, summaryWithoutAssets, summaryWithoutPurchaseDocuments] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: { where: { isActive: true } },
            maintenanceTickets: { where: { isActive: true } },
            purchaseDocuments: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildSupplierOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.supplier.count({ where }),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { isActive: true, assets: { some: { isActive: true } } } }),
    prisma.supplier.count({ where: { isActive: true, assets: { none: { isActive: true } } } }),
    prisma.supplier.count({ where: { isActive: true, purchaseDocuments: { none: { isActive: true } } } }),
  ])

  const basePath = `/${locale}/master-data/suppliers`
  const supplierReturnHref = `${basePath}?${buildSupplierQueryString(listState, {})}`
  const createHref = appendMasterDataReturnTo(`/${locale}/master-data/suppliers/new`, supplierReturnHref)
  const hasActiveFilters = Boolean(
    listState.search || listState.assetUsage !== "all" || listState.purchaseDocumentUsage !== "all"
  )
  const listHref = (next: Partial<SupplierListState>) => `${basePath}?${buildSupplierQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (suppliers.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const filterLabels = {
    search: tCommon("search"),
    searchPlaceholder: t("searchPlaceholder"),
    assetUsage: t("assetUsageFilter"),
    purchaseDocumentUsage: t("purchaseDocumentUsageFilter"),
    all: tCommon("all"),
    withAssets: t("withAssets"),
    withoutAssets: t("withoutAssets"),
    withPurchaseDocuments: t("withPurchaseDocuments"),
    withoutPurchaseDocuments: t("withoutPurchaseDocuments"),
    filter: tCommon("filter"),
    clear: t("clearFilters"),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={createHref} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <section aria-label={t("summaryLabel")}>
        <StatStrip
          items={[
            {
              key: "total",
              label: t("summaryTotal"),
              value: formatCount(summaryTotal),
              foot: t("summaryWithAssets", { count: summaryWithAssets }),
              footTitle: t("summaryWithAssets", { count: summaryWithAssets }),
              href: basePath,
            },
            {
              key: "withAssets",
              label: t("summaryAssetLinked"),
              value: formatCount(summaryWithAssets),
              foot: t("summaryAssetLinkedHelp"),
              footTitle: t("summaryAssetLinkedHelp"),
              href: listHref({ assetUsage: "withAssets", page: 1 }),
              current: listState.assetUsage === "withAssets",
            },
            {
              key: "withoutAssets",
              label: t("summaryWithoutAssets"),
              value: formatCount(summaryWithoutAssets),
              foot: t("summaryWithoutAssetsHelp"),
              footTitle: t("summaryWithoutAssetsHelp"),
              href: listHref({ assetUsage: "withoutAssets", page: 1 }),
              current: listState.assetUsage === "withoutAssets",
            },
            {
              key: "withoutPurchaseDocuments",
              label: t("summaryWithoutPurchaseDocuments"),
              value: formatCount(summaryWithoutPurchaseDocuments),
              foot: t("summaryWithoutPurchaseDocumentsHelp"),
              footTitle: t("summaryWithoutPurchaseDocumentsHelp"),
              href: listHref({ purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 }),
              current: listState.purchaseDocumentUsage === "withoutPurchaseDocuments",
              attention: summaryWithoutPurchaseDocuments > 0,
            },
          ]}
        />
      </section>

      <details className="rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid gap-3 border-t border-border p-4" />
      </details>

      <FilterPanel className="hidden md:block">
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" />
      </FilterPanel>

      <SupplierListView
        suppliers={suppliers}
        locale={locale}
        current={listState}
        basePath={basePath}
        supplierReturnHref={supplierReturnHref}
        createHref={createHref}
        hasActiveFilters={hasActiveFilters}
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
              range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
              pageSizeGroup: tCommon("pageSizeLabel"),
              rowsPerPage: tCommon("rowsPerPage"),
            }}
          />
        }
        labels={{
          title: t("title"),
          tableScrollHint: tCommon("tableScrollHint"),
          code: t("code"),
          name: t("name"),
          contactPerson: t("contactPerson"),
          phone: t("phone"),
          email: t("email"),
          assets: t("assets"),
          purchaseDocuments: t("purchaseDocuments"),
          maintenanceTickets: t("maintenanceTickets"),
          actions: tCommon("actions"),
          edit: tCommon("edit"),
          view: tCommon("view"),
          create: tCommon("create"),
          clearFilters: t("clearFilters"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          filteredEmptyTitle: t("filteredEmptyTitle"),
          filteredEmptyDescription: t("filteredEmptyDescription"),
          moreActionsFor: (code) => tCommon("moreActionsFor", { code }),
        }}
      />
    </div>
  )
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
  filter: string
  clear: string
}

// Rendered twice: in the phone disclosure and in the desktop panel. Field gives each copy its own ids (useId), and
// the copy that is display: none leaves the accessibility tree, so the page keeps one search landmark (spec 2B §6.2 6-ช).
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
      <input type="hidden" name="sort" value={current.sort} />
      <input type="hidden" name="direction" value={current.direction} />
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
      <FilterFormActions submitLabel={labels.filter} clear={hasActiveFilters ? { href: basePath, label: labels.clear } : undefined} />
    </form>
  )
}
