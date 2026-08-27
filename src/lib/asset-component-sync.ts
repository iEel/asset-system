import type { Prisma } from "@prisma/client"
import {
  createComponentTransactionSnapshot,
  type AssetComponentTransactionSnapshotChangeV1,
} from "./asset-transaction-snapshot.ts"

export const requiredComponentSyncFields = ["branchId", "currentLocationId"] as const
export const nullableComponentSyncFields = ["departmentId", "custodianId"] as const
export const componentSyncFields = [...requiredComponentSyncFields, ...nullableComponentSyncFields] as const

export type RequiredComponentSyncField = (typeof requiredComponentSyncFields)[number]
export type NullableComponentSyncField = (typeof nullableComponentSyncFields)[number]
export type ComponentSyncField = (typeof componentSyncFields)[number]
export type ComponentSyncChanges = Partial<Record<ComponentSyncField, string | null | undefined>>
export type ComponentSyncUpdateData = Partial<Record<RequiredComponentSyncField, string>> &
  Partial<Record<NullableComponentSyncField, string | null>>
export type NormalizedComponentSyncChanges = ComponentSyncUpdateData

export type ComponentSyncSnapshot = {
  id: string
  branchId: string
  currentLocationId: string
  departmentId: string | null
  custodianId: string | null
}

export type ComponentSyncUpdate = {
  data: ComponentSyncUpdateData
  fromValue: ComponentSyncUpdateData
  toValue: ComponentSyncUpdateData
}

export type ParentComponentSyncInput = {
  parentAssetId: string
  changes: ComponentSyncChanges
  movementType: string
  referenceType: string
  referenceId: string
  performedBy: string
  reason: string
  remark?: string | null
  restrictToAssetIds?: string[]
  captureSnapshots?: boolean
}

export type ParentComponentSyncResult = {
  updated: number
  skipped: number
  movements: number
  componentSnapshots: AssetComponentTransactionSnapshotChangeV1[]
}

export function normalizeComponentSyncChanges(changes: ComponentSyncChanges): NormalizedComponentSyncChanges {
  const normalized: NormalizedComponentSyncChanges = {}

  for (const field of requiredComponentSyncFields) {
    const value = changes[field]
    if (typeof value === "string") {
      normalized[field] = value
    }
  }

  for (const field of nullableComponentSyncFields) {
    const value = changes[field]
    if (value !== undefined) {
      normalized[field] = value ?? null
    }
  }

  return normalized
}

export function buildComponentSyncUpdate(
  snapshot: ComponentSyncSnapshot,
  changes: NormalizedComponentSyncChanges
): ComponentSyncUpdate | null {
  const data: ComponentSyncUpdateData = {}
  const fromValue: ComponentSyncUpdateData = {}
  const toValue: ComponentSyncUpdateData = {}

  for (const field of requiredComponentSyncFields) {
    if (!(field in changes)) continue
    const nextValue = changes[field]
    if (typeof nextValue !== "string") continue
    const currentValue = snapshot[field]
    if (currentValue === nextValue) continue
    data[field] = nextValue
    fromValue[field] = currentValue
    toValue[field] = nextValue
  }

  for (const field of nullableComponentSyncFields) {
    if (!(field in changes)) continue
    const nextValue = changes[field] ?? null
    const currentValue = snapshot[field] ?? null
    if (currentValue === nextValue) continue
    data[field] = nextValue
    fromValue[field] = currentValue
    toValue[field] = nextValue
  }

  return Object.keys(data).length > 0 ? { data, fromValue, toValue } : null
}

export async function syncInstalledComponentsWithParent(
  tx: Prisma.TransactionClient,
  input: ParentComponentSyncInput
): Promise<ParentComponentSyncResult> {
  const changes = normalizeComponentSyncChanges(input.changes)
  if (Object.keys(changes).length === 0) {
    return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
  }

  const restrictToAssetIds = input.restrictToAssetIds ? Array.from(new Set(input.restrictToAssetIds)) : null
  const links = await tx.assetComponent.findMany({
    where: {
      parentAssetId: input.parentAssetId,
      status: "installed",
      removedAt: null,
      ...(restrictToAssetIds ? { componentAssetId: { in: restrictToAssetIds } } : {}),
      componentAsset: { isActive: true },
    },
    select: {
      id: true,
      parentAssetId: true,
      componentAssetId: true,
      status: true,
      updatedAt: true,
      componentAsset: {
        select: {
          id: true,
          updatedAt: true,
          statusId: true,
          conditionId: true,
          branchId: true,
          currentLocationId: true,
          departmentId: true,
          custodianId: true,
        },
      },
    },
  })

  const uniqueLinks = Array.from(new Map(links.map((link) => [link.componentAssetId, link])).values())
  const componentIds = uniqueLinks.map((link) => link.componentAssetId)
  const activeCheckouts = componentIds.length
    ? await tx.assetCheckout.findMany({
        where: { assetId: { in: componentIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      })
    : []
  const checkedOutAssetIds = new Set(activeCheckouts.map((checkout) => checkout.assetId))
  const movementRows: Prisma.AssetMovementCreateManyInput[] = []
  const componentSnapshots: AssetComponentTransactionSnapshotChangeV1[] = []
  let updated = 0
  let skipped = 0

  for (const link of uniqueLinks) {
    if (checkedOutAssetIds.has(link.componentAssetId)) {
      skipped += 1
      continue
    }

    const update = buildComponentSyncUpdate(link.componentAsset, changes)
    if (!update) continue

    const updatedComponent = await tx.asset.update({
      where: { id: link.componentAssetId },
      data: {
        ...update.data,
        updatedBy: input.performedBy,
      },
      select: {
        id: true,
        updatedAt: true,
        statusId: true,
        conditionId: true,
        branchId: true,
        currentLocationId: true,
        departmentId: true,
        custodianId: true,
      },
    })
    updated += 1
    if (input.captureSnapshots) {
      const relationship = {
        componentLinkId: link.id,
        componentAssetId: link.componentAssetId,
        parentAssetId: link.parentAssetId,
        relationshipStatus: link.status,
        relationshipUpdatedAt: link.updatedAt,
      }
      componentSnapshots.push({
        before: createComponentTransactionSnapshot({
          ...relationship,
          assetUpdatedAt: link.componentAsset.updatedAt,
          statusId: link.componentAsset.statusId,
          conditionId: link.componentAsset.conditionId,
          branchId: link.componentAsset.branchId,
          currentLocationId: link.componentAsset.currentLocationId,
          custodianId: link.componentAsset.custodianId,
          departmentId: link.componentAsset.departmentId,
        }),
        after: createComponentTransactionSnapshot({
          ...relationship,
          assetUpdatedAt: updatedComponent.updatedAt,
          statusId: updatedComponent.statusId,
          conditionId: updatedComponent.conditionId,
          branchId: updatedComponent.branchId,
          currentLocationId: updatedComponent.currentLocationId,
          custodianId: updatedComponent.custodianId,
          departmentId: updatedComponent.departmentId,
        }),
      })
    }
    movementRows.push({
      assetId: link.componentAssetId,
      movementType: input.movementType,
      fromValue: JSON.stringify(update.fromValue),
      toValue: JSON.stringify(update.toValue),
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      performedBy: input.performedBy,
      remark: input.remark,
    })
  }

  if (movementRows.length > 0) {
    await tx.assetMovement.createMany({ data: movementRows })
  }

  return { updated, skipped, movements: movementRows.length, componentSnapshots }
}
