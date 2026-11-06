import Link from "next/link"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, type DataTableSort } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  MasterDataReactivateButton,
  MasterDataRowActions,
  type MasterDataDeactivateLabels,
  type MasterDataReactivate,
  type MasterDataRowLink,
} from "@/components/master-data/master-data-row-actions"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { buildSupplierQueryString, type SupplierListState, type SupplierSort } from "@/lib/organization-master-query"
import { cn } from "@/lib/utils"

// One row of board MD-Suppliers, prepared by the page (group 8 plan 3 Task 1): the counts are active records only, and
// openRepairs is the supplier's open repairs (supplierOpenRepairWhere, as the supplier page counts them).
export type SupplierListRow = {
  supplier: {
    id: string
    code: string
    name: string
    contactPerson: string | null
    phone: string | null
    email: string | null
    address: string | null
    isActive: boolean
  }
  counts: { assets: number; purchaseDocuments: number; maintenanceTickets: number; openRepairs: number }
  hrefs: { detail: string; edit: string; assets: string }
  // "ปิดใช้งานเมื่อ {date}" on an inactive row (G8P1-R2), null on an active one.
  deactivatedLine: string | null
  links: MasterDataRowLink[]
  deactivate: { endpoint: string; blocked: string | null; labels: MasterDataDeactivateLabels } | null
  reactivate: MasterDataReactivate | null
}

type SupplierListLabels = {
  title: string
  tableScrollHint: string
  name: string
  contactPerson: string
  assets: string
  purchaseDocuments: string
  maintenanceTickets: string
  status: string
  active: string
  inactive: string
  actions: string
  view: string
  create: string
  clearFilters: string
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  noContact: string
  addContact: string
  none: string
  countsNote: string
  // This is a server component called by a server page, so functions can pass.
  openRepairs: (count: number) => string
  moreActionsFor: (code: string) => string
}

