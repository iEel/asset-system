import assert from "node:assert/strict"
import test from "node:test"
import type { PrismaClient } from "@prisma/client"

import { scanAssetStateReviews } from "../src/lib/asset-state-review-service.ts"
import type { AssetStateObservedSnapshot } from "../src/lib/asset-state-review-types.ts"

test("scan creates then refreshes one pending issue without an asset write delegate", async () => {
  const db = fakeReviewDb()
  const observed = snapshot({ statusName: "Checked Out", statusId: "status-checked-out", openCheckouts: 0 })

  const first = await scanAssetStateReviews(db.client, "admin-1", { snapshots: [observed], now: new Date("2026-08-01T00:00:00.000Z") })
  const second = await scanAssetStateReviews(db.client, "admin-1", { snapshots: [observed], now: new Date("2026-08-02T00:00:00.000Z") })

  assert.deepEqual(first, { scannedAssets: 1, created: 1, refreshed: 0, autoClosed: 0 })
  assert.deepEqual(second, { scannedAssets: 1, created: 0, refreshed: 1, autoClosed: 0 })
  assert.equal(db.rows.length, 1)
  assert.equal(db.rows[0].reviewStatus, "pending")
  assert.equal(db.rows[0].lastDetectedAt.toISOString(), "2026-08-02T00:00:00.000Z")
})

test("scan closes a pending issue that is no longer detected without changing the asset", async () => {
  const db = fakeReviewDb()
  await scanAssetStateReviews(db.client, "admin-1", {
    snapshots: [snapshot({ statusName: "Checked Out", statusId: "status-checked-out", openCheckouts: 0 })],
  })

  const result = await scanAssetStateReviews(db.client, "admin-1", {
    snapshots: [snapshot({ statusName: "Ready", statusId: "status-ready", openCheckouts: 0 })],
  })

  assert.equal(result.autoClosed, 1)
  assert.equal(db.rows[0].reviewStatus, "resolved")
  assert.equal(db.rows[0].resolutionReason, "condition_no_longer_detected")
})

function fakeReviewDb() {
  type ReviewRow = {
    id: string
    assetId: string
    issueType: string
    reviewStatus: string
    lastDetectedAt: Date
    observedAssetUpdatedAt: Date
    resolutionReason?: string
    [key: string]: unknown
  }
  type FakeDatabase = {
    rows: ReviewRow[]
    assetStateReview: typeof assetStateReview
    $transaction: <T>(operation: (transaction: FakeDatabase) => Promise<T>) => Promise<T>
  }

  const rows: ReviewRow[] = []
  const assetStateReview = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => rows.find((row) =>
      row.assetId === where.assetId && row.issueType === where.issueType && row.reviewStatus === where.reviewStatus
    ) ?? null,
    findMany: async ({ where }: { where: { assetId?: string; reviewStatus?: string } }) => rows.filter((row) =>
      (!where.assetId || row.assetId === where.assetId) && (!where.reviewStatus || row.reviewStatus === where.reviewStatus)
    ),
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `review-${rows.length + 1}`, ...data } as ReviewRow
      rows.push(row)
      return row
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = rows.find((item) => item.id === where.id)!
      Object.assign(row, data)
      return row
    },
  }
  const database: FakeDatabase = {
    rows,
    assetStateReview,
    $transaction: async <T>(operation: (transaction: typeof database) => Promise<T>) => operation(database),
  }
  return { client: database as unknown as PrismaClient, rows }
}

function snapshot(overrides: Partial<AssetStateObservedSnapshot> = {}): AssetStateObservedSnapshot {
  return {
    assetId: "asset-1",
    assetTag: "AST-001",
    assetName: "Notebook",
    companyId: "company-1",
    branchId: "branch-1",
    ownershipType: "shared",
    statusId: "status-ready",
    statusName: "Ready",
    conditionId: "condition-good",
    conditionName: "Good",
    custodianId: null,
    assetUpdatedAt: new Date("2026-08-01T00:00:00.000Z"),
    openCheckouts: 0,
    openPermanentAssignments: 0,
    openTemporaryLoans: 0,
    openUnknownHandovers: 0,
    activeCorrectiveTickets: 0,
    activeCorrectiveStatusNames: [],
    openDisposalsMissingPreviousStatus: 0,
    ...overrides,
  }
}
