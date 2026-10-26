import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getAuditRoundOverlap, getAuditRoundSelection } from "@/lib/audit-round"
import { countAuditPreviewCategories } from "@/lib/audit-round-preview-rules"
import { auditRoundPreviewSchema } from "@/lib/validations/audit"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "create")

    // The scope alone (group 2 spec §7, R10): the name and the dates are not read, so the live count never fails on them.
    const input = auditRoundPreviewSchema.parse(await request.json())
    const selection = await getAuditRoundSelection(input)
    const overlap = await getAuditRoundOverlap(selection.selectedAssets.map((asset) => asset.id))

    return NextResponse.json({
      matchedAssets: selection.matchedAssets,
      sampledAssets: selection.selectedAssets.length,
      // "สุ่มได้": the directly sampled assets, without the components they pull in (R9).
      directSampled: selection.selectedAssets.length - selection.componentItems,
      componentItems: selection.componentItems,
      sampleRate: input.sampleRate,
      riskPreset: input.riskPreset,
      categories: countAuditPreviewCategories(selection.selectedAssets),
      overlap,
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
