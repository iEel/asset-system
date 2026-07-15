import Link from "next/link"
import { ArrowDown, ArrowUp, Edit, Eye } from "lucide-react"
import { SupplierDeleteButton } from "@/components/master-data/supplier-delete-button"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildSupplierDrilldownHrefs,
  buildSupplierQueryString,
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"

export type SupplierListItem = {
  id: string
  code: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  _count: {
    assets: number
    maintenanceTickets: number
    purchaseDocuments: number
  }
}

type SupplierListLabels = {
  code: string
  name: string
  contactPerson: string
  phone: string
  email: string
  assets: string
  purchaseDocuments: string
  maintenanceTickets: string
  actions: string
  edit: string
  delete: string
  view: string
  create: string
  clearFilters: string
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  rowsPerPage: string
  page: string
  of: string
  previous: string
  next: string
}

export function SupplierListView({
  suppliers,
  locale,
  current,
  total,
  basePath,
  supplierReturnHref,
  createHref,
  hasActiveFilters,
  labels,
}: {
  suppliers: SupplierListItem[]
  locale: string
  current: SupplierListState
  total: number
  basePath: string
  supplierReturnHref: string
  createHref: string
  hasActiveFilters: boolean
  labels: SupplierListLabels
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
          actionHref={hasActiveFilters ? basePath : createHref}
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div data-supplier-desktop-table className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <SupplierSortableColumnHeader field="code" current={current} basePath={basePath}>{labels.code}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="name" current={current} basePath={basePath}>{labels.name}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="contactPerson" current={current} basePath={basePath}>{labels.contactPerson}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="phone" current={current} basePath={basePath}>{labels.phone}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="email" current={current} basePath={basePath}>{labels.email}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="assets" current={current} basePath={basePath}>{labels.assets}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="purchaseDocuments" current={current} basePath={basePath}>{labels.purchaseDocuments}</SupplierSortableColumnHeader>
              <ColumnHeader>{labels.maintenanceTickets}</ColumnHeader>
              <ColumnHeader align="right">{labels.actions}</ColumnHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((supplier) => {
              const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
              return (
                <ClickableTableRow key={supplier.id} href={hrefs.detail} label={`${labels.view}: ${supplier.code}`}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{supplier.code}</td>
                  <td className="min-w-56 px-4 py-3 text-foreground">
                    <div className="font-medium">{supplier.name}</div>
                    {supplier.address ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</div> : null}
                  </td>
                  <td className="min-w-44 px-4 py-3 text-muted-foreground">{supplier.contactPerson || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier.phone || "-"}</td>
                  <td className="min-w-56 px-4 py-3 text-muted-foreground">{supplier.email || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {supplier._count.assets > 0 ? (
                      <Link href={hrefs.assets} aria-label={`${labels.assets}: ${supplier._count.assets}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        {supplier._count.assets.toLocaleString()}
                      </Link>
                    ) : "0"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.purchaseDocuments.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.maintenanceTickets.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={hrefs.edit} aria-label={`${labels.edit}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <SupplierDeleteButton id={supplier.id} />
                    </div>
                  </td>
                </ClickableTableRow>
              )
            })}
          </tbody>
        </table>
      </div>

      <div data-supplier-mobile-list className="grid gap-3 bg-background p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <div className="text-xs font-medium text-muted-foreground">{supplier.code}</div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.contactPerson}</dt>
                  <dd className="break-words text-foreground">{supplier.contactPerson || "-"}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.phone}</dt>
                  <dd className="break-words text-foreground">{supplier.phone || "-"}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
                <RelationshipCount label={labels.purchaseDocuments} value={supplier._count.purchaseDocuments} />
                <RelationshipCount label={labels.maintenanceTickets} value={supplier._count.maintenanceTickets} />
              </div>

              <div className="mt-3 flex items-center justify-end gap-1">
                <Link href={hrefs.detail} aria-label={`${labels.view}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={hrefs.edit} aria-label={`${labels.edit}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </Link>
                <SupplierDeleteButton id={supplier.id} />
              </div>
            </article>
          )
        })}
      </div>

      <SupplierPagination current={current} total={total} basePath={basePath} labels={labels} />
    </div>
  )
}

function buildSupplierRowHrefs({ supplier, locale, supplierReturnHref }: { supplier: SupplierListItem; locale: string; supplierReturnHref: string }) {
  const drilldown = buildSupplierDrilldownHrefs({ locale, supplierId: supplier.id })
  return {
    detail: appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}`, supplierReturnHref),
    edit: appendMasterDataReturnTo(`/${locale}/master-data/suppliers/${supplier.id}/edit`, supplierReturnHref),
    assets: drilldown.assets,
  }
}

function RelationshipCount({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = <><span className="block text-base font-semibold text-foreground">{value.toLocaleString()}</span><span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${value}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}

function SupplierSortableColumnHeader({ children, field, current, basePath }: { children: React.ReactNode; field: SupplierSort; current: SupplierListState; basePath: string }) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildSupplierQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`
  return (
    <th scope="col" aria-sort={active ? (current.direction === "asc" ? "ascending" : "descending") : undefined} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      <Link href={href} className="inline-flex min-h-11 items-center gap-1 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {children}
        {active ? current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </Link>
    </th>
  )
}

function SupplierPagination({ current, total, basePath, labels }: { current: SupplierListState; total: number; basePath: string; labels: Pick<SupplierListLabels, "rowsPerPage" | "page" | "of" | "previous" | "next"> }) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)
  const targetClassName = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  return (
    <nav aria-label={`${labels.page} ${current.page} ${labels.of} ${totalPages}`} className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
      <div>{start}-{end} {labels.of} {total}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => <Link key={pageSize} href={`${basePath}?${buildSupplierQueryString(current, { pageSize, page: 1 })}`} aria-current={current.pageSize === pageSize ? "page" : undefined} className={`${targetClassName} ${current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"}`}>{pageSize}</Link>)}
        <span className="w-full sm:w-auto sm:px-2">{labels.page} {current.page} {labels.of} {totalPages}</span>
        {current.page <= 1 ? <span aria-disabled="true" className={`${targetClassName} cursor-not-allowed border-border opacity-50`}>{labels.previous}</span> : <Link href={`${basePath}?${buildSupplierQueryString(current, { page: previousPage })}`} className={`${targetClassName} border-border hover:bg-accent`}>{labels.previous}</Link>}
        {current.page >= totalPages ? <span aria-disabled="true" className={`${targetClassName} cursor-not-allowed border-border opacity-50`}>{labels.next}</span> : <Link href={`${basePath}?${buildSupplierQueryString(current, { page: nextPage })}`} className={`${targetClassName} border-border hover:bg-accent`}>{labels.next}</Link>}
      </div>
    </nav>
  )
}