export function SupplierListView({
  rows,
  current,
  basePath,
  createHref,
  hasActiveFilters,
  showRecordStatus,
  canEdit,
  canViewAssets,
  pagination,
  labels,
}: {
  rows: SupplierListRow[]
  current: SupplierListState
  basePath: string
  // null without supplier:create: the empty list then offers no เพิ่มผู้ขาย.
  createHref: string | null
  hasActiveFilters: boolean
  // Spec §3: the status column shows only under ทั้งหมด.
  showRecordStatus: boolean
  // supplier:edit: แก้ไข in ⋯ and "เพิ่มข้อมูลติดต่อ". The row opens the supplier page, which supplier:view opens.
  canEdit: boolean
  // The asset count links to the register only with asset:view.
  canViewAssets: boolean
  // The page's <Pagination>, shown once under both the table and the phone cards (spec 2B §5.1).
  pagination: React.ReactNode
  labels: SupplierListLabels
}) {
  if (rows.length === 0) {
    return (
      <ContentPanel>
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
          actionHref={hasActiveFilters ? basePath : (createHref ?? undefined)}
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
            <DataTableHead sort={sortBy("name")}>{labels.name}</DataTableHead>
            <DataTableHead sort={sortBy("contactPerson")}>{labels.contactPerson}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{labels.assets}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("purchaseDocuments")}>{labels.purchaseDocuments}</DataTableHead>
            <DataTableHead align="right">{labels.maintenanceTickets}</DataTableHead>
            {showRecordStatus ? <DataTableHead>{labels.status}</DataTableHead> : null}
            <DataTableHead align="right" sticky="right" hideLabel>{labels.actions}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const { supplier } = row
            return (
              <ClickableTableRow key={supplier.id} href={row.hrefs.detail} label={`${labels.view}: ${supplier.code}`}>
                <DataTableCell className="min-w-56">
                  <div className={cn("font-semibold", supplier.isActive ? "text-foreground" : "text-muted-foreground")}>{supplier.name}</div>
                  <div className="text-meta text-muted-foreground">
                    <span className="tag">{supplier.code}</span>
                    {row.deactivatedLine ? <> · {row.deactivatedLine}</> : null}
                  </div>
                  {supplier.address ? <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</div> : null}
                </DataTableCell>
                <DataTableCell className="min-w-52">
                  <SupplierContact row={row} canEdit={canEdit} labels={labels} />
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewAssets && row.counts.assets > 0 ? (
                    <Link href={row.hrefs.assets} aria-label={`${labels.assets}: ${formatCount(row.counts.assets)}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                      {formatCount(row.counts.assets)}
                    </Link>
                  ) : formatCount(row.counts.assets)}
                </DataTableCell>
                <DataTableCell numeric className="whitespace-nowrap text-muted-foreground">
                  {row.counts.purchaseDocuments > 0 ? formatCount(row.counts.purchaseDocuments) : labels.none}
                </DataTableCell>
                <DataTableCell numeric className="whitespace-nowrap text-muted-foreground">
                  {formatCount(row.counts.maintenanceTickets)}
                  {row.counts.openRepairs > 0 ? <StatusBadge className="ml-1.5" label={labels.openRepairs(row.counts.openRepairs)} tone="warning" /> : null}
                </DataTableCell>
                {showRecordStatus ? (
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={supplier.isActive ? labels.active : labels.inactive} tone={supplier.isActive ? "success" : "muted"} />
                    {row.reactivate ? <MasterDataReactivateButton reactivate={row.reactivate} /> : null}
                  </DataTableCell>
                ) : null}
                <DataTableCell align="right" sticky="right">
                  <MasterDataRowActions
                    code={supplier.code}
                    name={supplier.name}
                    menuLabel={labels.moreActionsFor(supplier.code)}
                    links={row.links}
                    deactivate={row.deactivate}
                    reactivate={row.reactivate}
                  />
                </DataTableCell>
              </ClickableTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); the phone cards are kept and carry the table's facts (spec §7). */}
      <div data-supplier-mobile-list className="grid gap-3 p-3 md:hidden">
        {rows.map((row) => {
          const { supplier } = row
          return (
            <article key={supplier.id} className="min-w-0 rounded-md border border-border bg-background p-3">
              <Link href={row.hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <h2 className={cn("break-words text-base font-semibold", supplier.isActive ? "text-primary" : "text-muted-foreground")}>{supplier.name}</h2>
                <div className="mt-0.5 text-meta text-muted-foreground">
                  <span className="tag font-medium">{supplier.code}</span>
                  {row.deactivatedLine ? <> · {row.deactivatedLine}</> : null}
                </div>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <KeyValueList className="mt-3" items={[{ key: "contact", label: labels.contactPerson, value: <SupplierContact row={row} canEdit={canEdit} labels={labels} /> }]} />

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={formatCount(row.counts.assets)} href={canViewAssets && row.counts.assets > 0 ? row.hrefs.assets : undefined} />
                <RelationshipCount label={labels.purchaseDocuments} value={row.counts.purchaseDocuments > 0 ? formatCount(row.counts.purchaseDocuments) : labels.none} />
                <RelationshipCount
                  label={labels.maintenanceTickets}
                  value={formatCount(row.counts.maintenanceTickets)}
                  extra={row.counts.openRepairs > 0 ? <StatusBadge className="mt-1" label={labels.openRepairs(row.counts.openRepairs)} tone="warning" /> : null}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {showRecordStatus ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={supplier.isActive ? labels.active : labels.inactive} tone={supplier.isActive ? "success" : "muted"} />
                    {row.reactivate ? <MasterDataReactivateButton reactivate={row.reactivate} /> : null}
                  </div>
                ) : <span />}
                <MasterDataRowActions
                  code={supplier.code}
                  name={supplier.name}
                  menuLabel={labels.moreActionsFor(supplier.code)}
                  links={row.links}
                  deactivate={row.deactivate}
                  reactivate={row.reactivate}
                />
              </div>
            </article>
          )
        })}
      </div>

      <DataTableFoot>
        <div className="space-y-2">
          <p>{labels.countsNote}</p>
          {pagination}
        </div>
      </DataTableFoot>
    </div>
  )
}

// ผู้ติดต่อ (board MD-Suppliers): the name, then "phone · email"; with none of the three "ยังไม่มีข้อมูลติดต่อ" and, with
// supplier:edit, "เพิ่มข้อมูลติดต่อ" to the edit form.
function SupplierContact({ row, canEdit, labels }: { row: SupplierListRow; canEdit: boolean; labels: SupplierListLabels }) {
  const { contactPerson, phone, email } = row.supplier
  const reach = [phone, email].filter(Boolean).join(" · ")
  if (!contactPerson && !reach) {
    return (
      <>
        <StatusBadge label={labels.noContact} tone="warning" />
        {canEdit ? (
          <Link href={row.hrefs.edit} className={cn(linkVariants({ size: "inherit" }), "mt-1 flex min-h-11 w-fit items-center text-meta md:min-h-0")}>
            {labels.addContact}
          </Link>
        ) : null}
      </>
    )
  }
  return (
    <>
      {contactPerson ? <div className="text-foreground">{contactPerson}</div> : null}
      {reach ? <div className="break-words text-meta text-muted-foreground">{reach}</div> : null}
    </>
  )
}

function RelationshipCount({ label, value, href, extra }: { label: string; value: string; href?: string; extra?: React.ReactNode }) {
  // A linked count reads as a link (primary), like the table's drill-down link.
  const content = (
    <>
      <span className={cn("num block text-base font-semibold", href ? "text-primary" : "text-foreground")}>{value}</span>
      <span className="mt-0.5 block line-clamp-2 text-meta text-muted-foreground">{label}</span>
    </>
  )
  return href ? (
    <Link href={href} aria-label={`${label}: ${value}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  ) : (
    <div className="min-h-11 px-1 py-1">
      {content}
      {extra}
    </div>
  )
}
