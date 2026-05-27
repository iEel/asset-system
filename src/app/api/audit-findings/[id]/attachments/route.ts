import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

type AuditFindingAttachmentContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AuditFindingAttachmentContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const finding = await prisma.auditFinding.findUnique({
      where: { id },
      select: { id: true, assetId: true },
    })
    if (!finding) return NextResponse.json({ error: "Audit finding not found" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file")
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
    const uploadDir = path.join(getUploadRoot(), "audit-findings", year, month)
    const filePath = path.join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, bytes)
    await scanWrittenUploadFile(filePath)

    const attachment = await prisma.attachment.create({
      data: {
        assetId: finding.assetId,
        module: "audit_finding",
        referenceId: finding.id,
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
      module: "audit",
      recordId: finding.id,
      newValue: {
        attachmentId: attachment.id,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
