import type { Prisma } from "@prisma/client"

export const assetOwnershipTypes = ["personal", "shared", "stock", "component", "software_license"] as const

export type AssetOwnershipType = (typeof assetOwnershipTypes)[number]

export const defaultAssetOwnershipType: AssetOwnershipType = "personal"

export function normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType {
  return assetOwnershipTypes.includes(value as AssetOwnershipType)
    ? (value as AssetOwnershipType)
    : defaultAssetOwnershipType
}

export function requiresCustodian(ownershipType?: string | null) {
  return normalizeAssetOwnershipType(ownershipType) === "personal"
}

export function requiresResponsibleDepartment(ownershipType?: string | null) {
  const normalized = normalizeAssetOwnershipType(ownershipType)
  return normalized === "shared" || normalized === "stock" || normalized === "component"
}

export function requiresParentAsset(ownershipType?: string | null) {
  return normalizeAssetOwnershipType(ownershipType) === "component"
}

export const assetMissingResponsibilityWhere: Prisma.AssetWhereInput = {
  OR: [
    { ownershipType: "personal", custodianId: null },
    { ownershipType: { in: ["shared", "stock"] }, departmentId: null },
    { ownershipType: "software_license", custodianId: null, departmentId: null },
    {
      ownershipType: "component",
      OR: [
        { departmentId: null },
        { installedInLinks: { none: { status: "installed", removedAt: null } } },
      ],
    },
  ],
}

export function hasAssetResponsibility(asset: {
  ownershipType?: string | null
  custodian?: unknown | null
  custodianId?: string | null
  department?: unknown | null
  departmentId?: string | null
  installedInLinks?: unknown[]
}) {
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)

  if (ownershipType === "personal") {
    return Boolean(asset.custodian ?? asset.custodianId)
  }

  if (ownershipType === "shared" || ownershipType === "stock") {
    return Boolean(asset.department ?? asset.departmentId)
  }

  if (ownershipType === "software_license") {
    return Boolean(asset.custodian ?? asset.custodianId ?? asset.department ?? asset.departmentId)
  }

  return Boolean(asset.department ?? asset.departmentId) && Boolean(asset.installedInLinks?.length)
}
