import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { writeAuditLog } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"

type AssetPurchaseDocumentLinkRouteContext = {
  params: Promise<{ id: string; documentId: string }>
}

// Unlinks one purchase document from this asset (group 4 plan 3, spec §9.3; the edit page sends it at บันทึกการแก้ไข,
// P3-R5). asset:edit. Only this asset's link row goes, with its audit entry in the same transaction; the document and its
// attachments stay. A document that is not linked to this asset (another asset's, or none) answers 404.
export async function DELETE(_request: NextRequest, context: AssetPurchaseDocumentLinkRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id, documentId } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const link = await prisma.purchaseDocumentAsset.findUnique({
      where: { purchaseDocumentId_assetId: { purchaseDocumentId: documentId, assetId: asset.id } },
      select: { id: true, purchaseDocument: { select: { documentType: true, documentNo: true } } },
    })

    if (!link) {
      return NextResponse.json({ code: "PURCHASE_DOCUMENT_LINK_NOT_FOUND", error: "Purchase document link not found" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseDocumentAsset.delete({ where: { id: link.id } })
      await writeAuditLog(tx, {
        userId: user.id,
        action: "unlink_purchase_documents",
        module: "asset",
        recordId: asset.id,
        oldValue: {
          purchaseDocumentIds: [documentId],
          documentType: link.purchaseDocument.documentType,
          documentNo: link.purchaseDocument.documentNo,
        },
      })
    })

    return NextResponse.json({ unlinkedId: documentId })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
