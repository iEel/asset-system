import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckinSchema, type AssetCheckinInput } from "@/lib/validations/asset-operations"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { readCheckinDepartment } from "@/lib/checkin-department"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, type CheckinReturnDateErrorCode } from "@/lib/checkin-route-rules"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getAssetOperationConditionError } from "@/lib/asset-lifecycle-policy"
import { isValidCheckinReturnStatus } from "@/lib/asset-status-flow"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import {
  CheckinLocationInactiveError,
  CheckinMissingComponentRefusalError,
  MISSING_COMPONENT_REFUSALS,
  readActiveCheckinLocation,
  readMissingComponentPlan,
  writeCheckinInTransaction,
  type CheckinEvidenceWithLabel,
  type MissingComponentRefusalCode,
} from "@/lib/checkin-write"
import {
  optionalFormFile,
  optionalFormText,
  requiredFormText,
  type SavedOperationEvidence,
} from "@/lib/asset-operation-evidence"
import { optionalFormFiles, saveTrackedEvidenceFiles } from "@/lib/operation-evidence-save"
import { createUploadCleanup, type UploadCleanup } from "@/lib/upload-server"

type CheckinContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: CheckinContext) {
  // A refused or rolled-back return removes the files it saved (group 3 follow-up C).
  const uploads = createUploadCleanup()
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
    const { photosAfter, returnSignature, receiveSignature } = await saveCheckinEvidence(evidence, uploads)
    const { record: checkin, componentSync, departmentId, previousDepartmentId, missingComponents, repair } = await prisma.$transaction(async (tx) => {
      return writeCheckinInTransaction(tx, {
        asset,
        checkin: input,
        holderEmployeeId: checkout.custodianId,
        sendsToRepair,
        repairReporterId,
        evidence: { photosAfter, returnSignature, receiveSignature },
      }, { user })
    })
    uploads.commit()

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
  } finally {
    await uploads.discardIfUncommitted()
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

function missingComponentRefusalResponse(code: MissingComponentRefusalCode) {
  const refusal = MISSING_COMPONENT_REFUSALS[code]
  return NextResponse.json({ code, error: code, fieldErrors: { [refusal.field]: refusal.key } }, { status: 400 })
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

// The save itself is shared with the multi-return (operation-evidence-save.ts, group 3 follow-up C).
async function saveCheckinEvidence(evidence: CheckinEvidenceFiles, uploads: UploadCleanup): Promise<{
  photosAfter: CheckinEvidenceWithLabel[]
  returnSignature: SavedOperationEvidence | null
  receiveSignature: SavedOperationEvidence | null
}> {
  const files = [...evidence.photos.map((photo) => photo.file), evidence.returnSignature, evidence.receiveSignature]
  const saved = await saveTrackedEvidenceFiles(files, "checkin", uploads)
  const photoCount = evidence.photos.length
  return {
    photosAfter: evidence.photos.map((photo, index) => ({ file: saved[index] as SavedOperationEvidence, label: photo.label })),
    returnSignature: saved[photoCount],
    receiveSignature: saved[photoCount + 1],
  }
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
