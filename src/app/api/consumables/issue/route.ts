import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { consumableErrorResponse } from "@/lib/consumable-route-errors"
import { issueConsumable } from "@/lib/consumable-service"
import { consumableIssueSchema } from "@/lib/validations/consumables"

// ของใช้สิ้นเปลือง (consumables plan 1 task 3): issue.
// Body { itemId, quantity 1–9999, assetId, note? }. 200 { onHand, movementId };
// 409 { code: "CONSUMABLE_SHORT", error, onHand, unit } when the stock is short.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "consumable", "create")

    const input = consumableIssueSchema.parse(await request.json())
    return NextResponse.json(await issueConsumable(input, user.id))
  } catch (error) {
    return consumableErrorResponse(error)
  }
}
