// ของใช้สิ้นเปลือง (consumables spec, plan 1 task 3): kinds, receive, issue, adjust and history. The routes under
// src/app/api/consumables check the permission and map the errors (src/lib/consumable-route-errors.ts); this module writes each change
// in one serializable transaction and audits it after the transaction, as inspection-confirm-service.ts does.
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { consumableAdjustError, consumableIssueAssetError, consumableStockState } from "./consumable-rules.ts"
import { FieldRefusalError } from "./field-errors.ts"
import { isPrismaUniqueConstraintError } from "./prisma-unique-retry.ts"
import type {
  ConsumableAdjustInput,
  ConsumableIssueInput,
  ConsumableItemInput,
  ConsumableReceiveInput,
} from "./validations/consumables.ts"

export const consumableTransactionOptions = {
  isolationLevel: "Serializable",
  maxWait: 10_000,
  timeout: 30_000,
} as const satisfies { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number }

export const CONSUMABLE_MOVEMENTS_PAGE_SIZE = 50
export const CONSUMABLE_RECENT_MOVEMENTS = 20

export const CONSUMABLE_SHORT_MESSAGE = "Not enough in stock"
export const CONSUMABLE_INACTIVE_MESSAGE = "Consumable kind is inactive"
export const CONSUMABLE_NOT_FOUND_MESSAGE = "Consumable kind not found"
export const CONSUMABLE_CHANGED_MESSAGE = "Consumable stock changed while saving. Reload and try again."

/** 409 with the current count: the UI (plan 2) adds it to the Thai text. */
export class ConsumableShortError extends Error {
  readonly onHand: number
  readonly unit: string

  constructor(onHand: number, unit: string) {
    super(CONSUMABLE_SHORT_MESSAGE)
    this.name = "ConsumableShortError"
    this.onHand = onHand
    this.unit = unit
  }
}

export class ConsumableNotFoundError extends Error {
  constructor() {
    super(CONSUMABLE_NOT_FOUND_MESSAGE)
    this.name = "ConsumableNotFoundError"
  }
}

function inactiveError() {
  return new Error(CONSUMABLE_INACTIVE_MESSAGE)
}

function nameExistsError() {
  return new FieldRefusalError("Consumable name already exists", { name: "consumableNameExists" }, 409)
}

/** True when another active kind has the name, compared case-insensitively (trimmed). */
export function consumableNameTaken(activeItems: ReadonlyArray<{ id: string; name: string }>, name: string, exceptId?: string): boolean {
  const wanted = name.trim().toLowerCase()
  return activeItems.some((item) => item.id !== exceptId && item.name.trim().toLowerCase() === wanted)
}

/** An empty note arrives as "": stored as null. */
function noteOrNull(note: string | undefined): string | null {
  const trimmed = note?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

export function isConsumableWriteConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034")
}

type Tx = Prisma.TransactionClient

async function activeItemOrThrow(tx: Tx, itemId: string) {
  const item = await tx.consumableItem.findUnique({ where: { id: itemId } })
  if (!item) throw new ConsumableNotFoundError()
  if (!item.isActive) throw inactiveError()
  return item
}

async function assertNameFree(tx: Tx, name: string, exceptId?: string) {
  const active = await tx.consumableItem.findMany({
    where: { isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, name: true },
  })
  if (consumableNameTaken(active, name, exceptId)) throw nameExistsError()
}

// ---------------------------------------------------------------- reads

export async function listConsumableItems(options: { includeInactive?: boolean } = {}) {
  const items = await prisma.consumableItem.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ name: "asc" }],
  })
  return items.map((item) => ({ ...item, stockState: consumableStockState(item) }))
}

const movementInclude = {
  item: { select: { id: true, name: true, unit: true } },
  asset: { select: { id: true, assetTag: true, name: true } },
} as const

