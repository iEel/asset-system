import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { linkPurchaseDocumentsToAsset } from "@/lib/purchase-documents"
import { purchaseDocumentLinkSchema } from "@/lib/validations/purchase-document"

type AssetPurchaseDocumentsRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AssetPurchaseDocumentsRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const input = purchaseDocumentLinkSchema.parse(await request.json())
    const linkedIds = await linkPurchaseDocumentsToAsset({
      assetId: asset.id,
      purchaseDocumentIds: input.purchaseDocumentIds,
      userId: user.id,
    })

    if (linkedIds.length > 0) {
      await logAudit({
        userId: user.id,
        action: "link_purchase_documents",
        module: "asset",
        recordId: asset.id,
        newValue: { purchaseDocumentIds: linkedIds },
      })
    }

    return NextResponse.json({ linkedIds })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
