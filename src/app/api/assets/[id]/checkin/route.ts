import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckinSchema, type AssetCheckinInput } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { COMPONENT_LINK_OUTSTANDING } from "@/lib/asset-component-outstanding"
import { getCheckinNextDepartmentId, getOutstandingComponentCustody } from "@/lib/asset-department-rule"
import { buildAssetOperationComponentLinkWhere } from "@/lib/asset-operation-search-rules"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { readCheckinDepartment } from "@/lib/checkin-department"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, type CheckinReturnDateErrorCode } from "@/lib/checkin-route-rules"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getAssetOperationConditionError, getCheckinHandoverStatusError } from "@/lib/asset-lifecycle-policy"
import { isValidCheckinReturnStatus } from "@/lib/asset-status-flow"
import { generateCheckinDocumentNo } from "@/lib/operation-document-number"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { generateRepairNo, toMovementReason } from "@/lib/repair-record-service"
import {
  createAssetTransactionSnapshot,
  createComponentLinkTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
  type AssetComponentTransactionSnapshotChangeV1,
  type CheckinRepairLink,
} from "@/lib/asset-transaction-snapshot"
import {
  optionalFormFile,
  optionalFormText,
  requiredFormText,
  saveOperationEvidenceFile,
  type SavedOperationEvidence,
} from "@/lib/asset-operation-evidence"

type CheckinContext = {
  params: Promise<{ id: string }>
}

type EvidenceWithLabel = {
  file: SavedOperationEvidence
  label: string | null
}

