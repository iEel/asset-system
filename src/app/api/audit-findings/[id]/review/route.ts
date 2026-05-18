import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditFindingActionPlanSchema, auditFindingCloseSchema, auditFindingReviewSchema } from "@/lib/validations/audit"
import { auditSegregationErrors, isSameAuditActor } from "@/lib/audit-segregation"

type ReviewContext = {
  params: Promise<{ id: string }>
}

const fieldByFindingType: Record<string, "currentLocationId" | "custodianId" | "departmentId" | "conditionId"> = {
  wrong_location: "currentLocationId",
  wrong_custodian: "custodianId",
  wrong_department: "departmentId",
  wrong_condition: "conditionId",
}

const movementTypeByFindingType: Record<string, string> = {
  wrong_location: "audit_location_correction",
  wrong_custodian: "audit_custodian_correction",
  wrong_department: "audit_department_correction",
  wrong_condition: "audit_condition_correction",
}

export async function POST(request: NextRequest, context: ReviewContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "approve")

    const { id } = await context.params
    const body = await request.json()
    const actionType = typeof body?.action === "string" ? body.action : "review"
    const finding = await prisma.auditFinding.findUnique({
      where: { id },
      include: {
        auditItem: true,
        asset: true,
      },
    })
    if (!finding) return NextResponse.json({ error: "Audit finding not found" }, { status: 404 })

    if (actionType === "plan") {
      const input = auditFindingActionPlanSchema.parse(body)
      const updatedFinding = await prisma.auditFinding.update({
        where: { id },
        data: {
          actionPlan: input.actionPlan,
          actionOwnerId: input.actionOwnerId,
          actionDueDate: input.actionDueDate,
          actionStatus: input.actionStatus,
        },
      })

      await logAudit({
        userId: user.id,
        action: "update_action_plan",
        module: "audit",
        recordId: finding.id,
        oldValue: {
          actionPlan: finding.actionPlan,
          actionOwnerId: finding.actionOwnerId,
          actionDueDate: finding.actionDueDate,
          actionStatus: finding.actionStatus,
        },
        newValue: input,
      })

      return NextResponse.json(updatedFinding)
    }

    if (actionType === "close") {
      const input = auditFindingCloseSchema.parse(body)
      const evidenceCount = await prisma.attachment.count({
        where: { module: "audit_finding", referenceId: finding.id, isActive: true },
      })
      if (evidenceCount === 0) {
        return NextResponse.json({ error: "Please attach closure evidence before closing this finding" }, { status: 400 })
      }

      const updatedFinding = await prisma.auditFinding.update({
        where: { id },
        data: {
          actionStatus: "closed",
          closedAt: new Date(),
          closureRemark: input.closureRemark,
        },
      })

      await logAudit({
        userId: user.id,
        action: "close_action_plan",
        module: "audit",
        recordId: finding.id,
        oldValue: { actionStatus: finding.actionStatus, closedAt: finding.closedAt },
        newValue: { actionStatus: "closed", closureRemark: input.closureRemark, evidenceCount },
      })

      return NextResponse.json(updatedFinding)
    }

    const input = auditFindingReviewSchema.parse(body)
    if (finding.reviewStatus !== "pending") {
      return NextResponse.json({ error: "Audit finding has already been reviewed" }, { status: 400 })
    }
    if (isSameAuditActor(user.id, finding.reportedBy)) {
      return NextResponse.json({ error: auditSegregationErrors.reviewOwnFinding }, { status: 403 })
    }

    const reviewedFinding = await prisma.$transaction(async (tx) => {
      if (input.action === "approve") {
        if (finding.findingType === "not_found") {
          const reviewed = await tx.auditFinding.update({
            where: { id },
            data: {
              reviewStatus: "approved",
              reviewedBy: user.id,
              reviewedAt: new Date(),
              reviewRemark: input.reviewRemark,
              actionTaken: "not_found_confirmed_no_master_update",
            },
          })
          await updateAuditItemReviewState(tx, finding.auditItemId)
          return reviewed
        }

        const fieldName = fieldByFindingType[finding.findingType]
        const canApplyNullableValue = fieldName === "custodianId" || fieldName === "departmentId"
        if (!fieldName || !finding.assetId || (finding.actualValue === null && !canApplyNullableValue)) {
          const reviewed = await tx.auditFinding.update({
            where: { id },
            data: {
              reviewStatus: "exception",
              reviewedBy: user.id,
              reviewedAt: new Date(),
              reviewRemark: input.reviewRemark,
              actionTaken: "manual_review_required",
            },
          })
          await updateAuditItemReviewState(tx, finding.auditItemId)
          return reviewed
        }

        const assetUpdateData =
          fieldName === "currentLocationId"
            ? { currentLocationId: finding.actualValue as string, updatedBy: user.id }
            : fieldName === "conditionId"
              ? { conditionId: finding.actualValue as string, updatedBy: user.id }
              : fieldName === "custodianId"
                ? { custodianId: finding.actualValue, updatedBy: user.id }
                : { departmentId: finding.actualValue, updatedBy: user.id }

        await tx.asset.update({
          where: { id: finding.assetId },
          data: assetUpdateData,
        })

        await tx.assetMovement.create({
          data: {
            assetId: finding.assetId,
            movementType: movementTypeByFindingType[finding.findingType] ?? "audit_correction",
            fromValue: finding.expectedValue,
            toValue: finding.actualValue,
            reason: "Audit finding approved",
            referenceType: "audit_finding",
            referenceId: finding.id,
            performedBy: user.id,
            remark: input.reviewRemark,
          },
        })

      }

      const reviewed = await tx.auditFinding.update({
        where: { id },
        data: {
          reviewStatus: input.action === "approve" ? "approved" : "rejected",
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewRemark: input.reviewRemark,
          actionTaken: input.action === "approve" ? "master_asset_updated" : "finding_rejected",
        },
      })
      await updateAuditItemReviewState(tx, finding.auditItemId)
      return reviewed
    })

    await logAudit({
      userId: user.id,
      action: input.action === "approve" ? "approve_finding" : "reject_finding",
      module: "audit",
      recordId: finding.id,
      oldValue: {
        reviewStatus: finding.reviewStatus,
        findingType: finding.findingType,
        expectedValue: finding.expectedValue,
        actualValue: finding.actualValue,
      },
      newValue: {
        reviewStatus: reviewedFinding.reviewStatus,
        actionTaken: reviewedFinding.actionTaken,
      },
      remark: input.reviewRemark ?? undefined,
    })

    return NextResponse.json(reviewedFinding)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

