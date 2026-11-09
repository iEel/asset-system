// ยืนยันผลตรวจ (inspection-confirm spec §3, §4): a round's assets still "Under Inspection", read on the server. The close
// checklist counts them, the confirm page lists them and the confirm API re-reads them inside its transaction, all
// through the one where below. The db is passed in, so a transaction client works and node --test can import it.
import type { Prisma, PrismaClient } from "@prisma/client"
import { AUDIT_ID_CHUNK_SIZE, chunkAuditIds } from "./audit-round-counts-rules.ts"
import {
  INSPECTION_STATUS_NAME,
  classifyInspectionItem,
  inspectionTargetStatusName,
  type InspectionConfirmTab,
  type InspectionHandoverCounts,
  type InspectionTargetStatusName,
} from "./inspection-confirm-rules.ts"

export type InspectionRow = {
  auditItemId: string
  assetId: string
  assetTag: string
  assetName: string
  auditStatus: string
  auditResult: string | null
  scannedAt: Date | null
  conditionName: string | null
  conditionNameTh: string | null
  ownershipType: string | null
  custodianId: string | null
  custodianName: string | null
  locationName: string | null
  tab: InspectionConfirmTab
  handovers: InspectionHandoverCounts
  pendingFindingIds: string[]
  /** For outcome "confirm"/"damaged"; null = handoverUnclear. Missing is implied for notFound. */
  targetStatusName: InspectionTargetStatusName | null
}

type InspectionDb = Prisma.TransactionClient | PrismaClient

export const inspectionUnderReviewAssetWhere: Prisma.AssetWhereInput = { isActive: true, status: { name: INSPECTION_STATUS_NAME } }

// Out-of-scope items count too (spec §4).
export function roundInspectionItemWhere(auditRoundId: string, assetIds?: readonly string[]): Prisma.AuditItemWhereInput {
  const where: Prisma.AuditItemWhereInput = { auditRoundId, asset: inspectionUnderReviewAssetWhere }
  if (assetIds) where.assetId = { in: [...assetIds] }
  return where
}

export async function loadRoundInspectionRows(db: InspectionDb, auditRoundId: string, assetIds?: readonly string[]): Promise<InspectionRow[]> {
  const items = await db.auditItem.findMany({
    where: roundInspectionItemWhere(auditRoundId, assetIds),
    select: {
      id: true,
      assetId: true,
      auditStatus: true,
      auditResult: true,
      scannedAt: true,
      findings: { select: { id: true, findingType: true, reviewStatus: true } },
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          ownershipType: true,
          custodianId: true,
          custodian: { select: { fullNameTh: true } },
          currentLocation: { select: { name: true } },
          condition: { select: { name: true, nameTh: true } },
        },
      },
    },
  })
  if (items.length === 0) return []

  // Open handovers, as asset-state-review-service.ts reads them: not returned and active, counted by handoverMode.
  const handoversByAsset = new Map<string, InspectionHandoverCounts>()
  for (const chunk of chunkAuditIds(items.map((item) => item.assetId), AUDIT_ID_CHUNK_SIZE)) {
    const checkouts = await db.assetCheckout.findMany({
      where: { assetId: { in: chunk }, isReturned: false, transactionStatus: "active" },
      select: { assetId: true, handoverMode: true },
    })
    for (const checkout of checkouts) {
      const counts = handoversByAsset.get(checkout.assetId) ?? { permanent: 0, temporary: 0, unknown: 0 }
      if (checkout.handoverMode === "permanent_assignment") counts.permanent += 1
      else if (checkout.handoverMode === "temporary_loan") counts.temporary += 1
      else counts.unknown += 1
      handoversByAsset.set(checkout.assetId, counts)
    }
  }

  const rows = items.map((item): InspectionRow => {
    const { asset } = item
    const conditionName = asset.condition?.name ?? null
    const handovers = handoversByAsset.get(item.assetId) ?? { permanent: 0, temporary: 0, unknown: 0 }
    return {
      auditItemId: item.id,
      assetId: item.assetId,
      assetTag: asset.assetTag,
      assetName: asset.name,
      auditStatus: item.auditStatus,
      auditResult: item.auditResult,
      scannedAt: item.scannedAt,
      conditionName,
      conditionNameTh: asset.condition?.nameTh ?? null,
      ownershipType: asset.ownershipType,
      custodianId: asset.custodianId,
      custodianName: asset.custodian?.fullNameTh ?? null,
      locationName: asset.currentLocation?.name ?? null,
      tab: classifyInspectionItem({ auditStatus: item.auditStatus, auditResult: item.auditResult, findings: item.findings, conditionName }),
      handovers,
      pendingFindingIds: item.findings.filter((finding) => finding.reviewStatus === "pending").map((finding) => finding.id),
      targetStatusName: inspectionTargetStatusName({ ownershipType: asset.ownershipType, custodianId: asset.custodianId, handovers }, "confirm"),
    }
  })
  // `<` / `>`, not localeCompare: the same order on every server.
  return rows.sort((left, right) => (left.assetTag < right.assetTag ? -1 : left.assetTag > right.assetTag ? 1 : 0))
}

export async function countRoundUnconfirmedAssets(db: InspectionDb, auditRoundId: string): Promise<number> {
  return db.auditItem.count({ where: roundInspectionItemWhere(auditRoundId) })
}
