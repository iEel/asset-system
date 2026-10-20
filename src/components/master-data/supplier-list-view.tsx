import Link from "next/link"
import { Pencil } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, type DataTableSort } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { RowActions } from "@/components/ui/row-actions"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildSupplierDrilldownHrefs,
  buildSupplierQueryString,
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"
import { cn } from "@/lib/utils"

export type SupplierListItem = {
  id: string
  code: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
  _count: {
    assets: number
    maintenanceTickets: number
    purchaseDocuments: number
  }
}

type SupplierListLabels = {
  title: string
  tableScrollHint: string
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
  view: string
  create: string
  clearFilters: string
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  // tCommon("moreActionsFor", { code }). This is a server component called by a server page, so a function can pass.
  moreActionsFor: (code: string) => string
}

export function SupplierListView({
  suppliers,
  locale,
  current,
  basePath,
  supplierReturnHref,
  createHref,
  hasActiveFilters,
  pagination,
  labels,
}: {
  suppliers: SupplierListItem[]
  locale: string
  current: SupplierListState
  basePath: string
  supplierReturnHref: string
  createHref: string
  hasActiveFilters: boolean
  // The page's <Pagination>, shown once under both the table and the phone cards (spec 2B §5.1).
  pagination: React.ReactNode
  labels: SupplierListLabels
}) {
  if (suppliers.length === 0) {
    return (
      <ContentPanel>
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
          actionHref={hasActiveFilters ? basePath : createHref}
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
          actionVariant={hasActiveFilters ? "secondary" : "primary"}
        />
      </ContentPanel>
    )
  }

  const sortBy = (field: SupplierSort): DataTableSort => ({
    href: `${basePath}?${buildSupplierQueryString(current, { sort: field, direction: current.sort === field && current.direction === "asc" ? "desc" : "asc", page: 1 })}`,
    direction: current.sort === field ? current.direction : null,
  })

  return (
    <div className={cn(getPanelClasses(), "overflow-hidden")}>
      <DataTable data-supplier-desktop-table framed={false} className="hidden md:block" caption={labels.title} scrollHint={labels.tableScrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("code")}>{labels.code}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{labels.name}</DataTableHead>
            <DataTableHead sort={sortBy("contactPerson")}>{labels.contactPerson}</DataTableHead>
            <DataTableHead sort={sortBy("phone")}>{labels.phone}</DataTableHead>
            <DataTableHead sort={sortBy("email")}>{labels.email}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{labels.assets}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("purchaseDocuments")}>{labels.purchaseDocuments}</DataTableHead>
            <DataTableHead align="right">{labels.maintenanceTickets}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{labels.actions}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {suppliers.map((supplier) => {
            const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
            return (
              <ClickableTableRow key={supplier.id} href={hrefs.detail} label={`${labels.view}: ${supplier.code}`}>
                <DataTableCell className="whitespace-nowrap">
                  <span className="tag font-medium text-foreground">{supplier.code}</span>
                </DataTableCell>
                <DataTableCell className="min-w-56 text-foreground">
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.address ? <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</div> : null}
                </DataTableCell>
                <DataTableCell className="min-w-44 text-muted-foreground">{orNil(supplier.contactPerson)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(supplier.phone)}</DataTableCell>
                <DataTableCell className="min-w-56 text-muted-foreground">{orNil(supplier.email)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {supplier._count.assets > 0 ? (
                    <Link href={hrefs.assets} aria-label={`${labels.assets}: ${formatCount(supplier._count.assets)}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                      {formatCount(supplier._count.assets)}
                    </Link>
                  ) : formatCount(0)}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.purchaseDocuments)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.maintenanceTickets)}</DataTableCell>
                <DataTableCell align="right" sticky="right">
                  <RowActions
                    code={supplier.code}
                    name={supplier.name}
                    menuLabel={labels.moreActionsFor(supplier.code)}
                    next={{ label: labels.edit, href: hrefs.edit, icon: <Pencil aria-hidden="true" /> }}
                    groups={[]}
                    deleteAction={supplier.isActive ? { endpoint: `/api/suppliers/${supplier.id}` } : undefined}
                  />
                </DataTableCell>
              </ClickableTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19). */}
      <div data-supplier-mobile-list className="grid gap-3 p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="min-w-0 rounded-md border border-border bg-background p-3">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-meta text-muted-foreground">
                  <span className="tag font-medium">{supplier.code}</span>
                </div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <KeyValueList
                className="mt-3"
                items={[
                  { key: "contactPerson", label: labels.contactPerson, value: supplier.contactPerson },
                  { key: "phone", label: labels.phone, value: supplier.phone },
                ]}
              />

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
                <RelationshipCount label={labels.purchaseDocuments} value={supplier._count.purchaseDocuments} />
                <RelationshipCount label={labels.maintenanceTickets} value={supplier._count.maintenanceTickets} />
              </div>

              <RowActions
                className="mt-3"
                code={supplier.code}
                name={supplier.name}
                menuLabel={labels.moreActionsFor(supplier.code)}
                next={{ label: labels.edit, href: hrefs.edit, icon: <Pencil aria-hidden="true" /> }}
                groups={[]}
                deleteAction={supplier.isActive ? { endpoint: `/api/suppliers/${supplier.id}` } : undefined}
              />
            </article>
          )
        })}
      </div>

      <DataTableFoot>{pagination}</DataTableFoot>
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
  // A linked count reads as a link (primary), like the table's drill-down link.
  const content = <><span className={cn("num block text-base font-semibold", href ? "text-primary" : "text-foreground")}>{formatCount(value)}</span><span className="mt-0.5 block line-clamp-2 text-meta text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${formatCount(value)}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}
