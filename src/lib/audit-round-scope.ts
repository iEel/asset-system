import type { Prisma } from "@prisma/client"
import type { AuditRoundInput } from "./validations/audit.ts"

export const CLOSED_AUDIT_STATUS_NAMES = ["Disposed", "Retired"] as const
export const CLOSED_AUDIT_STATUS_NAMES_TH = ["ตัดจำหน่ายแล้ว", "ปลดระวาง"] as const

export type AuditStatusOption = {
  id: string
  label: string
  isClosed?: boolean
}

export function isClosedAuditStatusName(name: string, nameTh: string) {
  return (CLOSED_AUDIT_STATUS_NAMES as readonly string[]).includes(name) || (CLOSED_AUDIT_STATUS_NAMES_TH as readonly string[]).includes(nameTh)
}

export function filterAuditStatusOptions<T extends AuditStatusOption>(statuses: T[], includeClosedAssets: boolean): T[] {
  return includeClosedAssets ? statuses : statuses.filter((status) => !status.isClosed)
}

export function buildAuditAssetWhere(input: AuditRoundInput): Prisma.AssetWhereInput {
  const riskWhere = buildAuditRiskWhere(input.riskPreset)
  const statusWhere = buildAuditStatusWhere(input)

  return {
    isActive: true,
    ...(input.scopeCompanyId ? { companyId: input.scopeCompanyId } : {}),
    ...(input.scopeBranchId ? { branchId: input.scopeBranchId } : {}),
    ...(input.scopeDepartmentId ? { departmentId: input.scopeDepartmentId } : {}),
    ...(input.scopeLocationId ? { currentLocationId: input.scopeLocationId } : {}),
    ...(input.scopeCategoryId ? { categoryId: input.scopeCategoryId } : {}),
    ...(input.scopeCustodianId ? { custodianId: input.scopeCustodianId } : {}),
    ...(input.scopeStatusId ? { statusId: input.scopeStatusId } : {}),
    ...statusWhere,
    ...(input.scopeConditionId ? { conditionId: input.scopeConditionId } : {}),
    ...riskWhere,
  }
}

function buildAuditStatusWhere(input: AuditRoundInput): Prisma.AssetWhereInput {
  if (input.scopeStatusId || input.includeClosedAssets) return {}

  return {
    status: {
      name: { notIn: [...CLOSED_AUDIT_STATUS_NAMES] },
      nameTh: { notIn: [...CLOSED_AUDIT_STATUS_NAMES_TH] },
    },
  }
}

export function selectAuditSample<T extends { id: string }>(assets: T[], sampleRate: number): T[] {
  if (sampleRate >= 100) return assets

  const sampleSize = Math.max(1, Math.ceil((assets.length * sampleRate) / 100))
  return [...assets]
    .sort((left, right) => stableHash(left.id) - stableHash(right.id))
    .slice(0, sampleSize)
    .sort((left, right) => assets.findIndex((asset) => asset.id === left.id) - assets.findIndex((asset) => asset.id === right.id))
}

function buildAuditRiskWhere(riskPreset: AuditRoundInput["riskPreset"]): Prisma.AssetWhereInput {
  const today = startOfToday(new Date())
  const staleSince = addDays(today, -180)
  const expiringSoon = addDays(today, 60)

  if (riskPreset === "data_quality") {
    return {
      OR: [
        { serialNumber: null },
        { serialNumber: "" },
        { ownershipType: "personal", custodianId: null },
        { ownershipType: { in: ["shared", "stock"] }, departmentId: null },
        { ownershipType: { not: "software_license" }, attachments: { none: { isActive: true, module: "asset" } } },
        { purchaseDate: null },
        { purchasePrice: null },
      ],
    }
  }

  if (riskPreset === "high_value") {
    return { purchasePrice: { gte: 50000 } }
  }

  if (riskPreset === "stale_movement") {
    return { movements: { none: { performedAt: { gte: staleSince } } } }
  }

  if (riskPreset === "repair_history") {
    return { maintenanceTickets: { some: { isActive: true } } }
  }

  if (riskPreset === "license_expiring") {
    return {
      ownershipType: "software_license",
      warrantyEndDate: { gte: today, lte: expiringSoon },
    }
  }

  return {}
}

function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
