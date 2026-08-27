import {
  evaluateAssetTransactionCancellation,
  type AssetTransactionCancellationReason,
} from "./asset-transaction-cancellation-policy.ts"
import {
  parseAssetTransactionSnapshot,
  type AssetComponentTransactionSnapshotV1,
  type AssetTransactionSnapshotV1,
} from "./asset-transaction-snapshot.ts"

export type AssetTransactionType = "checkout" | "checkin" | "transfer"

export type AssetTransactionCancellationErrorCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_NOT_ACTIVE"
  | "TRANSACTION_STALE"
  | "TRANSACTION_CANCELLATION_BLOCKED"
  | "TRANSACTION_SNAPSHOT_UNSUPPORTED"

export class AssetTransactionCancellationServiceError extends Error {
  readonly code: AssetTransactionCancellationErrorCode

  constructor(code: AssetTransactionCancellationErrorCode) {
    super(code)
    this.name = "AssetTransactionCancellationServiceError"
    this.code = code
  }
}

export type AssetTransactionCancellationDocument = {
  type: AssetTransactionType
  id: string
  assetId: string
  transactionStatus: string
  updatedAt: string
  createdAt: string
  beforeSnapshotJson: string | null
  afterSnapshotJson: string | null
  checkoutId?: string | null
  voidedAt: string | null
}

export type AssetTransactionCancellationContext = {
  document: AssetTransactionCancellationDocument
  currentSnapshot: AssetTransactionSnapshotV1
  isLatestTransaction: boolean
  downstreamTypes: string[]
}

export type AssetCancellationRestorePlan = {
  asset: {
    statusId: string
    conditionId: string
    branchId: string
    currentLocationId: string
    custodianId: string | null
    departmentId: string | null
  }
  components: AssetComponentTransactionSnapshotV1[]
  reopenCheckoutId: string | null
  movementType: "checkout_cancel" | "checkin_cancel" | "transfer_cancel"
}

export type ApplyAssetTransactionCancellationInput = {
  document: AssetTransactionCancellationDocument
  beforeSnapshot: AssetTransactionSnapshotV1
  currentSnapshot: AssetTransactionSnapshotV1
  restorePlan: AssetCancellationRestorePlan
  userId: string
  reason: string
}

export type BlockedAssetTransactionCancellationInput = {
  document: AssetTransactionCancellationDocument
  currentSnapshot: AssetTransactionSnapshotV1
  expectedSnapshot: AssetTransactionSnapshotV1 | null
  userId: string
  reason: string
  reasons: AssetTransactionCancellationReason[]
}

export interface AssetTransactionCancellationRepository {
  transaction<T>(work: (repository: AssetTransactionCancellationRepository) => Promise<T>): Promise<T>
  loadContext(type: AssetTransactionType, transactionId: string): Promise<AssetTransactionCancellationContext | null>
  applyCancellation(input: ApplyAssetTransactionCancellationInput): Promise<{ movementId: string; voidedAt: string }>
  upsertBlockedReview(input: BlockedAssetTransactionCancellationInput): Promise<string>
}

export function buildAssetCancellationRestorePlan(
  type: AssetTransactionType,
  beforeSnapshot: AssetTransactionSnapshotV1
): AssetCancellationRestorePlan {
  return {
    asset: {
      statusId: beforeSnapshot.statusId,
      conditionId: beforeSnapshot.conditionId,
      branchId: beforeSnapshot.branchId,
      currentLocationId: beforeSnapshot.currentLocationId,
      custodianId: beforeSnapshot.custodianId,
      departmentId: beforeSnapshot.departmentId,
    },
    components: beforeSnapshot.components,
    reopenCheckoutId: type === "checkin" ? beforeSnapshot.checkout?.id ?? null : null,
    movementType: `${type}_cancel` as AssetCancellationRestorePlan["movementType"],
  }
}

function movementAssetState(snapshot: AssetTransactionSnapshotV1) {
  return {
    statusId: snapshot.statusId,
    conditionId: snapshot.conditionId,
    branchId: snapshot.branchId,
    currentLocationId: snapshot.currentLocationId,
    custodianId: snapshot.custodianId,
    departmentId: snapshot.departmentId,
  }
}

