import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { optionalFormFile, optionalFormText, type SavedOperationEvidence } from "@/lib/asset-operation-evidence"
import {
  BatchCheckinBlockedError,
  BatchCheckinFieldError,
  batchCheckinTransactionOptions,
  readBatchCheckinPlan,
  writeBatchCheckinInTransaction,
} from "@/lib/batch-checkin-service"
import type { CheckinEvidenceWithLabel } from "@/lib/checkin-write"
import { FieldRefusalError } from "@/lib/field-errors"
import { legacyReturnBackfillRemark } from "@/lib/legacy-checkout-write"
import { optionalFormFiles, saveTrackedEvidenceFiles } from "@/lib/operation-evidence-save"
import { withDeadlockRetry } from "@/lib/transaction-retry"
import { createUploadCleanup } from "@/lib/upload-server"
import { batchCheckinSchema, type BatchCheckinInput } from "@/lib/validations/batch-checkin"

// รับคืนหลายรายการ (group 7 plan 4 Task 2): several machines of one holder in one save, all or nothing. Multipart:
// employeeId, returnDate, returnBy, returnByEmployeeId, receiveBy, receiveByEmployeeId, nextLocationId,
// returnSignatureFile, receiveSignatureFile, items (JSON), and per machine photoAfterFiles[<assetId>].
// 201 { documentNo, checkinIds, firstCheckinId }; 409 { code, error, blocked: [{ assetId, assetTag, code }] }.
export async function POST(request: NextRequest) {
  // A refused or rolled-back save removes the files it saved (group 3 follow-up C).
  const uploads = createUploadCleanup()
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { input, evidence } = await readBatchCheckinRequest(request)
    // Both signatures are required, refused under their fields before anything is read or saved (Review Focus 4).
    const missingSignatures: Record<string, string> = {}
    if (!evidence.returnSignature) missingSignatures.returnSignatureFile = "batchCheckinSignatureRequired"
    if (!evidence.receiveSignature) missingSignatures.receiveSignatureFile = "batchCheckinSignatureRequired"
    if (Object.keys(missingSignatures).length > 0) {
      return NextResponse.json(
        { code: "BATCH_CHECKIN_SIGNATURE_REQUIRED", error: "BATCH_CHECKIN_SIGNATURE_REQUIRED", fieldErrors: missingSignatures },
        { status: 400 },
      )
    }

    const now = new Date()
    const plan = await readBatchCheckinPlan(prisma, input, { now })
    // The backfilled HO-'s status (G7P4-R6), read only when a held asset has no handover.
    const inUseStatusId = plan.items.some((entry) => !entry.checkoutId) ? await getRequiredAssetStatusId("In Use") : null

    // The files are saved only after every check before the transaction has passed (P2-R15); each signature once (G7P4-R5).
    const photoFiles = plan.items.flatMap((entry) => (evidence.photosByAsset.get(entry.asset.id) ?? []).map((file) => ({ assetId: entry.asset.id, file })))
    const saved = await saveTrackedEvidenceFiles([evidence.returnSignature, evidence.receiveSignature, ...photoFiles.map((photo) => photo.file)], "checkin", uploads)
    const photosAfterByAsset = new Map<string, CheckinEvidenceWithLabel[]>()
    photoFiles.forEach((photo, index) => {
      const list = photosAfterByAsset.get(photo.assetId) ?? []
      list.push({ file: saved[index + 2] as SavedOperationEvidence, label: null })
      photosAfterByAsset.set(photo.assetId, list)
    })

    // A deadlock victim was rolled back whole, so it runs again with the same saved files.
    const result = await withDeadlockRetry(() => prisma.$transaction(
      (tx) => writeBatchCheckinInTransaction(tx, plan, {
        returnSignature: saved[0] as SavedOperationEvidence,
        receiveSignature: saved[1] as SavedOperationEvidence,
        photosAfterByAsset,
      }, { user, inUseStatusId, now }),
      batchCheckinTransactionOptions,
    ))
    uploads.commit()

    for (const machine of result.machines) {
      if (machine.backfilledCheckoutId) {
        await logAudit({
          userId: user.id,
          action: "legacy_return_backfill",
          module: "asset",
          recordId: machine.assetId,
          oldValue: machine.asset,
          newValue: {
            checkoutId: machine.backfilledCheckoutId,
            checkoutType: "user",
            handoverMode: "permanent_assignment",
            custodianId: input.employeeId,
            conditionBefore: machine.asset.conditionId,
            source: "legacy_return_backfill",
          },
          remark: legacyReturnBackfillRemark,
        })
      }
      const { componentSync, departmentId, previousDepartmentId, record } = machine.result
      await logAudit({
        userId: user.id,
        action: "checkin",
        module: "asset",
        recordId: machine.assetId,
        oldValue: machine.asset,
        newValue: { ...machine.checkin, checkinId: record.id, documentNo: result.documentNo, componentSync, departmentId, previousDepartmentId },
      })
    }

    const checkinIds = result.machines.map((machine) => machine.result.record.id)
    return NextResponse.json({ documentNo: result.documentNo, checkinIds, firstCheckinId: checkinIds[0] }, { status: 201 })
  } catch (error) {
    if (error instanceof BatchCheckinBlockedError) {
      return NextResponse.json({ code: error.code, error: error.code, blocked: error.blocked }, { status: 409 })
    }
    if (error instanceof BatchCheckinFieldError) {
      return NextResponse.json({ code: error.code, error: error.code, fieldErrors: error.fieldErrors }, { status: error.status })
    }
    if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    return errorResponse(error, 400)
  } finally {
    await uploads.discardIfUncommitted()
  }
}

