import assert from "node:assert/strict"
import test from "node:test"

import {
  AssetTransactionCancellationServiceError,
  buildAssetCancellationRestorePlan,
  buildCancellationMovementValues,
  cancelAssetTransaction,
  previewAssetTransactionCancellation,
  type AssetTransactionCancellationContext,
  type AssetTransactionCancellationRepository,
} from "../src/lib/asset-transaction-cancellation-service.ts"
import type { AssetTransactionSnapshotV1 } from "../src/lib/asset-transaction-snapshot.ts"

const beforeSnapshot: AssetTransactionSnapshotV1 = {
  version: 1,
  assetId: "asset-1",
  assetUpdatedAt: "2026-08-27T08:00:00.000Z",
  statusId: "checked-out",
  conditionId: "good",
  branchId: "branch-1",
  currentLocationId: "desk-1",
  custodianId: "employee-1",
  departmentId: "department-1",
  checkout: { id: "checkout-1", isReturned: false },
  components: [],
}

const afterSnapshot: AssetTransactionSnapshotV1 = {
  ...beforeSnapshot,
  assetUpdatedAt: "2026-08-27T09:00:00.000Z",
  statusId: "ready",
  currentLocationId: "store-1",
  custodianId: null,
  checkout: { id: "checkout-1", isReturned: true },
}

const eligibleContext: AssetTransactionCancellationContext = {
  document: {
    type: "checkin",
    id: "checkin-1",
    assetId: "asset-1",
    transactionStatus: "active",
    updatedAt: "2026-08-27T09:00:01.000Z",
    createdAt: "2026-08-27T09:00:00.000Z",
    beforeSnapshotJson: JSON.stringify(beforeSnapshot),
    afterSnapshotJson: JSON.stringify(afterSnapshot),
    checkoutId: "checkout-1",
    voidedAt: null,
  },
  currentSnapshot: afterSnapshot,
  isLatestTransaction: true,
  downstreamTypes: [],
}

class MemoryCancellationRepository implements AssetTransactionCancellationRepository {
  context: AssetTransactionCancellationContext | null = structuredClone(eligibleContext)
  asset = structuredClone(afterSnapshot)
  checkoutReturned = true
  movements: Array<{ movementType: string; reason: string }> = []
  reviews = new Map<string, string>()

  async transaction<T>(work: (repository: AssetTransactionCancellationRepository) => Promise<T>): Promise<T> {
    return work(this)
  }

  async loadContext() {
    return this.context
  }

  async applyCancellation(input: Parameters<AssetTransactionCancellationRepository["applyCancellation"]>[0]) {
    this.asset = structuredClone(input.beforeSnapshot)
    this.checkoutReturned = input.restorePlan.reopenCheckoutId ? false : this.checkoutReturned
    this.movements.push({ movementType: input.restorePlan.movementType, reason: input.reason })
    if (this.context) {
      this.context.document.transactionStatus = "void"
      this.context.document.voidedAt = "2026-08-27T10:00:00.000Z"
    }
    return { movementId: "movement-1", voidedAt: "2026-08-27T10:00:00.000Z" }
  }

  async upsertBlockedReview(input: Parameters<AssetTransactionCancellationRepository["upsertBlockedReview"]>[0]) {
    const key = `${input.document.assetId}:${input.document.type}:${input.document.id}`
    if (!this.reviews.has(key)) this.reviews.set(key, `review-${this.reviews.size + 1}`)
    return this.reviews.get(key)!
  }
}

test("checkin restore plan reopens checkout and uses a compensating movement", () => {
  assert.deepEqual(buildAssetCancellationRestorePlan("checkin", beforeSnapshot), {
    asset: {
      statusId: "checked-out",
      conditionId: "good",
      branchId: "branch-1",
      currentLocationId: "desk-1",
      custodianId: "employee-1",
      departmentId: "department-1",
    },
    components: [],
    reopenCheckoutId: "checkout-1",
    movementType: "checkin_cancel",
  })
})

