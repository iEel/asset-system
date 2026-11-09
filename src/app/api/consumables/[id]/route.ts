import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { deactivateConsumableItem, getConsumableItem, updateConsumableItem } from "@/lib/consumable-service"
import { consumableItemSchema } from "@/lib/validations/consumables"

type ConsumableItemContext = {
  params: Promise<{ id: string }>
}

// A body naming isActive is the deactivation, and only { isActive: false }: it keeps onHand and the history.
const consumableDeactivateSchema = z.object({ isActive: z.literal(false) }).strict()

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): one kind with its recent movements (an inactive kind too: its history stays).
export async function GET(_request: NextRequest, context: ConsumableItemContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "view")

    const { id } = await context.params
    return NextResponse.json(await getConsumableItem(id))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}

// PATCH { name, unit, minQuantity } edits the kind; PATCH { isActive: false } deactivates it.
export async function PATCH(request: NextRequest, context: ConsumableItemContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "edit")

    const { id } = await context.params
    const body: unknown = await request.json()
    if (body && typeof body === "object" && "isActive" in body) {
      consumableDeactivateSchema.parse(body)
      return NextResponse.json(await deactivateConsumableItem(id, user.id))
    }
    const input = consumableItemSchema.parse(body)
    return NextResponse.json(await updateConsumableItem(id, input, user.id))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
