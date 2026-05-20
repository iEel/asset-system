import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { companySchema } from "@/lib/validations/company"
import { getCompanyDeleteBlockReason } from "@/lib/organization-master-query"

type CompanyRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: CompanyRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "view")

    const { id } = await context.params
    const company = await prisma.company.findFirst({
      where: { id, isActive: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: NextRequest, context: CompanyRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "edit")

    const { id } = await context.params
    const input = companySchema.parse(await request.json())
    const existing = await prisma.company.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "company",
      recordId: company.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(company)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: NextRequest, context: CompanyRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "delete")

    const { id } = await context.params
    const existing = await prisma.company.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            branches: { where: { isActive: true } },
            departments: { where: { isActive: true } },
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
            auditRounds: { where: { isActive: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const blockReason = getCompanyDeleteBlockReason(existing._count)
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "company",
      recordId: id,
      oldValue: existing,
      newValue: company,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
