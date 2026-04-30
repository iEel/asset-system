import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { employeeSchema } from "@/lib/validations/employee"

type EmployeeRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: EmployeeRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "employee", "view")

    const { id } = await context.params
    const employee = await prisma.employee.findFirst({
      where: { id, isActive: true },
      include: {
        company: { select: { id: true, code: true, nameTh: true } },
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        manager: { select: { id: true, code: true, fullNameTh: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: EmployeeRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "employee", "edit")

    const { id } = await context.params
    const input = employeeSchema.parse(await request.json())
    const existing = await prisma.employee.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    if (input.managerId === id) {
      return NextResponse.json({ error: "Employee cannot be their own manager" }, { status: 400 })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "employee",
      recordId: employee.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(employee)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: EmployeeRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "employee", "delete")

    const { id } = await context.params
    const existing = await prisma.employee.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "employee",
      recordId: id,
      oldValue: existing,
      newValue: employee,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
