import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { appendPhotoEvidence } from "@/lib/audit-round-photos-rules"
import { withDeadlockRetry } from "@/lib/transaction-retry"
import { createUploadCleanup, scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

type AssetAttachmentRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AssetAttachmentRouteContext) {
  // A refused or rolled-back save removes the file it wrote (group 3 follow-up C).
  const uploads = createUploadCleanup()
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      select: { id: true, assetTag: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const photoLabel = typeof formData.get("photoLabel") === "string" ? String(formData.get("photoLabel")).trim() : ""
    const documentType = typeof formData.get("documentType") === "string" ? String(formData.get("documentType")).trim() : ""
    const documentNumber = typeof formData.get("documentNumber") === "string" ? String(formData.get("documentNumber")).trim() : ""
    // Audit photos (spec 2026-11-10 §2): the scan page names the audit item a photo was taken for. Optional; a bad id
    // never refuses the upload, it only answers auditLinked: false.
    const auditItemId = typeof formData.get("auditItemId") === "string" ? String(formData.get("auditItemId")).trim() : ""
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    validateUploadFile(file)
    await validateUploadFileContent(file)

    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const safeOriginalName = sanitizeFileName(file.name)
    const documentLabel = [documentType && sanitizeFileName(documentType), documentNumber && sanitizeFileName(documentNumber)]
      .filter(Boolean)
      .join(" ")
    const safePhotoLabel = sanitizeAttachmentLabel(photoLabel)
    const labeledOriginalName = documentLabel
      ? `${documentLabel} - ${safeOriginalName}`
      : photoLabel && file.type.startsWith("image/")
        ? `${safePhotoLabel} - ${safeOriginalName}`
        : safeOriginalName
    const extension = path.extname(safeOriginalName)
    const fileName = `${randomUUID()}${extension}`
    const attachmentModule = documentType ? "asset_purchase" : "asset"
    const uploadDir = path.join(getUploadRoot(), documentType ? "asset-purchase" : "asset", year, month)
    const filePath = path.join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDir, { recursive: true })
    uploads.track(filePath)
    await writeFile(filePath, bytes)
    await scanWrittenUploadFile(filePath)

    const attachment = await prisma.attachment.create({
      data: {
        assetId: asset.id,
        module: attachmentModule,
        referenceId: asset.id,
        fileName,
        originalName: labeledOriginalName,
        fileType: file.type,
        fileSize: file.size,
        filePath,
        uploadedBy: user.id,
      },
    })
    uploads.commit()

    await logAudit({
      userId: user.id,
      action: "upload",
      module: attachmentModule,
      recordId: asset.id,
      newValue: {
        attachmentId: attachment.id,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
        documentType: documentType || null,
        documentNumber: documentNumber || null,
      },
    })

    let auditLinked = false
    if (auditItemId) {
      try {
        auditLinked = await withDeadlockRetry(() => prisma.$transaction(async (tx) => {
          const item = await tx.auditItem.findFirst({
            where: {
              id: auditItemId,
              assetId: asset.id,
              auditRound: { isActive: true, status: { not: "cancelled" } },
            },
            select: { id: true, assetId: true, photoEvidence: true, auditRound: { select: { status: true, isActive: true } } },
          })
          if (!item || item.assetId !== asset.id || !item.auditRound.isActive || item.auditRound.status === "cancelled") return false
          const evidence = appendPhotoEvidence(item.photoEvidence, [attachment.id])
          if (!evidence.linked.includes(attachment.id)) return false
          await tx.auditItem.update({ where: { id: item.id }, data: { photoEvidence: evidence.value } })
          return true
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
      } catch {
        auditLinked = false
      }
    }

    return NextResponse.json({ ...attachment, auditLinked }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  } finally {
    await uploads.discardIfUncommitted()
  }
}

function sanitizeAttachmentLabel(label: string) {
  return label.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}