test("compensating movement records the state before and after cancellation", () => {
  assert.deepEqual(buildCancellationMovementValues(afterSnapshot, beforeSnapshot), {
    fromValue: JSON.stringify({
      statusId: "ready",
      conditionId: "good",
      branchId: "branch-1",
      currentLocationId: "store-1",
      custodianId: null,
      departmentId: "department-1",
    }),
    toValue: JSON.stringify({
      statusId: "checked-out",
      conditionId: "good",
      branchId: "branch-1",
      currentLocationId: "desk-1",
      custodianId: "employee-1",
      departmentId: "department-1",
    }),
  })
})

test("checkin cancellation restores state and reopens checkout atomically", async () => {
  const repository = new MemoryCancellationRepository()
  const result = await cancelAssetTransaction(
    {
      type: "checkin",
      transactionId: "checkin-1",
      userId: "user-1",
      reason: "บันทึกรับคืนผิดรายการ",
      expectedUpdatedAt: "2026-08-27T09:00:01.000Z",
    },
    repository
  )

  assert.deepEqual(result, { status: "cancelled", movementId: "movement-1", voidedAt: "2026-08-27T10:00:00.000Z" })
  assert.equal(repository.checkoutReturned, false)
  assert.deepEqual(repository.asset, beforeSnapshot)
  assert.deepEqual(repository.movements, [{ movementType: "checkin_cancel", reason: "บันทึกรับคืนผิดรายการ" }])
})

test("blocked cancellation creates one review and changes no asset state", async () => {
  const repository = new MemoryCancellationRepository()
  repository.context = {
    ...structuredClone(eligibleContext),
    downstreamTypes: ["maintenance_create"],
  }

  const input = {
    type: "checkin" as const,
    transactionId: "checkin-1",
    userId: "user-1",
    reason: "ต้องย้อนรายการที่ผิด",
    expectedUpdatedAt: "2026-08-27T09:00:01.000Z",
  }
  const first = await cancelAssetTransaction(input, repository)
  const second = await cancelAssetTransaction(input, repository)

  assert.deepEqual(first, { status: "blocked", reviewId: "review-1", reasons: ["downstream_work"] })
  assert.deepEqual(second, first)
  assert.equal(repository.reviews.size, 1)
  assert.deepEqual(repository.asset, afterSnapshot)
  assert.equal(repository.movements.length, 0)
})

test("stale document versions fail before restoration", async () => {
  const repository = new MemoryCancellationRepository()

  await assert.rejects(
    cancelAssetTransaction({
      type: "checkin",
      transactionId: "checkin-1",
      userId: "user-1",
      reason: "ต้องย้อนรายการที่ผิด",
      expectedUpdatedAt: "2026-08-27T08:59:00.000Z",
    }, repository),
    (error: unknown) => error instanceof AssetTransactionCancellationServiceError && error.code === "TRANSACTION_STALE"
  )
  assert.equal(repository.movements.length, 0)
})

test("already void cancellation is idempotent", async () => {
  const repository = new MemoryCancellationRepository()
  repository.context!.document.transactionStatus = "void"
  repository.context!.document.voidedAt = "2026-08-27T09:30:00.000Z"

  const result = await cancelAssetTransaction({
    type: "checkin",
    transactionId: "checkin-1",
    userId: "user-1",
    reason: "ลองส่งคำขอซ้ำ",
    expectedUpdatedAt: "2026-08-27T09:00:01.000Z",
  }, repository)

  assert.deepEqual(result, { status: "cancelled", movementId: null, voidedAt: "2026-08-27T09:30:00.000Z", alreadyCancelled: true })
  assert.equal(repository.movements.length, 0)
})

test("preview reports unsupported historical snapshots without mutating data", async () => {
  const repository = new MemoryCancellationRepository()
  repository.context!.document.beforeSnapshotJson = null
  repository.context!.document.afterSnapshotJson = null

  const result = await previewAssetTransactionCancellation(
    { type: "checkin", transactionId: "checkin-1" },
    repository
  )

  assert.deepEqual(result, { eligible: false, reasons: ["unsupported_snapshot"] })
  assert.equal(repository.reviews.size, 0)
})
