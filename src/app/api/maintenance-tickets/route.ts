import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import { createRepairRecord, repairRecordInclude } from "@/lib/repair-record-service"
import { repairRecordCreateSchema } from "@/lib/validations/maintenance"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const where = buildMaintenanceWhere(filters)
    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where,
        include: repairRecordInclude,
        orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
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

    const input = repairRecordCreateSchema.parse(await request.json())
    const ticket = await createRepairRecord(prisma, input, { id: user.id, employeeId: user.employeeId })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "maintenance",
      recordId: ticket.id,
      newValue: { ...input, repairNo: ticket.repairNo, repairStatus: ticket.repairStatus },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
