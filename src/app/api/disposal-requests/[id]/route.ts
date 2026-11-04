import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { issuesToFieldErrors } from "@/lib/field-errors"
import { getDisposalStatusTargetError } from "@/lib/disposal-policy"
import { disposalDecisionSchema } from "@/lib/validations/disposal"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { disposalApiError } from "@/lib/disposal-api-errors"
import {
  approveDisposalRequest,
  DisposalApprovalServiceError,
  rejectDisposalRequest,
} from "@/lib/disposal-approval-service"

type DisposalRequestContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: DisposalRequestContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const body = await request.json()
    const action = typeof body?.action === "string" ? body.action : "decision"
    if (action === "execute") {
      requirePermission(user, "disposal", "edit")
    } else {
      requirePermission(user, "disposal", "approve")
    }

    // Retired (group 6 plan 4, P4-R1): an actual disposal is recorded only through a disposal round.
    if (action === "execute") return disposalApiError("DISPOSAL_USE_ROUND", "DISPOSAL_USE_ROUND", 410)

    const [disposalRequest, savedSettings] = await Promise.all([
      prisma.disposalRequest.findFirst({
        where: { id, isActive: true },
        select: { id: true },
      }),
      prisma.systemSetting.findMany({
        where: { key: { in: [...workflowApprovalSettingKeys] } },
        select: { key: true, value: true },
      }),
    ])
    if (!disposalRequest) return disposalApiError("DISPOSAL_REQUEST_NOT_FOUND", "Disposal request not found", 404)
    const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
    const actor = {
      userId: user.id,
      employeeId: user.employeeId,
      roles: user.roles,
      permissions: user.permissions,
    }

    const input = disposalDecisionSchema.parse(body)
    if (input.decision === "approve") {
      // The approve keeps the asset Pending Disposal; an explicit id from an old client is only
      // checked to refuse a wrong target, and without one Pending Disposal must still exist.
      if (input.nextStatusId) {
        const nextStatus = await prisma.assetStatus.findFirst({
          where: { id: input.nextStatusId, isActive: true },
          select: { id: true, name: true, nameTh: true },
        })
        if (!nextStatus) return disposalApiError("DISPOSAL_STATUS_NOT_FOUND", "Next asset status not found", 404)
        const nextStatusError = getDisposalStatusTargetError(input.decision, nextStatus)
        if (nextStatusError) return disposalApiError("DISPOSAL_INVALID_STATUS_TARGET", nextStatusError)
      } else {
        const pendingDisposalStatus = await prisma.assetStatus.findFirst({
          where: { OR: [{ name: "Pending Disposal" }, { nameTh: "รอตัดจำหน่าย" }] },
          select: { id: true },
        })
        if (!pendingDisposalStatus) {
          return disposalApiError("DISPOSAL_PENDING_STATUS_MISSING", "Pending Disposal asset status is not configured")
        }
      }

      try {
        const result = await approveDisposalRequest({
          requestId: id,
          actor,
          segregationRequired: workflowPolicy.segregationRequired,
          approvalRemark: input.approvalRemark,
          saleValue: input.saleValue,
          salvageValue: input.salvageValue,
        })
        return NextResponse.json(result.request)
      } catch (error) {
        if (error instanceof DisposalApprovalServiceError) return disposalDecisionError(error)
        throw error
      }
    }

    try {
      const result = await rejectDisposalRequest({
        requestId: id,
        actor,
        segregationRequired: workflowPolicy.segregationRequired,
        approvalRemark: input.approvalRemark,
        saleValue: input.saleValue,
        salvageValue: input.salvageValue,
      })
      return NextResponse.json(result.request)
    } catch (error) {
      if (error instanceof DisposalApprovalServiceError) return disposalDecisionError(error)
      throw error
    }
  } catch (error) {
    if (error instanceof ZodError) {
      if (error.issues.some((issue) => issue.path[0] === "evidenceExceptionReason")) {
        return disposalApiError(
          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
          400,
          issuesToFieldErrors(error.issues),
        )
      }
      return errorResponse(error, 400)
    }
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.startsWith("Forbidden"))) {
      return errorResponse(error)
    }
    console.error("Disposal execution failed", error)
    return NextResponse.json(
      { code: "DISPOSAL_EXECUTION_FAILED", error: "DISPOSAL_EXECUTION_FAILED" },
      { status: 500 },
    )
  }
}

function disposalDecisionError(error: DisposalApprovalServiceError) {
  return disposalApiError(
    error.code,
    error.message,
    getDisposalDecisionErrorStatus(error.code),
    undefined,
    error.sodReason ? { reason: error.sodReason } : undefined,
  )
}

function getDisposalDecisionErrorStatus(code: DisposalApprovalServiceError["code"]) {
  if (
    code === "DISPOSAL_CONCURRENT_UPDATE"
    || code === "DISPOSAL_PREVIOUS_STATUS_MISSING"
    || code === "DISPOSAL_PREVIOUS_STATUS_INACTIVE"
    || code === "DISPOSAL_ASSET_STATUS_CHANGED"
  ) return 409
  if (code === "DISPOSAL_SOD_CONFLICT" || code === "DISPOSAL_FORBIDDEN") return 403
  if (code === "DISPOSAL_REQUEST_NOT_FOUND") return 404
  return 400
}
