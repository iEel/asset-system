import type { Prisma, PrismaClient } from "@prisma/client"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"
import { calculateNextMaintenanceDueDate, type MaintenancePlanFrequency } from "./preventive-maintenance.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import {
  getRepairRecordCancelEffect,
  getRepairRecordCompleteEffect,
  getRepairRecordCreateEffect,
  isOpenRepairStatus,
  openRepairRecordWhere,
  type RepairAssetContext,
  type RepairAssetEffect,
} from "./repair-record-policy.ts"
import type {
  RepairRecordCancelInput,
  RepairRecordCompleteInput,
  RepairRecordCreateInput,
  RepairRecordUpdateInput,
} from "./validations/maintenance.ts"

export type RepairServiceDb = Pick<PrismaClient, "$transaction">
export type RepairServiceUser = { id: string; employeeId?: string | null }

export const repairRecordInclude = {
  asset: { select: { assetTag: true, name: true } },
  reportedBy: { select: { code: true, fullNameTh: true } },
  vendor: { select: { code: true, name: true } },
  maintenancePlan: { select: { planNo: true, title: true } },
} satisfies Prisma.MaintenanceTicketInclude

const assetContextSelect = {
  id: true,
  statusId: true,
  ownershipType: true,
  custodianId: true,
  status: { select: { name: true } },
} as const

type AssetRow = { id: string; statusId: string; ownershipType: string | null; custodianId: string | null; status: { name: string } }

export async function createRepairRecord(db: RepairServiceDb, input: RepairRecordCreateInput, user: RepairServiceUser) {
  const reportedById = input.reportedById ?? user.employeeId ?? null
  if (!reportedById) {
    throw new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair")
  }

  return withPrismaUniqueRetry(() => db.$transaction(async (tx) => {
    const asset = await tx.asset.findFirst({ where: { id: input.assetId, isActive: true }, select: assetContextSelect })
    if (!asset) throw new Error("Asset not found or inactive")

    // Lock the asset row first so a concurrent record for the same asset waits here and then
    // sees either the changed status or the committed open record.
    await claimAsset(tx, asset, null, user)
    const effect = getRepairRecordCreateEffect(await loadAssetContext(tx, asset), input)
    throwIfRepairError(effect)

    await requireActiveEmployee(tx, reportedById)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)

    const nextStatusId = await applyAssetStatus(tx, asset, effect.nextStatusName, user)
    const ticket = await tx.maintenanceTicket.create({
      data: {
        repairNo: await generateRepairNo(tx, new Date()),
        assetId: asset.id,
        maintenancePlanId: input.maintenancePlanId,
        problem: input.problem,
        reportedById,
        reportedDate: input.reportedDate,
        repairType: input.vendorId ? "vendor" : "internal",
        vendorId: input.vendorId,
        repairStatus: input.done ? "closed" : "in_progress",
        outcome: input.done ? input.outcome : null,
        repairCost: input.repairCost,
        invoiceNo: input.invoiceNo,
        resolution: input.remark,
        returnDate: input.done ? input.reportedDate : null,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: repairRecordInclude,
    })

    await tx.assetMovement.create({
      data: {
        assetId: asset.id,
        movementType: "maintenance_create",
        fromValue: asset.statusId,
        toValue: nextStatusId ?? asset.statusId,
        reason: input.problem,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: user.id,
      },
    })

    if (input.maintenancePlanId) await advancePlan(tx, input.maintenancePlanId, asset.id, input.reportedDate, user)
    return ticket
  }))
}

export async function completeRepairRecord(db: RepairServiceDb, id: string, input: RepairRecordCompleteInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getOpenTicket(tx, id)
    const effect = getRepairRecordCompleteEffect(await loadAssetContext(tx, previous.asset, { ignoreRecordId: id }), input.outcome)
    throwIfRepairError(effect)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)

    await updateTicket(tx, previous, {
      repairStatus: "closed",
      outcome: input.outcome,
      returnDate: input.returnDate,
      ...(input.vendorId ? { vendorId: input.vendorId, repairType: "vendor" } : {}),
      ...(input.repairCost !== null ? { repairCost: input.repairCost } : {}),
      ...(input.invoiceNo ? { invoiceNo: input.invoiceNo } : {}),
      ...(input.remark ? { resolution: input.remark } : {}),
    }, input.expectedUpdatedAt, user)
    const nextStatusId = await applyAssetStatus(tx, previous.asset, effect.nextStatusName, user)
    await recordMovement(tx, previous, "maintenance_close", nextStatusId, input.remark, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

export async function cancelRepairRecord(db: RepairServiceDb, id: string, input: RepairRecordCancelInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getOpenTicket(tx, id)
    const effect = getRepairRecordCancelEffect(await loadAssetContext(tx, previous.asset, { ignoreRecordId: id }))

    await updateTicket(tx, previous, { repairStatus: "cancelled" }, input.expectedUpdatedAt, user)
    const nextStatusId = await applyAssetStatus(tx, previous.asset, effect.nextStatusName, user)
    await recordMovement(tx, previous, "maintenance_cancel", nextStatusId, input.reason, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

export async function updateRepairRecordDetails(db: RepairServiceDb, id: string, input: RepairRecordUpdateInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getTicket(tx, id)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)
    await updateTicket(tx, previous, {
      reportedDate: input.reportedDate,
      problem: input.problem,
      vendorId: input.vendorId,
      repairType: input.vendorId ? "vendor" : "internal",
      repairCost: input.repairCost,
      invoiceNo: input.invoiceNo,
      resolution: input.remark,
    }, input.expectedUpdatedAt, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

// The detail fields come back as `previous` so routes can write old values to the System Log.
type TicketRow = {
  id: string
  repairStatus: string
  updatedAt: Date
  assetId: string
  asset: AssetRow
  reportedDate?: Date
  problem?: string
  vendorId?: string | null
  repairCost?: unknown
  invoiceNo?: string | null
  resolution?: string | null
}

async function getTicket(tx: Prisma.TransactionClient, id: string): Promise<TicketRow> {
  const ticket = await tx.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      repairStatus: true,
      updatedAt: true,
      assetId: true,
      reportedDate: true,
      problem: true,
      vendorId: true,
      repairCost: true,
      invoiceNo: true,
      resolution: true,
      asset: { select: assetContextSelect },
    },
  })
  if (!ticket) throw new Error("Repair record not found")
  return ticket as TicketRow
}

async function getOpenTicket(tx: Prisma.TransactionClient, id: string) {
  const ticket = await getTicket(tx, id)
  if (!isOpenRepairStatus(ticket.repairStatus)) {
    throw new MaintenanceApiError("MAINTENANCE_INVALID_TRANSITION", "This record is already finished or cancelled", 409)
  }
  return ticket
}

async function updateTicket(
  tx: Prisma.TransactionClient,
  previous: TicketRow,
  data: Prisma.MaintenanceTicketUncheckedUpdateManyInput,
  expectedUpdatedAt: Date,
  user: RepairServiceUser,
) {
  const result = await tx.maintenanceTicket.updateMany({
    where: { id: previous.id, isActive: true, updatedAt: expectedUpdatedAt, repairStatus: previous.repairStatus },
    data: { ...data, updatedBy: user.id },
  })
  if (result.count === 0) throw conflictError()
}

async function reloadTicket(tx: Prisma.TransactionClient, id: string) {
  const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: repairRecordInclude })
  if (!ticket) throw conflictError()
  return ticket
}

