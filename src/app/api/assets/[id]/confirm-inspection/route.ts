import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import {
  ASSET_CONFIRM_INSPECTION_CHANGED_MESSAGE,
  AssetConfirmInspectionChangedError,
  confirmAssetInspection,
} from "@/lib/asset-confirm-inspection-service"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { isPrismaWriteConflict } from "@/lib/disposal-execution-service"
import { assetConfirmInspectionSchema } from "@/lib/validations/asset-confirm-inspection"

type ConfirmInspectionContext = {
  params: Promise<{ id: string }>
}

// ยืนยันผลตรวจ plan 5 (agreed 2026-10-28): releases one asset stuck "Under Inspection" that is in no audit round, with its
// status, holder and location in one step. Body { statusName: "Ready" | "In Use", custodianId: string | null, locationId,
// reason }. With an open clear handover the body's statusName is ignored, except that Ready is refused: the server writes
// the handover rule's target (In Use for a permanent handover, Checked Out for a temporary loan), and the holder and
// location must stay as they are. An unclear handover is refused.
// 200 { assetId, statusName, custodianId, currentLocationId, departmentId };
// 400 { error, fieldErrors } (not Under Inspection, in a round, the handover, a holder, an inactive employee or location);
// 409 { code: "ASSET_INSPECTION_CHANGED", error } when the asset changed meanwhile.
export async function POST(request: NextRequest, context: ConfirmInspectionContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetConfirmInspectionSchema.parse(await request.json())

    const asset = await prisma.asset.findFirst({ where: { id, isActive: true }, select: { id: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const result = await confirmAssetInspection({ ...input, assetId: asset.id, userId: user.id })
    return NextResponse.json(result)
  } catch (error) {
    // The conditional update found the asset no longer Under Inspection, or SQL Server ended one of two serializable
    // writers (Prisma P2034): reload and try again.
    if (error instanceof AssetConfirmInspectionChangedError || isPrismaWriteConflict(error)) {
      return NextResponse.json({ code: "ASSET_INSPECTION_CHANGED", error: ASSET_CONFIRM_INSPECTION_CHANGED_MESSAGE }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}
