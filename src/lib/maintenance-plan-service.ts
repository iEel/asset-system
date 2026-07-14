import type { PrismaClient } from "@prisma/client"
import { getMaintenancePlanIntervalDays } from "./preventive-maintenance.ts"
import type { MaintenancePlanActionInput } from "./validations/maintenance.ts"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"

export type MaintenancePlanServiceDb = Pick<PrismaClient, "$transaction">
export type MaintenancePlanState = "active" | "paused" | "ended"

export function getMaintenancePlanActiveState(action: MaintenancePlanActionInput["action"]) {
  if (action === "resume") return true
  if (action === "pause" || action === "end") return false
  return null
}

export function getMaintenancePlanNextState(
  current: MaintenancePlanState,
  action: MaintenancePlanActionInput["action"],
): MaintenancePlanState {
  if (action === "update") {
    if (current !== "ended") return current
  } else if (action === "pause" && current === "active") {
    return "paused"
  } else if (action === "resume" && current === "paused") {
    return "active"
  } else if (action === "end" && current !== "ended") {
    return "ended"
  }
  throw new MaintenanceApiError(
    "MAINTENANCE_PLAN_INVALID_TRANSITION",
    `Maintenance plan cannot ${action} from ${current}`,
    409,
  )
}

export async function mutateMaintenancePlan(
  db: MaintenancePlanServiceDb,
  id: string,
  input: MaintenancePlanActionInput,
  userId: string,
) {
  return db.$transaction(async (tx) => {
    const current = await tx.maintenancePlan.findFirst({ where: { id }, include: { asset: true } })
    if (!current) throw new Error("Maintenance plan not found")
    const currentState = normalizeMaintenancePlanState(current.planState, current.isActive)
    const nextState = getMaintenancePlanNextState(currentState, input.action)

    const assignedToId = input.action === "update" ? input.assignedToId : current.assignedToId
    const vendorId = input.action === "update" ? input.vendorId : current.vendorId
    if (input.action === "update" || input.action === "resume") {
      const asset = await tx.asset.findFirst({
        where: { id: current.assetId, isActive: true },
        select: { id: true },
      })
      if (!asset) throw new Error("Maintenance plan asset not found or inactive")
      if (assignedToId) {
        const employee = await tx.employee.findFirst({
          where: { id: assignedToId, isActive: true },
          select: { id: true },
        })
        if (!employee) throw new Error("PM assignee not found or inactive")
      }
      if (vendorId) {
        const vendor = await tx.supplier.findFirst({
          where: { id: vendorId, isActive: true },
          select: { id: true },
        })
        if (!vendor) throw new Error("PM vendor not found or inactive")
      }
    }

    const plan = await tx.maintenancePlan.update({
      where: { id },
      data: input.action === "update"
        ? {
            title: input.title,
            frequency: input.frequency,
            intervalDays: getMaintenancePlanIntervalDays(input.frequency, input.intervalDays),
            nextDueDate: input.nextDueDate,
            assignedToId: input.assignedToId,
            vendorId: input.vendorId,
            notes: input.notes,
            updatedBy: userId,
          }
        : { planState: nextState, isActive: nextState === "active", updatedBy: userId },
    })
    return { plan, previous: current }
  })
}

function normalizeMaintenancePlanState(value: string, isActive: boolean): MaintenancePlanState {
  if (value === "active" || value === "paused" || value === "ended") return value
  return isActive ? "active" : "paused"
}
