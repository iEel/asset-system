import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import {
  approveDisposalRequest,
  DisposalApprovalServiceError,
  inspectDisposalApprovalRequests,
} from "@/lib/disposal-approval-service"
import {
  summarizeDisposalBulkApproval,
  type DisposalBulkApprovalCode,
  type DisposalBulkApprovalItem,
} from "@/lib/disposal-bulk-approval"
import { disposalBulkDecisionSchema } from "@/lib/validations/disposal"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "approve")
    const input = disposalBulkDecisionSchema.parse(await request.json())
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    })
    const segregationRequired = parseWorkflowApprovalPolicy(settings).segregationRequired
    const actor = {
      userId: user.id,
      employeeId: user.employeeId,
      roles: user.roles,
      permissions: user.permissions,
    }

    if (input.mode === "preview") {
      const inspected = await inspectDisposalApprovalRequests({
        requestIds: input.requestIds,
        actor,
        segregationRequired,
      })
      return NextResponse.json({ summary: summarizeDisposalBulkApproval(inspected), items: inspected })
    }

    const items: DisposalBulkApprovalItem[] = []
    for (const requestId of input.requestIds) {
      try {
        const result = await approveDisposalRequest({
          requestId,
          actor,
          segregationRequired,
          approvalRemark: input.approvalRemark,
        })
        items.push({
          requestId,
          disposalNo: result.request.disposalNo,
          assetTag: result.assetTag,
          outcome: "approved",
          code: null,
        })
      } catch (error) {
        const { code, display } = getBulkApprovalFailure(error, requestId)
        items.push({
          requestId,
          disposalNo: display.disposalNo,
          assetTag: display.assetTag,
          outcome: code === "DISPOSAL_APPROVAL_FAILED" ? "failed" : "blocked",
          code,
        })
      }
    }

    return NextResponse.json({ summary: summarizeDisposalBulkApproval(items), items })
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error, 400)
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.startsWith("Forbidden"))) {
      return errorResponse(error)
    }
    console.error("Disposal bulk approval failed", error)
    return NextResponse.json(
      { code: "DISPOSAL_APPROVAL_FAILED", error: "DISPOSAL_APPROVAL_FAILED" },
      { status: 500 },
    )
  }
}

function getBulkApprovalFailure(
  error: unknown,
  requestId: string,
): {
  code: DisposalBulkApprovalCode
  display: Pick<DisposalBulkApprovalItem, "disposalNo" | "assetTag">
} {
  if (error instanceof DisposalApprovalServiceError) {
    return {
      code: error.code as DisposalBulkApprovalCode,
      display: error.item,
    }
  }

  return {
    code: "DISPOSAL_APPROVAL_FAILED",
    display: { disposalNo: requestId, assetTag: "-" },
  }
}
