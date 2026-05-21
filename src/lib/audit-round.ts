import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { buildAuditAssetWhere, selectAuditSample } from "./audit-round-scope.ts"
import type { AuditRoundInput } from "@/lib/validations/audit"

export { buildAuditAssetWhere, selectAuditSample }

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

export async function getAuditRoundCandidateAssets(input: AuditRoundInput) {
  return prisma.asset.findMany({
    where: buildAuditAssetWhere(input),
    orderBy: { assetTag: "asc" },
    select: auditRoundAssetSelect,
  })
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
