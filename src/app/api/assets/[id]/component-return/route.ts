import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { assetComponentReturnSchema, type AssetComponentReturnInput } from "@/lib/validations/asset-operations"
import { AssetOperationConflictError, claimAssetForCustodyChange } from "@/lib/asset-operation-claim"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { outstandingLinkWhere } from "@/lib/asset-component-outstanding"
import { getLateReturnDepartmentId } from "@/lib/asset-department-rule"
import { getCheckinVerdict } from "@/lib/asset-operation-eligibility"
import { getAssetOperationConditionError } from "@/lib/asset-lifecycle-policy"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { readCheckinDepartment } from "@/lib/checkin-department"
import {
  getLateReturnDateError,
  getLateReturnNextStatusName,
  getLateReturnOutcome,
  type LateReturnDateError,
  type LateReturnParent,
} from "@/lib/component-late-return"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"

// The late return of an outstanding component (group 3 spec §8.6, P2-R3): [id] is the component. It re-attaches to a
// parent in IT stock and otherwise stands alone in the chosen room. The RT- stays the reference; no new document.

type ComponentReturnContext = {
  params: Promise<{ id: string }>
}

const LATE_RETURN_REASON = "Component late return"

export async function POST(request: NextRequest, context: ComponentReturnContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetComponentReturnSchema.parse(await request.json().catch(() => ({})))
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true }, select: { id: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const link = await prisma.assetComponent.findFirst({
      where: lateReturnLinkWhere(id, input),
      select: { id: true, parentAssetId: true },
    })
    if (!link) throw changedDuringOperation()
    const checkin = await prisma.assetCheckin.findFirst({
      where: { id: input.checkinId, assetId: link.parentAssetId, transactionStatus: "active" },
      select: { id: true, documentNo: true, returnDate: true },
    })
    if (!checkin) throw changedDuringOperation()

    // วันที่คืน is ≤ today and ≥ the RT-'s return day, in Bangkok days (P2-R13).
    const dateError = getLateReturnDateError({
      returnDay: getBangkokDateKey(input.returnDate),
      todayDay: getBangkokDateKey(new Date()),
      checkinDay: getBangkokDateKey(checkin.returnDate),
    })
    if (dateError) return returnDateRefusal(dateError)

    if (input.conditionId) {
      const condition = await prisma.assetCondition.findUnique({
        where: { id: input.conditionId },
        select: { name: true, isActive: true },
      })
      const conditionError = getAssetOperationConditionError("checkin", condition)
      if (conditionError) {
        return NextResponse.json(
          { code: conditionError, error: "Invalid return condition for check-in", fieldErrors: { conditionId: "invalidReturnCondition" } },
          { status: 400 },
        )
      }
    }

    await readCheckinDepartment(prisma)
    // A re-attach never reads the room, even if a client sends one: the room is the parent's.
    if (input.expectedOutcome === "standalone" && !(await isActiveLocation(prisma, input.nextLocationId!))) {
      return locationInactiveResponse()
    }

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.assetComponent.updateMany({
        where: lateReturnLinkWhere(id, input),
        data: { updatedBy: user.id },
      })
      if (claim.count !== 1) throw changedDuringOperation()

      const linkRow = await tx.assetComponent.findUnique({
        where: { id: input.componentLinkId },
        select: { id: true, parentAssetId: true, componentRole: true, slotNo: true },
      })
      const checkinNow = await tx.assetCheckin.findFirst({
        where: { id: input.checkinId, assetId: link.parentAssetId, transactionStatus: "active" },
        select: { id: true, documentNo: true, returnDate: true },
      })
      if (!linkRow || !checkinNow) throw changedDuringOperation()

      // Claim the component row before reading its state, its open handover and its repair, in the order checkout and
      // transfer take it (they claim the component, then read its links): one of two saves waits here, then sees the other.
      const componentClaim = await tx.asset.updateMany({ where: { id, isActive: true }, data: { updatedBy: user.id } })
      if (componentClaim.count !== 1) throw changedDuringOperation()

      const before = await tx.asset.findUnique({
        where: { id },
        select: {
          id: true,
          assetTag: true,
          isActive: true,
          updatedAt: true,
          ownershipType: true,
          statusId: true,
          status: { select: { name: true } },
          conditionId: true,
          condition: { select: { name: true } },
          currentLocationId: true,
          custodianId: true,
          departmentId: true,
        },
      })
      if (!before || !before.isActive) throw changedDuringOperation()

      const read = await readLateReturnParent(tx, linkRow.parentAssetId)
      if (!read) throw changedDuringOperation()
      const outcome = getLateReturnOutcome(read.facts)

      const openCheckout = await tx.assetCheckout.findFirst({
        where: { assetId: id, isReturned: false, transactionStatus: "active" },
        select: { id: true, handoverMode: true },
      })
      const hasOpenRepair = (await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })) > 0
      const ownership = normalizeAssetOwnershipType(before.ownershipType)
      // Task 4's rule: the panel opens only for an eligible row, so a refusal here is a stale row.
      const verdict = getCheckinVerdict({
        statusName: before.status.name,
        ownership,
        custodianId: before.custodianId,
        openCheckout,
        hasOpenRepair,
        conditionName: before.condition?.name ?? null,
        outstanding: { linkId: linkRow.id, checkinId: checkinNow.id },
      })
      if (!verdict.eligible || verdict.path !== "componentReturn") throw changedDuringOperation()
      // The panel said re-attach or stand alone; a parent that changed since is a stale panel, never a field error (P2-R3).
      if (outcome !== input.expectedOutcome) throw changedDuringOperation()

      const returnDepartment = await readCheckinDepartment(tx)
      // A re-attach takes the parent's room and department from the read made after the parent claim: a move or a
      // transfer that kept the status passes the claim, and the first read would then be stale.
      let parent = read.parent
      if (outcome === "reattached") {
        await claimAssetForCustodyChange(tx, { assetId: read.parent.id, expectedStatusId: read.parent.statusId, updatedBy: user.id })
        // A holder or a repair set without a status change passes the claim; read the parent again.
        const reread = await readLateReturnParent(tx, read.parent.id)
        if (!reread || getLateReturnOutcome(reread.facts) !== "reattached") throw changedDuringOperation()
        parent = reread.parent
      } else if (!(await isActiveLocation(tx, input.nextLocationId!))) {
        throw new LateReturnLocationInactiveError()
      }

      const nextDepartmentId = getLateReturnDepartmentId({
        outcome,
        ownership,
        parentDepartmentId: parent.departmentId,
        returnDepartmentId: returnDepartment.id,
        currentDepartmentId: before.departmentId,
      })
      const conditionChanged = Boolean(input.conditionId) && input.conditionId !== before.conditionId
      const currentLocationId = outcome === "reattached" ? parent.currentLocationId : input.nextLocationId!
      // A หาไม่พบ component brought back has been found: it becomes พร้อมใช้งาน (user 2026-11-01). Read before the write.
      const nextStatusName = getLateReturnNextStatusName(before.status.name)
      const nextStatusId = nextStatusName ? await getRequiredAssetStatusId(nextStatusName) : null
      const statusChanged = nextStatusId !== null && nextStatusId !== before.statusId

      // Every outstanding link of this component under this RT- ends the same way (P2-R1); each keeps the RT- as its reference.
      await tx.assetComponent.updateMany({
        where: {
          parentAssetId: read.parent.id,
          componentAssetId: id,
          referenceType: "checkin",
          referenceId: input.checkinId,
          ...outstandingLinkWhere,
        },
        data: outcome === "reattached"
          ? { status: "installed", updatedBy: user.id }
          : { status: "removed", removedAt: input.returnDate, updatedBy: user.id },
      })

      // Only a หาไม่พบ component's status is written (getLateReturnNextStatusName); every other status is kept.
      await tx.asset.update({
        where: { id },
        data: {
          ...(statusChanged ? { statusId: nextStatusId } : {}),
          currentLocationId,
          custodianId: null,
          departmentId: nextDepartmentId,
          ...(conditionChanged ? { conditionId: input.conditionId! } : {}),
          updatedBy: user.id,
        },
      })

      const reference = { referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }
      const moved = { reason: LATE_RETURN_REASON, ...reference }
      const linkValue = JSON.stringify({
        componentAssetId: id,
        componentAssetTag: before.assetTag,
        componentRole: linkRow.componentRole,
        slotNo: linkRow.slotNo,
      })
      const parentMovementType = outcome === "reattached" ? "component_install" : "component_remove"
      const rows: Prisma.AssetMovementCreateManyInput[] = [
        {
          assetId: read.parent.id,
          movementType: parentMovementType,
          ...(outcome === "reattached" ? { toValue: linkValue } : { fromValue: linkValue }),
          reason: null,
          ...reference,
        },
        {
          assetId: id,
          movementType: "component_late_return",
          toValue: JSON.stringify({ receivedByName: input.receiveBy, returnDate: getBangkokDateKey(input.returnDate), outcome }),
          ...moved,
          remark: input.remark ?? null,
        },
      ]
      if (statusChanged) {
        rows.push({ assetId: id, movementType: "status_change", fromValue: before.statusId, toValue: nextStatusId, ...moved })
      }
      if (currentLocationId !== before.currentLocationId) {
        rows.push({ assetId: id, movementType: "location_change", fromValue: before.currentLocationId, toValue: currentLocationId, ...moved })
      }
      if (before.custodianId !== null) {
        rows.push({ assetId: id, movementType: "custodian_change", fromValue: before.custodianId, toValue: null, ...moved })
      }
      if (nextDepartmentId !== before.departmentId) {
        rows.push({ assetId: id, movementType: "department_change", fromValue: before.departmentId, toValue: nextDepartmentId, ...moved })
      }
      if (conditionChanged) {
        rows.push({ assetId: id, movementType: "condition_change", fromValue: before.conditionId, toValue: input.conditionId, ...moved })
      }
      await tx.assetMovement.createMany({ data: rows })

      return {
        outcome,
        parentAssetId: read.parent.id,
        departmentId: nextDepartmentId,
        previousDepartmentId: before.departmentId,
        statusId: statusChanged ? nextStatusId : before.statusId,
        previousStatusId: before.statusId,
        before,
      }
    })

    await logAudit({
      userId: user.id,
      action: "component_late_return",
      module: "asset",
      recordId: id,
      oldValue: result.before,
      newValue: {
        ...input,
        checkinId: checkin.id,
        documentNo: checkin.documentNo,
        outcome: result.outcome,
        parentAssetId: result.parentAssetId,
        departmentId: result.departmentId,
        previousDepartmentId: result.previousDepartmentId,
        statusId: result.statusId,
        previousStatusId: result.previousStatusId,
      },
    })

    return NextResponse.json({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome: result.outcome }, { status: 201 })
  } catch (error) {
    // Branch 1 also answers Task 1's department refusal: `CheckinDepartmentUnavailableError` is an
    // `AssetOperationConflictError` whose code and message are `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`.
    if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    if (error instanceof LateReturnLocationInactiveError) return locationInactiveResponse()
    return errorResponse(error, 400)
  }
}

