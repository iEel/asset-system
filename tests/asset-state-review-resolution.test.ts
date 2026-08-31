import assert from "node:assert/strict"
import test from "node:test"
import type { PrismaClient } from "@prisma/client"

import {
  AssetStateReviewServiceError,
  dismissAssetStateReview,
  resolveAssetStateReview,
} from "../src/lib/asset-state-review-service.ts"

test("resolution rejects a stale asset snapshot without writing history", async () => {
  const db = fakeResolutionDb({ currentAssetUpdatedAt: new Date("2026-08-02T00:00:00.000Z") })
  await assert.rejects(
    resolveAssetStateReview(db.client, {
      reviewId: "review-1",
      statusId: "status-in-use",
      reason: "ยืนยันผู้ครอบครองจากเอกสารล่าสุด",
    }, "admin-1"),
    (error) => error instanceof AssetStateReviewServiceError && error.code === "ASSET_STATE_REVIEW_STALE",
  )
  assert.deepEqual(db.events, [])
})

test("resolution changes an allowed status and records movement, audit, and review", async () => {
  const db = fakeResolutionDb()
  await resolveAssetStateReview(db.client, {
    reviewId: "review-1",
    statusId: "status-in-use",
    reason: "ยืนยันผู้ครอบครองจากเอกสารล่าสุด",
  }, "admin-1")

  assert.deepEqual(db.events, [
    "asset:status-in-use",
    "movement:state_review_resolution",
    "audit:asset_state_review_resolve",
    "review:resolved",
  ])
})

test("dismissal records a reason and audit without changing the asset", async () => {
  const db = fakeResolutionDb()
  await dismissAssetStateReview(db.client, "review-1", "ตรวจสอบแล้วข้อมูลเดิมถูกต้อง", "admin-1")
  assert.deepEqual(db.events, ["audit:asset_state_review_dismiss", "review:dismissed"])
})

test("checkout mismatch resolution only accepts its mode-derived suggested status", async () => {
  const db = fakeResolutionDb({
    issueType: "open_checkout_status_mismatch",
    suggestedStatusId: "status-checked-out",
  })
  await assert.rejects(
    resolveAssetStateReview(db.client, {
      reviewId: "review-1",
      statusId: "status-in-use",
      reason: "ยืนยันสถานะตามประเภทการถือครอง",
    }, "admin-1"),
    (error) => error instanceof AssetStateReviewServiceError && error.code === "ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED",
  )
  assert.deepEqual(db.events, [])
})

function fakeResolutionDb(options: {
  currentAssetUpdatedAt?: Date
  issueType?: string
  suggestedStatusId?: string | null
} = {}) {
  const events: string[] = []
  const observedAt = new Date("2026-08-01T00:00:00.000Z")
  const review = {
    id: "review-1",
    assetId: "asset-1",
    issueType: options.issueType ?? "personal_ready_with_custodian",
    suggestedStatusId: options.suggestedStatusId ?? "status-in-use",
    reviewStatus: "pending",
    observedStatusId: "status-ready",
    observedConditionId: "condition-good",
    observedCustodianId: "employee-1",
    observedAssetUpdatedAt: observedAt,
    asset: {
      id: "asset-1",
      assetTag: "AST-001",
      statusId: "status-ready",
      conditionId: "condition-good",
      custodianId: "employee-1",
      updatedAt: options.currentAssetUpdatedAt ?? observedAt,
      status: { id: "status-ready", name: "Ready" },
      condition: { id: "condition-good", name: "Good" },
    },
  }

  const transaction = {
    assetStateReview: {
      findUnique: async () => review,
      updateMany: async ({ data }: { data: { reviewStatus: string } }) => {
        events.push(`review:${data.reviewStatus}`)
        return { count: 1 }
      },
    },
    assetStatus: {
      findFirst: async () => ({ id: "status-in-use", name: "In Use", isActive: true }),
    },
    assetCondition: { findFirst: async () => null },
    asset: {
      updateMany: async ({ data }: { data: { statusId?: string } }) => {
        events.push(`asset:${data.statusId}`)
        return { count: 1 }
      },
    },
    assetMovement: {
      create: async ({ data }: { data: { movementType: string } }) => {
        events.push(`movement:${data.movementType}`)
        return {}
      },
    },
    systemLog: {
      create: async ({ data }: { data: { action: string } }) => {
        events.push(`audit:${data.action}`)
        return {}
      },
    },
  }
  const database = {
    $transaction: async <T>(operation: (tx: typeof transaction) => Promise<T>) => operation(transaction),
  }
  return { client: database as unknown as PrismaClient, events }
}
