import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { branchSchema } from "@/lib/validations/branch"

type BranchRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: BranchRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "branch", "view")

    const { id } = await context.params
    const branch = await prisma.branch.findFirst({
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

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    return NextResponse.json(branch)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: BranchRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "branch", "edit")

    const { id } = await context.params
    const input = branchSchema.parse(await request.json())
    const existing = await prisma.branch.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    const existingCode = await prisma.branch.findFirst({
      where: {
        code: input.code,
        id: { not: id },
      },
      include: { company: { select: { code: true, nameTh: true } } },
    })

    if (existingCode) {
      return NextResponse.json(
        {
          error: `รหัสสาขา ${input.code} มีอยู่แล้วในระบบ (${existingCode.company.code} - ${existingCode.company.nameTh}) สาขาใช้ร่วมกับการ Sync AD/LDAP ได้ ไม่ต้องสร้างซ้ำใต้บริษัทอื่น`,
        },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "branch",
      recordId: branch.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(branch)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: BranchRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "branch", "delete")

    const { id } = await context.params
    const existing = await prisma.branch.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "branch",
      recordId: id,
      oldValue: existing,
      newValue: branch,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
