import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getAuditRoundSelection } from "@/lib/audit-round"
import { auditRoundSchema } from "@/lib/validations/audit"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "create")

    const payload = await request.json()
    const input = auditRoundSchema.parse({
      ...payload,
      name: typeof payload?.name === "string" && payload.name.trim() ? payload.name : "Audit preview",
    })
    const selection = await getAuditRoundSelection(input)

    return NextResponse.json({
      matchedAssets: selection.matchedAssets,
      sampledAssets: selection.selectedAssets.length,
      componentItems: selection.componentItems,
      sampleRate: input.sampleRate,
      riskPreset: input.riskPreset,
      previewAssets: selection.selectedItems.slice(0, 8).map((item) => ({
        id: item.asset.id,
        assetTag: item.asset.assetTag,
        name: item.asset.name,
        includedVia: item.includedVia,
        parentAssetTag: item.parentAssetTag ?? null,
      })),
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
