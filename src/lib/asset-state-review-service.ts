import type { Prisma, PrismaClient } from "@prisma/client"
import { filterSelectableConditions, normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import { detectAssetStateIssues } from "./asset-state-review-detector.ts"
import type {
  AssetStateReviewErrorCode,
  AssetStateReviewIssueType,
  AssetStateObservedSnapshot,
  AssetStateReviewCandidate,
  AssetStateReviewListFilters,
} from "./asset-state-review-types.ts"
import { isAssetStateReviewIssueType } from "./asset-state-review-types.ts"
import { writeAuditLog } from "./audit-log-writer.ts"

const scanPageSize = 250

export type AssetStateReviewScanResult = {
  scannedAssets: number
  created: number
  refreshed: number
  autoClosed: number
}

type ScanOptions = {
  snapshots?: AssetStateObservedSnapshot[]
  now?: Date
  statusIdByName?: ReadonlyMap<string, string>
  conditionIdByName?: ReadonlyMap<string, string>
}

export type AssetStateReviewResolutionCommand = {
  reviewId: string
  statusId?: string
  conditionId?: string
  reason: string
}

export class AssetStateReviewServiceError extends Error {
  readonly code: AssetStateReviewErrorCode

  constructor(code: AssetStateReviewErrorCode) {
    super(code)
    this.code = code
    this.name = "AssetStateReviewServiceError"
  }
}

const allowedStatusTargets: Record<AssetStateReviewIssueType, readonly string[]> = {
  checked_out_without_open_checkout: ["Ready", "In Use"],
  personal_ready_with_custodian: ["In Use"],
  personal_in_use_without_custodian: ["Ready"],
  repair_status_without_active_ticket: ["Ready", "In Use"],
  active_repair_ticket_status_mismatch: ["Pending Repair", "Under Maintenance"],
  open_checkout_status_mismatch: ["Checked Out"],
  incompatible_status_condition: [],
  legacy_condition_value: [],
  controlled_legacy_status: ["Ready", "In Use", "Missing", "Lost"],
  legacy_disposal_missing_previous_status: ["Ready", "In Use"],
  transaction_cancellation_blocked: [],
}

const conditionResolutionIssues = new Set<AssetStateReviewIssueType>([
  "incompatible_status_condition",
  "legacy_condition_value",
])

export async function resolveAssetStateReview(
  db: PrismaClient,
  command: AssetStateReviewResolutionCommand,
  actorId: string,
) {
  assertResolutionReason(command.reason)
  if (!command.statusId && !command.conditionId) {
    throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED")
  }

  return db.$transaction(async (tx) => {
    const review = await tx.assetStateReview.findUnique({
      where: { id: command.reviewId },
      include: {
        asset: {
          include: {
            status: { select: { id: true, name: true } },
            condition: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!review) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_NOT_FOUND")
    if (review.reviewStatus !== "pending") throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_NOT_PENDING")
    if (!isAssetStateReviewIssueType(review.issueType)) {
      throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED")
    }
    assertFreshReview(review)

    const nextStatus = command.statusId
      ? await tx.assetStatus.findFirst({ where: { id: command.statusId, isActive: true }, select: { id: true, name: true } })
      : null
    const nextCondition = command.conditionId
      ? await tx.assetCondition.findFirst({ where: { id: command.conditionId, isActive: true }, select: { id: true, name: true } })
      : null
    if ((command.statusId && !nextStatus) || (command.conditionId && !nextCondition)) {
      throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_MASTER_NOT_FOUND")
    }
    assertAllowedResolution(review.issueType, nextStatus?.name, nextCondition)

    const assetUpdate = await tx.asset.updateMany({
      where: {
        id: review.assetId,
        updatedAt: review.observedAssetUpdatedAt,
        statusId: review.asset.statusId,
        conditionId: review.asset.conditionId,
        custodianId: review.observedCustodianId,
      },
      data: {
        ...(nextStatus ? { statusId: nextStatus.id } : {}),
        ...(nextCondition ? { conditionId: nextCondition.id } : {}),
        updatedBy: actorId,
      },
    })
    if (assetUpdate.count !== 1) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_STALE")

    await tx.assetMovement.create({
      data: {
        assetId: review.assetId,
        movementType: "state_review_resolution",
        fromValue: nextStatus ? review.observedStatusId : review.observedConditionId,
        toValue: nextStatus?.id ?? nextCondition?.id ?? null,
        reason: command.reason.trim(),
        referenceType: "asset_state_review",
        referenceId: review.id,
        performedBy: actorId,
        remark: review.issueType,
      },
    })
    await writeAuditLog(tx, {
      userId: actorId,
      action: "asset_state_review_resolve",
      module: "asset",
      recordId: review.assetId,
      oldValue: {
        assetTag: review.asset.assetTag,
        issueType: review.issueType,
        statusId: review.observedStatusId,
        conditionId: review.observedConditionId,
      },
      newValue: {
        assetTag: review.asset.assetTag,
        issueType: review.issueType,
        statusId: nextStatus?.id ?? review.observedStatusId,
        conditionId: nextCondition?.id ?? review.observedConditionId,
        resolutionReason: command.reason.trim(),
      },
    })
    const resolvedAt = new Date()
    const reviewUpdate = await tx.assetStateReview.updateMany({
      where: { id: review.id, reviewStatus: "pending", observedAssetUpdatedAt: review.observedAssetUpdatedAt },
      data: {
        reviewStatus: "resolved",
        resolvedAt,
        resolvedBy: actorId,
        resolutionReason: command.reason.trim(),
        resolvedStatusId: nextStatus?.id ?? null,
        resolvedConditionId: nextCondition?.id ?? null,
      },
    })
    if (reviewUpdate.count !== 1) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_STALE")
    return { id: review.id, reviewStatus: "resolved" as const, resolvedAt }
  })
}

export async function dismissAssetStateReview(
  db: PrismaClient,
  reviewId: string,
  reason: string,
  actorId: string,
) {
  assertResolutionReason(reason)
  return db.$transaction(async (tx) => {
    const review = await tx.assetStateReview.findUnique({
      where: { id: reviewId },
      include: { asset: { select: { assetTag: true } } },
    })
    if (!review) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_NOT_FOUND")
    if (review.reviewStatus !== "pending") throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_NOT_PENDING")

    await writeAuditLog(tx, {
      userId: actorId,
      action: "asset_state_review_dismiss",
      module: "asset",
      recordId: review.assetId,
      oldValue: { assetTag: review.asset.assetTag, issueType: review.issueType, reviewStatus: "pending" },
      newValue: { assetTag: review.asset.assetTag, issueType: review.issueType, reviewStatus: "dismissed", resolutionReason: reason.trim() },
    })
    const resolvedAt = new Date()
    const update = await tx.assetStateReview.updateMany({
      where: { id: review.id, reviewStatus: "pending" },
      data: { reviewStatus: "dismissed", resolvedAt, resolvedBy: actorId, resolutionReason: reason.trim() },
    })
    if (update.count !== 1) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_NOT_PENDING")
    return { id: review.id, reviewStatus: "dismissed" as const, resolvedAt }
  })
}

function assertFreshReview(review: {
  observedStatusId: string | null
  observedConditionId: string | null
  observedCustodianId: string | null
  observedAssetUpdatedAt: Date
  asset: { statusId: string; conditionId: string; custodianId: string | null; updatedAt: Date }
}) {
  if (
    review.asset.statusId !== review.observedStatusId
    || review.asset.conditionId !== review.observedConditionId
    || review.asset.custodianId !== review.observedCustodianId
    || review.asset.updatedAt.getTime() !== review.observedAssetUpdatedAt.getTime()
  ) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_STALE")
}

function assertAllowedResolution(
  issueType: AssetStateReviewIssueType,
  statusName: string | undefined,
  condition: { name: string } | null,
) {
  if (statusName && !allowedStatusTargets[issueType].some((target) => normalizeAssetStateName(target) === normalizeAssetStateName(statusName))) {
    throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED")
  }
  if (condition && (!conditionResolutionIssues.has(issueType) || filterSelectableConditions([condition]).length !== 1)) {
    throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED")
  }
  if (statusName && condition) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED")
}

function assertResolutionReason(reason: string) {
  if (reason.trim().length < 10) throw new AssetStateReviewServiceError("ASSET_STATE_REVIEW_REASON_REQUIRED")
}

export async function scanAssetStateReviews(
  db: PrismaClient,
  actorId: string,
  options: ScanOptions = {},
): Promise<AssetStateReviewScanResult> {
  const snapshots = options.snapshots ?? await loadAssetStateReviewSnapshots(db)
  const now = options.now ?? new Date()
  const masterMaps = options.snapshots || options.statusIdByName || options.conditionIdByName
    ? {
        statusIdByName: options.statusIdByName ?? new Map<string, string>(),
        conditionIdByName: options.conditionIdByName ?? new Map<string, string>(),
      }
    : await loadAssetStateMasterMaps(db)
  const result: AssetStateReviewScanResult = {
    scannedAssets: snapshots.length,
    created: 0,
    refreshed: 0,
    autoClosed: 0,
  }

  for (const snapshot of snapshots) {
    await db.$transaction(async (tx) => {
      const candidates = detectAssetStateIssues(snapshot)
      const detectedIssueTypes = new Set(candidates.map((candidate) => candidate.issueType))

      for (const candidate of candidates) {
        const existing = await tx.assetStateReview.findFirst({
          where: { assetId: snapshot.assetId, issueType: candidate.issueType, reviewStatus: "pending" },
          select: { id: true },
        })
        const data = buildObservedReviewData(snapshot, candidate, masterMaps, now)
        if (existing) {
          await tx.assetStateReview.update({ where: { id: existing.id }, data })
          result.refreshed += 1
          continue
        }

        const dismissed = await tx.assetStateReview.findFirst({
          where: { assetId: snapshot.assetId, issueType: candidate.issueType, reviewStatus: "dismissed" },
          orderBy: { resolvedAt: "desc" },
          select: { observedAssetUpdatedAt: true },
        })
        if (dismissed?.observedAssetUpdatedAt.getTime() === snapshot.assetUpdatedAt.getTime()) continue

        await tx.assetStateReview.create({
          data: {
            assetId: snapshot.assetId,
            issueType: candidate.issueType,
            reviewStatus: "pending",
            detectedAt: now,
            ...data,
          },
        })
        result.created += 1
      }

      const pending = await tx.assetStateReview.findMany({
        where: { assetId: snapshot.assetId, reviewStatus: "pending" },
        select: { id: true, issueType: true },
      })
      for (const review of pending) {
        if (detectedIssueTypes.has(review.issueType as AssetStateReviewCandidate["issueType"])) continue
        await tx.assetStateReview.update({
          where: { id: review.id },
          data: {
            reviewStatus: "resolved",
            resolvedAt: now,
            resolvedBy: actorId,
            resolutionReason: "condition_no_longer_detected",
          },
        })
        result.autoClosed += 1
      }
    })
  }

  return result
}

export async function listAssetStateReviews(db: PrismaClient, filters: AssetStateReviewListFilters) {
  const where: Prisma.AssetStateReviewWhereInput = {
    ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.issueType ? { issueType: filters.issueType } : {}),
    ...(filters.statusId ? { observedStatusId: filters.statusId } : {}),
    ...(filters.conditionId ? { observedConditionId: filters.conditionId } : {}),
    ...((filters.companyId || filters.branchId) ? {
      asset: {
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
    } : {}),
  }

  const [rows, total, severityRows, issueRows] = await Promise.all([
    db.assetStateReview.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            ownershipType: true,
            custodianId: true,
            companyId: true,
            branchId: true,
            status: { select: { id: true, name: true, nameTh: true } },
            condition: { select: { id: true, name: true, nameTh: true } },
            custodian: { select: { code: true, fullNameTh: true } },
          },
        },
      },
      orderBy: [{ severity: "asc" }, { lastDetectedAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.assetStateReview.count({ where }),
    db.assetStateReview.groupBy({
      by: ["severity"],
      where: { reviewStatus: "pending" },
      _count: { _all: true },
    }),
    db.assetStateReview.groupBy({
      by: ["issueType"],
      where: { reviewStatus: "pending" },
      _count: { _all: true },
    }),
  ])

  const [suggestedStatuses, suggestedConditions] = await Promise.all([
    db.assetStatus.findMany({ where: { isActive: true }, select: { id: true, name: true, nameTh: true } }),
    db.assetCondition.findMany({ where: { isActive: true }, select: { id: true, name: true, nameTh: true } }),
  ])
  const statusById = new Map(suggestedStatuses.map((status) => [status.id, status]))
  const conditionById = new Map(suggestedConditions.map((condition) => [condition.id, condition]))

  return {
    data: rows.map((row) => {
      const issueType = isAssetStateReviewIssueType(row.issueType) ? row.issueType : null
      const allowedStatusNames = issueType ? allowedStatusTargets[issueType] : []
      return {
        ...row,
        metadata: parseMetadata(row.metadataJson),
        suggestedStatus: row.suggestedStatusId ? statusById.get(row.suggestedStatusId) ?? null : null,
        suggestedCondition: row.suggestedConditionId ? conditionById.get(row.suggestedConditionId) ?? null : null,
        allowedStatusTargets: suggestedStatuses.filter((status) =>
          allowedStatusNames.some((name) => normalizeAssetStateName(name) === normalizeAssetStateName(status.name))
        ),
        allowedConditionTargets: issueType && conditionResolutionIssues.has(issueType)
          ? filterSelectableConditions(suggestedConditions)
          : [],
      }
    }),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      bySeverity: Object.fromEntries(severityRows.map((row) => [row.severity, row._count._all])),
      byIssueType: Object.fromEntries(issueRows.map((row) => [row.issueType, row._count._all])),
    },
  }
}

export async function loadAssetStateReviewSnapshots(db: PrismaClient): Promise<AssetStateObservedSnapshot[]> {
  const snapshots: AssetStateObservedSnapshot[] = []
  let cursor: string | undefined

  do {
    const assets = await db.asset.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      take: scanPageSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        assetTag: true,
        name: true,
        companyId: true,
        branchId: true,
        ownershipType: true,
        statusId: true,
        conditionId: true,
        custodianId: true,
        updatedAt: true,
        status: { select: { name: true } },
        condition: { select: { name: true } },
      },
    })
    if (assets.length === 0) break

    const assetIds = assets.map((asset) => asset.id)
    const [checkoutGroups, correctiveTickets, disposalGroups] = await Promise.all([
      db.assetCheckout.groupBy({
        by: ["assetId"],
        where: { assetId: { in: assetIds }, isReturned: false, transactionStatus: "active" },
        _count: { _all: true },
      }),
      db.maintenanceTicket.findMany({
        where: {
          assetId: { in: assetIds },
          isActive: true,
          repairStatus: { notIn: ["closed", "cancelled"] },
          maintenancePlanId: null,
          NOT: { problem: { startsWith: "[PM] " } },
        },
        select: { assetId: true, repairStatus: true },
      }),
      db.disposalRequest.groupBy({
        by: ["assetId"],
        where: {
          assetId: { in: assetIds },
          isActive: true,
          requestStatus: { in: ["pending", "approved"] },
          previousAssetStatusId: null,
        },
        _count: { _all: true },
      }),
    ])

    const checkoutCountByAsset = new Map(checkoutGroups.map((row) => [row.assetId, row._count._all]))
    const disposalCountByAsset = new Map(disposalGroups.map((row) => [row.assetId, row._count._all]))
    const correctiveStatusesByAsset = new Map<string, string[]>()
    for (const ticket of correctiveTickets) {
      const statuses = correctiveStatusesByAsset.get(ticket.assetId) ?? []
      statuses.push(ticket.repairStatus)
      correctiveStatusesByAsset.set(ticket.assetId, statuses)
    }

    snapshots.push(...assets.map((asset) => {
      const activeCorrectiveStatusNames = correctiveStatusesByAsset.get(asset.id) ?? []
      return {
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        companyId: asset.companyId,
        branchId: asset.branchId,
        ownershipType: asset.ownershipType,
        statusId: asset.statusId,
        statusName: asset.status.name,
        conditionId: asset.conditionId,
        conditionName: asset.condition.name,
        custodianId: asset.custodianId,
        assetUpdatedAt: asset.updatedAt,
        openCheckouts: checkoutCountByAsset.get(asset.id) ?? 0,
        activeCorrectiveTickets: activeCorrectiveStatusNames.length,
        activeCorrectiveStatusNames,
        openDisposalsMissingPreviousStatus: disposalCountByAsset.get(asset.id) ?? 0,
      }
    }))
    cursor = assets.at(-1)?.id
    if (assets.length < scanPageSize) break
  } while (cursor)

  return snapshots
}

