import type { Prisma, PrismaClient } from "@prisma/client"
import {
  createAssetTransactionSnapshot,
  createComponentTransactionSnapshot,
  parseAssetTransactionSnapshot,
  type AssetComponentTransactionSnapshotV1,
} from "./asset-transaction-snapshot.ts"
import type {
  ApplyAssetTransactionCancellationInput,
  AssetTransactionCancellationContext,
  AssetTransactionCancellationDocument,
  AssetTransactionCancellationRepository,
  AssetTransactionType,
  BlockedAssetTransactionCancellationInput,
} from "./asset-transaction-cancellation-service.ts"
import { AssetTransactionCancellationServiceError } from "./asset-transaction-cancellation-service.ts"
import { buildCancellationMovementValues } from "./asset-transaction-cancellation-service.ts"
import { writeAuditLog } from "./audit-log-writer.ts"

type CancellationDb = PrismaClient | Prisma.TransactionClient

type CommonDocumentRow = {
  id: string
  assetId: string
  transactionStatus: string
  updatedAt: Date
  createdAt: Date
  beforeSnapshotJson: string | null
  afterSnapshotJson: string | null
  voidedAt: Date | null
  checkoutId?: string | null
}

export function createPrismaAssetTransactionCancellationRepository(db: PrismaClient) {
  return new PrismaAssetTransactionCancellationRepository(db, db)
}

class PrismaAssetTransactionCancellationRepository implements AssetTransactionCancellationRepository {
  constructor(
    private readonly db: CancellationDb,
    private readonly rootDb: PrismaClient
  ) {}

  async transaction<T>(work: (repository: AssetTransactionCancellationRepository) => Promise<T>): Promise<T> {
    if (this.db !== this.rootDb) return work(this)
    return this.rootDb.$transaction(
      (tx) => work(new PrismaAssetTransactionCancellationRepository(tx, this.rootDb)),
      { isolationLevel: "Serializable" }
    )
  }

