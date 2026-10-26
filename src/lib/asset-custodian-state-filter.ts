import type { Prisma } from "@prisma/client"
import { CLOSED_AUDIT_STATUS_NAMES } from "./audit-round-scope.ts"

export type AssetCustodianStateFilter = "" | "assigned"

export function normalizeAssetCustodianStateFilter(value: unknown): AssetCustodianStateFilter {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === "assigned" ? "assigned" : ""
}

// An asset that is not Disposed or Retired. The dashboard's custodian share uses this same fragment as its denominator.
export const assetNotClosedStatusWhere: Prisma.AssetWhereInput = {
  status: { name: { notIn: [...CLOSED_AUDIT_STATUS_NAMES] } },
}

// มีผู้ถือครอง (group 1 spec §6.4): a custodian is set and the asset is not closed.
export const assetCustodianAssignedWhere: Prisma.AssetWhereInput = {
  custodianId: { not: null },
  ...assetNotClosedStatusWhere,
}

export function getAssetCustodianStateWhere(state: AssetCustodianStateFilter): Prisma.AssetWhereInput | null {
  return state === "assigned" ? assetCustodianAssignedWhere : null
}
