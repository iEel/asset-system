import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getUploadRoot, sanitizeFileName, validateUploadFile } from "@/lib/uploads"

export const runtime = "nodejs"

type AssetAttachmentRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AssetAttachmentRouteContext) {
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
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    validateUploadFile(file)

    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const safeOriginalName = sanitizeFileName(file.name)
    const documentLabel = [documentType && sanitizeFileName(documentType), documentNumber && sanitizeFileName(documentNumber)]
      .filter(Boolean)
      .join(" ")
    const labeledOriginalName = documentLabel
      ? `${documentLabel} - ${safeOriginalName}`
      : photoLabel && file.type.startsWith("image/")
        ? `${sanitizeFileName(photoLabel)} - ${safeOriginalName}`
        : safeOriginalName
    const extension = path.extname(safeOriginalName)
    const fileName = `${randomUUID()}${extension}`
    const attachmentModule = documentType ? "asset_purchase" : "asset"
    const uploadDir = path.join(getUploadRoot(), documentType ? "asset-purchase" : "asset", year, month)
    const filePath = path.join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, bytes)

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

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
