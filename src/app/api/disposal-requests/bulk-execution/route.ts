import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { disposalApiError } from "@/lib/disposal-api-errors"

// Retired (group 6 plan 4, P4-R1): an actual disposal is recorded only through a disposal round (POST /api/disposal-rounds).
export async function POST() {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "edit")
    return disposalApiError("DISPOSAL_USE_ROUND", "DISPOSAL_USE_ROUND", 410)
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.startsWith("Forbidden"))) {
      return errorResponse(error)
    }
    console.error("Disposal bulk execution failed", error)
    return NextResponse.json(
      { code: "DISPOSAL_EXECUTION_FAILED", error: "DISPOSAL_EXECUTION_FAILED" },
      { status: 500 },
    )
  }
}
