import type { Prisma } from "@prisma/client"
import { chunkListIds } from "./master-data-list-ui.ts"

// One definition of an open repair with a supplier (vendorId), for the suppliers list's "ค้าง {n}" and summary line and
// for the supplier page (group 8 plan 3): an active repair record that is not closed or cancelled.
export const supplierOpenRepairWhere = {
  isActive: true,
  repairStatus: { notIn: ["closed", "cancelled"] },
} satisfies Prisma.MaintenanceTicketWhereInput

export type SupplierOpenRepairReader = { maintenanceTicket: { groupBy(args: object): PromiseLike<unknown[]> } }

// The open repairs of each supplier, one grouped query per 2,000 ids; a supplier with none is left out of the map.
export async function readSupplierOpenRepairCounts(db: SupplierOpenRepairReader, supplierIds: readonly string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (supplierIds.length === 0) return result
  const parts = await Promise.all(
    chunkListIds(supplierIds).map((chunk) =>
      db.maintenanceTicket.groupBy({
        by: ["vendorId"],
        where: { ...supplierOpenRepairWhere, vendorId: { in: chunk } },
        _count: { _all: true },
      })
    )
  )
  for (const row of parts.flat() as { vendorId: string | null; _count: { _all: number } }[]) {
    if (row.vendorId) result.set(row.vendorId, (result.get(row.vendorId) ?? 0) + row._count._all)
  }
  return result
}

export type SupplierDetailSummaryInput = {
  assetCount: number
  purchaseDocumentCount: number
  maintenanceTicketCount: number
  openMaintenanceTicketCount: number
  purchaseAmount: number
  maintenanceCost: number
}

export type SupplierFollowUpKey =
  | "missing_contact"
  | "assets_without_purchase_documents"
  | "open_vendor_maintenance"

export function buildSupplierDetailHrefs({ locale, supplierId }: { locale: string; supplierId: string }) {
  const basePath = `/${locale}/master-data/suppliers`
  const encodedSupplierId = encodeURIComponent(supplierId)
  return {
    list: basePath,
    edit: `${basePath}/${encodedSupplierId}/edit`,
    assets: `/${locale}/assets?supplierId=${encodedSupplierId}&page=1`,
  }
}

export function buildSupplierDetailSummary(input: SupplierDetailSummaryInput) {
  return {
    ...input,
    attentionCount: input.openMaintenanceTicketCount,
  }
}

export function buildSupplierFollowUpItems({
  hasContact,
  assetCount,
  purchaseDocumentCount,
  openMaintenanceTicketCount,
}: {
  hasContact: boolean
  assetCount: number
  purchaseDocumentCount: number
  openMaintenanceTicketCount: number
}) {
  const items: SupplierFollowUpKey[] = []
  if (!hasContact) items.push("missing_contact")
  if (assetCount > 0 && purchaseDocumentCount === 0) items.push("assets_without_purchase_documents")
  if (openMaintenanceTicketCount > 0) items.push("open_vendor_maintenance")
  return items
}
