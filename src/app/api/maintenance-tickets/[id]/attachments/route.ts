import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { buildMaintenanceAttachmentName, normalizeMaintenanceAttachmentType } from "@/lib/maintenance-attachments"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

type MaintenanceAttachmentContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: MaintenanceAttachmentContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")

    const { id } = await context.params
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id, isActive: true },
      select: { id: true, repairNo: true, assetId: true, repairStatus: true },
    })
    if (!ticket) return NextResponse.json({ error: "Maintenance ticket not found" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file")
    const attachmentType = normalizeMaintenanceAttachmentType(formData.get("attachmentType"))
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    validateUploadFile(file)
    await validateUploadFileContent(file)

    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const safeOriginalName = sanitizeFileName(file.name)
    const extension = path.extname(safeOriginalName)
    const fileName = `${randomUUID()}${extension}`
    const uploadDir = path.join(getUploadRoot(), "maintenance", year, month)
    const filePath = path.join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, bytes)
    await scanWrittenUploadFile(filePath)

    const attachment = await prisma.attachment.create({
      data: {
        assetId: ticket.assetId,
        module: "maintenance",
        referenceId: ticket.id,
        fileName,
        originalName: buildMaintenanceAttachmentName(attachmentType, safeOriginalName),
        fileType: file.type,
        fileSize: file.size,
        filePath,
        uploadedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "upload",
      module: "maintenance",
      recordId: ticket.id,
      newValue: {
        attachmentId: attachment.id,
        originalName: attachment.originalName,
        attachmentType,
        fileSize: attachment.fileSize,
        postCloseAddendum: ticket.repairStatus === "closed",
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
