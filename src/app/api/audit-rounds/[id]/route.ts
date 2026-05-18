import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"

type AuditRoundContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: AuditRoundContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "view")

    const { id } = await context.params
    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      include: {
        scopeCompany: { select: { code: true, nameTh: true } },
        scopeBranch: { select: { code: true, name: true } },
        scopeDepartment: { select: { code: true, name: true } },
        scopeLocation: { select: { code: true, name: true } },
        scopeCategory: { select: { code: true, name: true } },
        items: {
          take: 100,
          orderBy: { createdAt: "desc" },
          include: {
            asset: {
              select: {
                assetTag: true,
                name: true,
                currentLocation: { select: { code: true, name: true } },
                custodian: { select: { code: true, fullNameTh: true } },
              },
            },
          },
        },
        _count: { select: { items: true, findings: true } },
      },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    return NextResponse.json(round)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: AuditRoundContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "approve")

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === "string" ? body.action : ""
    if (action !== "close") {
      return NextResponse.json({ error: "Unsupported audit round action" }, { status: 400 })
    }

    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "closed") return NextResponse.json({ error: "Audit round is already closed" }, { status: 400 })

    const checklist = await getCloseChecklist(id)
    if (!checklist.canClose) {
      return NextResponse.json({ error: "Audit round still has pending checklist items", checklist }, { status: 400 })
    }

    const updatedRound = await prisma.auditRound.update({
      where: { id },
      data: {
        status: "closed",
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "close",
      module: "audit",
      recordId: id,
      oldValue: { status: round.status },
      newValue: { status: updatedRound.status, checklist },
    })

    return NextResponse.json(updatedRound)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: AuditRoundContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "delete")

    const { id } = await context.params
    const round = await prisma.auditRound.findFirst({ where: { id, isActive: true } })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    await prisma.auditRound.update({
      where: { id },
      data: { isActive: false, updatedBy: user.id },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "audit",
      recordId: id,
      oldValue: round,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function getCloseChecklist(auditRoundId: string) {
  const [pendingItems, pendingFindings, openActions] = await Promise.all([
    prisma.auditItem.count({ where: { auditRoundId, auditStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "pending" } }),
    prisma.auditFinding.count({
      where: {
        auditRoundId,
        actionStatus: { in: ["planned", "in_progress", "done"] },
      },
    }),
  ])

  return {
    pendingItems,
    pendingFindings,
    openActions,
    canClose: pendingItems === 0 && pendingFindings === 0 && openActions === 0,
  }
}
