import type { AssetDetailView } from "./asset-detail-view.ts"

export type AssetDetailLoadPolicy = {
  movementLimit: number
  checkoutLimit: number
  maintenanceLimit: number
  auditItemLimit: number
  auditFindingLimit: number
  disposalLimit: number
  assignedLicenseLimit: number
}

const previewPolicy: AssetDetailLoadPolicy = {
  movementLimit: 1,
  checkoutLimit: 1,
  maintenanceLimit: 1,
  auditItemLimit: 1,
  auditFindingLimit: 1,
  disposalLimit: 1,
  assignedLicenseLimit: 1,
}

export function getAssetDetailLoadPolicy(view: AssetDetailView): AssetDetailLoadPolicy {
  if (view === "custody") {
    return { ...previewPolicy, checkoutLimit: 10, assignedLicenseLimit: 50 }
  }
  if (view === "operations") {
    return {
      ...previewPolicy,
      movementLimit: 20,
      checkoutLimit: 10,
      maintenanceLimit: 10,
      disposalLimit: 20,
    }
  }
  if (view === "audit") {
    return { ...previewPolicy, auditItemLimit: 10, auditFindingLimit: 20 }
  }
  return { ...previewPolicy }
}
