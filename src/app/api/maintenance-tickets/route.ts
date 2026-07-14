import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import {
  createCorrectiveMaintenanceTicket,
  maintenanceTicketInclude,
} from "@/lib/maintenance-ticket-service"
import { maintenanceTicketSchema } from "@/lib/validations/maintenance"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { isActive: true },
      include: maintenanceTicketInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ data: tickets })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const input = maintenanceTicketSchema.parse(await request.json())
    const ticket = await createCorrectiveMaintenanceTicket(prisma, input, user)

    await logAudit({
      userId: user.id,
      action: "create",
      module: "maintenance",
      recordId: ticket.id,
      newValue: { ...input, repairNo: ticket.repairNo },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
