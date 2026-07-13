import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { errorResponse } from "@/lib/api-response"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import {
  commitDisposalBulkExecution,
  inspectDisposalBulkExecution,
} from "@/lib/disposal-bulk-execution-service"
import { getDisposalBatchSchemaReadiness } from "@/lib/disposal-schema-readiness"
import { disposalBulkExecutionSchema } from "@/lib/validations/disposal"

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

    const input = disposalBulkExecutionSchema.parse(body)
    const batchSchemaReadiness = await getDisposalBatchSchemaReadiness()
    const command = {
      actor: {
        userId: user.id,
        employeeId: user.employeeId,
        roles: user.roles,
        permissions: user.permissions,
      },
      input,
    }
    const dependencies = { database: prisma, batchSchemaReadiness }

    if (input.mode === "preview") {
      return NextResponse.json(await inspectDisposalBulkExecution(command, dependencies))
    }

    return NextResponse.json(await commitDisposalBulkExecution(command, dependencies))
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error, 400)
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.startsWith("Forbidden"))) {
      return errorResponse(error)
    }
    console.error("Disposal bulk execution failed", error)
    return NextResponse.json(
      { code: "DISPOSAL_BULK_EXECUTION_FAILED", error: "DISPOSAL_BULK_EXECUTION_FAILED" },
      { status: 500 },
    )
  }
}
