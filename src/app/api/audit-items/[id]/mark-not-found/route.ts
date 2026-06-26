import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditMarkNotFoundSchema, type AuditMarkNotFoundInput } from "@/lib/validations/audit"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

type MarkNotFoundContext = {
  params: Promise<{ id: string }>
}

type ParsedMarkNotFoundRequest = {
  input: AuditMarkNotFoundInput
  evidenceFile: File | null
}

type PreparedEvidenceUpload = {
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string
}

export async function POST(request: NextRequest, context: MarkNotFoundContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const { input, evidenceFile } = await parseMarkNotFoundRequest(request)
    const item = await prisma.auditItem.findUnique({
      where: { id },
      include: {
        auditRound: { select: { id: true, status: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    })
    if (!item) return NextResponse.json({ error: "Audit item not found" }, { status: 404 })
    if (item.auditRound.status === "closed") {
      return NextResponse.json({ error: "Audit round is closed" }, { status: 400 })
    }
    if (item.auditStatus !== "pending") {
      return NextResponse.json({ error: "Only pending audit items can be marked as not found" }, { status: 400 })
    }

    const existingFinding = await prisma.auditFinding.findFirst({
      where: {
        auditItemId: id,
        findingType: "not_found",
        reviewStatus: "pending",
      },
      select: { id: true },
    })
    const findingId = existingFinding?.id ?? randomUUID()
    const evidenceUpload = evidenceFile ? await prepareAuditFindingEvidenceUpload(evidenceFile) : null

    const { updatedItem, evidenceAttachmentId } = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.auditItem.update({
        where: { id },
        data: {
          auditStatus: "reviewed",
          auditResult: "not_found",
          findingRequired: true,
          reconcileStatus: "pending_investigation",
          remark: input.remark,
        },
      })

      if (!existingFinding) {
        await tx.auditFinding.create({
          data: {
            id: findingId,
            auditRoundId: item.auditRoundId,
            auditItemId: item.id,
            assetId: item.assetId,
            findingType: "not_found",
            expectedValue: JSON.stringify({
              assetTag: item.asset.assetTag,
              assetName: item.asset.name,
              expectedLocationId: item.expectedLocationId,
              expectedCustodianId: item.expectedCustodianId,
              expectedDepartmentId: item.expectedDepartmentId,
              expectedConditionId: item.expectedConditionId,
            }),
            actualValue: null,
            remark: input.remark,
            reportedBy: user.id,
            reviewStatus: "pending",
            actionTaken: "pending_investigation",
          },
        })
      }

      const evidenceAttachment = evidenceUpload
        ? await tx.attachment.create({
            data: {
              assetId: item.assetId,
              module: "audit_finding",
              referenceId: findingId,
              fileName: evidenceUpload.fileName,
              originalName: evidenceUpload.originalName,
              fileType: evidenceUpload.fileType,
              fileSize: evidenceUpload.fileSize,
              filePath: evidenceUpload.filePath,
              uploadedBy: user.id,
            },
          })
        : null

      return { updatedItem, evidenceAttachmentId: evidenceAttachment?.id ?? null }
    })

    await logAudit({
      userId: user.id,
      action: "mark_not_found",
      module: "audit",
      recordId: item.id,
      oldValue: {
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
      },
      newValue: {
        auditStatus: updatedItem.auditStatus,
        auditResult: updatedItem.auditResult,
        reconcileStatus: updatedItem.reconcileStatus,
        findingId,
        evidenceAttachmentId,
      },
      remark: input.remark ?? undefined,
    })

    return NextResponse.json({ ...updatedItem, findingId, evidenceAttachmentId })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function parseMarkNotFoundRequest(request: NextRequest): Promise<ParsedMarkNotFoundRequest> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const remark = formData.get("remark")
    const evidence = formData.get("evidence")
    const evidenceFile = evidence instanceof File && evidence.size > 0 ? evidence : null
    return {
      input: auditMarkNotFoundSchema.parse({ remark: typeof remark === "string" ? remark : "" }),
      evidenceFile,
    }
  }

  return { input: auditMarkNotFoundSchema.parse(await request.json()), evidenceFile: null }
}

async function prepareAuditFindingEvidenceUpload(evidenceFile: File): Promise<PreparedEvidenceUpload> {
  validateUploadFile(evidenceFile)
  await validateUploadFileContent(evidenceFile)

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const safeOriginalName = sanitizeFileName(evidenceFile.name)
  const extension = path.extname(safeOriginalName)
  const fileName = randomUUID() + extension
  const uploadDir = path.join(getUploadRoot(), "audit-findings", year, month)
  const filePath = path.join(uploadDir, fileName)
  const bytes = Buffer.from(await evidenceFile.arrayBuffer())

  await mkdir(uploadDir, { recursive: true })
  await writeFile(filePath, bytes)
  await scanWrittenUploadFile(filePath)

  return {
    fileName,
    originalName: safeOriginalName,
    fileType: evidenceFile.type,
    fileSize: evidenceFile.size,
    filePath,
  }
}
