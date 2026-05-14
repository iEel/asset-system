import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckinSchema } from "@/lib/validations/asset-operations"
import { isValidCheckinReturnStatus } from "@/lib/asset-status-flow"
import { generateCheckinDocumentNo } from "@/lib/operation-document-number"
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
    const { input, photosAfter, returnSignature, receiveSignature } = await parseCheckinRequest(request)
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const checkout = await prisma.assetCheckout.findFirst({
      where: { id: input.checkoutId, assetId: id, isReturned: false },
    })
    if (!checkout) {
      return NextResponse.json({ error: "Active checkout not found" }, { status: 404 })
    }
    if (!(await isValidCheckinReturnStatus(input.nextStatusId))) {
      return NextResponse.json({ error: "Invalid return status for check-in" }, { status: 400 })
    }
    const returnStatus = await prisma.assetStatus.findUnique({
      where: { id: input.nextStatusId },
      select: { id: true, name: true },
    })
    if (input.createMaintenance) {
      requirePermission(user, "maintenance", "create")
      if (returnStatus?.name !== "Pending Repair") {
        return NextResponse.json({ error: "Maintenance ticket can be created only when the next status is Pending Repair" }, { status: 400 })
      }
    }

    const checkin = await prisma.$transaction(async (tx) => {
      const documentNo = await generateCheckinDocumentNo(tx, input.returnDate)
      const record = await tx.assetCheckin.create({
        data: {
          documentNo,
          assetId: id,
          checkoutId: checkout.id,
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

      await tx.assetCheckout.update({
        where: { id: checkout.id },
        data: { isReturned: true },
      })

      await tx.asset.update({
        where: { id },
        data: {
          statusId: input.nextStatusId,
          conditionId: input.conditionAfter,
          currentLocationId: input.nextLocationId,
          custodianId: null,
          updatedBy: user.id,
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

      if (input.createMaintenance) {
        const repairNo = await generateRepairNo(tx)
        const problem = input.maintenanceProblem ?? buildMaintenanceProblem(input)
        const ticket = await tx.maintenanceTicket.create({
          data: {
            repairNo,
            assetId: id,
            problem,
            reportedById: input.maintenanceReportedById!,
            reportedDate: input.returnDate,
            repairType: "internal",
            createdBy: user.id,
            updatedBy: user.id,
          },
          select: { id: true },
        })

        await tx.assetMovement.create({
          data: {
            assetId: id,
            movementType: "maintenance_create",
            fromValue: input.nextStatusId,
            toValue: input.nextStatusId,
            reason: problem,
            referenceType: "maintenance",
            referenceId: ticket.id,
            performedBy: user.id,
            remark: "created_from_checkin",
          },
        })
      }

      return record
    })

    await logAudit({
      userId: user.id,
      action: "checkin",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkinId: checkin.id },
    })

    return NextResponse.json(checkin, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function parseCheckinRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: assetCheckinSchema.parse(await request.json()),
      photosAfter: [],
      returnSignature: null,
      receiveSignature: null,
    }
  }

  const formData = await request.formData()
  const photoAfterFiles = [
    ...optionalFormFiles(formData, "photoAfterFiles"),
    ...optionalFormFiles(formData, "photoAfter"),
  ]
  const photoLabels = parseStringList(optionalFormText(formData, "photoAfterLabels"))
  const returnSignatureFile = optionalFormFile(formData, "returnSignatureFile")
  const receiveSignatureFile = optionalFormFile(formData, "receiveSignatureFile")
  const [savedPhotos, returnSignature, receiveSignature] = await Promise.all([
    Promise.all(photoAfterFiles.map((file) => saveOperationEvidenceFile(file, "checkin"))),
    returnSignatureFile ? saveOperationEvidenceFile(returnSignatureFile, "checkin") : Promise.resolve(null),
    receiveSignatureFile ? saveOperationEvidenceFile(receiveSignatureFile, "checkin") : Promise.resolve(null),
  ])

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
      createMaintenance: requiredFormText(formData, "createMaintenance"),
      maintenanceReportedById: optionalFormText(formData, "maintenanceReportedById"),
      maintenanceProblem: optionalFormText(formData, "maintenanceProblem"),
    }),
    photosAfter: savedPhotos.map((file, index) => ({ file, label: photoLabels[index] ?? null })) satisfies EvidenceWithLabel[],
    returnSignature,
    receiveSignature,
  }
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
    input.damageNote ? `Damage: ${input.damageNote}` : null,
    input.missingAccessories ? `Missing accessories: ${input.missingAccessories}` : null,
    input.remark ? `Check-in remark: ${input.remark}` : null,
  ].filter(Boolean).join("\n") || "Created from asset check-in"
}

async function generateRepairNo(tx: Prisma.TransactionClient) {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await tx.maintenanceTicket.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}
