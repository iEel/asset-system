import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { isPrismaWriteConflict } from "@/lib/disposal-execution-service"
import {
  INSPECTION_CONFIRM_CHANGED_MESSAGE,
  InspectionConfirmChangedError,
  confirmInspectionResults,
} from "@/lib/inspection-confirm-service"
import { inspectionConfirmSchema } from "@/lib/validations/inspection-confirm"

type ConfirmResultsContext = {
  params: Promise<{ id: string }>
}

// ยืนยันผลตรวจ (inspection-confirm spec §4): releases the round's assets stuck "Under Inspection", all or nothing.
// Body { assetIds, reason, outcome? }. 200 { confirmed, byStatus };
// 409 { code: "INSPECTION_CONFIRM_CHANGED", error, blocked: [{ assetId, assetTag, code }] }.
export async function POST(request: NextRequest, context: ConfirmResultsContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = inspectionConfirmSchema.parse(await request.json())

    const round = await prisma.auditRound.findFirst({ where: { id, isActive: true }, select: { id: true, status: true } })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "cancelled") return NextResponse.json({ error: "Audit round is cancelled" }, { status: 400 })

    const result = await confirmInspectionResults({ ...input, auditRoundId: round.id, userId: user.id })
    return NextResponse.json(result)
  } catch (error) {
    // A refusal, or SQL Server ending one of two serializable writers (Prisma P2034): reload and try again.
    if (error instanceof InspectionConfirmChangedError || isPrismaWriteConflict(error)) {
      const blocked = error instanceof InspectionConfirmChangedError ? error.blocked : []
      return NextResponse.json({ code: "INSPECTION_CONFIRM_CHANGED", error: INSPECTION_CONFIRM_CHANGED_MESSAGE, blocked }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}
