import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

type DisposalBatchAttachmentContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: DisposalBatchAttachmentContext) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user, "disposal", "create") && !hasPermission(user, "disposal", "edit") && !hasPermission(user, "disposal", "approve")) {
      throw new Error("Forbidden: insufficient permissions")
    }

    const { id } = await context.params
    const batch = await prisma.disposalBatch.findFirst({ where: { id, isActive: true }, select: { id: true } })
    if (!batch) return NextResponse.json({ code: "DISPOSAL_BATCH_NOT_FOUND", error: "Disposal batch not found" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 })
    validateUploadFile(file)
    await validateUploadFileContent(file)

    const now = new Date()
    const safeOriginalName = sanitizeFileName(file.name)
    const fileName = `${randomUUID()}${path.extname(safeOriginalName)}`
    const uploadDir = path.join(getUploadRoot(), "disposal", "batches", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"))
    const filePath = path.join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, bytes)
    await scanWrittenUploadFile(filePath)

    const attachment = await prisma.attachment.create({
      data: {
        module: "disposal_batch",
        referenceId: batch.id,
        fileName,
        originalName: safeOriginalName,
        fileType: file.type,
        fileSize: file.size,
        filePath,
        uploadedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "upload",
      module: "disposal",
      recordId: batch.id,
      newValue: { attachmentId: attachment.id, originalName: attachment.originalName, fileSize: attachment.fileSize, source: "batch" },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
