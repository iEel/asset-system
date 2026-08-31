export const assetHandoverModes = ["permanent_assignment", "temporary_loan"] as const

export type AssetHandoverMode = (typeof assetHandoverModes)[number]

export type AssetHandoverModeErrorCode =
  | "HANDOVER_MODE_REQUIRED"
  | "HANDOVER_PERMANENT_USER_ONLY"
  | "HANDOVER_PERMANENT_CUSTODIAN_REQUIRED"
  | "HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED"
  | "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED"
  | "HANDOVER_RETURN_BEFORE_CHECKOUT"

type CheckoutType = "user" | "department" | "location" | "asset"

export function getHandoverTargetStatusName(mode: AssetHandoverMode): "In Use" | "Checked Out" {
  return mode === "permanent_assignment" ? "In Use" : "Checked Out"
}

export function getHandoverRequiredSourceStatusName(mode: AssetHandoverMode): "In Use" | "Checked Out" {
  return getHandoverTargetStatusName(mode)
}

export function isAssetHandoverMode(value: unknown): value is AssetHandoverMode {
  return typeof value === "string" && assetHandoverModes.includes(value as AssetHandoverMode)
}

export function assertHandoverModeFields(input: {
  handoverMode: AssetHandoverMode
  checkoutType: CheckoutType
  custodianId?: string | null
  checkoutDate: Date
  expectedReturnDate?: Date | null
}): void {
  if (input.handoverMode === "permanent_assignment") {
    if (input.checkoutType !== "user") throw new Error("HANDOVER_PERMANENT_USER_ONLY")
    if (!input.custodianId) throw new Error("HANDOVER_PERMANENT_CUSTODIAN_REQUIRED")
    if (input.expectedReturnDate) throw new Error("HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED")
    return
  }

  if (!input.expectedReturnDate) throw new Error("HANDOVER_TEMPORARY_DUE_DATE_REQUIRED")
  if (input.expectedReturnDate.getTime() < input.checkoutDate.getTime()) {
    throw new Error("HANDOVER_RETURN_BEFORE_CHECKOUT")
  }
}
