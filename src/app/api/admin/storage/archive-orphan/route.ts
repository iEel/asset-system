import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import {
  archiveOrphanUploadFile,
  assertStorageRelativePath,
  getStoragePathVariants,
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const body = await request.json().catch(() => ({}))
    const input = body && typeof body === "object" ? body as { relativePath?: unknown } : {}
    const relativePath = assertStorageRelativePath(typeof input.relativePath === "string" ? input.relativePath : "")
    const pathVariants = getStoragePathVariants(relativePath)

    const activeAttachment = await prisma.attachment.findFirst({
      where: {
        isActive: true,
        filePath: { in: pathVariants },
      },
      select: {
        id: true,
        module: true,
        referenceId: true,
      },
    })

    if (activeAttachment) {
      return NextResponse.json(
        {
          error: "File is still attached to an active record",
          attachmentId: activeAttachment.id,
          module: activeAttachment.module,
          referenceId: activeAttachment.referenceId,
        },
        { status: 409 }
      )
    }

    const archived = await archiveOrphanUploadFile({
      uploadDir: getUploadRoot(),
      relativePath,
    })

    await logAudit({
      userId: user.id,
      action: "storage_archive_orphan_file",
      module: "storage",
      recordId: archived.sourceRelativePath.slice(0, 100),
      oldValue: { relativePath: archived.sourceRelativePath },
      newValue: { archiveRelativePath: archived.archiveRelativePath },
      ipAddress: getRequestIpAddress(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json({
      success: true,
      sourceRelativePath: archived.sourceRelativePath,
      archiveRelativePath: archived.archiveRelativePath,
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function getRequestIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwardedFor || request.headers.get("x-real-ip") || undefined
}
