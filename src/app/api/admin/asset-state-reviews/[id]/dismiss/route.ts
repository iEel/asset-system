import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { getAssetStateReviewErrorResponse } from "@/lib/asset-state-review-api"
import { dismissAssetStateReview } from "@/lib/asset-state-review-service"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { assetStateReviewDismissSchema } from "@/lib/validations/asset-state-review"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")
    const { id } = await context.params
    const input = assetStateReviewDismissSchema.parse(await request.json())
    return NextResponse.json(await dismissAssetStateReview(prisma, id, input.reason, user.id))
  } catch (error) {
    return getAssetStateReviewErrorResponse(error) ?? errorResponse(error, 400)
  }
}
