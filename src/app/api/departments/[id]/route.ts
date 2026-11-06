import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { isDeactivation } from "@/lib/master-data-query"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { departmentSchema } from "@/lib/validations/department"
import { masterDataReactivateSchema } from "@/lib/validations/master-data-reactivate"
import { departmentDeactivateCountSelect, departmentDeactivateCounts } from "@/lib/department-list-query"
import { getDepartmentDeleteBlockReason, getReactivateBlockedByCompanyReason } from "@/lib/organization-master-query"

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

    // G8P1-R3: unticking "ใช้งาน" removes the department from use the way ปิดใช้งาน (DELETE) does, so the same counts
    // refuse it: active employees, active assets and open audit rounds scoped to it.
    if (isDeactivation(existing.isActive, input.isActive)) {
      const usage = await prisma.department.findFirst({
        where: { id },
        select: { _count: { select: departmentDeactivateCountSelect } },
      })
      const blockReason = usage ? getDepartmentDeleteBlockReason(departmentDeactivateCounts(usage._count)) : null
      if (blockReason) {
        return NextResponse.json({ error: blockReason }, { status: 409 })
      }
    }

    // Ticking "ใช้งาน" again is refused while the chosen company is inactive, as the PATCH; a department with no company
    // (แผนกกลาง) comes back freely (group 8 plan 1 final review).
    if (!existing.isActive && input.isActive && input.companyId) {
      const company = await prisma.company.findFirst({ where: { id: input.companyId }, select: { nameTh: true, isActive: true } })
      const reactivateBlocked = getReactivateBlockedByCompanyReason("department", company)
      if (reactivateBlocked) {
        return NextResponse.json({ error: reactivateBlocked }, { status: 409 })
      }
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
    // A deactivation saved from the edit form is logged like the DELETE route's, so the list's "ปิดใช้งานเมื่อ {date}"
    // (readDeactivatedAt, G8P1-R2) finds it too (group 8 plan 1 Task 2).
    if (isDeactivation(existing.isActive, input.isActive)) {
      await logAudit({
        userId: user.id,
        action: "delete",
        module: "department",
        recordId: department.id,
        oldValue: existing,
        newValue: department,
      })
    }

    return NextResponse.json(department)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("code", "Department code already exists")
    return errorResponse(error, 400)
  }
}

// เปิดใช้งาน from the list (group 8 plan 1 final review): the body is only { isActive: true }, so nothing else of the
// record is written (no stale snapshot of the list goes back); the update entry logs the isActive change only.
// Refused (409) while the department's company is inactive, as the PUT that ticks ใช้งาน again.
export async function PATCH(request: NextRequest, context: DepartmentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "edit")

    const { id } = await context.params
    masterDataReactivateSchema.parse(await request.json())
    const existing = await prisma.department.findFirst({
      where: { id },
      include: { company: { select: { nameTh: true, isActive: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }
    if (existing.isActive) {
      return NextResponse.json(existing)
    }

    const blockReason = getReactivateBlockedByCompanyReason("department", existing.company)
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        isActive: true,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "department",
      recordId: id,
      oldValue: { isActive: false },
      newValue: { isActive: true },
    })

    return NextResponse.json(department)
  } catch (error) {
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
      // G8P1-R3: the counts the guard reads (the list's ⋯ shows the same reason before anyone presses it).
      include: { _count: { select: departmentDeactivateCountSelect } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const blockReason = getDepartmentDeleteBlockReason(departmentDeactivateCounts(existing._count))
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
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
