import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { searchAssetScan, type AssetScanSearchDb } from "@/lib/asset-scan-search"
import { parseAssetScanSearch } from "@/lib/asset-scan-search-rules"

// The scan page's search (group 4 plan 4, spec §14): asset:view, as the page, checked before the query is read. Each
// card's next actions follow the user's own permissions, as the register's rows.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")
    const input = parseAssetScanSearch(new URL(request.url).searchParams)
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 })
    const can = {
      assetEdit: hasPermission(user, "asset", "edit"),
      maintenanceCreate: hasPermission(user, "maintenance", "create"),
      maintenanceView: hasPermission(user, "maintenance", "view"),
      disposalView: hasPermission(user, "disposal", "view"),
    }
    const data = await withPerformanceTiming(
      "asset-scan-search",
      () => searchAssetScan(prisma as unknown as AssetScanSearchDb, input, can),
      { locale: input.locale },
    )
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}
