import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { AuditRoundInput } from "@/lib/validations/audit"

export const auditRoundAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  companyId: true,
  branchId: true,
  departmentId: true,
  currentLocationId: true,
  custodianId: true,
  conditionId: true,
} satisfies Prisma.AssetSelect

export type AuditRoundCandidateAsset = Prisma.AssetGetPayload<{ select: typeof auditRoundAssetSelect }>

export function buildAuditAssetWhere(input: AuditRoundInput): Prisma.AssetWhereInput {
  const riskWhere = buildAuditRiskWhere(input.riskPreset)

  return {
    isActive: true,
    ...(input.scopeCompanyId ? { companyId: input.scopeCompanyId } : {}),
    ...(input.scopeBranchId ? { branchId: input.scopeBranchId } : {}),
    ...(input.scopeDepartmentId ? { departmentId: input.scopeDepartmentId } : {}),
    ...(input.scopeLocationId ? { currentLocationId: input.scopeLocationId } : {}),
    ...(input.scopeCategoryId ? { categoryId: input.scopeCategoryId } : {}),
    ...(input.scopeCustodianId ? { custodianId: input.scopeCustodianId } : {}),
    ...(input.scopeStatusId ? { statusId: input.scopeStatusId } : {}),
    ...(input.scopeConditionId ? { conditionId: input.scopeConditionId } : {}),
    ...riskWhere,
  }
}

export async function getAuditRoundCandidateAssets(input: AuditRoundInput) {
  return prisma.asset.findMany({
    where: buildAuditAssetWhere(input),
    orderBy: { assetTag: "asc" },
    select: auditRoundAssetSelect,
  })
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

export async function generateAuditNo(auditYear: number) {
  const prefix = `AUD-${auditYear}-`
  const latest = await prisma.auditRound.findFirst({
    where: { auditNo: { startsWith: prefix } },
    orderBy: { auditNo: "desc" },
    select: { auditNo: true },
  })
  const nextNumber = latest ? Number(latest.auditNo.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}
