// ยืนยันผลตรวจ (inspection-confirm spec §3, §4): a round's assets still "Under Inspection", read on the server. The close
// checklist counts them, the confirm page lists them and the confirm API re-reads them inside its transaction, all
// through the one where below. The db is passed in, so a transaction client works and node --test can import it.
import type { Prisma, PrismaClient } from "@prisma/client"
import { getCheckoutConditionBlock } from "./asset-lifecycle-policy.ts"
import { AUDIT_ID_CHUNK_SIZE, chunkAuditIds } from "./audit-round-counts-rules.ts"
import { loadAuditRoundDisposalFindingIds } from "./disposal-query.ts"
import {
  INSPECTION_STATUS_NAME,
  classifyInspectionItem,
  inspectionTargetStatusName,
  type InspectionConfirmTab,
  type InspectionHandoverCounts,
  type InspectionTargetStatusName,
} from "./inspection-confirm-rules.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

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
  const itemAssetIds = items.map((item) => item.assetId)

  // The items' findings, read on their own: `audit_findings` has no index on `auditItemId`, and the confirm API reads
  // these rows inside a Serializable transaction, so a nested `findings` read by item id would scan, and range-lock,
  // the whole table until commit. Every creator copies the item's asset onto the finding (final review I-1b,
  // audit-item-review-state.ts), so the round and asset ids give the same set, and the read seeks
  // `IX_audit_findings_assetId`. Grouped by item, as the relation returned them.
  const findingsByItem = new Map<string, Array<{ id: string; findingType: string; reviewStatus: string }>>()
  for (const chunk of chunkAuditIds(itemAssetIds, AUDIT_ID_CHUNK_SIZE)) {
    const findings = await db.auditFinding.findMany({
      where: { auditRoundId, assetId: { in: chunk } },
      select: { id: true, auditItemId: true, findingType: true, reviewStatus: true },
    })
    for (const { auditItemId, ...finding } of findings) {
      const list = findingsByItem.get(auditItemId)
      if (list) list.push(finding)
      else findingsByItem.set(auditItemId, [finding])
    }
  }

  // Open handovers, as asset-state-review-service.ts reads them: not returned and active, counted by handoverMode.
  const handoversByAsset = new Map<string, InspectionHandoverCounts>()
  for (const chunk of chunkAuditIds(itemAssetIds, AUDIT_ID_CHUNK_SIZE)) {
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
    const findings = findingsByItem.get(item.id) ?? []
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
      tab: classifyInspectionItem({ auditStatus: item.auditStatus, auditResult: item.auditResult, findings, conditionName }),
      handovers,
      pendingFindingIds: findings.filter((finding) => finding.reviewStatus === "pending").map((finding) => finding.id),
      targetStatusName: inspectionTargetStatusName({ ownershipType: asset.ownershipType, custodianId: asset.custodianId, handovers }, "confirm"),
    }
  })
  // `<` / `>`, not localeCompare: the same order on every server.
  return rows.sort((left, right) => (left.assetTag < right.assetTag ? -1 : left.assetTag > right.assetTag ? 1 : 0))
}

// The same count for many rounds at once (the approvals inbox, the rounds list), in chunks of 2,000 ids; a round with
// none is absent from the map.
export async function countUnconfirmedAssetsByRound(db: InspectionDb, auditRoundIds: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const chunk of chunkAuditIds(auditRoundIds, AUDIT_ID_CHUNK_SIZE)) {
    const rows = await db.auditItem.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: chunk }, asset: inspectionUnderReviewAssetWhere },
      _count: { _all: true },
    })
    for (const row of rows) if (row._count._all > 0) counts.set(row.auditRoundId, row._count._all)
  }
  return counts
}

export async function countRoundUnconfirmedAssets(db: InspectionDb, auditRoundId: string): Promise<number> {
  return db.auditItem.count({ where: roundInspectionItemWhere(auditRoundId) })
}