  async loadContext(type: AssetTransactionType, transactionId: string): Promise<AssetTransactionCancellationContext | null> {
    const row = await this.loadDocument(type, transactionId)
    if (!row) return null
    const document = toCancellationDocument(type, row)
    const expectedAfter = parseAssetTransactionSnapshot(document.afterSnapshotJson)
    const componentIds = expectedAfter?.components.map((component) => component.componentAssetId) ?? []
    const linkIds = expectedAfter?.components.map((component) => component.componentLinkId) ?? []

    const [asset, componentLinks, checkout, laterCheckoutCount, laterCheckinCount, laterTransferCount, downstreamMovements] = await Promise.all([
      this.db.asset.findUnique({
        where: { id: document.assetId },
        select: {
          id: true,
          updatedAt: true,
          statusId: true,
          conditionId: true,
          branchId: true,
          currentLocationId: true,
          custodianId: true,
          departmentId: true,
        },
      }),
      linkIds.length > 0
        ? this.db.assetComponent.findMany({
            where: { id: { in: linkIds }, componentAssetId: { in: componentIds } },
            select: {
              id: true,
              parentAssetId: true,
              componentAssetId: true,
              status: true,
              updatedAt: true,
              componentAsset: {
                select: {
                  updatedAt: true,
                  statusId: true,
                  conditionId: true,
                  branchId: true,
                  currentLocationId: true,
                  custodianId: true,
                  departmentId: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      expectedAfter?.checkout
        ? this.db.assetCheckout.findUnique({
            where: { id: expectedAfter.checkout.id },
            select: { id: true, isReturned: true },
          })
        : Promise.resolve(null),
      this.db.assetCheckout.count({ where: { assetId: document.assetId, createdAt: { gt: new Date(document.createdAt) } } }),
      this.db.assetCheckin.count({ where: { assetId: document.assetId, createdAt: { gt: new Date(document.createdAt) } } }),
      this.db.assetTransfer.count({ where: { assetId: document.assetId, createdAt: { gt: new Date(document.createdAt) } } }),
      this.db.assetMovement.findMany({
        where: {
          assetId: document.assetId,
          performedAt: { gt: new Date(document.createdAt) },
          NOT: { referenceType: type, referenceId: document.id },
        },
        select: { movementType: true },
      }),
    ])
    if (!asset) throw new AssetTransactionCancellationServiceError("TRANSACTION_NOT_FOUND")

    const linksById = new Map(componentLinks.map((link) => [link.id, link]))
    const currentComponents: AssetComponentTransactionSnapshotV1[] = []
    for (const expectedComponent of expectedAfter?.components ?? []) {
      const link = linksById.get(expectedComponent.componentLinkId)
      if (!link) continue
      currentComponents.push(createComponentTransactionSnapshot({
        componentLinkId: link.id,
        componentAssetId: link.componentAssetId,
        parentAssetId: link.parentAssetId,
        relationshipStatus: link.status,
        relationshipUpdatedAt: link.updatedAt,
        assetUpdatedAt: link.componentAsset.updatedAt,
        statusId: link.componentAsset.statusId,
        conditionId: link.componentAsset.conditionId,
        branchId: link.componentAsset.branchId,
        currentLocationId: link.componentAsset.currentLocationId,
        custodianId: link.componentAsset.custodianId,
        departmentId: link.componentAsset.departmentId,
      }))
    }

    return {
      document,
      currentSnapshot: createAssetTransactionSnapshot({
        asset,
        checkout,
        components: currentComponents,
      }),
      isLatestTransaction: laterCheckoutCount + laterCheckinCount + laterTransferCount === 0,
      downstreamTypes: Array.from(new Set(downstreamMovements.map((movement) => movement.movementType))),
    }
  }

  async applyCancellation(input: ApplyAssetTransactionCancellationInput) {
    const assetUpdate = await this.db.asset.updateMany({
      where: {
        id: input.document.assetId,
        updatedAt: new Date(input.currentSnapshot.assetUpdatedAt),
      },
      data: { ...input.restorePlan.asset, updatedBy: input.userId },
    })
    if (assetUpdate.count !== 1) throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")

    const currentComponentsById = new Map(
      input.currentSnapshot.components.map((component) => [component.componentAssetId, component])
    )
    for (const component of input.restorePlan.components) {
      const current = currentComponentsById.get(component.componentAssetId)
      if (!current) throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")
      const componentUpdate = await this.db.asset.updateMany({
        where: { id: component.componentAssetId, updatedAt: new Date(current.assetUpdatedAt) },
        data: {
          statusId: component.statusId,
          conditionId: component.conditionId,
          branchId: component.branchId,
          currentLocationId: component.currentLocationId,
          custodianId: component.custodianId,
          departmentId: component.departmentId,
          updatedBy: input.userId,
        },
      })
      if (componentUpdate.count !== 1) throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")
    }

    if (input.restorePlan.reopenCheckoutId) {
      const checkoutUpdate = await this.db.assetCheckout.updateMany({
        where: {
          id: input.restorePlan.reopenCheckoutId,
          isReturned: true,
          transactionStatus: "active",
        },
        data: { isReturned: false },
      })
      if (checkoutUpdate.count !== 1) throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")
    }

    const voidedAt = new Date()
    const voided = await this.voidDocument(input.document, input.userId, input.reason, voidedAt)
    if (voided !== 1) throw new AssetTransactionCancellationServiceError("TRANSACTION_STALE")

    const movementValues = buildCancellationMovementValues(input.currentSnapshot, input.beforeSnapshot)
    const movement = await this.db.assetMovement.create({
      data: {
        assetId: input.document.assetId,
        movementType: input.restorePlan.movementType,
        ...movementValues,
        reason: input.reason,
        referenceType: input.document.type,
        referenceId: input.document.id,
        performedBy: input.userId,
        remark: `cancelled_${input.document.type}`,
      },
      select: { id: true },
    })
    await writeAuditLog(this.db, {
      userId: input.userId,
      action: `${input.document.type}_cancel`,
      module: "asset",
      recordId: input.document.assetId,
      oldValue: { transactionId: input.document.id, currentSnapshot: input.currentSnapshot },
      newValue: { transactionId: input.document.id, reason: input.reason, restoredSnapshot: input.beforeSnapshot },
    })

    return { movementId: movement.id, voidedAt: voidedAt.toISOString() }
  }

  async upsertBlockedReview(input: BlockedAssetTransactionCancellationInput): Promise<string> {
    const metadataJson = JSON.stringify({
      transactionType: input.document.type,
      transactionId: input.document.id,
      requestedReason: input.reason,
      blockers: input.reasons,
      currentSnapshot: input.currentSnapshot,
      expectedSnapshot: input.expectedSnapshot,
      requester: input.userId,
      requestedAt: new Date().toISOString(),
    })
    const existing = await this.db.assetStateReview.findFirst({
      where: {
        assetId: input.document.assetId,
        issueType: "transaction_cancellation_blocked",
        reviewStatus: "pending",
      },
      select: { id: true },
    })
    if (existing) {
      const refreshed = await this.db.assetStateReview.update({
        where: { id: existing.id },
        data: {
          severity: "warning",
          observedStatusId: input.currentSnapshot.statusId,
          observedConditionId: input.currentSnapshot.conditionId,
          observedCustodianId: input.currentSnapshot.custodianId,
          observedAssetUpdatedAt: new Date(input.currentSnapshot.assetUpdatedAt),
          metadataJson,
          lastDetectedAt: new Date(),
        },
        select: { id: true },
      })
      return refreshed.id
    }

    const created = await this.db.assetStateReview.create({
      data: {
        assetId: input.document.assetId,
        issueType: "transaction_cancellation_blocked",
        severity: "warning",
        observedStatusId: input.currentSnapshot.statusId,
        observedConditionId: input.currentSnapshot.conditionId,
        observedCustodianId: input.currentSnapshot.custodianId,
        observedAssetUpdatedAt: new Date(input.currentSnapshot.assetUpdatedAt),
        metadataJson,
      },
      select: { id: true },
    })
    return created.id
  }

  private async loadDocument(type: AssetTransactionType, transactionId: string): Promise<CommonDocumentRow | null> {
    const select = {
      id: true,
      assetId: true,
      transactionStatus: true,
      updatedAt: true,
      createdAt: true,
      beforeSnapshotJson: true,
      afterSnapshotJson: true,
      voidedAt: true,
    } as const
    if (type === "checkout") return this.db.assetCheckout.findUnique({ where: { id: transactionId }, select })
    if (type === "transfer") return this.db.assetTransfer.findUnique({ where: { id: transactionId }, select })
    return this.db.assetCheckin.findUnique({
      where: { id: transactionId },
      select: { ...select, checkoutId: true },
    })
  }

  private async voidDocument(
    document: AssetTransactionCancellationDocument,
    userId: string,
    reason: string,
    voidedAt: Date
  ) {
    const where = {
      id: document.id,
      transactionStatus: "active",
      updatedAt: new Date(document.updatedAt),
    }
    const data = { transactionStatus: "void", voidedAt, voidedBy: userId, voidReason: reason }
    if (document.type === "checkout") return (await this.db.assetCheckout.updateMany({ where, data })).count
    if (document.type === "checkin") return (await this.db.assetCheckin.updateMany({ where, data })).count
    return (await this.db.assetTransfer.updateMany({ where, data })).count
  }
}

function toCancellationDocument(type: AssetTransactionType, row: CommonDocumentRow): AssetTransactionCancellationDocument {
  return {
    type,
    id: row.id,
    assetId: row.assetId,
    transactionStatus: row.transactionStatus,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    beforeSnapshotJson: row.beforeSnapshotJson,
    afterSnapshotJson: row.afterSnapshotJson,
    checkoutId: row.checkoutId ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
  }
}
