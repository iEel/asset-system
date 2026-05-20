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
