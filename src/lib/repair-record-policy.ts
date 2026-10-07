import { getMaintenanceOperationalTarget, normalizeAssetStateName } from "./asset-lifecycle-policy.ts"

export const repairRecordStatuses = ["in_progress", "closed", "cancelled"] as const
export type RepairRecordStatus = (typeof repairRecordStatuses)[number]

export const repairOutcomes = ["usable", "beyond_repair"] as const
export type RepairOutcome = (typeof repairOutcomes)[number]

// Tickets written by the old workflow (open, reported, accepted, waiting_*, completed) count as
// unfinished repairs; only closed and cancelled are final. Typed with a mutable array (not
// `as const`) so it can be spread into Prisma where-clauses.
export const openRepairRecordWhere: { isActive: true; repairStatus: { notIn: string[] } } = {
  isActive: true,
  repairStatus: { notIn: ["closed", "cancelled"] },
}

export function isOpenRepairStatus(status: string) {
  return status !== "closed" && status !== "cancelled"
}

export function toRepairRecordStatus(status: string): RepairRecordStatus {
  return isOpenRepairStatus(status) ? "in_progress" : (status as RepairRecordStatus)
}

export type RepairAssetContext = {
  statusName: string
  ownershipType?: string | null
  custodianId?: string | null
  hasActiveCheckout: boolean
  hasOpenRecord: boolean
}

export type RepairRecordErrorCode =
  | "MAINTENANCE_ASSET_WRITTEN_OFF"
  | "MAINTENANCE_ASSET_ON_LOAN"
  | "MAINTENANCE_OPEN_RECORD_EXISTS"
  | "MAINTENANCE_ASSET_INELIGIBLE"

export type RepairAssetEffect =
  | { error: RepairRecordErrorCode; nextStatusName?: undefined }
  | { error: null; nextStatusName: string | null }

const writtenOffStatuses = new Set(["disposed", "retired"])
const repairStatuses = new Set(["pending repair", "under maintenance"])
const unfinishedRepairSources = new Set(["ready", "in use", "pending repair"])

// A permanent assignment keeps an active checkout while the asset is In Use, and check-in expects
// In Use again, so an open checkout always restores In Use.
export function getRepairRestoreStatusName(asset: RepairAssetContext): "In Use" | "Ready" {
  return asset.hasActiveCheckout ? "In Use" : getMaintenanceOperationalTarget(asset)
}

export function getRepairRecordCreateEffect(
  asset: RepairAssetContext,
  input: { done: boolean; outcome: RepairOutcome },
): RepairAssetEffect {
  const status = normalizeAssetStateName(asset.statusName)
  if (writtenOffStatuses.has(status)) return { error: "MAINTENANCE_ASSET_WRITTEN_OFF" }
  if (asset.hasOpenRecord) return { error: "MAINTENANCE_OPEN_RECORD_EXISTS" }

  if (!input.done) {
    if (status === "checked out") return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    if (!unfinishedRepairSources.has(status)) return { error: "MAINTENANCE_ASSET_INELIGIBLE" }
    return { error: null, nextStatusName: "Under Maintenance" }
  }

  if (input.outcome === "beyond_repair") {
    if (asset.hasActiveCheckout) return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    return { error: null, nextStatusName: "Pending Disposal" }
  }

  return { error: null, nextStatusName: repairStatuses.has(status) ? getRepairRestoreStatusName(asset) : null }
}

export function getRepairRecordCompleteEffect(asset: RepairAssetContext, outcome: RepairOutcome): RepairAssetEffect {
  if (outcome === "beyond_repair") {
    if (asset.hasActiveCheckout) return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    return { error: null, nextStatusName: "Pending Disposal" }
  }
  return { error: null, nextStatusName: getRepairRestoreStatusName(asset) }
}

export function getRepairRecordCancelEffect(asset: RepairAssetContext): { error: null; nextStatusName: string | null } {
  const status = normalizeAssetStateName(asset.statusName)
  return { error: null, nextStatusName: repairStatuses.has(status) ? getRepairRestoreStatusName(asset) : null }
}

export function getRepairRecordStatusTone(status: string): "warning" | "success" | "muted" {
  const recordStatus = toRepairRecordStatus(status)
  if (recordStatus === "in_progress") return "warning"
  return recordStatus === "closed" ? "success" : "muted"
}

// Recording a repair (maintenance:create) includes attaching its photos and receipts, but only
// on records that user created; maintenance:edit may attach to any record.
export function canAttachToRepairRecord(
  user: { userId: string; canEdit: boolean; canCreate: boolean },
  record: { createdBy: string },
) {
  return user.canEdit || (user.canCreate && record.createdBy === user.userId)
}