export async function getConsumableItem(id: string) {
  const item = await prisma.consumableItem.findUnique({ where: { id } })
  if (!item) throw new ConsumableNotFoundError()
  const movements = await prisma.consumableMovement.findMany({
    where: { itemId: id },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    take: CONSUMABLE_RECENT_MOVEMENTS,
    include: movementInclude,
  })
  return { ...item, stockState: consumableStockState(item), movements }
}

export const consumableMovementsQuerySchema = z
  .object({
    itemId: z.string().trim().min(1).max(100).optional(),
    assetId: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
  })
  .refine((query) => Boolean(query.itemId || query.assetId), { path: ["itemId"] })

export type ConsumableMovementsQuery = z.infer<typeof consumableMovementsQuerySchema>

export async function listConsumableMovements(query: ConsumableMovementsQuery) {
  const where: Prisma.ConsumableMovementWhereInput = {
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.assetId ? { assetId: query.assetId } : {}),
  }
  const [total, movements] = await Promise.all([
    prisma.consumableMovement.count({ where }),
    prisma.consumableMovement.findMany({
      where,
      orderBy: [{ performedAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * CONSUMABLE_MOVEMENTS_PAGE_SIZE,
      take: CONSUMABLE_MOVEMENTS_PAGE_SIZE,
      include: movementInclude,
    }),
  ])
  return { movements, total, page: query.page, pageSize: CONSUMABLE_MOVEMENTS_PAGE_SIZE }
}

// ---------------------------------------------------------------- kinds

export async function createConsumableItem(input: ConsumableItemInput, userId: string) {
  const name = input.name.trim()
  let item
  try {
    item = await prisma.$transaction(async (tx) => {
      await assertNameFree(tx, name)
      return tx.consumableItem.create({
        data: { name, unit: input.unit.trim(), minQuantity: input.minQuantity, createdBy: userId },
      })
    }, consumableTransactionOptions)
  } catch (error) {
    // The filtered unique index on active names (two creates at once).
    if (isPrismaUniqueConstraintError(error)) throw nameExistsError()
    throw error
  }
  await logAudit({ userId, module: "consumable", action: "create", recordId: item.id, newValue: { name: item.name, unit: item.unit, minQuantity: item.minQuantity } })
  return item
}

export async function updateConsumableItem(id: string, input: ConsumableItemInput, userId: string) {
  const name = input.name.trim()
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      const before = await activeItemOrThrow(tx, id)
      await assertNameFree(tx, name, id)
      const after = await tx.consumableItem.update({
        where: { id },
        data: { name, unit: input.unit.trim(), minQuantity: input.minQuantity, updatedBy: userId },
      })
      return { before, after }
    }, consumableTransactionOptions)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) throw nameExistsError()
    throw error
  }
  const { before, after } = result
  await logAudit({
    userId, module: "consumable", action: "update", recordId: id,
    oldValue: { name: before.name, unit: before.unit, minQuantity: before.minQuantity },
    newValue: { name: after.name, unit: after.unit, minQuantity: after.minQuantity },
  })
  return after
}

/** Sets isActive false only: onHand and the history stay (spec: a kind with stock may be deactivated). */
export async function deactivateConsumableItem(id: string, userId: string) {
  const item = await prisma.$transaction(async (tx) => {
    await activeItemOrThrow(tx, id)
    return tx.consumableItem.update({ where: { id }, data: { isActive: false, updatedBy: userId } })
  }, consumableTransactionOptions)
  await logAudit({ userId, module: "consumable", action: "deactivate", recordId: id, newValue: { isActive: false, onHand: item.onHand } })
  return item
}

// ---------------------------------------------------------------- stock

