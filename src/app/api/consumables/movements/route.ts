import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { consumableMovementsQuerySchema, listConsumableMovements } from "@/lib/consumable-service"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): the history. GET ?itemId= or ?assetId= (one is required), &page=, 50 a page
// newest first. 200 { movements, total, page, pageSize }.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "view")

    const params = request.nextUrl.searchParams
    const query = consumableMovementsQuerySchema.parse({
      itemId: params.get("itemId") ?? undefined,
      assetId: params.get("assetId") ?? undefined,
      page: params.get("page") ?? undefined,
    })
    return NextResponse.json(await listConsumableMovements(query))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
