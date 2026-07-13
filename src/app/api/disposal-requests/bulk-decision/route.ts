import { NextRequest, NextResponse } from "next/server"
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

    const inspected = await inspectDisposalApprovalRequests({
      requestIds: input.requestIds,
      actor,
      segregationRequired,
    })
    if (input.mode === "preview") {
      return NextResponse.json({ summary: summarizeDisposalBulkApproval(inspected), items: inspected })
    }

    const items: DisposalBulkApprovalItem[] = []
    const inspectedById = new Map(inspected.map((item) => [item.requestId.toLowerCase(), item]))
    for (const requestId of input.requestIds) {
      const previewItem = inspectedById.get(requestId.toLowerCase())!
      if (previewItem.outcome === "blocked") {
        items.push(previewItem)
        continue
      }

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
        const { code, display } = getBulkApprovalFailure(error, previewItem)
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
    return errorResponse(error, 400)
  }
}

function getBulkApprovalFailure(
  error: unknown,
  previewItem: DisposalBulkApprovalItem,
): {
  code: DisposalBulkApprovalCode
  display: Pick<DisposalBulkApprovalItem, "disposalNo" | "assetTag">
} {
  if (error instanceof DisposalApprovalServiceError) {
    return {
      code: error.code === "DISPOSAL_FORBIDDEN" ? "DISPOSAL_APPROVAL_FAILED" : error.code,
      display: error.item,
    }
  }

  return { code: "DISPOSAL_APPROVAL_FAILED", display: previewItem }
}
