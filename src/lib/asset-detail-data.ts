import type { Prisma } from "@prisma/client"
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

// Interim (R24): each of Tasks 9-12 replaces its tab's load with its own loader. The history and maintenance limits
// are the old operations and audit views'; nothing renders the disposal requests or the findings, so they stay at one.
export function getAssetDetailLoadPolicy(view: AssetDetailView): AssetDetailLoadPolicy {
  if (view === "history") {
    return { ...previewPolicy, movementLimit: 20, checkoutLimit: 10, maintenanceLimit: 10, auditItemLimit: 10 }
  }
  if (view === "components") {
    return { ...previewPolicy, checkoutLimit: 10, assignedLicenseLimit: 50 }
  }
  if (view === "maintenance") {
    return { ...previewPolicy, maintenanceLimit: 10 }
  }
  return { ...previewPolicy }
}

// The tab counts (ภาพรวม has none): each is the number of records its tab lists.
export type AssetDetailCounts = { history: number; components: number; files: number; repairs: number }

export const ASSET_DETAIL_FILE_MODULES = ["asset", "asset_purchase"] as const

// The files tab (Task 11) lists with this where, so its count is its rows.
export function assetDetailFileWhere(assetId: string): Prisma.AttachmentWhereInput {
  return { assetId, isActive: true, module: { in: [...ASSET_DETAIL_FILE_MODULES] } }
}

// The components count: the links Task 10 renders from the page's own reads, the current components plus
// installedInLinks (installed, not removed, either side; R58).
export function assetDetailComponentLinkWhere(assetId: string): Prisma.AssetComponentWhereInput {
  return { status: "installed", removedAt: null, OR: [{ parentAssetId: assetId }, { componentAssetId: assetId }] }
}

// The repair / PM tab (Task 12) lists with this where: every active record, the table's rows (R24).
export function assetRepairRecordWhere(assetId: string): Prisma.MaintenanceTicketWhereInput {
  return { assetId, isActive: true }
}
