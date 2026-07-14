import type { Prisma, PrismaClient } from "@prisma/client"
import { getMaintenanceCloseStatusError } from "./asset-lifecycle-exception-policy.ts"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"
import {
  canCloseMaintenanceTicket,
  getCorrectiveAssetEligibilityError,
  getCorrectiveLifecycleTarget,
  isMaintenanceTransitionAllowed,
  isPreventiveMaintenanceTicket,
} from "./maintenance-policy.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import type {
  MaintenanceTicketCloseInput,
  MaintenanceTicketInput,
  MaintenanceTicketStatusInput,
} from "./validations/maintenance.ts"

export type MaintenanceServiceDb = Pick<PrismaClient, "$transaction">
export type MaintenanceServiceUser = { id: string }

export const maintenanceTicketInclude = {
  asset: { select: { assetTag: true, name: true } },
  reportedBy: { select: { code: true, fullNameTh: true } },
  assignedTo: { select: { code: true, fullNameTh: true } },
  inspectedBy: { select: { code: true, fullNameTh: true } },
  vendor: { select: { code: true, name: true } },
} satisfies Prisma.MaintenanceTicketInclude

const mutationTicketInclude = {
  ...maintenanceTicketInclude,
  asset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      statusId: true,
      status: { select: { id: true, name: true, nameTh: true } },
    },
  },
} satisfies Prisma.MaintenanceTicketInclude

export async function createCorrectiveMaintenanceTicket(
  db: MaintenanceServiceDb,
  input: MaintenanceTicketInput,
  user: MaintenanceServiceUser,
) {
  return withPrismaUniqueRetry(() => db.$transaction(async (tx) => {
    const asset = await tx.asset.findFirst({
      where: { id: input.assetId, isActive: true },
      select: {
        id: true,
        statusId: true,
        status: { select: { name: true } },
      },
    })
    if (!asset) throw new Error("Asset not found or inactive")

    const activeCorrectiveCount = await tx.maintenanceTicket.count({
      where: {
        assetId: input.assetId,
        isActive: true,
        repairStatus: { not: "closed" },
        maintenancePlanId: null,
        NOT: { problem: { startsWith: "[PM] " } },
      },
    })
    const eligibilityError = getCorrectiveAssetEligibilityError(asset.status.name, activeCorrectiveCount)
    if (eligibilityError) {
      throw new MaintenanceApiError(
        eligibilityError,
        eligibilityError === "MAINTENANCE_ACTIVE_TICKET_EXISTS"
          ? "This asset already has an active corrective maintenance ticket"
          : "This asset status cannot start a corrective maintenance ticket",
        409,
      )
    }

    await requireActiveEmployee(tx, input.reportedById, "Reporter")
    if (input.assignedToId) await requireActiveEmployee(tx, input.assignedToId, "Assignee")
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)

    const pendingRepairStatus = await tx.assetStatus.findFirst({
      where: { isActive: true, OR: [{ name: "Pending Repair" }, { nameTh: "รอซ่อม" }] },
      select: { id: true },
    })
    if (!pendingRepairStatus) throw new Error("Pending Repair asset status is not configured")

    const now = new Date()
    const repairNo = await generateRepairNo(tx, now)
    const ticket = await tx.maintenanceTicket.create({
      data: {
        repairNo,
        assetId: input.assetId,
        problem: input.problem,
        reportedById: input.reportedById,
        reportedDate: input.reportedDate,
        assignedToId: input.assignedToId,
        dueDate: input.dueDate,
        repairType: input.repairType,
        vendorId: input.vendorId,
        repairStatus: "reported",
        laborCost: input.laborCost,
        partsCost: input.partsCost,
        repairCost: input.repairCost,
        quotationNo: input.quotationNo,
        invoiceNo: input.invoiceNo,
        warrantyClaim: input.warrantyClaim,
        rootCause: input.rootCause,
        resolution: input.resolution,
        returnDate: input.returnDate,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: maintenanceTicketInclude,
    })

    if (pendingRepairStatus.id !== asset.statusId) {
      await tx.asset.update({
        where: { id: asset.id },
        data: { statusId: pendingRepairStatus.id, updatedBy: user.id },
      })
    }
    await tx.assetMovement.create({
      data: {
        assetId: asset.id,
        movementType: "maintenance_create",
        fromValue: asset.statusId,
        toValue: pendingRepairStatus.id,
        reason: input.problem,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: user.id,
        remark: input.repairType,
      },
    })

    return ticket
  }))
}

