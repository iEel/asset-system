import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import {
  getDisposalSegregationError,
  getDisposalStatusTargetError,
} from "@/lib/disposal-policy"
import { disposalDecisionSchema, disposalExecutionSchema } from "@/lib/validations/disposal"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { disposalApiError } from "@/lib/disposal-api-errors"
import { approveDisposalRequest, DisposalApprovalServiceError } from "@/lib/disposal-approval-service"
import { getDisposalBatchSchemaReadiness, isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { executeDisposalRequest, DisposalExecutionServiceError } from "@/lib/disposal-execution-service"

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

    if (action === "execute") {
      const input = disposalExecutionSchema.parse(body)
      try {
        const result = await executeDisposalRequest({
          requestId: id,
          actor: {
            userId: user.id,
            employeeId: user.employeeId,
            roles: user.roles,
            permissions: user.permissions,
          },
          input,
        }, {
          database: prisma,
          batchSchemaReadiness: await getDisposalBatchSchemaReadiness(),
        })
        return NextResponse.json(result.request)
      } catch (error) {
        if (error instanceof DisposalExecutionServiceError) {
          return disposalApiError(error.code, error.message, getDisposalExecutionErrorStatus(error.code))
        }
        throw error
      }
    }

    const batchSchemaReady = await isDisposalBatchSchemaReady()
    const [disposalRequest, savedSettings, batchLink] = await Promise.all([
      prisma.disposalRequest.findFirst({
        where: { id, isActive: true },
        omit: { batchId: true },
        include: { asset: { select: { id: true, statusId: true, status: { select: { name: true, nameTh: true } } } } },
      }),
      prisma.systemSetting.findMany({
        where: { key: { in: [...workflowApprovalSettingKeys] } },
        select: { key: true, value: true },
      }),
      batchSchemaReady
        ? prisma.disposalRequest.findFirst({ where: { id, isActive: true }, select: { batchId: true } })
        : Promise.resolve(null),
    ])
    if (!disposalRequest) return disposalApiError("DISPOSAL_REQUEST_NOT_FOUND", "Disposal request not found", 404)
    const disposalBatchId = batchLink?.batchId ?? null
    const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)

    const input = disposalDecisionSchema.parse(body)
    if (input.decision === "approve") {
      const nextStatus = await prisma.assetStatus.findFirst({
        where: { id: input.nextStatusId, isActive: true },
        select: { id: true, name: true, nameTh: true },
      })
      if (!nextStatus) return disposalApiError("DISPOSAL_STATUS_NOT_FOUND", "Next asset status not found", 404)
      const nextStatusError = getDisposalStatusTargetError(input.decision, nextStatus)
      if (nextStatusError) return disposalApiError("DISPOSAL_INVALID_STATUS_TARGET", nextStatusError)

      try {
        const result = await approveDisposalRequest({
          requestId: id,
          actor: {
            userId: user.id,
            employeeId: user.employeeId,
            roles: user.roles,
            permissions: user.permissions,
          },
          segregationRequired: workflowPolicy.segregationRequired,
          approvalRemark: input.approvalRemark,
          saleValue: input.saleValue,
          salvageValue: input.salvageValue,
        })
        return NextResponse.json(result.request)
      } catch (error) {
        if (error instanceof DisposalApprovalServiceError) {
          const status =
            error.code === "DISPOSAL_CONCURRENT_UPDATE"
              ? 409
              : error.code === "DISPOSAL_SOD_CONFLICT" || error.code === "DISPOSAL_FORBIDDEN"
                ? 403
                : error.code === "DISPOSAL_REQUEST_NOT_FOUND"
                  ? 404
                  : 400
          return disposalApiError(error.code as Parameters<typeof disposalApiError>[0], error.message, status)
        }
        throw error
      }
    }

    if (disposalRequest.requestStatus !== "pending") {
      return disposalApiError("DISPOSAL_INVALID_STAGE", "Disposal request is already reviewed")
    }

    const segregationError = getDisposalSegregationError({
      action: input.decision,
      segregationRequired: workflowPolicy.segregationRequired,
      actorEmployeeId: user.employeeId,
      actorUserId: user.id,
      requestedById: disposalRequest.requestedById,
      createdByUserId: disposalRequest.createdBy,
    })
    if (segregationError) return disposalApiError("DISPOSAL_SOD_CONFLICT", segregationError, 403)
    const nextStatus = await prisma.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true, name: true, nameTh: true },
    })
    if (!nextStatus) return disposalApiError("DISPOSAL_STATUS_NOT_FOUND", "Next asset status not found", 404)
    const nextStatusError = getDisposalStatusTargetError(input.decision, nextStatus)
    if (nextStatusError) return disposalApiError("DISPOSAL_INVALID_STATUS_TARGET", nextStatusError)

    const requestStatus = "rejected"
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
        omit: { batchId: true },
      })

      await tx.asset.update({
        where: { id: disposalRequest.assetId },
        data: { statusId: input.nextStatusId, updatedBy: user.id },
      })

      await tx.assetMovement.create({
        data: {
          assetId: disposalRequest.assetId,
          movementType: "disposal_reject",
          fromValue: disposalRequest.asset.statusId,
          toValue: input.nextStatusId,
          reason: input.approvalRemark ?? disposalRequest.reason,
          referenceType: "disposal",
          referenceId: disposalRequest.id,
          performedBy: user.id,
          remark: requestStatus,
        },
      })

      if (disposalBatchId) {
        const children = await tx.disposalRequest.findMany({ where: { batchId: disposalBatchId, isActive: true }, select: { requestStatus: true } })
        await tx.disposalBatch.update({ where: { id: disposalBatchId }, data: { batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)), updatedBy: user.id } })
      }

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
    if (error instanceof ZodError) {
      if (error.issues.some((issue) => issue.path[0] === "evidenceExceptionReason")) {
        return disposalApiError(
          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
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

function getDisposalExecutionErrorStatus(code: DisposalExecutionServiceError["code"]) {
  if (code === "DISPOSAL_CONCURRENT_UPDATE") return 409
  if (code === "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED") return 503
  if (code === "DISPOSAL_FORBIDDEN" || code === "DISPOSAL_SOD_CONFLICT" || code === "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN") return 403
  if (code === "DISPOSAL_REQUEST_NOT_FOUND" || code === "DISPOSAL_STATUS_NOT_FOUND" || code === "DISPOSAL_EMPLOYEE_NOT_FOUND") return 404
  return 400
}
