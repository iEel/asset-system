import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { departmentSchema } from "@/lib/validations/department"

type DepartmentRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: DepartmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "view")

    const { id } = await context.params
    const department = await prisma.department.findFirst({
      where: { id, isActive: true },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            nameTh: true,
          },
        },
      },
    })

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: DepartmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "edit")

    const { id } = await context.params
    const input = departmentSchema.parse(await request.json())
    // An inactive record opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.department.findFirst({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "department",
      recordId: department.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(department)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("code", "Department code already exists")
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: DepartmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "delete")

    const { id } = await context.params
    const existing = await prisma.department.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "department",
      recordId: id,
      oldValue: existing,
      newValue: department,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
