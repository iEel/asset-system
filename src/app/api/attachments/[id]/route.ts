import { readFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assertSafeUploadPath } from "@/lib/uploads"

export const runtime = "nodejs"

type AttachmentRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: AttachmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const { id } = await context.params
    const attachment = await prisma.attachment.findFirst({
      where: { id, isActive: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    const safePath = assertSafeUploadPath(attachment.filePath)
    const file = await readFile(safePath)
    const encodedName = encodeURIComponent(attachment.originalName)

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": attachment.fileType,
        "Content-Length": String(attachment.fileSize),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: AttachmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const existing = await prisma.attachment.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    const attachment = await prisma.attachment.update({
      where: { id },
      data: { isActive: false },
    })

    await logAudit({
      userId: user.id,
      action: "delete_attachment",
      module: "asset",
      recordId: existing.referenceId,
      oldValue: existing,
      newValue: attachment,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
