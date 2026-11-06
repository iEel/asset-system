// The multi-return (รับคืนหลายรายการ, group 7 plan 4 Task 2): several machines of one holder in one save, one pair of
// signatures, one RT- number shared by every return record (G7P4-R1), all or nothing. The route
// (src/app/api/asset-checkins/batch/route.ts) reads the request, saves the files and maps the errors; this module runs the
// checks before the transaction (readBatchCheckinPlan) and the transaction body (writeBatchCheckinInTransaction).
// Each machine is written by the single return's writeCheckinInTransaction, so its record, movement, status change,
// history line and cancel are exactly a single return's.
import type { Asset, Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth-utils"
import { AssetComponentOutstandingError, AssetOperationConflictError, readOutstandingComponentLinks } from "@/lib/asset-operation-claim"
import { getAssetLifecycleTransitionError, getAssetOperationConditionError, getCheckinHandoverStatusError } from "@/lib/asset-lifecycle-policy"
import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"
import { checkinReturnStatusNames } from "@/lib/asset-status-flow"
import { CheckinDepartmentUnavailableError, readCheckinDepartment } from "@/lib/checkin-department"
import { checkinHandoverDay, checkinReturnDateError } from "@/lib/checkin-route-rules"
import {
  CheckinLocationInactiveError,
  readActiveCheckinLocation,
  writeCheckinInTransaction,
  type CheckinEvidenceWithLabel,
  type CheckinWriteResult,
} from "@/lib/checkin-write"
import { backfillLegacyCheckoutInTransaction } from "@/lib/legacy-checkout-write"
import { generateCheckinDocumentNo } from "@/lib/operation-document-number"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import type { SavedOperationEvidence } from "@/lib/asset-operation-evidence"
import type { AssetCheckinInput } from "@/lib/validations/asset-operations"
import type { BatchCheckinBlockedAsset, BatchCheckinBlockedCode, BatchCheckinInput, BatchCheckinItemInput } from "@/lib/validations/batch-checkin"

// Up to 50 machines, each a full return plus a possible HO- backfill, over the VPN (G7P4-R1; the disposal rounds' options).
export const batchCheckinTransactionOptions = {
  isolationLevel: "Serializable",
  maxWait: 10_000,
  timeout: 120_000,
} as const satisfies { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number }

// One answer naming every refused machine: the bulk-move 409 shape { code, error, blocked: [{ assetId, assetTag, code }] }.
export class BatchCheckinBlockedError extends Error {
  readonly code: BatchCheckinBlockedCode
  readonly blocked: BatchCheckinBlockedAsset[]

  constructor(blocked: BatchCheckinBlockedAsset[]) {
    super(blocked[0]?.code ?? "ASSET_CHANGED_DURING_OPERATION")
    this.name = "BatchCheckinBlockedError"
    this.code = blocked[0]?.code ?? "ASSET_CHANGED_DURING_OPERATION"
    this.blocked = blocked
  }
}

// A refusal of a field of the whole form (the return date, the next location for all), answered under that field as the
// single return answers it.
export class BatchCheckinFieldError extends Error {
  readonly code: string
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(code: string, fieldErrors: Record<string, string>, status: number) {
    super(code)
    this.name = "BatchCheckinFieldError"
    this.code = code
    this.fieldErrors = fieldErrors
    this.status = status
  }
}

type PlannedAsset = Pick<Asset, "id" | "assetTag" | "statusId" | "conditionId" | "currentLocationId" | "custodianId" | "ownershipType">

export type BatchCheckinPlanItem = {
  item: BatchCheckinItemInput
  asset: PlannedAsset
  // The open handover as read before the transaction; null for a held asset with no handover (backfilled, G7P4-R6).
  checkoutId: string | null
  nextLocationId: string
}

export type BatchCheckinPlan = {
  input: BatchCheckinInput
  // In request order.
  items: BatchCheckinPlanItem[]
}

type PlanDb = Pick<
  Prisma.TransactionClient,
  "asset" | "assetCheckout" | "assetComponent" | "assetCondition" | "assetStatus" | "location" | "maintenanceTicket" | "systemSetting" | "department"
>

const assetChanged = "ASSET_CHANGED_DURING_OPERATION" as const
// The route reads In Use whenever the plan has a held asset with no handover; asset-status-flow.ts words the same refusal.
const missingInUseStatus = "Required asset status is not configured: In Use"

// The single return's pre-checks, per machine, plus the multi-return's own (G7P4-R2, the holder). Every reason is read
// before any refusal, so one 409 names every refused machine. At most 50 ids (G7P4-R3), so each IN list is one chunk.
export async function readBatchCheckinPlan(db: PlanDb, input: BatchCheckinInput, ctx: { now: Date }): Promise<BatchCheckinPlan> {
  // วันที่คืน is ≤ today in Bangkok days (P2-R13); each machine's lower bound is checked below.
  const returnDay = getBangkokDateKey(input.returnDate)
  const todayDay = getBangkokDateKey(ctx.now)
  const futureError = checkinReturnDateError({ returnDay, todayDay, handoverDay: null })
  if (futureError) throw new BatchCheckinFieldError(futureError, { returnDate: "checkinReturnDateInFuture" }, 400)
  // The room for all must exist and be active, as in the single return (P2-R15); the transaction reads it again.
  if (!(await readActiveCheckinLocation(db, input.nextLocationId))) {
    throw new BatchCheckinFieldError("ASSET_CHECKIN_LOCATION_INACTIVE", { nextLocationId: "checkinLocationInactive" }, 409)
  }

  const assetIds = input.items.map((item) => item.assetId)
  const assets = await db.asset.findMany({
    where: { id: { in: assetIds }, isActive: true },
    select: {
      id: true, assetTag: true, statusId: true, conditionId: true, currentLocationId: true, custodianId: true, ownershipType: true,
      status: { select: { name: true } },
    },
  })
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
  const missingIds = assetIds.filter((id) => !assetsById.has(id))
  const missingTags = missingIds.length > 0
    ? new Map((await db.asset.findMany({ where: { id: { in: missingIds } }, select: { id: true, assetTag: true } })).map((row) => [row.id, row.assetTag]))
    : new Map<string, string>()

  const conditionIds = Array.from(new Set(input.items.map((item) => item.conditionAfter)))
  const statusIds = Array.from(new Set(input.items.map((item) => item.nextStatusId)))
  const overrideLocationIds = Array.from(new Set(input.items.flatMap((item) => item.nextLocationId && item.nextLocationId !== input.nextLocationId ? [item.nextLocationId] : [])))
  const [openCheckouts, openRepairs, outstanding, conditions, statuses, activeOverrides] = await Promise.all([
    db.assetCheckout.findMany({
      where: { assetId: { in: assetIds }, isReturned: false, transactionStatus: "active" },
      select: { id: true, assetId: true, custodianId: true, handoverMode: true, checkoutDate: true, remark: true },
    }),
    db.maintenanceTicket.findMany({ where: { ...openRepairRecordWhere, assetId: { in: assetIds } }, select: { assetId: true } }),
    readOutstandingComponentLinks(db, assetIds),
    db.assetCondition.findMany({ where: { id: { in: conditionIds } }, select: { id: true, name: true, isActive: true } }),
    db.assetStatus.findMany({ where: { id: { in: statusIds } }, select: { id: true, name: true, isActive: true } }),
    overrideLocationIds.length > 0
      ? db.location.findMany({ where: { id: { in: overrideLocationIds }, isActive: true }, select: { id: true } })
      : Promise.resolve([] as Array<{ id: string }>),
  ])
  const checkoutByAsset = new Map(openCheckouts.map((checkout) => [checkout.assetId, checkout]))
  const repairIds = new Set(openRepairs.map((ticket) => ticket.assetId))
  const outstandingIds = new Set(outstanding.map((row) => row.assetId))
  const conditionsById = new Map(conditions.map((condition) => [condition.id, condition]))
  const statusesById = new Map(statuses.map((status) => [status.id, status]))
  const activeOverrideIds = new Set(activeOverrides.map((location) => location.id))
  const returnStatusNames: ReadonlySet<string> = new Set(checkinReturnStatusNames)

  const blocked: BatchCheckinBlockedAsset[] = []
  const items: BatchCheckinPlanItem[] = []
  for (const item of input.items) {
    const asset = assetsById.get(item.assetId)
    if (!asset) {
      blocked.push({ assetId: item.assetId, assetTag: missingTags.get(item.assetId) ?? item.assetId, code: "ASSET_NOT_ACTIVE" })
      continue
    }
    const checkout = checkoutByAsset.get(asset.id) ?? null
    const nextLocationId = item.nextLocationId ?? input.nextLocationId
    const code = machineRefusal({
      item,
      asset,
      checkout,
      employeeId: input.employeeId,
      outstanding: outstandingIds.has(asset.id),
      hasOpenRepair: repairIds.has(asset.id),
      condition: conditionsById.get(item.conditionAfter) ?? null,
      status: statusesById.get(item.nextStatusId) ?? null,
      returnStatusNames,
      returnDay,
      locationActive: nextLocationId === input.nextLocationId || activeOverrideIds.has(nextLocationId),
    })
    if (code) {
      blocked.push({ assetId: asset.id, assetTag: asset.assetTag, code })
      continue
    }
    const planned: PlannedAsset = {
      id: asset.id, assetTag: asset.assetTag, statusId: asset.statusId, conditionId: asset.conditionId,
      currentLocationId: asset.currentLocationId, custodianId: asset.custodianId, ownershipType: asset.ownershipType,
    }
    items.push({ item, asset: planned, checkoutId: checkout?.id ?? null, nextLocationId })
  }
  if (blocked.length > 0) throw new BatchCheckinBlockedError(blocked)

  // The return department must resolve before anything is written (spec §12, P2-R8); the transaction reads it again.
  await readCheckinDepartment(db)
  return { input, items }
}

type MachineFacts = {
  item: BatchCheckinItemInput
  asset: { custodianId: string | null; ownershipType: string; status: { name: string } }
  checkout: { id: string; custodianId: string | null; handoverMode: string | null; checkoutDate: Date; remark: string | null } | null
  employeeId: string
  outstanding: boolean
  hasOpenRepair: boolean
  condition: { name: string; isActive: boolean } | null
  status: { name: string; isActive: boolean } | null
  returnStatusNames: ReadonlySet<string>
  returnDay: string
  locationActive: boolean
}

// The machine's first failing reason: getCheckinVerdict's order (outstanding, then the handover or the legacy path), then
// the single route's field checks (condition, next status, date, room), with G7P4-R2 in place of the repair paths.
export function machineRefusal(facts: MachineFacts): BatchCheckinBlockedCode | null {
  const { item, asset, checkout } = facts
  // An outstanding component comes back through its own late return (group 3 spec §8.6), never here (G7P4-R2).
  if (facts.outstanding) return "BATCH_CHECKIN_NEEDS_SINGLE"
  if (checkout) {
    // The form read no handover, or another one: the asset changed since (Review Focus 1).
    if (item.checkoutId !== checkout.id) return assetChanged
    if (checkout.custodianId !== facts.employeeId) return "BATCH_CHECKIN_NOT_HELD"
    if (facts.hasOpenRepair) return "BATCH_CHECKIN_NEEDS_SINGLE"
    const handoverError = getCheckinHandoverStatusError(checkout.handoverMode, asset.status.name, { hasOpenRepair: false })
    if (handoverError) return handoverError
  } else {
    // The handover the form read was returned or cancelled elsewhere meanwhile (Review Focus 1).
    if (item.checkoutId !== null) return assetChanged
    // The legacy-checkout route's refusals (G7P4-R6): ownership, the holder, an open repair, the status.
    const ownershipRefusal = getAssetOperationOwnershipRefusal("legacyCheckin", asset.ownershipType)
    if (ownershipRefusal === "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED" || ownershipRefusal === "ASSET_LICENSE_CHECKIN_NOT_ALLOWED") return ownershipRefusal
    if (asset.custodianId !== facts.employeeId) return "BATCH_CHECKIN_NOT_HELD"
    if (facts.hasOpenRepair) return "BATCH_CHECKIN_NEEDS_SINGLE"
    if (getAssetLifecycleTransitionError("legacy_return_backfill", asset.status.name)) return "ASSET_STATUS_CHECKIN_NOT_ALLOWED"
  }
  if (getAssetOperationConditionError("checkin", facts.condition)) return "BATCH_CHECKIN_CONDITION_INVALID"
  if (!facts.status || !facts.status.isActive || !facts.returnStatusNames.has(facts.status.name)) return "BATCH_CHECKIN_STATUS_INVALID"
  // ส่งซ่อม opens or joins a repair: the single form (G7P4-R2).
  if (facts.status.name === "Under Maintenance") return "BATCH_CHECKIN_NEEDS_SINGLE"
  // ≥ the handover's day; a held asset with no handover is backfilled today and has no lower bound (P2-R13).
  const handoverDay = checkout ? checkinHandoverDay(checkout) : null
  if (checkinReturnDateError({ returnDay: facts.returnDay, todayDay: facts.returnDay, handoverDay })) return "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"
  if (!facts.locationActive) return "ASSET_CHECKIN_LOCATION_INACTIVE"
  return null
}

export type BatchCheckinEvidence = {
  // The two signature files, stored once and attached to every record (G7P4-R5).
  returnSignature: SavedOperationEvidence
  receiveSignature: SavedOperationEvidence
  photosAfterByAsset: ReadonlyMap<string, CheckinEvidenceWithLabel[]>
}

export type BatchCheckinWriteContext = {
  user: SessionUser
  // The In Use status (the backfilled HO-'s status); read by the caller when the plan has a held asset with no handover.
  inUseStatusId: string | null
  // The backfilled HO-'s checkout date.
  now: Date
}

export type BatchCheckinWrittenMachine = {
  assetId: string
  asset: PlannedAsset
  backfilledCheckoutId: string | null
  checkin: AssetCheckinInput
  result: CheckinWriteResult
}

export type BatchCheckinWriteResult = {
  documentNo: string
  // In request order.
  machines: BatchCheckinWrittenMachine[]
}

// The transaction body (G7P4-R1, R5, R6), run Serializable by the caller: the outstanding re-read, each held asset's HO-
// backfill, the open handovers re-read, one RT- number, then each machine's return in asset-id order (each claims its
// handover). Any refusal throws BatchCheckinBlockedError naming the machine, and the whole save rolls back, a backfilled
// HO- included.
export async function writeBatchCheckinInTransaction(
  tx: Prisma.TransactionClient,
  plan: BatchCheckinPlan,
  evidence: BatchCheckinEvidence,
  ctx: BatchCheckinWriteContext,
): Promise<BatchCheckinWriteResult> {
  const { input } = plan
  // Rows are locked in asset-id order, whatever the tick order, so two saves over the same machines wait for each other.
  const ordered = [...plan.items].sort((left, right) => (left.asset.id < right.asset.id ? -1 : left.asset.id > right.asset.id ? 1 : 0))
  const blockedOf = (entry: BatchCheckinPlanItem, code: BatchCheckinBlockedCode) => new BatchCheckinBlockedError([{ assetId: entry.asset.id, assetTag: entry.asset.assetTag, code }])

  // A machine taken as an outstanding component since the pre-check (G7P4-R2).
  const outstanding = await readOutstandingComponentLinks(tx, ordered.map((entry) => entry.asset.id))
  if (outstanding.length > 0) {
    const ids = new Set(outstanding.map((row) => row.assetId))
    throw new BatchCheckinBlockedError(ordered.filter((entry) => ids.has(entry.asset.id)).map((entry) => ({ assetId: entry.asset.id, assetTag: entry.asset.assetTag, code: "BATCH_CHECKIN_NEEDS_SINGLE" as const })))
  }

  // G7P4-R6: a held asset with no handover gets its HO- here; a refused save rolls it back with the rest.
  const checkoutIds = new Map<string, string>()
  const backfilled = new Set<string>()
  for (const entry of ordered) {
    if (entry.checkoutId) {
      checkoutIds.set(entry.asset.id, entry.checkoutId)
      continue
    }
    if (!ctx.inUseStatusId) throw new Error(missingInUseStatus)
    // The holder again: a transfer meanwhile keeps the status, so the backfill's claim alone would not see it.
    const stillHeld = await tx.asset.findFirst({ where: { id: entry.asset.id, isActive: true, custodianId: input.employeeId }, select: { id: true } })
    if (!stillHeld) throw blockedOf(entry, "BATCH_CHECKIN_NOT_HELD")
    try {
      const checkout = await backfillLegacyCheckoutInTransaction(tx, {
        asset: entry.asset,
        custodianId: input.employeeId,
        checkoutDate: ctx.now,
        inUseStatusId: ctx.inUseStatusId,
      }, { userId: ctx.user.id })
      checkoutIds.set(entry.asset.id, checkout.id)
      backfilled.add(entry.asset.id)
    } catch (error) {
      if (error instanceof AssetComponentOutstandingError) throw blockedOf(entry, "BATCH_CHECKIN_NEEDS_SINGLE")
      if (error instanceof AssetOperationConflictError && !(error instanceof CheckinDepartmentUnavailableError)) throw blockedOf(entry, error.code === "ASSET_ACTIVE_CHECKOUT_EXISTS" ? "ASSET_ACTIVE_CHECKOUT_EXISTS" : assetChanged)
      throw error
    }
  }

  // Every handover read before the transaction must still be open: one answer names each one returned meanwhile
  // (Review Focus 1). The claims below still guard each one.
  const handedOver = ordered.filter((entry) => entry.checkoutId)
  if (handedOver.length > 0) {
    const stillOpen = await tx.assetCheckout.findMany({
      where: { id: { in: handedOver.map((entry) => entry.checkoutId as string) }, isReturned: false, transactionStatus: "active" },
      select: { id: true, assetId: true },
    })
    const openIds = new Set(stillOpen.map((row) => `${row.assetId}:${row.id}`))
    const changed = handedOver.filter((entry) => !openIds.has(`${entry.asset.id}:${entry.checkoutId}`))
    if (changed.length > 0) {
      throw new BatchCheckinBlockedError(changed.map((entry) => ({ assetId: entry.asset.id, assetTag: entry.asset.assetTag, code: assetChanged })))
    }
  }

  // G7P4-R1: one RT- number for the whole document, taken inside this Serializable transaction.
  const documentNo = await generateCheckinDocumentNo(tx, input.returnDate)

  const written = new Map<string, BatchCheckinWrittenMachine>()
  for (const entry of ordered) {
    const checkin: AssetCheckinInput = {
      checkoutId: checkoutIds.get(entry.asset.id) as string,
      returnDate: input.returnDate,
      returnByEmployeeId: input.returnByEmployeeId ?? null,
      returnBy: input.returnBy,
      receiveByEmployeeId: input.receiveByEmployeeId ?? null,
      receiveBy: input.receiveBy,
      conditionAfter: entry.item.conditionAfter,
      missingAccessories: null,
      damageNote: entry.item.damageNote ?? null,
      nextStatusId: entry.item.nextStatusId,
      nextLocationId: entry.nextLocationId,
      remark: entry.item.remark ?? null,
      maintenanceReportedById: null,
      maintenanceProblem: null,
      // Components travel with their machine (G7P4-R2): none is left out here.
      missingComponentIds: [],
    }
    let result: CheckinWriteResult
    try {
      result = await writeCheckinInTransaction(tx, {
        asset: entry.asset,
        checkin,
        holderEmployeeId: input.employeeId,
        sendsToRepair: false,
        repairReporterId: null,
        evidence: {
          photosAfter: evidence.photosAfterByAsset.get(entry.asset.id) ?? [],
          returnSignature: evidence.returnSignature,
          receiveSignature: evidence.receiveSignature,
        },
        documentNo,
      }, { user: ctx.user })
    } catch (error) {
      const code = writeRefusalCode(error)
      if (code) throw blockedOf(entry, code)
      throw error
    }
    written.set(entry.asset.id, {
      assetId: entry.asset.id,
      asset: entry.asset,
      backfilledCheckoutId: backfilled.has(entry.asset.id) ? checkoutIds.get(entry.asset.id) ?? null : null,
      checkin,
      result,
    })
  }

  return { documentNo, machines: plan.items.map((entry) => written.get(entry.asset.id) as BatchCheckinWrittenMachine) }
}

// The single return's in-transaction refusals, as the machine's code; null for a refusal of the whole save (the return
// department) or an unexpected error.
function writeRefusalCode(error: unknown): BatchCheckinBlockedCode | null {
  if (error instanceof CheckinDepartmentUnavailableError) return null
  if (error instanceof AssetOperationConflictError) return error.code === "ASSET_ACTIVE_CHECKOUT_EXISTS" ? "ASSET_ACTIVE_CHECKOUT_EXISTS" : assetChanged
  if (error instanceof CheckinLocationInactiveError) return "ASSET_CHECKIN_LOCATION_INACTIVE"
  if (!(error instanceof Error)) return null
  if (error.message === "Active checkout not found") return assetChanged
  // A repair opened since the pre-check (G7P4-R2).
  if (error.message === "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED") return "BATCH_CHECKIN_NEEDS_SINGLE"
  if (error.message === "ASSET_HANDOVER_MODE_MISSING") return "ASSET_HANDOVER_MODE_MISSING"
  if (error.message === "ASSET_HANDOVER_STATUS_MISMATCH") return "ASSET_HANDOVER_STATUS_MISMATCH"
  return null
}
