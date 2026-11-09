// ของใช้สิ้นเปลือง (consumables plan 1 task 3): the consumables routes' error mapping. The short 409 carries onHand and
// unit for the UI's count; a deadlock still left after the service's retries (isDeadlockError: P2034, the adapter's
// TransactionWriteConflict or driver number 1205) asks for a reload, never a 500.
import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import {
  CONSUMABLE_CHANGED_MESSAGE,
  ConsumableNotFoundError,
  ConsumableShortError,
} from "@/lib/consumable-service"
import { isDeadlockError } from "@/lib/transaction-retry"

export function consumableErrorResponse(error: unknown) {
  if (error instanceof ConsumableShortError) {
    return NextResponse.json({ error: error.message, code: "CONSUMABLE_SHORT", onHand: error.onHand, unit: error.unit }, { status: 409 })
  }
  if (error instanceof ConsumableNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 })
  if (isDeadlockError(error)) {
    return NextResponse.json({ error: CONSUMABLE_CHANGED_MESSAGE, code: "CONSUMABLE_CHANGED" }, { status: 409 })
  }
  return errorResponse(error, 400)
}
