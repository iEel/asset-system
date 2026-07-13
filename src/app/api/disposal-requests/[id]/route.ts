import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit, writeAuditLog } from "@/lib/audit-log"
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
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { getDisposalExecutionEvidenceError } from "@/lib/disposal-evidence-exception"

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

    if (action === "execute") {
      if (disposalRequest.requestStatus !== "approved") {
        return disposalApiError("DISPOSAL_INVALID_STAGE", "Only approved disposal requests can be executed")
      }
      const input = disposalExecutionSchema.parse({ ...body, disposalType: disposalRequest.disposalType })
      const segregationError = getDisposalSegregationError({
        action: "execute",
        segregationRequired: workflowPolicy.segregationRequired,
        actorEmployeeId: user.employeeId,
        actorUserId: user.id,
        requestedById: disposalRequest.requestedById,
        createdByUserId: disposalRequest.createdBy,
        approverId: disposalRequest.approverId,
        executedById: input.executedById,
      })
      if (segregationError) return disposalApiError("DISPOSAL_SOD_CONFLICT", segregationError, 403)

      const nextStatus = await prisma.assetStatus.findFirst({
        where: { id: input.nextStatusId, isActive: true },
        select: { id: true, name: true, nameTh: true },
      })
      if (!nextStatus) return disposalApiError("DISPOSAL_STATUS_NOT_FOUND", "Next asset status not found", 404)
      const nextStatusError = getDisposalStatusTargetError("execute", nextStatus)
      if (nextStatusError) return disposalApiError("DISPOSAL_INVALID_STATUS_TARGET", nextStatusError)

      const executor = await prisma.employee.findFirst({
        where: { id: input.executedById, isActive: true },
        select: { id: true },
      })
      if (!executor) return disposalApiError("DISPOSAL_EMPLOYEE_NOT_FOUND", "Executor is inactive or missing", 404)

      const [itemEvidenceCount, batchEvidenceCount] = await Promise.all([
        prisma.attachment.count({
          where: { module: "disposal", referenceId: disposalRequest.id, isActive: true },
        }),
        disposalBatchId
          ? prisma.attachment.count({
              where: { module: "disposal_batch", referenceId: disposalBatchId, isActive: true },
            })
          : Promise.resolve(0),
      ])
      const effectiveEvidenceCount = itemEvidenceCount + batchEvidenceCount
      const evidenceError = getDisposalExecutionEvidenceError({
        roles: user.roles,
        effectiveEvidenceCount,
        useHistoricalEvidenceException: input.useHistoricalEvidenceException,
        evidenceExceptionReason: input.evidenceExceptionReason,
        evidenceExceptionAcknowledged: input.evidenceExceptionAcknowledged,
      })
      if (evidenceError) {
        const error = {
          DISPOSAL_EVIDENCE_REQUIRED: "Please attach disposal evidence before execution",
          DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN: "Only system administrators can execute without disposal evidence",
          DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED: "A historical evidence exception reason of at least 20 characters is required",
          DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED: "Historical evidence exception acknowledgement is required",
          DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE: "Historical evidence exceptions can only be used when no active evidence exists",
        }[evidenceError]
        return disposalApiError(evidenceError, error, evidenceError === "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN" ? 403 : 400)
      }

      const exceptionGrantedAt = input.useHistoricalEvidenceException ? new Date() : null
      const updatedRequest = await prisma.$transaction(async (tx) => {
        const record = await tx.disposalRequest.update({
          where: { id },
          data: {
            requestStatus: "disposed",
            executionDate: input.executionDate,
            executedById: input.executedById,
            recipientName: input.recipientName,
            documentNo: input.documentNo,
            actualSaleValue: input.actualSaleValue,
            actualSalvageValue: input.actualSalvageValue,
            executionRemark: input.executionRemark,
            evidenceExceptionReason: input.useHistoricalEvidenceException ? input.evidenceExceptionReason : null,
            evidenceExceptionGrantedBy: input.useHistoricalEvidenceException ? user.id : null,
            evidenceExceptionGrantedAt: exceptionGrantedAt,
            completedAt: new Date(),
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
            movementType: "disposal_execute",
            fromValue: disposalRequest.asset.statusId,
            toValue: input.nextStatusId,
            reason: input.executionRemark ?? disposalRequest.reason,
            referenceType: "disposal",
            referenceId: disposalRequest.id,
            performedBy: user.id,
            performedAt: input.executionDate,
            remark: input.documentNo,
          },
        })

        if (disposalBatchId) {
          const children = await tx.disposalRequest.findMany({ where: { batchId: disposalBatchId, isActive: true }, select: { requestStatus: true } })
          await tx.disposalBatch.update({ where: { id: disposalBatchId }, data: { batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)), updatedBy: user.id } })
        }

        await writeAuditLog(tx, {
          userId: user.id,
          action: input.useHistoricalEvidenceException ? "execute_historical_without_evidence" : "execute",
          module: "disposal",
          recordId: id,
          oldValue: { requestStatus: disposalRequest.requestStatus, assetStatusId: disposalRequest.asset.statusId },
          newValue: {
            ...input,
            requestStatus: "disposed",
            effectiveEvidenceCount,
            evidenceExceptionGrantedBy: input.useHistoricalEvidenceException ? user.id : null,
            evidenceExceptionGrantedAt: exceptionGrantedAt,
          },
        })

        return record
      })

      return NextResponse.json(updatedRequest)
    }

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
    return errorResponse(error, 400)
  }
}