async function loadAssetContext(
  tx: Prisma.TransactionClient,
  asset: AssetRow,
  options: { ignoreRecordId?: string } = {},
): Promise<RepairAssetContext> {
  const [activeCheckouts, openRecords] = await Promise.all([
    tx.assetCheckout.count({ where: { assetId: asset.id, isReturned: false, transactionStatus: "active" } }),
    tx.maintenanceTicket.count({
      where: { ...openRepairRecordWhere, assetId: asset.id, ...(options.ignoreRecordId ? { id: { not: options.ignoreRecordId } } : {}) },
    }),
  ])
  return {
    statusName: asset.status.name,
    ownershipType: asset.ownershipType,
    custodianId: asset.custodianId,
    hasActiveCheckout: activeCheckouts > 0,
    hasOpenRecord: openRecords > 0,
  }
}

async function claimAsset(tx: Prisma.TransactionClient, asset: AssetRow, statusId: string | null, user: RepairServiceUser) {
  const result = await tx.asset.updateMany({
    where: { id: asset.id, isActive: true, statusId: asset.statusId },
    data: statusId ? { statusId, updatedBy: user.id } : { updatedBy: user.id },
  })
  if (result.count !== 1) throw conflictError()
}

async function applyAssetStatus(tx: Prisma.TransactionClient, asset: AssetRow, nextStatusName: string | null, user: RepairServiceUser) {
  if (!nextStatusName || nextStatusName === asset.status.name) return null
  const status = await tx.assetStatus.findFirst({ where: { isActive: true, name: nextStatusName }, select: { id: true } })
  if (!status) throw new Error(`${nextStatusName} asset status is not configured`)
  await claimAsset(tx, asset, status.id, user)
  return status.id
}

async function recordMovement(
  tx: Prisma.TransactionClient,
  ticket: TicketRow,
  movementType: "maintenance_close" | "maintenance_cancel",
  nextStatusId: string | null,
  reason: string | null,
  user: RepairServiceUser,
) {
  await tx.assetMovement.create({
    data: {
      assetId: ticket.assetId,
      movementType,
      fromValue: ticket.asset.statusId,
      toValue: nextStatusId ?? ticket.asset.statusId,
      reason,
      referenceType: "maintenance",
      referenceId: ticket.id,
      performedBy: user.id,
    },
  })
}

async function advancePlan(tx: Prisma.TransactionClient, planId: string, assetId: string, recordedDate: Date, user: RepairServiceUser) {
  const plan = await tx.maintenancePlan.findFirst({
    where: { id: planId, assetId, planState: "active", isActive: true },
    select: { id: true, frequency: true, intervalDays: true },
  })
  if (!plan) throw new MaintenanceApiError("MAINTENANCE_PLAN_INVALID_TRANSITION", "The PM plan is not active for this asset", 409)
  await tx.maintenancePlan.update({
    where: { id: plan.id },
    data: {
      nextDueDate: calculateNextMaintenanceDueDate(recordedDate, plan.frequency as MaintenancePlanFrequency, plan.intervalDays),
      updatedBy: user.id,
    },
  })
}

async function requireActiveEmployee(tx: Prisma.TransactionClient, id: string) {
  const record = await tx.employee.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error("Reporter not found or inactive")
}

async function requireActiveSupplier(tx: Prisma.TransactionClient, id: string) {
  const record = await tx.supplier.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error("Vendor not found or inactive")
}

export async function generateRepairNo(tx: Prisma.TransactionClient, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await tx.maintenanceTicket.count({ where: { createdAt: { gte: start, lt: end } } })
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}

function throwIfRepairError(effect: RepairAssetEffect): asserts effect is { error: null; nextStatusName: string | null } {
  if (effect.error) {
    throw new MaintenanceApiError(effect.error, effect.error, effect.error === "MAINTENANCE_OPEN_RECORD_EXISTS" ? 409 : 400)
  }
}

function conflictError() {
  return new MaintenanceApiError("MAINTENANCE_CONFLICT", "The asset or record changed just now; reload and try again", 409)
}