export function buildCancellationMovementValues(
  currentSnapshot: AssetTransactionSnapshotV1,
  restoredSnapshot: AssetTransactionSnapshotV1
) {
  return {
    fromValue: JSON.stringify(movementAssetState(currentSnapshot)),
    toValue: JSON.stringify(movementAssetState(restoredSnapshot)),
  }
}

function assetStateMatches(current: AssetTransactionSnapshotV1, expected: AssetTransactionSnapshotV1): boolean {
  return (
    current.assetId === expected.assetId &&
    current.assetUpdatedAt === expected.assetUpdatedAt &&
    current.statusId === expected.statusId &&
    current.conditionId === expected.conditionId &&
    current.branchId === expected.branchId &&
    current.currentLocationId === expected.currentLocationId &&
    current.custodianId === expected.custodianId &&
    current.departmentId === expected.departmentId &&
    JSON.stringify(current.checkout ?? null) === JSON.stringify(expected.checkout ?? null)
  )
}

function componentStateMatches(current: AssetTransactionSnapshotV1, expected: AssetTransactionSnapshotV1): boolean {
  return JSON.stringify(current.components) === JSON.stringify(expected.components)
}

function evaluateContext(context: AssetTransactionCancellationContext) {
  const beforeSnapshot = parseAssetTransactionSnapshot(context.document.beforeSnapshotJson)
  const afterSnapshot = parseAssetTransactionSnapshot(context.document.afterSnapshotJson)
  const supportedSnapshot = beforeSnapshot && afterSnapshot ? afterSnapshot : null
  const result = evaluateAssetTransactionCancellation({
    snapshot: supportedSnapshot,
    transactionStatus: context.document.transactionStatus,
    isLatestTransaction: context.isLatestTransaction,
    assetMatchesAfterSnapshot: afterSnapshot ? assetStateMatches(context.currentSnapshot, afterSnapshot) : true,
    componentsMatchAfterSnapshot: afterSnapshot ? componentStateMatches(context.currentSnapshot, afterSnapshot) : true,
    downstreamTypes: context.downstreamTypes,
  })

  return { beforeSnapshot, afterSnapshot, result }
}

export async function previewAssetTransactionCancellation(
  input: { type: AssetTransactionType; transactionId: string },
  repository: AssetTransactionCancellationRepository
) {
  const context = await repository.loadContext(input.type, input.transactionId)
  if (!context) throw new AssetTransactionCancellationServiceError("TRANSACTION_NOT_FOUND")
  return evaluateContext(context).result
}

export async function cancelAssetTransaction(
  input: {
    type: AssetTransactionType
    transactionId: string
    userId: string
    reason: string
    expectedUpdatedAt: string
  },
  repository: AssetTransactionCancellationRepository
) {
  const reason = input.reason.trim()
  if (reason.length < 5) throw new AssetTransactionCancellationServiceError("TRANSACTION_CANCELLATION_BLOCKED")

  return repository.transaction(async (transactionRepository) => {
    const context = await transactionRepository.loadContext(input.type, input.transactionId)
    if (!context) throw new AssetTransactionCancellationServiceError("TRANSACTION_NOT_FOUND")
    if (context.document.transactionStatus === "void") {
      return {
        status: "cancelled" as const,
        movementId: null,
        voidedAt: context.document.voidedAt,
        alreadyCancelled: true as const,
      }
    }
    if (context.document.updatedAt !== input.expectedUpdatedAt) {
      throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")
    }

    const evaluation = evaluateContext(context)
    if (!evaluation.result.eligible) {
      const reviewId = await transactionRepository.upsertBlockedReview({
        document: context.document,
        currentSnapshot: context.currentSnapshot,
        expectedSnapshot: evaluation.afterSnapshot,
        userId: input.userId,
        reason,
        reasons: evaluation.result.reasons,
      })
      return { status: "blocked" as const, reviewId, reasons: evaluation.result.reasons }
    }
    if (!evaluation.beforeSnapshot) {
      throw new AssetTransactionCancellationServiceError("TRANSACTION_SNAPSHOT_UNSUPPORTED")
    }

    const applied = await transactionRepository.applyCancellation({
      document: context.document,
      beforeSnapshot: evaluation.beforeSnapshot,
      currentSnapshot: context.currentSnapshot,
      restorePlan: buildAssetCancellationRestorePlan(input.type, evaluation.beforeSnapshot),
      userId: input.userId,
      reason,
    })
    return { status: "cancelled" as const, ...applied }
  })
}
