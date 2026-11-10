import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { adjustConsumable } from "@/lib/consumable-service"
import { consumableAdjustSchema } from "@/lib/validations/consumables"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): adjust.
// Body { itemId, counted 0–99999, reason }. 200 { onHand, movementId }; a count equal to onHand is refused on counted.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "edit")

    const input = consumableAdjustSchema.parse(await request.json())
    return NextResponse.json(await adjustConsumable(input, user.id))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
