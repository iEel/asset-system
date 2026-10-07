import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { loadAuditScanRows } from "@/lib/audit-scan-data"

type AuditScanStatusContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: AuditScanStatusContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const sinceParam = new URL(request.url).searchParams.get("since")
    const since = sinceParam ? new Date(sinceParam) : null
    if (!since || Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "Invalid since" }, { status: 400 })
    }

    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    // Taken before the query: a save that lands while it runs is picked up next time instead of lost.
    const serverTime = new Date()
    const items = await loadAuditScanRows(id, { since })
    return NextResponse.json({ serverTime: serverTime.toISOString(), roundStatus: round.status, items })
  } catch (error) {
    return errorResponse(error)
  }
}
