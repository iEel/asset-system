import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { errorResponse } from "@/lib/api-response"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { disposalApiError } from "@/lib/disposal-api-errors"
import {
  createDisposalRound,
  DisposalRoundServiceError,
  previewDisposalRound,
} from "@/lib/disposal-round-service"
import { disposalRoundInputSchema } from "@/lib/validations/disposal-round"

// A disposal round (group 6 spec §11.2): mode "preview" names every machine that would be refused and the executors
// allowed; mode "commit" saves the round and executes every machine, or nothing.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "edit")
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const input = disposalRoundInputSchema.parse(body)
    const actor = {
      userId: user.id,
      employeeId: user.employeeId,
      roles: user.roles,
      permissions: user.permissions,
    }
    try {
      if (input.mode === "preview") {
        return NextResponse.json(await previewDisposalRound(prisma, input, actor))
      }
      return NextResponse.json(await createDisposalRound(prisma, input, actor), { status: 201 })
    } catch (error) {
      if (!(error instanceof DisposalRoundServiceError)) throw error
      if (error.code === "DISPOSAL_ROUND_BLOCKED") {
        return NextResponse.json({ code: error.code, error: error.code, items: error.items }, { status: 409 })
      }
      return disposalApiError(error.code, error.code, getDisposalRoundErrorStatus(error.code))
    }
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error, 400)
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.startsWith("Forbidden"))) {
      return errorResponse(error)
    }
    console.error("Disposal round failed", error)
    return NextResponse.json(
      { code: "DISPOSAL_EXECUTION_FAILED", error: "DISPOSAL_EXECUTION_FAILED" },
      { status: 500 },
    )
  }
}

function getDisposalRoundErrorStatus(code: DisposalRoundServiceError["code"]) {
  if (code === "DISPOSAL_CONCURRENT_UPDATE") return 409
  if (code === "DISPOSAL_FORBIDDEN" || code === "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN") return 403
  if (code === "DISPOSAL_EMPLOYEE_NOT_FOUND" || code === "DISPOSAL_STATUS_NOT_FOUND") return 404
  return 400
}
