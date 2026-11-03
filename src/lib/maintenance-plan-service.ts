import type { Prisma, PrismaClient } from "@prisma/client"
import { FieldRefusalError } from "./field-errors.ts"
import { getBangkokDateKey, getMaintenancePlanIntervalDays, startOfBangkokDay } from "./preventive-maintenance.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import type { MaintenancePlanActionInput } from "./validations/maintenance.ts"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"

export type MaintenancePlanServiceDb = Pick<PrismaClient, "$transaction">
export type MaintenancePlanState = "active" | "paused" | "ended"

// Disposed and Retired assets have left the books, so no PM plan is set up for them (G5P1-R11).
const writtenOffStatusNames = new Set(["disposed", "retired"])

export function assertMaintenancePlanAssetNotWrittenOff(statusName: string) {
  if (writtenOffStatusNames.has(statusName.trim().toLowerCase())) {
    throw new MaintenanceApiError(
      "MAINTENANCE_PLAN_ASSET_WRITTEN_OFF",
      "This asset is disposed or retired; a PM plan cannot be set up",
      400,
    )
  }
}

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

    const vendorId = input.action === "update" ? input.vendorId : current.vendorId
    if (input.action === "update" || input.action === "resume") {
      const asset = await tx.asset.findFirst({
        where: { id: current.assetId, isActive: true },
        select: { id: true },
      })
      if (!asset) throw new Error("Maintenance plan asset not found or inactive")
      if (vendorId) {
        const vendor = await tx.supplier.findFirst({
          where: { id: vendorId, isActive: true },
          select: { id: true },
        })
        if (!vendor) throw new FieldRefusalError("PM vendor not found or inactive", { vendorId: "pmVendorNotFound" })
      }
    }

    if (input.action === "update") {
      // Only when the plan is as the edit page read it: a done PM visit or another edit since then refuses the save (G5P1-R12).
      const written = await tx.maintenancePlan.updateMany({
        where: { id, updatedAt: input.expectedUpdatedAt },
        data: {
          title: input.title,
          frequency: input.frequency,
          intervalDays: getMaintenancePlanIntervalDays(input.frequency, input.intervalDays),
          nextDueDate: input.nextDueDate,
          vendorId: input.vendorId,
          notes: input.notes,
          updatedBy: userId,
        },
      })
      if (written.count === 0) {
        throw new MaintenanceApiError("MAINTENANCE_PLAN_CONFLICT", "The PM plan changed just now; reload and edit again", 409)
      }
      const plan = await tx.maintenancePlan.findUniqueOrThrow({ where: { id } })
      return { plan, previous: current }
    }

    const plan = await tx.maintenancePlan.update({
      where: { id },
      data: { planState: nextState, isActive: nextState === "active", updatedBy: userId },
    })
    return { plan, previous: current }
  })
}

function normalizeMaintenancePlanState(value: string, isActive: boolean): MaintenancePlanState {
  if (value === "active" || value === "paused" || value === "ended") return value
  return isActive ? "active" : "paused"
}

type MaintenancePlanCountDb = { maintenancePlan: Pick<PrismaClient["maintenancePlan"], "count"> }
type MaintenancePlanCreateDb = { maintenancePlan: Pick<PrismaClient["maintenancePlan"], "count" | "create"> }
export type MaintenancePlanCreateData = Omit<Prisma.MaintenancePlanUncheckedCreateInput, "planNo">

const bangkokDayMs = 24 * 60 * 60 * 1000

// PM-<Bangkok YYYYMMDD>-<NNNN>: the plans created on the same Bangkok day, plus one (G5P1-R11). Bangkok has no DST.
export async function generateMaintenancePlanNo(db: MaintenancePlanCountDb, now: Date): Promise<string> {
  const start = startOfBangkokDay(now)
  const end = new Date(start.getTime() + bangkokDayMs)
  const count = await db.maintenancePlan.count({ where: { createdAt: { gte: start, lt: end } } })
  return `PM-${getBangkokDateKey(now).replace(/-/g, "")}-${String(count + 1).padStart(4, "0")}`
}

// Two plans saved at once can read the same count: the second meets the unique planNo, reads the count again and
// takes the next number (G5P1-R11, Review Focus 3).
export async function createMaintenancePlanRecord<TInclude extends Prisma.MaintenancePlanInclude>(
  db: MaintenancePlanCreateDb,
  data: MaintenancePlanCreateData,
  now: Date,
  include: TInclude,
) {
  return withPrismaUniqueRetry(async () => {
    const planNo = await generateMaintenancePlanNo(db, now)
    return db.maintenancePlan.create({ data: { ...data, planNo }, include })
  })
}