export async function transitionMaintenanceTicket(
  db: MaintenanceServiceDb,
  id: string,
  input: MaintenanceTicketStatusInput,
  user: MaintenanceServiceUser,
) {
  return db.$transaction(async (tx) => {
    const ticket = await getActiveTicket(tx, id)
    if (!isMaintenanceTransitionAllowed(ticket.repairStatus, input.repairStatus)) {
      throw new MaintenanceApiError(
        "MAINTENANCE_INVALID_TRANSITION",
        `Cannot move maintenance ticket from ${ticket.repairStatus} to ${input.repairStatus}`,
      )
    }
    if (input.assignedToId) await requireActiveEmployee(tx, input.assignedToId, "Assignee")

    const isPreventive = isPreventiveMaintenanceTicket(ticket)
    const lifecycleTarget = isPreventive ? null : getCorrectiveLifecycleTarget(input.repairStatus)
    const lifecycleStatus = lifecycleTarget
      ? await tx.assetStatus.findFirst({
          where: { isActive: true, name: lifecycleTarget },
          select: { id: true, name: true },
        })
      : null
    if (lifecycleTarget && !lifecycleStatus) {
      throw new Error(`${lifecycleTarget} asset status is not configured`)
    }

    const updateResult = await tx.maintenanceTicket.updateMany({
      where: {
        id,
        isActive: true,
        updatedAt: input.expectedUpdatedAt,
        repairStatus: ticket.repairStatus,
      },
      data: {
        repairStatus: input.repairStatus,
        assignedToId: input.assignedToId,
        dueDate: input.dueDate,
        updatedBy: user.id,
      },
    })
    if (updateResult.count === 0) throw conflictError()

    if (lifecycleStatus && lifecycleStatus.id !== ticket.asset.statusId) {
      await tx.asset.update({
        where: { id: ticket.assetId },
        data: { statusId: lifecycleStatus.id, updatedBy: user.id },
      })
    }
    await tx.assetMovement.create({
      data: {
        assetId: ticket.assetId,
        movementType: "maintenance_status_update",
        fromValue: ticket.repairStatus,
        toValue: input.repairStatus,
        reason: input.remark,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: user.id,
      },
    })

    const updatedTicket = await tx.maintenanceTicket.findUnique({
      where: { id },
      include: maintenanceTicketInclude,
    })
    if (!updatedTicket) throw conflictError()
    return { ticket: updatedTicket, previous: ticket }
  })
}

export async function closeMaintenanceTicket(
  db: MaintenanceServiceDb,
  id: string,
  input: MaintenanceTicketCloseInput,
  user: MaintenanceServiceUser,
) {
  return db.$transaction(async (tx) => {
    const ticket = await getActiveTicket(tx, id)
    if (!canCloseMaintenanceTicket(ticket)) {
      throw new MaintenanceApiError(
        "MAINTENANCE_INVALID_TRANSITION",
        "Move this maintenance ticket to completed before closing",
      )
    }

    const attachmentCount = await tx.attachment.count({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
    })
    if (attachmentCount === 0) {
      throw new MaintenanceApiError(
        "MAINTENANCE_EVIDENCE_REQUIRED",
        "Attach maintenance evidence before closing this ticket",
      )
    }
    await requireActiveEmployee(tx, input.inspectedById, "Inspector")

    const isPreventive = isPreventiveMaintenanceTicket(ticket)
    if (!isPreventive && !input.nextStatusId) {
      throw new MaintenanceApiError("MAINTENANCE_INVALID_CLOSE_STATUS", "Next asset status is required")
    }
    const nextStatus = isPreventive
      ? null
      : await tx.assetStatus.findFirst({
          where: { id: input.nextStatusId!, isActive: true },
          select: { id: true, name: true, nameTh: true },
        })
    if (!isPreventive && !nextStatus) {
      throw new MaintenanceApiError("MAINTENANCE_INVALID_CLOSE_STATUS", "Next asset status not found")
    }
    if (nextStatus) {
      const nextStatusError = getMaintenanceCloseStatusError(nextStatus)
      if (nextStatusError) {
        throw new MaintenanceApiError("MAINTENANCE_INVALID_CLOSE_STATUS", nextStatusError)
      }
    }

    const updateResult = await tx.maintenanceTicket.updateMany({
      where: {
        id,
        isActive: true,
        updatedAt: input.expectedUpdatedAt,
        repairStatus: ticket.repairStatus,
      },
      data: {
        repairStatus: "closed",
        laborCost: input.laborCost,
        partsCost: input.partsCost,
        repairCost: input.repairCost,
        quotationNo: input.quotationNo,
        invoiceNo: input.invoiceNo,
        warrantyClaim: input.warrantyClaim,
        rootCause: input.rootCause,
        resolution: input.resolution,
        returnDate: input.returnDate,
        inspectedById: input.inspectedById,
        updatedBy: user.id,
      },
    })
    if (updateResult.count === 0) throw conflictError()

    if (nextStatus && nextStatus.id !== ticket.asset.statusId) {
      await tx.asset.update({
        where: { id: ticket.assetId },
        data: { statusId: nextStatus.id, updatedBy: user.id },
      })
    }
    await tx.assetMovement.create({
      data: {
        assetId: ticket.assetId,
        movementType: "maintenance_close",
        fromValue: ticket.asset.statusId,
        toValue: nextStatus?.id ?? ticket.asset.statusId,
        reason: input.resolution,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: user.id,
        remark: input.rootCause,
      },
    })

    const updatedTicket = await tx.maintenanceTicket.findUnique({
      where: { id },
      include: maintenanceTicketInclude,
    })
    if (!updatedTicket) throw conflictError()
    return { ticket: updatedTicket, previous: ticket }
  })
}

async function getActiveTicket(tx: Prisma.TransactionClient, id: string) {
  const ticket = await tx.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: mutationTicketInclude,
  })
  if (!ticket) throw new Error("Maintenance ticket not found")
  return ticket
}

async function requireActiveEmployee(tx: Prisma.TransactionClient, id: string, label: string) {
  const record = await tx.employee.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error(`${label} not found or inactive`)
}

async function requireActiveSupplier(tx: Prisma.TransactionClient, id: string) {
  const record = await tx.supplier.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error("Vendor not found or inactive")
}

async function generateRepairNo(tx: Prisma.TransactionClient, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await tx.maintenanceTicket.count({ where: { createdAt: { gte: start, lt: end } } })
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}

function conflictError() {
  return new MaintenanceApiError(
    "MAINTENANCE_CONFLICT",
    "This maintenance ticket changed while you were editing it; reload and try again",
    409,
  )
}
