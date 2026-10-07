import { getAssetLifecycleTransitionError, type AssetLifecycleErrorCode } from "./asset-lifecycle-policy.ts"

export type AssetCustodyChangeError =
  | AssetLifecycleErrorCode
  | "ASSET_ACTIVE_CHECKOUT_EXISTS"
  | "ASSET_CUSTODY_LOCKED_BY_CHECKOUT"

type CustodyFields = {
  custodianId?: string | null
  currentLocationId?: string | null
  departmentId?: string | null
}

// Bulk updates bypass the checkout/transfer documents, so they are limited to assets that
// a transfer could move: no open checkout, and a custodian change only from Ready or In Use.
export function getBulkCustodyChangeError(input: {
  statusName: string | null | undefined
  hasActiveCheckout: boolean
  changesCustodian: boolean
}): AssetCustodyChangeError | null {
  if (input.hasActiveCheckout) return "ASSET_ACTIVE_CHECKOUT_EXISTS"
  return getAssetLifecycleTransitionError(input.changesCustodian ? "assign_custodian" : "move_scope", input.statusName)
}

export function getRegisterCustodyChangeError(input: {
  statusName: string | null | undefined
  hasActiveCheckout: boolean
  before: CustodyFields
  after: CustodyFields
}): AssetCustodyChangeError | null {
  // Prisma leaves undefined fields untouched, so only fields the form actually sent can change.
  const changed = (["custodianId", "currentLocationId", "departmentId"] as const).some(
    (field) => input.after[field] !== undefined && (input.before[field] ?? null) !== (input.after[field] ?? null),
  )
  if (!changed) return null
  if (input.hasActiveCheckout) return "ASSET_CUSTODY_LOCKED_BY_CHECKOUT"
  return getAssetLifecycleTransitionError("move_scope", input.statusName)
}