export type RoundDisposalSummary = {
  /** The round's not-found assets now หาไม่พบ with no open request (pending or approved), by tag. */
  missingForDisposal: Array<{ assetId: string; assetTag: string }>
  /**
   * The round's assets confirmed damaged (plan 4 task 4b): a condition the checkout refuses, Ready or In Use, no open
   * request and no open repair record, by tag. The confirm page offers them for disposal once the round is closed.
   */
  damagedForDisposal: Array<{ assetId: string; assetTag: string; assetName: string }>
  /** Active requests made from this round: from its confirm page (audit_round) or one of its findings (audit_finding). */
  requests: number
  approved: number
}

/**
 * Plan 4 task 4b: the round's items whose asset could go to disposal after a damaged confirm: active, Ready or In Use, no
 * open disposal request and no open repair record (openRepairRecordWhere, as the disposal readiness counts it). The
 * condition is checked on what this returns (toDamagedForDisposal), through getCheckoutConditionBlock.
 */
export function roundDamagedForDisposalItemWhere(auditRoundId: string): Prisma.AuditItemWhereInput {
  return {
    auditRoundId,
    asset: {
      isActive: true,
      status: { name: { in: ["Ready", "In Use"] } },
      disposalRequests: { none: { isActive: true, requestStatus: { in: ["pending", "approved"] } } },
      maintenanceTickets: { none: openRepairRecordWhere },
    },
  }
}

/** The condition-blocked ones (เสียหาย, ใช้งานไม่ได้, ซาก), by tag. */
export function toDamagedForDisposal(
  items: ReadonlyArray<{ assetId: string; asset: { assetTag: string; name: string; condition: { name: string } | null } }>,
): RoundDisposalSummary["damagedForDisposal"] {
  return items
    .filter((item) => getCheckoutConditionBlock(item.asset.condition?.name) !== null)
    .map((item) => ({ assetId: item.assetId, assetTag: item.asset.assetTag, assetName: item.asset.name }))
    // `<` / `>`, as loadRoundInspectionRows sorts.
    .sort((left, right) => (left.assetTag < right.assetTag ? -1 : left.assetTag > right.assetTag ? 1 : 0))
}

// ยืนยันผลตรวจ plan 4 task 3: the confirm page's lost-disposal block and its disposal line. The requests are the disposal
// list's round filter (disposal-query.ts), counted; the finding ids come in chunks for SQL Server's parameter limit.
export async function loadRoundDisposalSummary(db: InspectionDb, auditRoundId: string): Promise<RoundDisposalSummary> {
  const items = await db.auditItem.findMany({
    where: {
      auditRoundId,
      auditResult: "not_found",
      asset: {
        isActive: true,
        status: { name: "Missing" },
        disposalRequests: { none: { isActive: true, requestStatus: { in: ["pending", "approved"] } } },
      },
    },
    select: { assetId: true, asset: { select: { assetTag: true } } },
  })
  // One item per asset per round (@@unique([auditRoundId, assetId])).
  const missingForDisposal = items
    .map((item) => ({ assetId: item.assetId, assetTag: item.asset.assetTag }))
    // `<` / `>`, as loadRoundInspectionRows sorts.
    .sort((left, right) => (left.assetTag < right.assetTag ? -1 : left.assetTag > right.assetTag ? 1 : 0))

  const damagedItems = await db.auditItem.findMany({
    where: roundDamagedForDisposalItemWhere(auditRoundId),
    select: { assetId: true, asset: { select: { assetTag: true, name: true, condition: { select: { name: true } } } } },
  })
  const damagedForDisposal = toDamagedForDisposal(damagedItems)

  const findingIds = await loadAuditRoundDisposalFindingIds(db, auditRoundId)
  const sourceWheres: Prisma.DisposalRequestWhereInput[] = [
    { sourceType: "audit_round", sourceId: auditRoundId },
    ...chunkAuditIds(findingIds, AUDIT_ID_CHUNK_SIZE).map((chunk): Prisma.DisposalRequestWhereInput => ({ sourceType: "audit_finding", sourceId: { in: chunk } })),
  ]
  let requests = 0
  let approved = 0
  for (const source of sourceWheres) {
    const [all, done] = await Promise.all([
      db.disposalRequest.count({ where: { isActive: true, ...source } }),
      db.disposalRequest.count({ where: { isActive: true, requestStatus: "approved", ...source } }),
    ])
    requests += all
    approved += done
  }
  return { missingForDisposal, damagedForDisposal, requests, approved }
}