export async function receiveConsumable(input: ConsumableReceiveInput, userId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await activeItemOrThrow(tx, input.itemId)
    const item = await tx.consumableItem.update({
      where: { id: input.itemId },
      data: { onHand: { increment: input.quantity }, updatedBy: userId },
    })
    const movement = await tx.consumableMovement.create({
      data: {
        itemId: input.itemId,
        type: "receive",
        quantityChange: input.quantity,
        onHandAfter: item.onHand,
        receivedDate: new Date(`${input.receivedDate}T00:00:00.000Z`),
        note: noteOrNull(input.note),
        performedBy: userId,
      },
    })
    return { item, movement }
  }, consumableTransactionOptions)
  await logAudit({ userId, module: "consumable", action: "receive", recordId: input.itemId, newValue: { quantity: input.quantity, onHand: result.item.onHand, receivedDate: input.receivedDate } })
  return { onHand: result.item.onHand, movementId: result.movement.id }
}

export async function issueConsumable(input: ConsumableIssueInput, userId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await activeItemOrThrow(tx, input.itemId)
    const asset = await tx.asset.findUnique({
      where: { id: input.assetId },
      select: { isActive: true, status: { select: { name: true } } },
    })
    const assetError = consumableIssueAssetError(asset ? { isActive: asset.isActive, statusName: asset.status.name } : null)
    if (assetError === "assetNotFound") throw new FieldRefusalError("Asset not found", { assetId: "assetNotFound" }, 404)
    if (assetError === "assetStatus") throw new FieldRefusalError("This asset cannot take consumables", { assetId: "consumableAssetStatus" })

    // The conditional decrement: a count of 0 is a shortage (or the kind was deactivated meanwhile).
    const updated = await tx.consumableItem.updateMany({
      where: { id: input.itemId, isActive: true, onHand: { gte: input.quantity } },
      data: { onHand: { decrement: input.quantity }, updatedBy: userId },
    })
    if (updated.count === 0) {
      const latest = await tx.consumableItem.findUnique({ where: { id: input.itemId } })
      if (!latest) throw new ConsumableNotFoundError()
      if (!latest.isActive) throw inactiveError()
      throw new ConsumableShortError(latest.onHand, latest.unit)
    }
    const item = await tx.consumableItem.findUnique({ where: { id: input.itemId } })
    if (!item) throw new ConsumableNotFoundError()
    const movement = await tx.consumableMovement.create({
      data: {
        itemId: input.itemId,
        type: "issue",
        quantityChange: -input.quantity,
        onHandAfter: item.onHand,
        assetId: input.assetId,
        note: noteOrNull(input.note),
        performedBy: userId,
      },
    })
    return { item, movement }
  }, consumableTransactionOptions)
  await logAudit({ userId, module: "consumable", action: "issue", recordId: input.itemId, newValue: { quantity: input.quantity, assetId: input.assetId, onHand: result.item.onHand } })
  return { onHand: result.item.onHand, movementId: result.movement.id }
}

export async function adjustConsumable(input: ConsumableAdjustInput, userId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const item = await activeItemOrThrow(tx, input.itemId)
    const refusal = consumableAdjustError(item.onHand, input.counted)
    if (refusal === "noChange") throw new FieldRefusalError("No change to the count", { counted: "consumableNoChange" })
    if (refusal === "range") throw new FieldRefusalError("Invalid request data", { counted: "outOfRange" })
    const after = await tx.consumableItem.update({
      where: { id: input.itemId },
      data: { onHand: input.counted, updatedBy: userId },
    })
    const movement = await tx.consumableMovement.create({
      data: {
        itemId: input.itemId,
        type: "adjust",
        quantityChange: input.counted - item.onHand,
        onHandAfter: after.onHand,
        reason: input.reason.trim(),
        performedBy: userId,
      },
    })
    return { before: item.onHand, after, movement }
  }, consumableTransactionOptions)
  await logAudit({ userId, module: "consumable", action: "adjust", recordId: input.itemId, oldValue: { onHand: result.before }, newValue: { onHand: result.after.onHand, reason: input.reason.trim() } })
  return { onHand: result.after.onHand, movementId: result.movement.id }
}