export async function POST(request: NextRequest, context: CheckinContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const { input, evidence } = await readCheckinRequest(request)
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const checkout = await prisma.assetCheckout.findFirst({
      where: { id: input.checkoutId, assetId: id, isReturned: false, transactionStatus: "active" },
    })
    if (!checkout) {
      return NextResponse.json({ error: "Active checkout not found" }, { status: 404 })
    }
    const returnCondition = await prisma.assetCondition.findUnique({
      where: { id: input.conditionAfter },
      select: { name: true, isActive: true },
    })
    const conditionError = getAssetOperationConditionError("checkin", returnCondition)
    if (conditionError) {
      return NextResponse.json(
        { code: conditionError, error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" } },
        { status: 400 },
      )
    }
    if (!(await isValidCheckinReturnStatus(input.nextStatusId))) {
      return NextResponse.json(
        { error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" } },
        { status: 400 },
      )
    }
    // วันที่คืน is ≤ today and ≥ the handover's day, in Bangkok days; a legacy-backfilled HO- has no lower bound (P2-R13).
    const returnDateError = checkinReturnDateError({
      returnDay: getBangkokDateKey(input.returnDate),
      todayDay: getBangkokDateKey(new Date()),
      handoverDay: checkinHandoverDay(checkout),
    })
    if (returnDateError) return returnDateResponse(returnDateError)
    // The room must exist and be active; the transaction reads it again (P2-R15).
    if (!(await readActiveCheckinLocation(prisma, input.nextLocationId))) return locationInactiveResponse()
    const returnStatus = await prisma.assetStatus.findUnique({
      where: { id: input.nextStatusId },
      select: { id: true, name: true },
    })
    // "Send for repair" is the Under Maintenance return status; it opens the repair record
    // in the same transaction so the asset never sits in a repair status without one.
    const sendsToRepair = returnStatus?.name === "Under Maintenance"
    const repairReporterId = sendsToRepair
      ? user.employeeId ?? input.receiveByEmployeeId ?? input.maintenanceReportedById ?? null
      : null

    // An open repair takes the return into ส่งซ่อม under that repair, so another next status is refused (S-R43, the
    // user's choice ก 2026-10-29); the repair record below is not created a second time (openRecords === 0).
    const hasOpenRepairBefore = await prisma.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } }) > 0
    if (!sendsToRepair && hasOpenRepairBefore) {
      return repairStatusRequiredResponse()
    }
    // Joining an open repair needs only asset:edit; a new repair record needs maintenance:create and a reporter
    // (group 3 spec §5, P2-R14). The transaction asks again if the open repair closed meanwhile.
    if (sendsToRepair && !hasOpenRepairBefore) {
      requirePermission(user, "maintenance", "create")
      if (!repairReporterId) return reporterRequiredResponse()
    }
    // The return department (spec §12, P2-R8) must resolve before anything is written, ส่วนกลาง included; the
    // transaction reads it again. It stays after the last pre-check (tests/v-track2-x.test.ts stubs no department).
    await readCheckinDepartment(prisma)
    // The missing-components list (spec §8.5, P2-R1, P2-R18) is checked last, before any file is saved; the
    // transaction reads it again. A request with no missing ids reads nothing here.
    await readMissingComponentPlan(prisma, id, input, checkout.custodianId)

    // The files are saved only after every cheap check has passed (P2-R15).
    const { photosAfter, returnSignature, receiveSignature } = await saveCheckinEvidence(evidence)
    const { record: checkin, componentSync, departmentId, previousDepartmentId, missingComponents, repair } = await prisma.$transaction(async (tx) => {
      const activeCheckout = await tx.assetCheckout.findFirst({
        where: {
          id: input.checkoutId,
          assetId: id,
          isReturned: false,
          transactionStatus: "active",
        },
        select: {
          id: true,
          handoverMode: true,
          asset: {
            select: {
              status: { select: { name: true } },
            },
          },
        },
      })
      if (!activeCheckout) throw new Error("Active checkout not found")
      const hasOpenRepair = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } }) > 0
      if (!sendsToRepair && hasOpenRepair) {
        throw new Error("ASSET_CHECKIN_REPAIR_STATUS_REQUIRED")
      }
      // A repair that closed since the pre-check turns the join into a new record: ask again (group 3 spec §5, P2-R14).
      const createsRepair = sendsToRepair && !hasOpenRepair
      if (createsRepair) {
        requirePermission(user, "maintenance", "create")
        if (!repairReporterId) throw new Error("MAINTENANCE_REPORTER_REQUIRED")
      }
      // S-R48: a permanent handover whose asset went into repair (Under Maintenance or Pending Repair) fits while that
      // repair is open; the checkin clears the holder, so finishing the repair later restores Ready.
      const handoverStatusError = getCheckinHandoverStatusError(
        activeCheckout.handoverMode,
        activeCheckout.asset.status.name,
        { hasOpenRepair },
      )
      if (handoverStatusError) throw new Error(handoverStatusError)
      const returnDepartment = await readCheckinDepartment(tx)
      // P2-R15: the room again, then the claim on the handover, before the RT- number is taken. A second save of the
      // same HO- loses the claim and answers 409 instead of the unique index's 500 (GP W1).
      if (!(await readActiveCheckinLocation(tx, input.nextLocationId))) throw new CheckinLocationInactiveError()
      const claimed = await tx.assetCheckout.updateMany({
        where: { id: activeCheckout.id, assetId: id, isReturned: false, transactionStatus: "active" },
        data: { isReturned: true },
      })
      if (claimed.count !== 1) {
        throw new AssetOperationConflictError(
          "ASSET_CHANGED_DURING_OPERATION",
          "Asset status changed while this request was being saved. Reload the asset and try again.",
        )
      }
      // Claim the missing components' rows before reading their links and open handovers, in the order checkout and
      // transfer take them (they claim the component, then read its links). A ส่งมอบ of the component that wins the lock
      // leaves an open HO- that the plan below refuses; one that loses sees the outstanding link and refuses.
      if (input.missingComponentIds.length > 0) {
        await tx.asset.updateMany({ where: { id: { in: input.missingComponentIds }, isActive: true }, data: { updatedBy: user.id } })
      }
      // A component taken since the pre-check is refused before the RT- number is taken (P2-R15). The claimed row is the
      // pre-read handover, so its holder has not changed.
      const missingPlan = await readMissingComponentPlan(tx, id, input, checkout.custodianId)

      const beforeAsset = await tx.asset.findUnique({
        where: { id },
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
      })
      if (!beforeAsset) throw new Error("Asset not found")
      // บุคคล and Stock go to the return department; ส่วนกลาง, ส่วนควบ and License keep theirs (P2-R7).
      const nextDepartmentId = getCheckinNextDepartmentId({
        ownership: normalizeAssetOwnershipType(asset.ownershipType),
        returnDepartmentId: returnDepartment.id,
        currentDepartmentId: beforeAsset.departmentId,
      })

      const documentNo = await generateCheckinDocumentNo(tx, input.returnDate)
      const record = await tx.assetCheckin.create({
        data: {
          documentNo,
          assetId: id,
          checkoutId: activeCheckout.id,
          returnDate: input.returnDate,
          returnByEmployeeId: input.returnByEmployeeId,
          returnBy: input.returnBy,
          receiveByEmployeeId: input.receiveByEmployeeId,
          receiveBy: input.receiveBy,
          conditionAfter: input.conditionAfter,
          missingAccessories: input.missingAccessories,
          damageNote: input.damageNote,
          photoAfter: photosAfter[0]?.file.filePath,
          nextStatus: input.nextStatusId,
          nextLocationId: input.nextLocationId,
          remark: input.remark,
          beforeSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
            asset: beforeAsset,
            checkout: { id: activeCheckout.id, isReturned: false },
            components: [],
          })),
        },
      })

      for (const evidence of [
        ...photosAfter.map((photo) => ({ module: "checkin_photo_after", file: photo.file, label: photo.label })),
        { module: "checkin_return_signature", file: returnSignature, label: null },
        { module: "checkin_receive_signature", file: receiveSignature, label: null },
      ]) {
        if (!evidence.file) continue
        await tx.attachment.create({
          data: {
            assetId: asset.id,
            module: evidence.module,
            referenceId: record.id,
            fileName: evidence.file.fileName,
            originalName: evidence.label ? `${evidence.label} - ${evidence.file.originalName}` : evidence.file.originalName,
            fileType: evidence.file.fileType,
            fileSize: evidence.file.fileSize,
            filePath: evidence.file.filePath,
            uploadedBy: user.id,
          },
        })
      }

      // Closed by the claim above.
      const returnedCheckout = { id: activeCheckout.id, isReturned: true }

      const afterAsset = await tx.asset.update({
        where: { id },
        data: {
          statusId: input.nextStatusId,
          conditionId: input.conditionAfter,
          currentLocationId: input.nextLocationId,
          custodianId: null,
          departmentId: nextDepartmentId,
          updatedBy: user.id,
        },
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
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "checkin",
          fromValue: asset.currentLocationId,
          toValue: input.nextLocationId,
          reason: "Asset checkin",
          referenceType: "checkin",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.remark,
        },
      })
      if (nextDepartmentId !== beforeAsset.departmentId) {
        await tx.assetMovement.create({
          data: {
            assetId: id,
            movementType: "department_change",
            fromValue: beforeAsset.departmentId,
            toValue: nextDepartmentId,
            reason: "Asset checkin",
            referenceType: "checkin",
            referenceId: record.id,
            performedBy: user.id,
          },
        })
      }

      // Before the sync: the sync reads installed links only, so the components that did not come back stay where they
      // are and only the returned ones follow the parent (spec §8.5 "Save").
      const outstanding = await markComponentsOutstanding(tx, { plan: missingPlan, checkinId: record.id, userId: user.id, remark: input.remark ?? null })

      // The travelling components take the parent's department (its kept one for a ส่วนกลาง parent), as checkout does.
      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: input.nextLocationId,
          custodianId: null,
          departmentId: nextDepartmentId,
        },
        movementType: "parent_checkin_sync",
        referenceType: "checkin",
        referenceId: record.id,
        performedBy: user.id,
        reason: "Parent asset checkin",
        remark: input.remark,
        captureSnapshots: true,
      })

      let repair: CheckinRepairLink | null = null
      if (createsRepair && repairReporterId) {
        const openRecords = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })
        if (openRecords === 0) {
          const problem = input.maintenanceProblem ?? buildMaintenanceProblem(input, outstanding.missingComponents)
          const ticket = await tx.maintenanceTicket.create({
            data: {
              repairNo: await generateRepairNo(tx, new Date()),
              assetId: id,
              problem,
              reportedById: repairReporterId,
              reportedDate: input.returnDate,
              repairType: "internal",
              repairStatus: "in_progress",
              createdBy: user.id,
              updatedBy: user.id,
            },
            select: { id: true, repairNo: true },
          })

          await tx.assetMovement.create({
            data: {
              assetId: id,
              movementType: "maintenance_create",
              fromValue: beforeAsset.statusId,
              toValue: input.nextStatusId,
              reason: toMovementReason(problem),
              referenceType: "maintenance",
              referenceId: ticket.id,
              performedBy: user.id,
              remark: "created_from_checkin",
            },
          })
          repair = { id: ticket.id, repairNo: ticket.repairNo, joined: false }
        }
      }
      if (sendsToRepair && !repair) {
        const openRecord = await tx.maintenanceTicket.findFirst({
          where: { ...openRepairRecordWhere, assetId: id },
          orderBy: { createdAt: "desc" },
          select: { id: true, repairNo: true },
        })
        if (openRecord) repair = { id: openRecord.id, repairNo: openRecord.repairNo, joined: true }
      }

      const componentChanges = [...componentSync.componentSnapshots, ...outstanding.changes]
      const beforeSnapshot = createAssetTransactionSnapshot({
        asset: beforeAsset,
        checkout: { id: activeCheckout.id, isReturned: false },
        components: componentChanges.map((change) => change.before),
      })
      const afterSnapshot = createAssetTransactionSnapshot({
        asset: afterAsset,
        checkout: returnedCheckout,
        components: componentChanges.map((change) => change.after),
        repair,
      })
      const finalizedRecord = await tx.assetCheckin.update({
        where: { id: record.id },
        data: {
          beforeSnapshotJson: serializeAssetTransactionSnapshot(beforeSnapshot),
          afterSnapshotJson: serializeAssetTransactionSnapshot(afterSnapshot),
          componentSnapshotJson: serializeAssetComponentTransactionSnapshots(componentChanges),
        },
      })
      const componentSyncSummary = {
        updated: componentSync.updated,
        skipped: componentSync.skipped,
        movements: componentSync.movements,
      }

      return {
        record: finalizedRecord,
        componentSync: componentSyncSummary,
        departmentId: nextDepartmentId,
        previousDepartmentId: beforeAsset.departmentId,
        missingComponents: outstanding.missingComponents,
        repair,
      }
    })

    await logAudit({
      userId: user.id,
      action: "checkin",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkinId: checkin.id, componentSync, departmentId, previousDepartmentId },
    })

    return NextResponse.json({ ...checkin, missingComponents, repair }, { status: 201 })
  } catch (error) {
    if (error instanceof CheckinMissingComponentRefusalError) return missingComponentRefusalResponse(error.code)
    if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    if (error instanceof CheckinLocationInactiveError) return locationInactiveResponse()
    if (error instanceof Error && error.message === "MAINTENANCE_REPORTER_REQUIRED") return reporterRequiredResponse()
    if (error instanceof Error && error.message === "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED") return repairStatusRequiredResponse()
    if (
      error instanceof Error
      && ["ASSET_HANDOVER_MODE_MISSING", "ASSET_HANDOVER_STATUS_MISMATCH"].includes(error.message)
    ) {
      return NextResponse.json({ code: error.message, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

function repairStatusRequiredResponse() {
  return NextResponse.json(
    {
      code: "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED",
      error: "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED",
      fieldErrors: { nextStatusId: "checkinRepairStatusRequired" },
    },
    { status: 409 },
  )
}

// The refusals of the missing-components list (group 3 spec §8.5, P2-R1, P2-R18), keyed by their catalogued codes; each
// lands under its field. The returner code and key are Task 2's.
const MISSING_COMPONENT_REFUSALS = {
  CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED: { field: "returnBy", key: "checkinMissingComponentReturnerRequired" },
  ASSET_CHECKIN_MISSING_COMPONENT_INVALID: { field: "missingComponentIds", key: "checkinMissingComponentInvalid" },
} as const
type MissingComponentRefusalCode = keyof typeof MISSING_COMPONENT_REFUSALS

const missingComponentLinkSelect = {
  id: true, parentAssetId: true, componentAssetId: true, status: true, updatedAt: true, referenceType: true, referenceId: true,
  componentAsset: {
    select: {
      assetTag: true, name: true, ownershipType: true, updatedAt: true, statusId: true, conditionId: true,
      branchId: true, currentLocationId: true, custodianId: true, departmentId: true,
    },
  },
} satisfies Prisma.AssetComponentSelect
type MissingComponentLink = Prisma.AssetComponentGetPayload<{ select: typeof missingComponentLinkSelect }>
type MissingComponentPlan = { returner: { id: string; departmentId: string } | null; links: MissingComponentLink[] }

class CheckinMissingComponentRefusalError extends Error {
  readonly code: MissingComponentRefusalCode

  constructor(code: MissingComponentRefusalCode) {
    super(code)
    this.name = "CheckinMissingComponentRefusalError"
    this.code = code
  }
}

function missingComponentRefusalResponse(code: MissingComponentRefusalCode) {
  const refusal = MISSING_COMPONENT_REFUSALS[code]
  return NextResponse.json({ code, error: code, fieldErrors: { [refusal.field]: refusal.key } }, { status: 400 })
}

// Who keeps what stays out, and every travelling link of each missing component, duplicates included (GP X1).
// Reads nothing for an empty list, so a caller that sends no ids makes no new query.
async function readMissingComponentPlan(
  db: Pick<Prisma.TransactionClient, "employee" | "assetComponent" | "assetCheckout">,
  parentAssetId: string,
  input: { missingComponentIds: string[]; returnByEmployeeId?: string | null },
  holderEmployeeId: string | null,
): Promise<MissingComponentPlan> {
  if (input.missingComponentIds.length === 0) return { returner: null, links: [] }

  // What stays out stays with ผู้คืน, so ผู้คืน must be an employee who can hold it; the handover's holder who has left
  // is the one inactive employee the form offers, and may return (spec §8.3, S-R46).
  const employee = input.returnByEmployeeId
    ? await db.employee.findUnique({
        where: { id: input.returnByEmployeeId },
        select: { id: true, departmentId: true, isActive: true },
      })
    : null
  if (!employee || (!employee.isActive && employee.id !== holderEmployeeId)) {
    throw new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")
  }

  const found = await db.assetComponent.findMany({
    where: { ...buildAssetOperationComponentLinkWhere(parentAssetId), componentAssetId: { in: input.missingComponentIds } },
    select: missingComponentLinkSelect,
    orderBy: { id: "asc" },
  })
  // A component with its own open handover does not travel with the parent (the sync's skip, asset-component-sync.ts).
  const handedOver = found.length > 0
    ? await db.assetCheckout.findMany({
        where: {
          assetId: { in: Array.from(new Set(found.map((link) => link.componentAssetId))) },
          isReturned: false,
          transactionStatus: "active",
        },
        select: { assetId: true },
      })
    : []
  const handedOverIds = new Set(handedOver.map((checkout) => checkout.assetId))
  const links = found.filter((link) => !handedOverIds.has(link.componentAssetId))
  const linkedIds = new Set(links.map((link) => link.componentAssetId))
  if (!input.missingComponentIds.every((componentId) => linkedIds.has(componentId))) {
    throw new CheckinMissingComponentRefusalError("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")
  }

  return { returner: { id: employee.id, departmentId: employee.departmentId }, links }
}

// Marks the links outstanding under the RT-, makes ผู้คืน each component's holder (never its room), and writes one
// component_outstanding line and one snapshot entry per component (spec §8.5, P2-R2, P2-R6, P2-R7).
async function markComponentsOutstanding(
  tx: Prisma.TransactionClient,
  input: { plan: MissingComponentPlan; checkinId: string; userId: string; remark: string | null },
): Promise<{ changes: AssetComponentTransactionSnapshotChangeV1[]; missingComponents: { assetTag: string; name: string }[] }> {
  const { returner, links } = input.plan
  if (!returner || links.length === 0) return { changes: [], missingComponents: [] }

  const linkIds = links.map((link) => link.id)
  const marked = await tx.assetComponent.updateMany({
    where: { id: { in: linkIds }, status: "installed", removedAt: null },
    data: { status: COMPONENT_LINK_OUTSTANDING, referenceType: "checkin", referenceId: input.checkinId, updatedBy: input.userId },
  })
  if (marked.count !== linkIds.length) {
    throw new AssetOperationConflictError(
      "ASSET_CHANGED_DURING_OPERATION",
      "Asset status changed while this request was being saved. Reload the asset and try again.",
    )
  }
  const reread = await tx.assetComponent.findMany({
    where: { id: { in: linkIds } },
    select: { id: true, status: true, updatedAt: true },
  })
  const rereadById = new Map(reread.map((link) => [link.id, link]))

  // Each component's first link (in plan order) is its snapshot link (GP X1).
  const snapshotLinks = new Map<string, MissingComponentLink>()
  for (const link of links) if (!snapshotLinks.has(link.componentAssetId)) snapshotLinks.set(link.componentAssetId, link)

  const changes: AssetComponentTransactionSnapshotChangeV1[] = []
  for (const link of snapshotLinks.values()) {
    const component = link.componentAsset
    const custody = getOutstandingComponentCustody({
      ownership: normalizeAssetOwnershipType(component.ownershipType),
      custodianId: component.custodianId,
      departmentId: component.departmentId,
      returner,
    })
    // Always written, even when nothing changes, so the after entry gets its assetUpdatedAt. The row was already claimed
    // before the plan read, which is what makes another save of the component wait. The room is not changed (spec §8.5).
    const updated = await tx.asset.update({
      where: { id: link.componentAssetId },
      data: { custodianId: custody.custodianId, departmentId: custody.departmentId, updatedBy: input.userId },
      select: { updatedAt: true, statusId: true, conditionId: true, branchId: true, currentLocationId: true, custodianId: true, departmentId: true },
    })
    await tx.assetMovement.create({
      data: {
        assetId: link.componentAssetId,
        movementType: "component_outstanding",
        fromValue: JSON.stringify({ custodianId: component.custodianId, departmentId: component.departmentId }),
        toValue: JSON.stringify({ custodianId: updated.custodianId, departmentId: updated.departmentId }),
        reason: "Not returned with its parent asset",
        referenceType: "checkin",
        referenceId: input.checkinId,
        performedBy: input.userId,
        remark: input.remark,
      },
    })
    const markedLink = rereadById.get(link.id)
    if (!markedLink) {
      throw new AssetOperationConflictError(
        "ASSET_CHANGED_DURING_OPERATION",
        "Asset status changed while this request was being saved. Reload the asset and try again.",
      )
    }
    changes.push({
      // `|| null`: an empty reference reads as none, which the snapshot validator accepts.
      before: createComponentLinkTransactionSnapshot(link, component, { referenceType: link.referenceType || null, referenceId: link.referenceId || null }),
      after: createComponentLinkTransactionSnapshot({ ...link, status: markedLink.status, updatedAt: markedLink.updatedAt }, updated),
    })
  }

  const missingComponents = Array.from(snapshotLinks.values(), (link) => ({ assetTag: link.componentAsset.assetTag, name: link.componentAsset.name }))
    .sort((left, right) => left.assetTag.localeCompare(right.assetTag))
  return { changes, missingComponents }
}

async function readActiveCheckinLocation(db: Pick<Prisma.TransactionClient, "location">, locationId: string) {
  return db.location.findFirst({ where: { id: locationId, isActive: true }, select: { id: true } })
}

class CheckinLocationInactiveError extends Error {
  constructor() {
    super("ASSET_CHECKIN_LOCATION_INACTIVE")
    this.name = "CheckinLocationInactiveError"
  }
}

function locationInactiveResponse() {
  return NextResponse.json(
    {
      code: "ASSET_CHECKIN_LOCATION_INACTIVE",
      error: "ASSET_CHECKIN_LOCATION_INACTIVE",
      fieldErrors: { nextLocationId: "checkinLocationInactive" },
    },
    { status: 409 },
  )
}

function returnDateResponse(code: CheckinReturnDateErrorCode) {
  return NextResponse.json({ code, error: code, fieldErrors: { returnDate: CHECKIN_RETURN_DATE_ERROR_KEYS[code] } }, { status: 400 })
}

function reporterRequiredResponse() {
  return NextResponse.json({ code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }, { status: 400 })
}

type CheckinEvidenceFiles = {
  photos: Array<{ file: File; label: string | null }>
  returnSignature: File | null
  receiveSignature: File | null
}

// Reads and validates the request; saves nothing (the files are saved once the cheap checks have passed, P2-R15).
async function readCheckinRequest(request: NextRequest): Promise<{ input: AssetCheckinInput; evidence: CheckinEvidenceFiles }> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: assetCheckinSchema.parse(await request.json()),
      evidence: { photos: [], returnSignature: null, receiveSignature: null },
    }
  }

  const formData = await request.formData()
  const photoAfterFiles = [
    ...optionalFormFiles(formData, "photoAfterFiles"),
    ...optionalFormFiles(formData, "photoAfter"),
  ]
  const photoLabels = parseStringList(optionalFormText(formData, "photoAfterLabels"))

  return {
    input: assetCheckinSchema.parse({
      checkoutId: requiredFormText(formData, "checkoutId"),
      returnDate: requiredFormText(formData, "returnDate"),
      returnByEmployeeId: optionalFormText(formData, "returnByEmployeeId"),
      returnBy: requiredFormText(formData, "returnBy"),
      receiveByEmployeeId: optionalFormText(formData, "receiveByEmployeeId"),
      receiveBy: requiredFormText(formData, "receiveBy"),
      conditionAfter: requiredFormText(formData, "conditionAfter"),
      missingAccessories: optionalFormText(formData, "missingAccessories"),
      damageNote: optionalFormText(formData, "damageNote"),
      nextStatusId: requiredFormText(formData, "nextStatusId"),
      nextLocationId: requiredFormText(formData, "nextLocationId"),
      remark: optionalFormText(formData, "remark"),
      maintenanceReportedById: optionalFormText(formData, "maintenanceReportedById"),
      maintenanceProblem: optionalFormText(formData, "maintenanceProblem"),
      // The raw list: a file or a blank value is refused by the schema, never dropped (P2-R1).
      missingComponentIds: formData.getAll("missingComponentIds"),
    }),
    evidence: {
      photos: photoAfterFiles.map((file, index) => ({ file, label: photoLabels[index] ?? null })),
      returnSignature: optionalFormFile(formData, "returnSignatureFile"),
      receiveSignature: optionalFormFile(formData, "receiveSignatureFile"),
    },
  }
}

async function saveCheckinEvidence(evidence: CheckinEvidenceFiles): Promise<{
  photosAfter: EvidenceWithLabel[]
  returnSignature: SavedOperationEvidence | null
  receiveSignature: SavedOperationEvidence | null
}> {
  const [photosAfter, returnSignature, receiveSignature] = await Promise.all([
    Promise.all(evidence.photos.map(async (photo) => ({ file: await saveOperationEvidenceFile(photo.file, "checkin"), label: photo.label }))),
    evidence.returnSignature ? saveOperationEvidenceFile(evidence.returnSignature, "checkin") : Promise.resolve(null),
    evidence.receiveSignature ? saveOperationEvidenceFile(evidence.receiveSignature, "checkin") : Promise.resolve(null),
  ])
  return { photosAfter, returnSignature, receiveSignature }
}

function optionalFormFiles(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => {
    return value instanceof File && value.size > 0 && value.name.trim().length > 0
  })
}

function parseStringList(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function buildMaintenanceProblem(
  input: {
    damageNote?: string | null
    missingAccessories?: string | null
    remark?: string | null
  },
  missingComponents: { assetTag: string; name: string }[],
) {
  return [
    input.damageNote ? `ความเสียหาย: ${input.damageNote}` : null,
    input.missingAccessories ? `อุปกรณ์ไม่ครบ: ${input.missingAccessories}` : null,
    missingComponents.length > 0
      ? `ส่วนควบที่ยังไม่ได้คืน: ${missingComponents.map((component) => `${component.assetTag} - ${component.name}`).join(", ")}`
      : null,
    input.remark ? `หมายเหตุตอนรับคืน: ${input.remark}` : null,
  ].filter(Boolean).join("\n") || "ส่งซ่อมตอนรับคืน"
}
