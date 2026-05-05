import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { disposalDecisionSchema } from "@/lib/validations/disposal"

type DisposalRequestContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: DisposalRequestContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "approve")

    const { id } = await context.params
    const input = disposalDecisionSchema.parse(await request.json())
    const disposalRequest = await prisma.disposalRequest.findFirst({
      where: { id, isActive: true },
      include: { asset: { select: { id: true, statusId: true } } },
    })
    if (!disposalRequest) return NextResponse.json({ error: "Disposal request not found" }, { status: 404 })
    if (disposalRequest.requestStatus !== "pending") {
      return NextResponse.json({ error: "Disposal request is already reviewed" }, { status: 400 })
    }

    const nextStatus = await prisma.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true },
    })
    if (!nextStatus) return NextResponse.json({ error: "Next asset status not found" }, { status: 404 })

    const requestStatus = input.decision === "approve" ? "approved" : "rejected"
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const record = await tx.disposalRequest.update({
        where: { id },
        data: {
          requestStatus,
          saleValue: input.saleValue,
          salvageValue: input.salvageValue,
          approvalRemark: input.approvalRemark,
          approverId: user.employeeId ?? disposalRequest.approverId,
          approvedAt: new Date(),
          updatedBy: user.id,
        },
      })

      await tx.asset.update({
        where: { id: disposalRequest.assetId },
        data: { statusId: input.nextStatusId, updatedBy: user.id },
      })

      await tx.assetMovement.create({
        data: {
          assetId: disposalRequest.assetId,
          movementType: input.decision === "approve" ? "disposal_approve" : "disposal_reject",
          fromValue: disposalRequest.asset.statusId,
          toValue: input.nextStatusId,
          reason: input.approvalRemark ?? disposalRequest.reason,
          referenceType: "disposal",
          referenceId: disposalRequest.id,
          performedBy: user.id,
          remark: requestStatus,
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: input.decision,
      module: "disposal",
      recordId: id,
      oldValue: {
        requestStatus: disposalRequest.requestStatus,
        assetStatusId: disposalRequest.asset.statusId,
        saleValue: disposalRequest.saleValue,
        salvageValue: disposalRequest.salvageValue,
      },
      newValue: {
        requestStatus,
        assetStatusId: input.nextStatusId,
        saleValue: input.saleValue,
        salvageValue: input.salvageValue,
        approvalRemark: input.approvalRemark,
      },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
