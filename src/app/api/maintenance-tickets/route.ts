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
import { buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const evidenceTicketIds = filters.evidence ? await getMaintenanceAttachmentTicketIds() : []
    const where = buildMaintenanceWhere(filters, evidenceTicketIds)
    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where,
        include: maintenanceTicketInclude,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.maintenanceTicket.count({ where }),
    ])

    return NextResponse.json({ data: tickets, total, page: filters.page, pageSize: filters.pageSize })
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

async function getMaintenanceAttachmentTicketIds() {
  const rows = await prisma.attachment.findMany({
    where: { module: "maintenance", isActive: true },
    select: { referenceId: true },
    distinct: ["referenceId"],
  })
  return rows.map((row) => row.referenceId)
}