type BatchCheckinEvidenceFiles = {
  returnSignature: File | null
  receiveSignature: File | null
  photosByAsset: Map<string, File[]>
}

const photoFieldPattern = /^photoAfterFiles\[(.+)\]$/

// Reads and validates the request; saves nothing. A photo sent for a machine that is not in the list is refused.
async function readBatchCheckinRequest(request: NextRequest): Promise<{ input: BatchCheckinInput; evidence: BatchCheckinEvidenceFiles }> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: batchCheckinSchema.parse(await request.json()),
      evidence: { returnSignature: null, receiveSignature: null, photosByAsset: new Map() },
    }
  }

  const formData = await request.formData()
  const input = batchCheckinSchema.parse({
    employeeId: optionalFormText(formData, "employeeId"),
    returnDate: optionalFormText(formData, "returnDate"),
    returnByEmployeeId: optionalFormText(formData, "returnByEmployeeId"),
    returnBy: optionalFormText(formData, "returnBy"),
    receiveByEmployeeId: optionalFormText(formData, "receiveByEmployeeId"),
    receiveBy: optionalFormText(formData, "receiveBy"),
    nextLocationId: optionalFormText(formData, "nextLocationId"),
    items: parseJsonField(optionalFormText(formData, "items")),
  })

  const itemIds = new Set(input.items.map((item) => item.assetId))
  const photosByAsset = new Map<string, File[]>()
  for (const name of new Set(formData.keys())) {
    const assetId = photoFieldPattern.exec(name)?.[1]
    if (!assetId) continue
    const files = optionalFormFiles(formData, name)
    if (files.length === 0) continue
    if (!itemIds.has(assetId)) throw new FieldRefusalError("Invalid request data", { [name]: "invalid" })
    photosByAsset.set(assetId, files)
  }

  return {
    input,
    evidence: {
      returnSignature: optionalFormFile(formData, "returnSignatureFile"),
      receiveSignature: optionalFormFile(formData, "receiveSignatureFile"),
      photosByAsset,
    },
  }
}

// Unparseable JSON reads as absent, so the schema answers "items" under its field instead of a 500.
function parseJsonField(value: string | null): unknown {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
