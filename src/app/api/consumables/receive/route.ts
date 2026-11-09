import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { receiveConsumable } from "@/lib/consumable-service"
import { consumableReceiveSchema } from "@/lib/validations/consumables"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): receive.
// Body { itemId, quantity 1–9999, receivedDate yyyy-mm-dd (Bangkok, not after today), note? }. 200 { onHand, movementId }.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "create")

    const input = consumableReceiveSchema.parse(await request.json())
    return NextResponse.json(await receiveConsumable(input, user.id))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
