// ยืนยันผลตรวจ (inspection-confirm spec §3, §4): a round's assets still "Under Inspection", read on the server. The close
// checklist counts them, the confirm page lists them and the confirm API re-reads them inside its transaction, all
// through the one where below. The db is passed in, so a transaction client works and node --test can import it.
import type { Prisma, PrismaClient } from "@prisma/client"
import { getCheckoutConditionBlock } from "./asset-lifecycle-policy.ts"
import { AUDIT_ID_CHUNK_SIZE, chunkAuditIds } from "./audit-round-counts-rules.ts"
import { getDisposalAssetEligibilityError, type DisposalLifecycleStatus } from "./disposal-policy.ts"
import { loadAuditRoundDisposalFindingIds } from "./disposal-query.ts"
import { disposalReadinessAssetSelect, getDisposalReadinessBlockersForAsset } from "./disposal-readiness.ts"
import {
  INSPECTION_STATUS_NAME,
  classifyInspectionItem,
  inspectionHandoverOpen,
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

  const handoversByAsset = await loadOpenHandoverCounts(db, itemAssetIds)

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

/**
 * Plan 5 final review: the round's Under Inspection assets the confirm page can act on now, i.e. checked
 * (auditStatus not pending). The findings hand-off banner counts these, not the not-scanned ones.
 */
export async function countRoundConfirmableAssets(db: InspectionDb, auditRoundId: string): Promise<number> {
  return db.auditItem.count({ where: { ...roundInspectionItemWhere(auditRoundId), auditStatus: { not: "pending" } } })
}

// Open handovers, as asset-state-review-service.ts reads them: not returned and active, counted by handoverMode. An asset
// with none is absent from the map. The round rows and the single-asset confirm (asset-confirm-inspection-service.ts)
// both read them here.
export async function loadOpenHandoverCounts(db: InspectionDb, assetIds: readonly string[]): Promise<Map<string, InspectionHandoverCounts>> {
  const handoversByAsset = new Map<string, InspectionHandoverCounts>()
  for (const chunk of chunkAuditIds(assetIds, AUDIT_ID_CHUNK_SIZE)) {
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
  return handoversByAsset
}

export type InspectionRoundCandidate = {
  roundId: string
  auditNo: string
  startDate: Date
  roundStatus: string
  roundActive: boolean
  tab: InspectionConfirmTab
}

export type AssetInspectionRound = { roundId: string; auditNo: string; tab: InspectionConfirmTab }

// The tabs the confirm page can act on now; awaitingReview and notScanned wait for something else first.
const actionableRoundTabs: ReadonlySet<InspectionConfirmTab> = new Set(["ready", "damaged", "notFound"])

/**
 * ยืนยันผลตรวจ plan 5 (spec §7): the round an Under Inspection asset is confirmed in. Active, not cancelled rounds only;
 * the newest by startDate among those where its tab is ready, damaged or notFound, else the newest whatever the tab;
 * none = null (the asset detail page offers the single-asset dialog). Equal start dates fall back to the higher auditNo.
 */
export function pickInspectionRound(candidates: readonly InspectionRoundCandidate[]): AssetInspectionRound | null {
  const live = candidates.filter((candidate) => candidate.roundActive && candidate.roundStatus !== "cancelled")
  const newest = (list: readonly InspectionRoundCandidate[]) =>
    list.reduce<InspectionRoundCandidate | null>((best, candidate) => {
      if (!best) return candidate
      const byDate = candidate.startDate.getTime() - best.startDate.getTime()
      if (byDate !== 0) return byDate > 0 ? candidate : best
      return candidate.auditNo > best.auditNo ? candidate : best
    }, null)
  const picked = newest(live.filter((candidate) => actionableRoundTabs.has(candidate.tab))) ?? newest(live)
  return picked ? { roundId: picked.roundId, auditNo: picked.auditNo, tab: picked.tab } : null
}

/**
 * The asset's items in active, non-cancelled rounds, classified as the confirm page classifies them. The findings are
 * read by round and asset ids, as loadRoundInspectionRows reads them (one item per asset per round, so the round id
 * groups them as the item id would).
 */
export async function findAssetInspectionRound(db: InspectionDb, assetId: string): Promise<AssetInspectionRound | null> {
  const items = await db.auditItem.findMany({
    where: { assetId, auditRound: { isActive: true, status: { not: "cancelled" } } },
    select: {
      auditRoundId: true,
      auditStatus: true,
      auditResult: true,
      auditRound: { select: { auditNo: true, startDate: true, status: true, isActive: true } },
      asset: { select: { condition: { select: { name: true } } } },
    },
  })
  if (items.length === 0) return null

  const findingsByRound = new Map<string, Array<{ findingType: string; reviewStatus: string }>>()
  const findings = await db.auditFinding.findMany({
    where: { assetId, auditRoundId: { in: items.map((item) => item.auditRoundId) } },
    select: { auditRoundId: true, findingType: true, reviewStatus: true },
  })
  for (const { auditRoundId, ...finding } of findings) {
    const list = findingsByRound.get(auditRoundId)
    if (list) list.push(finding)
    else findingsByRound.set(auditRoundId, [finding])
  }

  return pickInspectionRound(items.map((item): InspectionRoundCandidate => ({
    roundId: item.auditRoundId,
    auditNo: item.auditRound.auditNo,
    startDate: item.auditRound.startDate,
    roundStatus: item.auditRound.status,
    roundActive: item.auditRound.isActive,
    tab: classifyInspectionItem({
      auditStatus: item.auditStatus,
      auditResult: item.auditResult,
      findings: findingsByRound.get(item.auditRoundId) ?? [],
      conditionName: item.asset.condition?.name ?? null,
    }),
  })))
}

const NO_HANDOVERS: InspectionHandoverCounts = { permanent: 0, temporary: 0, unknown: 0 }

/**
 * Plan 5 final review (controller decision A): ยืนยันผลตรวจ is the one way to release an Under Inspection asset, except
 * where its flows refuse the asset because of an open handover. The old Ready-only status correction stays as an escape
 * hatch for those cases only:
 * - the open handover is unclear (an unknown mode, or both modes open: inspectionTargetStatusName is null), wherever the
 *   asset sits;
 * - the asset's round row is on the not-found tab and it has any open handover (หาไม่พบ refuses it: handoverOpen).
 * The caller has checked the asset is Under Inspection. The status-correction route and the asset detail page both ask.
 */
export async function inspectionCorrectionEscapeAllowed(db: InspectionDb, assetId: string): Promise<boolean> {
  const handovers = (await loadOpenHandoverCounts(db, [assetId])).get(assetId) ?? NO_HANDOVERS
  if (!inspectionHandoverOpen(handovers)) return false
  if (inspectionTargetStatusName({ ownershipType: null, custodianId: null, handovers }, "confirm") === null) return true
  const round = await findAssetInspectionRound(db, assetId)
  return round?.tab === "notFound"
}

export type RoundDisposalSummary = {
  /**
   * The round's not-found assets set หาไม่พบ through this round's confirm page, with no open request (pending or
   * approved) and nothing else refusing a lost request (isRoundAssetReadyForDisposal), by tag.
   */
  missingForDisposal: Array<{ assetId: string; assetTag: string }>
  /** The same assets that something else still refuses (a handover, a component, a licence, another open round), by tag. */
  missingBlockedForDisposal: Array<{ assetId: string; assetTag: string }>
  /**
   * The round's assets confirmed damaged through this round (plan 4 task 4b): a condition the checkout refuses, Ready or
   * In Use, no open request, no open repair record and no readiness blocker, by tag. The confirm page offers them for
   * disposal once the round is closed.
   */
  damagedForDisposal: Array<{ assetId: string; assetTag: string; assetName: string }>
  /** Active requests made from this round: from its confirm page (audit_round) or one of its findings (audit_finding). */
  requests: number
  approved: number
}

/**
 * Plan 4 final review: an asset counts for this round only when this round's confirm page set its status, i.e. the
 * status_correction movement confirm-results writes (inspection-confirm-service.ts) with the round as its reference. An
 * asset damaged or lost later, or confirmed through another round, is not this round's.
 */
export function confirmedThroughRoundAssetWhere(auditRoundId: string): Prisma.AssetWhereInput {
  return { movements: { some: { movementType: "status_correction", referenceType: "audit_round", referenceId: auditRoundId } } }
}

/**
 * Plan 4 task 4b: the round's items whose asset could go to disposal after a damaged confirm: active, Ready or In Use,
 * confirmed through this round, no open disposal request and no open repair record (openRepairRecordWhere, as the
 * disposal readiness counts it). The readiness and the condition are checked on what this returns
 * (isRoundAssetReadyForDisposal, then toDamagedForDisposal through getCheckoutConditionBlock).
 */
export function roundDamagedForDisposalItemWhere(auditRoundId: string): Prisma.AuditItemWhereInput {
  return {
    auditRoundId,
    asset: {
      isActive: true,
      status: { name: { in: ["Ready", "In Use"] } },
      disposalRequests: { none: { isActive: true, requestStatus: { in: ["pending", "approved"] } } },
      maintenanceTickets: { none: openRepairRecordWhere },
      ...confirmedThroughRoundAssetWhere(auditRoundId),
    },
  }
}

/** Plan 4 task 3: the round's not-found items whose asset is now หาไม่พบ through this round, with no open request. */
export function roundMissingForDisposalItemWhere(auditRoundId: string): Prisma.AuditItemWhereInput {
  return {
    auditRoundId,
    auditResult: "not_found",
    asset: {
      isActive: true,
      status: { name: "Missing" },
      disposalRequests: { none: { isActive: true, requestStatus: { in: ["pending", "approved"] } } },
      ...confirmedThroughRoundAssetWhere(auditRoundId),
    },
  }
}

/**
 * The disposal readiness read (disposalReadinessAssetSelect) without this round's own item and findings: after the close
 * they no longer count anyway, and before it this open round would hide every asset from the not-yet-closed note. Any
 * other open round still blocks.
 */
export function roundDisposalReadinessSelect(auditRoundId: string) {
  const counts = disposalReadinessAssetSelect._count.select
  return {
    ...disposalReadinessAssetSelect,
    _count: {
      select: {
        ...counts,
        auditItems: { where: { ...counts.auditItems.where, auditRoundId: { not: auditRoundId } } },
        auditFindings: { where: { ...counts.auditFindings.where, auditRoundId: { not: auditRoundId } } },
      },
    },
  } satisfies Prisma.AssetSelect
}

/**
 * A request could be made for the asset now: no readiness blocker and a status the request allows, with the method
 * สูญหาย for a หาไม่พบ asset ("lost") and with no method for a damaged one.
 */
export function isRoundAssetReadyForDisposal(
  asset: Parameters<typeof getDisposalReadinessBlockersForAsset>[0] & { status: DisposalLifecycleStatus | null },
  disposalType?: "lost",
): boolean {
  return getDisposalReadinessBlockersForAsset(asset).length === 0 && getDisposalAssetEligibilityError(asset.status, disposalType) === null
}

// `<` / `>`, as loadRoundInspectionRows sorts.
function byAssetTag<T extends { assetTag: string }>(left: T, right: T) {
  return left.assetTag < right.assetTag ? -1 : left.assetTag > right.assetTag ? 1 : 0
}

/** The condition-blocked ones (เสียหาย, ใช้งานไม่ได้, ซาก), by tag. */
export function toDamagedForDisposal(
  items: ReadonlyArray<{ assetId: string; asset: { assetTag: string; name: string; condition: { name: string } | null } }>,
): RoundDisposalSummary["damagedForDisposal"] {
  return items
    .filter((item) => getCheckoutConditionBlock(item.asset.condition?.name) !== null)
    .map((item) => ({ assetId: item.assetId, assetTag: item.asset.assetTag, assetName: item.asset.name }))
    .sort(byAssetTag)
}

// ยืนยันผลตรวจ plan 4 task 3: the confirm page's lost-disposal block and its disposal line. The requests are the disposal
// list's round filter (disposal-query.ts), counted; the finding ids come in chunks for SQL Server's parameter limit.
export async function loadRoundDisposalSummary(db: InspectionDb, auditRoundId: string): Promise<RoundDisposalSummary> {
  const readinessSelect = roundDisposalReadinessSelect(auditRoundId)
  const items = await db.auditItem.findMany({
    where: roundMissingForDisposalItemWhere(auditRoundId),
    select: { assetId: true, asset: { select: { assetTag: true, status: { select: { name: true, nameTh: true } }, ...readinessSelect } } },
  })
  // One item per asset per round (@@unique([auditRoundId, assetId])).
  const missingForDisposal: RoundDisposalSummary["missingForDisposal"] = []
  const missingBlockedForDisposal: RoundDisposalSummary["missingBlockedForDisposal"] = []
  for (const item of items) {
    const entry = { assetId: item.assetId, assetTag: item.asset.assetTag }
    if (isRoundAssetReadyForDisposal(item.asset, "lost")) missingForDisposal.push(entry)
    else missingBlockedForDisposal.push(entry)
  }
  missingForDisposal.sort(byAssetTag)
  missingBlockedForDisposal.sort(byAssetTag)

  const damagedItems = await db.auditItem.findMany({
    where: roundDamagedForDisposalItemWhere(auditRoundId),
    select: {
      assetId: true,
      asset: { select: { assetTag: true, name: true, condition: { select: { name: true } }, status: { select: { name: true, nameTh: true } }, ...readinessSelect } },
    },
  })
  const damagedForDisposal = toDamagedForDisposal(damagedItems.filter((item) => isRoundAssetReadyForDisposal(item.asset)))

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
  return { missingForDisposal, missingBlockedForDisposal, damagedForDisposal, requests, approved }
}
