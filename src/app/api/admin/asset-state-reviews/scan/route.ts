import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { scanAssetStateReviews } from "@/lib/asset-state-review-service"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    return NextResponse.json(await scanAssetStateReviews(prisma, user.id))
  } catch (error) {
    return errorResponse(error, 400)
  }
}