function buildObservedReviewData(
  snapshot: AssetStateObservedSnapshot,
  candidate: AssetStateReviewCandidate,
  masterMaps: {
    statusIdByName: ReadonlyMap<string, string>
    conditionIdByName: ReadonlyMap<string, string>
  },
  now: Date,
) {
  return {
    severity: candidate.severity,
    observedStatusId: snapshot.statusId,
    observedConditionId: snapshot.conditionId,
    observedCustodianId: snapshot.custodianId,
    observedAssetUpdatedAt: snapshot.assetUpdatedAt,
    suggestedStatusId: candidate.suggestedStatusName
      ? masterMaps.statusIdByName.get(candidate.suggestedStatusName.toLowerCase()) ?? null
      : null,
    suggestedConditionId: candidate.suggestedConditionName
      ? masterMaps.conditionIdByName.get(candidate.suggestedConditionName.toLowerCase()) ?? null
      : null,
    metadataJson: JSON.stringify(candidate.metadata),
    lastDetectedAt: now,
  }
}

async function loadAssetStateMasterMaps(db: PrismaClient) {
  const [statuses, conditions] = await Promise.all([
    db.assetStatus.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.assetCondition.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ])
  return {
    statusIdByName: new Map(statuses.map((status) => [status.name.trim().toLowerCase(), status.id])),
    conditionIdByName: new Map(conditions.map((condition) => [condition.name.trim().toLowerCase(), condition.id])),
  }
}

function parseMetadata(value: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}
