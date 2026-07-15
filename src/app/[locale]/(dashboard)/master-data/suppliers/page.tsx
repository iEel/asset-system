import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
import { SupplierListView } from "@/components/master-data/supplier-list-view"
import { prisma } from "@/lib/db"
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
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={createHref}
        createLabel={tCommon("create")}
      />

      <div aria-label={t("summaryLabel")} className="grid auto-cols-[minmax(240px,85%)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
        <SummaryTile label={t("summaryTotal")} value={summaryTotal} detail={t("summaryWithAssets", { count: summaryWithAssets })} href={basePath} />
        <SummaryTile label={t("summaryAssetLinked")} value={summaryWithAssets} detail={t("summaryAssetLinkedHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withAssets", page: 1 })}`} />
        <SummaryTile label={t("summaryWithoutAssets")} value={summaryWithoutAssets} detail={t("summaryWithoutAssetsHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`} />
        <SummaryTile label={t("summaryWithoutPurchaseDocuments")} value={summaryWithoutPurchaseDocuments} detail={t("summaryWithoutPurchaseDocumentsHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 })}`} tone={summaryWithoutPurchaseDocuments > 0 ? "warning" : "neutral"} />
      </div>

      <details className="rounded-lg border border-border bg-surface shadow-sm md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} className="grid gap-3 border-t border-border p-4" />
      </details>

      <div className="hidden rounded-lg border border-border bg-surface p-4 shadow-sm md:block">
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" />
      </div>

      <SupplierListView
        suppliers={suppliers}
        locale={locale}
        current={listState}
        total={total}
        basePath={basePath}
        supplierReturnHref={supplierReturnHref}
        createHref={createHref}
        hasActiveFilters={hasActiveFilters}
        labels={{
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
          delete: tCommon("delete"),
          view: tCommon("view"),
          create: tCommon("create"),
          clearFilters: t("clearFilters"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          filteredEmptyTitle: t("filteredEmptyTitle"),
          filteredEmptyDescription: t("filteredEmptyDescription"),
          rowsPerPage: tCommon("rowsPerPage"),
          page: tCommon("page"),
          of: tCommon("of"),
          previous: tCommon("previous"),
          next: tCommon("next"),
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

function SupplierFilterForm({ basePath, current, labels, className }: { basePath: string; current: SupplierListState; labels: FilterLabels; className: string }) {
  const controlClassName = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
  return (
    <form className={className} action={basePath}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={current.pageSize} />
      <input type="hidden" name="sort" value={current.sort} />
      <input type="hidden" name="direction" value={current.direction} />
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>{labels.search}</span>
        <input type="search" name="search" defaultValue={current.search} placeholder={labels.searchPlaceholder} className={controlClassName} />
      </label>
      <FilterSelect label={labels.assetUsage} name="assetUsage" defaultValue={current.assetUsage} className={controlClassName}>
        <option value="all">{labels.all}</option>
        <option value="withAssets">{labels.withAssets}</option>
        <option value="withoutAssets">{labels.withoutAssets}</option>
      </FilterSelect>
      <FilterSelect label={labels.purchaseDocumentUsage} name="purchaseDocumentUsage" defaultValue={current.purchaseDocumentUsage} className={controlClassName}>
        <option value="all">{labels.all}</option>
        <option value="withPurchaseDocuments">{labels.withPurchaseDocuments}</option>
        <option value="withoutPurchaseDocuments">{labels.withoutPurchaseDocuments}</option>
      </FilterSelect>
      <div className="grid grid-cols-2 items-end gap-2 md:flex">
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{labels.filter}</button>
        <Link href={basePath} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{labels.clear}</Link>
      </div>
    </form>
  )
}

function FilterSelect({ label, name, defaultValue, className, children }: { label: string; name: string; defaultValue: string; className: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-medium text-foreground"><span>{label}</span><select name={name} defaultValue={defaultValue} className={className}>{children}</select></label>
}

function SummaryTile({ label, value, detail, href, tone = "neutral" }: { label: string; value: number; detail: string; href: string; tone?: "neutral" | "warning" }) {
  return (
    <Link href={href} className={`min-h-32 rounded-lg border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tone === "warning" ? "border-warning/40" : "border-border"}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}
