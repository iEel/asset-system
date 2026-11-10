import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { loadAuditRoundPhotos, type AuditRoundPhotoDb } from "@/lib/audit-round-photos-data"

// The round page's photo dialog (audit photos spec 2026-11-10 §5): one item's photos for its round, newest first, read
// when the dialog opens. The round needs audit:view and the asset's photos asset:view. It never writes.

type AuditRoundItemPhotosContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(_request: NextRequest, context: AuditRoundItemPhotosContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "view")
    requirePermission(user, "asset", "view")

    const { id, itemId } = await context.params
    const item = await prisma.auditItem.findFirst({
      where: { id: itemId, auditRoundId: id, auditRound: { isActive: true } },
      select: { assetId: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } },
    })
    if (!item) return NextResponse.json({ error: "Audit item not found" }, { status: 404 })

    // Every photo of the asset gets its round by the one rule (spec §2); only this round's are listed.
    const photos = (await loadAuditRoundPhotos(prisma as unknown as AuditRoundPhotoDb, [item.assetId]))
      .filter((photo) => photo.auditRoundId === id)
      .map((photo) => ({ id: photo.id, originalName: photo.originalName, uploadedAtIso: photo.uploadedAt.toISOString() }))
    return NextResponse.json({ assetTag: item.asset.assetTag, auditNo: item.auditRound.auditNo, photos })
  } catch (error) {
    return errorResponse(error)
  }
}
