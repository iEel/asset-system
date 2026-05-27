import { readFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assertSafeUploadPath } from "@/lib/uploads"

export const runtime = "nodejs"

type AttachmentRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: AttachmentRouteContext) {
  try {
    const user = await requireAuth()

    const { id } = await context.params
    const attachment = await prisma.attachment.findFirst({
      where: { id, isActive: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }
    requireAttachmentPermission(user, attachment.module, "view")

    const safePath = assertSafeUploadPath(attachment.filePath)
    const file = await readFile(safePath)
    const encodedName = encodeURIComponent(attachment.originalName)
    const disposition = request.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment"

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": attachment.fileType,
        "Content-Length": String(attachment.fileSize),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: AttachmentRouteContext) {
  try {
    const user = await requireAuth()

    const { id } = await context.params
    const existing = await prisma.attachment.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }
    requireAttachmentPermission(user, existing.module, "edit")

    const attachment = await prisma.attachment.update({
      where: { id },
      data: { isActive: false },
    })

    await logAudit({
      userId: user.id,
      action: "delete_attachment",
      module: existing.module,
      recordId: existing.referenceId,
      oldValue: existing,
      newValue: attachment,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

function requireAttachmentPermission(
  user: Awaited<ReturnType<typeof requireAuth>>,
  module: string,
  action: "view" | "edit"
) {
  const permissionModule =
    module === "maintenance"
      ? "maintenance"
      : module === "audit_finding"
        ? "audit"
        : module === "disposal"
          ? "disposal"
        : module === "asset_model"
          ? "brand"
          : "asset"
  if (!hasPermission(user, permissionModule, action)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}
