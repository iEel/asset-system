// The words for every AssetMovement type (group 1 spec §4, §6.8, §7.6). Pure: the dashboard's recent feed
// and the asset-detail page read it, and tests import it directly.

// The 47 types src writes, plus maintenance_status_update and maintenance_pm_create: older rows that have no writer
// today but still show in an asset's history.
export const ASSET_MOVEMENT_LABELLED_TYPES = [
  "create",
  "import",
  "batch_create",
  "checkout",
  "checkin",
  "transfer",
  "checkout_cancel",
  "checkin_cancel",
  "transfer_cancel",
  "location_change",
  "custodian_change",
  "status_change",
  "condition_change",
  "department_change",
  "ownership_type_change",
  "license_total_seats_change",
  "license_used_seats_change",
  "license_assigned_asset_change",
  "bulk_location_move",
  "bulk_location_update",
  "bulk_custodian_update",
  "status_correction",
  "state_review_resolution",
  "component_install",
  "component_remove",
  "installed_in_parent",
  "removed_from_parent",
  "parent_checkout_sync",
  "parent_checkin_sync",
  "parent_transfer_sync",
  "parent_register_update_sync",
  "parent_bulk_move_sync",
  "parent_bulk_update_sync",
  "parent_audit_finding_sync",
  "parent_audit_confirmation_sync",
  "maintenance_create",
  "maintenance_close",
  "maintenance_cancel",
  "maintenance_status_update",
  "maintenance_pm_create",
  "audit_correction",
  "audit_location_correction",
  "audit_custodian_correction",
  "audit_department_correction",
  "audit_condition_correction",
  "disposal_request",
  "disposal_approve",
  "disposal_reject",
  "disposal_execute",
] as const

// A component's copy of its parent's event. The parent's own row records the same event, so the dashboard feed leaves these out.
export const ASSET_MOVEMENT_MIRROR_TYPES = [
  "installed_in_parent",
  "removed_from_parent",
  "parent_checkout_sync",
  "parent_checkin_sync",
  "parent_transfer_sync",
  "parent_register_update_sync",
  "parent_bulk_move_sync",
  "parent_bulk_update_sync",
  "parent_audit_finding_sync",
  "parent_audit_confirmation_sync",
] as const

const labelledTypes = new Set<string>(ASSET_MOVEMENT_LABELLED_TYPES)

/** The message key for a movement type; a type without a label reads as other activity, never as its English code. */
export function assetMovementLabelKey(movementType: string): string {
  return labelledTypes.has(movementType) ? `asset.movementTypes.${movementType}` : "asset.movementTypes.other"
}

export type AssetMovementDocumentKind = "checkout" | "checkin" | "transfer" | "repair" | "disposal" | "auditRound"

export type AssetMovementDocument = { kind: AssetMovementDocumentKind; id: string; code: string }

export type AssetMovementReferenceLookup = "checkout" | "checkin" | "transfer" | "repair" | "disposal" | "auditFinding" | "auditItem"

const referenceLookups: Record<string, AssetMovementReferenceLookup> = {
  checkout: "checkout",
  checkin: "checkin",
  transfer: "transfer",
  maintenance: "repair",
  disposal: "disposal",
  audit_finding: "auditFinding",
  audit_scan: "auditItem",
}

/** Which record a movement's referenceId points at; null when the reference is not a document with its own page. */
export function assetMovementReferenceLookup(referenceType: string | null): AssetMovementReferenceLookup | null {
  if (!referenceType || !Object.hasOwn(referenceLookups, referenceType)) return null
  return referenceLookups[referenceType]
}

/** The document's page, the same pages the asset-detail page links. */
export function buildAssetMovementDocumentHref(locale: string, document: AssetMovementDocument): string {
  switch (document.kind) {
    case "checkout":
      return `/${locale}/asset-management/checkouts/${document.id}`
    case "checkin":
      return `/${locale}/asset-management/checkins/${document.id}`
    case "transfer":
      return `/${locale}/asset-management/transfers/${document.id}`
    case "repair":
      return `/${locale}/maintenance/${document.id}`
    case "disposal":
      return `/${locale}/disposal/${document.id}`
    case "auditRound":
      return `/${locale}/audit/rounds/${document.id}`
  }
}

/** Each document page's own requirePagePermission. */
export const ASSET_MOVEMENT_DOCUMENT_PERMISSION: Record<AssetMovementDocumentKind, { module: string; action: "view" }> = {
  checkout: { module: "asset", action: "view" },
  checkin: { module: "asset", action: "view" },
  transfer: { module: "asset", action: "view" },
  repair: { module: "maintenance", action: "view" },
  disposal: { module: "disposal", action: "view" },
  auditRound: { module: "audit", action: "view" },
}
