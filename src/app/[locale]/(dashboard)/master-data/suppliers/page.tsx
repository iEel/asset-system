import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SupplierDeleteButton } from "@/components/master-data/supplier-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildSupplierDrilldownHrefs,
  buildSupplierOrderBy,
  buildSupplierQueryString,
  buildSupplierSummary,
  buildSupplierWhere,
  parseSupplierListParams,
  type SupplierListParams,
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"

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

  const [suppliers, total, summarySuppliers] = await Promise.all([
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
    prisma.supplier.findMany({
      where: { isActive: true },
      select: {
        _count: {
          select: {
            assets: { where: { isActive: true } },
            purchaseDocuments: { where: { isActive: true } },
          },
        },
      },
    }),
  ])
  const basePath = `/${locale}/master-data/suppliers`
  const supplierReturnHref = `${basePath}?${buildSupplierQueryString(listState, {})}`
  const summary = buildSupplierSummary(summarySuppliers)

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/suppliers/new`, supplierReturnHref)}
        createLabel={tCommon("create")}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryWithAssets", { count: summary.withAssets })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryAssetLinked")}
          value={summary.withAssets}
          detail={t("summaryAssetLinkedHelp")}
          href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutPurchaseDocuments")}
          value={summary.withoutPurchaseDocuments}
          detail={t("summaryWithoutPurchaseDocumentsHelp")}
          href={`${basePath}?${buildSupplierQueryString(listState, { purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 })}`}
          tone={summary.withoutPurchaseDocuments > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listState.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <FilterSelect label={t("assetUsageFilter")} name="assetUsage" defaultValue={listState.assetUsage}>
            <option value="all">{tCommon("all")}</option>
            <option value="withAssets">{t("withAssets")}</option>
            <option value="withoutAssets">{t("withoutAssets")}</option>
          </FilterSelect>
          <FilterSelect label={t("purchaseDocumentUsageFilter")} name="purchaseDocumentUsage" defaultValue={listState.purchaseDocumentUsage}>
            <option value="all">{tCommon("all")}</option>
            <option value="withPurchaseDocuments">{t("withPurchaseDocuments")}</option>
            <option value="withoutPurchaseDocuments">{t("withoutPurchaseDocuments")}</option>
          </FilterSelect>
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
                <SupplierSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="contactPerson" current={listState} basePath={basePath}>{t("contactPerson")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="phone" current={listState} basePath={basePath}>{t("phone")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="email" current={listState} basePath={basePath}>{t("email")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</SupplierSortableColumnHeader>
                <SupplierSortableColumnHeader field="purchaseDocuments" current={listState} basePath={basePath}>{t("purchaseDocuments")}</SupplierSortableColumnHeader>
                <ColumnHeader>{t("maintenanceTickets")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => {
                  const drilldown = buildSupplierDrilldownHrefs({ locale, supplierId: supplier.id })
                  const detailHref = appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}`, supplierReturnHref)
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}/edit`, supplierReturnHref)
                  return (
                    <ClickableTableRow
                      key={supplier.id}
                      href={detailHref}
                      label={`${tCommon("view")}: ${supplier.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{supplier.code}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.address ? <div className="text-xs text-muted-foreground">{supplier.address}</div> : null}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">{supplier.contactPerson || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier.phone || "-"}</td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">{supplier.email || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {supplier._count.assets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {supplier._count.assets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.purchaseDocuments.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.maintenanceTickets.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <SupplierDeleteButton id={supplier.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <SupplierPagination
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

function FilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
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

function SupplierSortableColumnHeader({
  children,
  field,
  current,
  basePath,
}: {
  children: React.ReactNode
  field: SupplierSort
  current: SupplierListState
  basePath: string
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildSupplierQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      <Link href={href} className="inline-flex items-center gap-1 hover:text-primary">
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function SupplierPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: SupplierListState
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
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)

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
            href={`${basePath}?${buildSupplierQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {current.page} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildSupplierQueryString(current, { page: previousPage })}`}
          aria-disabled={current.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildSupplierQueryString(current, { page: nextPage })}`}
          aria-disabled={current.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}
