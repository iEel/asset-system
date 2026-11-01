import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { readBulkMoveListPage, type BulkMoveListDb } from "@/lib/bulk-move-list"
import { parseBulkMoveListQuery } from "@/lib/bulk-move-list-rules"

// The bulk-move table's pages (group 3 spec §10.3; plan 4 P4-R11, P4-R12): asset:edit, as the page and the bulk-move save.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")
    const input = parseBulkMoveListQuery(new URL(request.url).searchParams)
    if (!input) return NextResponse.json({ error: "Invalid list" }, { status: 400 })
    const data = await withPerformanceTiming(
      "bulk-move-list",
      () => readBulkMoveListPage(prisma as unknown as BulkMoveListDb, input),
      { page: input.page, text: input.q !== "", room: input.locationId !== null, category: input.categoryId !== null },
    )
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}
