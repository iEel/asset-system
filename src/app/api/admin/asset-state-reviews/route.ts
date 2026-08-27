import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { listAssetStateReviews } from "@/lib/asset-state-review-service"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { assetStateReviewListQuerySchema } from "@/lib/validations/asset-state-review"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "view")

    const params = request.nextUrl.searchParams
    const query = assetStateReviewListQuerySchema.parse({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
      reviewStatus: params.get("reviewStatus") ?? undefined,
      severity: params.get("severity") ?? undefined,
      issueType: params.get("issueType") ?? undefined,
      statusId: params.get("statusId") ?? undefined,
      conditionId: params.get("conditionId") ?? undefined,
      companyId: params.get("companyId") ?? undefined,
      branchId: params.get("branchId") ?? undefined,
    })

    return NextResponse.json(await listAssetStateReviews(prisma, query))
  } catch (error) {
    return errorResponse(error, 400)
  }
}
