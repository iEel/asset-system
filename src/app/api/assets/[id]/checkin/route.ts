import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckinSchema, type AssetCheckinInput } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { getCheckinNextDepartmentId } from "@/lib/asset-department-rule"
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
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
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

    // The files are saved only after every cheap check has passed (P2-R15).
    const { photosAfter, returnSignature, receiveSignature } = await saveCheckinEvidence(evidence)
    const { record: checkin, componentSync, departmentId, previousDepartmentId } = await prisma.$transaction(async (tx) => {
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

      if (createsRepair && repairReporterId) {
        const openRecords = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })
        if (openRecords === 0) {
          const problem = input.maintenanceProblem ?? buildMaintenanceProblem(input)
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
            select: { id: true },
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
        }
      }

      const beforeSnapshot = createAssetTransactionSnapshot({
        asset: beforeAsset,
        checkout: { id: activeCheckout.id, isReturned: false },
        components: componentSync.componentSnapshots.map((change) => change.before),
      })
      const afterSnapshot = createAssetTransactionSnapshot({
        asset: afterAsset,
        checkout: returnedCheckout,
        components: componentSync.componentSnapshots.map((change) => change.after),
      })
      const finalizedRecord = await tx.assetCheckin.update({
        where: { id: record.id },
        data: {
          beforeSnapshotJson: serializeAssetTransactionSnapshot(beforeSnapshot),
          afterSnapshotJson: serializeAssetTransactionSnapshot(afterSnapshot),
          componentSnapshotJson: serializeAssetComponentTransactionSnapshots(componentSync.componentSnapshots),
        },
      })
      const componentSyncSummary = {
        updated: componentSync.updated,
        skipped: componentSync.skipped,
        movements: componentSync.movements,
      }

      return { record: finalizedRecord, componentSync: componentSyncSummary, departmentId: nextDepartmentId, previousDepartmentId: beforeAsset.departmentId }
    })

    await logAudit({
      userId: user.id,
      action: "checkin",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkinId: checkin.id, componentSync, departmentId, previousDepartmentId },
    })

    return NextResponse.json(checkin, { status: 201 })
  } catch (error) {
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

function buildMaintenanceProblem(input: {
  damageNote?: string | null
  missingAccessories?: string | null
  remark?: string | null
}) {
  return [
    input.damageNote ? `ความเสียหาย: ${input.damageNote}` : null,
    input.missingAccessories ? `อุปกรณ์ไม่ครบ: ${input.missingAccessories}` : null,
    input.remark ? `หมายเหตุตอนรับคืน: ${input.remark}` : null,
  ].filter(Boolean).join("\n") || "ส่งซ่อมตอนรับคืน"
}
