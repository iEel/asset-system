// ของใช้สิ้นเปลือง (consumables plan 1 task 3): the consumables routes' error mapping. The short 409 carries onHand and
// unit for the UI's count; SQL Server ending one of two serializable writers (Prisma P2034) asks for a reload.
import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import {
  CONSUMABLE_CHANGED_MESSAGE,
  ConsumableNotFoundError,
  ConsumableShortError,
  isConsumableWriteConflict,
} from "@/lib/consumable-service"

export function consumableErrorResponse(error: unknown) {
  if (error instanceof ConsumableShortError) {
    return NextResponse.json({ error: error.message, code: "CONSUMABLE_SHORT", onHand: error.onHand, unit: error.unit }, { status: 409 })
  }
  if (error instanceof ConsumableNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 })
  if (isConsumableWriteConflict(error)) {
    return NextResponse.json({ error: CONSUMABLE_CHANGED_MESSAGE, code: "CONSUMABLE_CHANGED" }, { status: 409 })
  }
  return errorResponse(error, 400)
}