const CHANGED_MESSAGE = "Asset status changed while this request was being saved. Reload the asset and try again."

function changedDuringOperation() {
  return new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", CHANGED_MESSAGE)
}

function lateReturnLinkWhere(componentAssetId: string, input: AssetComponentReturnInput) {
  return {
    id: input.componentLinkId,
    componentAssetId,
    referenceType: "checkin",
    referenceId: input.checkinId,
    ...outstandingLinkWhere,
  }
}

async function isActiveLocation(db: Pick<Prisma.TransactionClient, "location">, id: string) {
  return (await db.location.findFirst({ where: { id, isActive: true }, select: { id: true } })) !== null
}

// The parent as it is now, with no isActive filter: a disposed parent is a fact, and it stands the component alone.
async function readLateReturnParent(
  db: Pick<Prisma.TransactionClient, "asset" | "assetCheckout" | "maintenanceTicket">,
  parentAssetId: string,
) {
  const parent = await db.asset.findUnique({
    where: { id: parentAssetId },
    select: {
      id: true,
      assetTag: true,
      name: true,
      isActive: true,
      statusId: true,
      status: { select: { name: true } },
      custodianId: true,
      currentLocationId: true,
      departmentId: true,
    },
  })
  if (!parent) return null
  const openCheckout = await db.assetCheckout.findFirst({
    where: { assetId: parentAssetId, isReturned: false, transactionStatus: "active" },
    select: { id: true },
  })
  const openRepairCount = await db.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: parentAssetId } })
  const facts: LateReturnParent = {
    isActive: parent.isActive,
    statusName: parent.status.name,
    custodianId: parent.custodianId,
    hasOpenCheckout: openCheckout !== null,
    hasOpenRepair: openRepairCount > 0,
  }
  return { parent, facts }
}

class LateReturnLocationInactiveError extends Error {
  constructor() {
    super("ASSET_CHECKIN_LOCATION_INACTIVE")
    this.name = "LateReturnLocationInactiveError"
  }
}

function locationInactiveResponse() {
  return NextResponse.json(
    {
      code: "ASSET_CHECKIN_LOCATION_INACTIVE",
      error: "ASSET_CHECKIN_LOCATION_INACTIVE",
      fieldErrors: { nextLocationId: getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE") },
    },
    { status: 409 },
  )
}

function returnDateRefusal(code: LateReturnDateError) {
  return NextResponse.json({ code, error: code, fieldErrors: { returnDate: getApiErrorKey(code) } }, { status: 400 })
}
