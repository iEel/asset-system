import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import { parseAssetOperationSearch } from "@/lib/asset-operation-search-rules"

// The transaction pages' asset picker (server search spec 6.2): asset:edit, as the four pages and their save routes.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")
    const input = parseAssetOperationSearch(new URL(request.url).searchParams)
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 })
    const data = await withPerformanceTiming(
      "asset-operation-search",
      () => searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, input),
      { mode: input.mode, byId: input.id !== null },
    )
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}
