import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getAuditRoundCandidateAssets, selectAuditSample } from "@/lib/audit-round"
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
    const candidateAssets = await getAuditRoundCandidateAssets(input)
    const sampledAssets = selectAuditSample(candidateAssets, input.sampleRate)

    return NextResponse.json({
      matchedAssets: candidateAssets.length,
      sampledAssets: sampledAssets.length,
      sampleRate: input.sampleRate,
      riskPreset: input.riskPreset,
      previewAssets: sampledAssets.slice(0, 8).map((asset) => ({
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
      })),
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
