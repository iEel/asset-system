import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { branchSchema } from "@/lib/validations/branch"
import { getBranchDeleteBlockReason } from "@/lib/organization-master-query"
import { isDeactivation } from "@/lib/master-data-query"

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
    // An inactive branch opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.branch.findFirst({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    // Unticking "ใช้งาน" removes the branch from use the way "ลบ" does, so the same counts refuse it.
    if (isDeactivation(existing.isActive, input.isActive)) {
      const usage = await prisma.branch.findFirst({
        where: { id },
        select: {
          _count: {
            select: {
              locations: { where: { isActive: true } },
              employees: { where: { isActive: true } },
              assets: { where: { isActive: true } },
              auditRounds: { where: { isActive: true } },
            },
          },
        },
      })
      const blockReason = usage ? getBranchDeleteBlockReason(usage._count) : null
      if (blockReason) {
        return NextResponse.json({ error: blockReason }, { status: 409 })
      }
    }

    // Every other branch of the company counts, inactive ones too: the unique index on (companyId, code) covers them all (V track spec §6.2).
    const existingCode = await prisma.branch.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        id: { not: id },
      },
      include: { company: { select: { code: true, nameTh: true } } },
    })

    if (existingCode) {
      return fieldErrorResponse({
        status: 400,
        error: `รหัสสาขา ${input.code} มีอยู่แล้วในบริษัท ${existingCode.company.code} - ${existingCode.company.nameTh}`,
        fieldErrors: { code: "duplicate" },
      })
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
      include: {
        _count: {
          select: {
            locations: { where: { isActive: true } },
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
            auditRounds: { where: { isActive: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    const blockReason = getBranchDeleteBlockReason(existing._count)
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
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
