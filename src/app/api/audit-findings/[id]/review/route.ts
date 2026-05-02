import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditFindingReviewSchema } from "@/lib/validations/audit"

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
    const input = auditFindingReviewSchema.parse(await request.json())
    const finding = await prisma.auditFinding.findUnique({
      where: { id },
      include: {
        auditItem: true,
        asset: true,
      },
    })
    if (!finding) return NextResponse.json({ error: "Audit finding not found" }, { status: 404 })
    if (finding.reviewStatus !== "pending") {
      return NextResponse.json({ error: "Audit finding has already been reviewed" }, { status: 400 })
    }

    const reviewedFinding = await prisma.$transaction(async (tx) => {
      if (input.action === "approve") {
        if (finding.findingType === "not_found") {
          await tx.auditItem.update({
            where: { id: finding.auditItemId },
            data: {
              auditStatus: "reviewed",
              reconcileStatus: "pending_investigation",
            },
          })

          return tx.auditFinding.update({
            where: { id },
            data: {
              reviewStatus: "approved",
              reviewedBy: user.id,
              reviewedAt: new Date(),
              reviewRemark: input.reviewRemark,
              actionTaken: "not_found_confirmed_no_master_update",
            },
          })
        }

        const fieldName = fieldByFindingType[finding.findingType]
        const canApplyNullableValue = fieldName === "custodianId" || fieldName === "departmentId"
        if (!fieldName || !finding.assetId || (finding.actualValue === null && !canApplyNullableValue)) {
          return tx.auditFinding.update({
            where: { id },
            data: {
              reviewStatus: "exception",
              reviewedBy: user.id,
              reviewedAt: new Date(),
              reviewRemark: input.reviewRemark,
              actionTaken: "manual_review_required",
            },
          })
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

        await tx.auditItem.update({
          where: { id: finding.auditItemId },
          data: {
            auditStatus: "reconciled",
            reconcileStatus: "approved",
          },
        })
      }

      if (input.action === "reject") {
        await tx.auditItem.update({
          where: { id: finding.auditItemId },
          data: { reconcileStatus: "rejected" },
        })
      }

      return tx.auditFinding.update({
        where: { id },
        data: {
          reviewStatus: input.action === "approve" ? "approved" : "rejected",
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewRemark: input.reviewRemark,
          actionTaken: input.action === "approve" ? "master_asset_updated" : "finding_rejected",
        },
      })
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
