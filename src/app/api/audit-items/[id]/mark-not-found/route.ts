import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditMarkNotFoundSchema } from "@/lib/validations/audit"

type MarkNotFoundContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: MarkNotFoundContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "approve")

    const { id } = await context.params
    const input = auditMarkNotFoundSchema.parse(await request.json())
    const item = await prisma.auditItem.findUnique({
      where: { id },
      include: {
        auditRound: { select: { id: true, status: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    })
    if (!item) return NextResponse.json({ error: "Audit item not found" }, { status: 404 })
    if (item.auditRound.status === "closed") {
      return NextResponse.json({ error: "Audit round is closed" }, { status: 400 })
    }
    if (item.auditStatus !== "pending") {
      return NextResponse.json({ error: "Only pending audit items can be marked as not found" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.auditItem.update({
        where: { id },
        data: {
          auditStatus: "reviewed",
          auditResult: "not_found",
          findingRequired: true,
          reconcileStatus: "pending_investigation",
          remark: input.remark,
        },
      })

      const existingFinding = await tx.auditFinding.findFirst({
        where: {
          auditItemId: id,
          findingType: "not_found",
          reviewStatus: "pending",
        },
        select: { id: true },
      })

      if (!existingFinding) {
        await tx.auditFinding.create({
          data: {
            auditRoundId: item.auditRoundId,
            auditItemId: item.id,
            assetId: item.assetId,
            findingType: "not_found",
            expectedValue: JSON.stringify({
              assetTag: item.asset.assetTag,
              assetName: item.asset.name,
              expectedLocationId: item.expectedLocationId,
              expectedCustodianId: item.expectedCustodianId,
              expectedDepartmentId: item.expectedDepartmentId,
              expectedConditionId: item.expectedConditionId,
            }),
            actualValue: null,
            remark: input.remark,
            reportedBy: user.id,
            reviewStatus: "pending",
            actionTaken: "pending_investigation",
          },
        })
      }

      return updatedItem
    })

    await logAudit({
      userId: user.id,
      action: "mark_not_found",
      module: "audit",
      recordId: item.id,
      oldValue: {
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
      },
      newValue: {
        auditStatus: result.auditStatus,
        auditResult: result.auditResult,
        reconcileStatus: result.reconcileStatus,
      },
      remark: input.remark ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