type ReviewTransaction = Prisma.TransactionClient

async function updateAuditItemReviewState(tx: ReviewTransaction, auditItemId: string) {
  const findings = await tx.auditFinding.findMany({
    where: { auditItemId },
    select: { findingType: true, reviewStatus: true },
  })
  const pendingCount = findings.filter((finding) => finding.reviewStatus === "pending").length
  const approvedCount = findings.filter((finding) => finding.reviewStatus === "approved").length
  const exceptionCount = findings.filter((finding) => finding.reviewStatus === "exception").length
  const approvedNotFound = findings.some(
    (finding) => finding.findingType === "not_found" && finding.reviewStatus === "approved"
  )

  if (pendingCount > 0) {
    await tx.auditItem.update({
      where: { id: auditItemId },
      data: { reconcileStatus: "pending" },
    })
    return
  }

  if (exceptionCount > 0) {
    await tx.auditItem.update({
      where: { id: auditItemId },
      data: { auditStatus: "reviewed", reconcileStatus: "exception" },
    })
    return
  }

  if (approvedNotFound) {
    await tx.auditItem.update({
      where: { id: auditItemId },
      data: { auditStatus: "reviewed", reconcileStatus: "pending_investigation" },
    })
    return
  }

  if (approvedCount > 0) {
    await tx.auditItem.update({
      where: { id: auditItemId },
      data: { auditStatus: "reconciled", reconcileStatus: "approved" },
    })
    return
  }

  await tx.auditItem.update({
    where: { id: auditItemId },
    data: { auditStatus: "reviewed", reconcileStatus: "rejected" },
  })
}
