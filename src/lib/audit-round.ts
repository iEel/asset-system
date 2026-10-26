import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { selectAuditComponentCandidates } from "@/lib/audit-component-round"
import { buildAuditAssetWhere, selectAuditSample } from "./audit-round-scope.ts"
import type { AuditRoundScopeInput } from "@/lib/validations/audit"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { chunkAuditIds, withAuditRoundOwnItems } from "@/lib/audit-round-counts-rules"
import { foldAuditRoundOverlap, type AuditRoundOverlap, type AuditRoundOverlapRow } from "@/lib/audit-round-preview-rules"

export { buildAuditAssetWhere, selectAuditSample }

export const auditRoundAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  categoryId: true,
  companyId: true,
  branchId: true,
  departmentId: true,
  currentLocationId: true,
  custodianId: true,
  conditionId: true,
} satisfies Prisma.AssetSelect

export type AuditRoundCandidateAsset = Prisma.AssetGetPayload<{ select: typeof auditRoundAssetSelect }>

export async function getAuditRoundCandidateAssets(input: AuditRoundScopeInput) {
  return prisma.asset.findMany({
    where: buildAuditAssetWhere(input),
    orderBy: { assetTag: "asc" },
    select: auditRoundAssetSelect,
  })
}

export async function getAuditRoundSelection(input: AuditRoundScopeInput) {
  // The components of the scope's parents by relation, never an id list: the live count's first scope is the whole
  // register, past SQL Server's 2,100-parameter limit (group 2 spec §7).
  const [candidateAssets, componentLinks] = await Promise.all([
    getAuditRoundCandidateAssets(input),
    prisma.assetComponent.findMany({
      where: {
        parentAsset: buildAuditAssetWhere(input),
        status: "installed",
        removedAt: null,
        componentAsset: { isActive: true },
      },
      select: {
        parentAssetId: true,
        componentAsset: { select: auditRoundAssetSelect },
      },
    }),
  ])

  return selectAuditComponentCandidates(candidateAssets, componentLinks, input.sampleRate)
}

// The selected assets that are already own items of another round in progress, drafts included (group 2 spec §7,
// §14). Chunked under SQL Server's 2,100-parameter limit (R11). A warning only: create never checks it.
export async function getAuditRoundOverlap(assetIds: readonly string[]): Promise<AuditRoundOverlap> {
  const rows: AuditRoundOverlapRow[] = []
  for (const chunk of chunkAuditIds(assetIds)) {
    rows.push(
      ...(await prisma.auditItem.findMany({
        where: withAuditRoundOwnItems({ assetId: { in: chunk }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }),
        select: { assetId: true, auditRound: { select: { id: true, auditNo: true } } },
      })),
    )
  }
  return foldAuditRoundOverlap(rows)
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
