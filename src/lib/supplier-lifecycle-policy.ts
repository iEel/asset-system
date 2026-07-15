export type SupplierRelationshipCounts = {
  assets: number
  maintenanceTickets: number
  maintenancePlans: number
  purchaseDocuments: number
}

export function hasProtectedSupplierRelationships(counts: SupplierRelationshipCounts) {
  return Object.values(counts).some((count) => count > 0)
}

export function shouldBlockSupplierLifecycleChange({
  currentIsActive,
  nextIsActive,
  operation,
  counts,
}: {
  currentIsActive: boolean
  nextIsActive: boolean
  operation: "update" | "delete"
  counts: SupplierRelationshipCounts
}) {
  const removesFromActiveUse = operation === "delete" || (currentIsActive && !nextIsActive)
  return removesFromActiveUse && hasProtectedSupplierRelationships(counts)
}
