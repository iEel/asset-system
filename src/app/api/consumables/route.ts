import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { createConsumableItem, listConsumableItems } from "@/lib/consumable-service"
import { consumableItemSchema } from "@/lib/validations/consumables"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): the kinds. GET ?includeInactive=1 lists the inactive kinds too; each item
// carries stockState (ok | low | out). POST { name, unit?, minQuantity? } creates a kind with onHand 0.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "view")

    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1"
    const items = await listConsumableItems({ includeInactive })
    return NextResponse.json({ items })
  } catch (error) {
    return consumableErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "create")

    const input = consumableItemSchema.parse(await request.json())
    const item = await createConsumableItem(input, user.id)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
