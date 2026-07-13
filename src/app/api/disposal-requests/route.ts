import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import { disposalRequestSchema } from "@/lib/validations/disposal"
import { disposalApiError } from "@/lib/disposal-api-errors"
import { withPrismaUniqueRetry } from "@/lib/prisma-unique-retry"
import {
  disposalReadinessAssetSelect,
  getDisposalReadinessBlockersForAsset,
} from "@/lib/disposal-readiness"

const disposalInclude = {
  asset: { select: { assetTag: true, name: true } },
  requestedBy: { select: { code: true, fullNameTh: true } },
  approver: { select: { code: true, fullNameTh: true } },
} as const

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "view")

    const requests = await prisma.disposalRequest.findMany({
      where: { isActive: true },
      omit: { batchId: true },
      include: disposalInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ data: requests })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "create")

    const input = disposalRequestSchema.parse(await request.json())
    if (input.approverId === input.requestedById) {
      return disposalApiError("DISPOSAL_SOD_CONFLICT", "Requester and assigned approver must be different")
    }
    const employeeIds = [input.requestedById, input.approverId].filter(Boolean) as string[]
    const [asset, activeEmployees] = await Promise.all([
      prisma.asset.findFirst({
        where: { id: input.assetId, isActive: true },
        select: {
          id: true,
          statusId: true,
          status: { select: { name: true, nameTh: true } },
          ...disposalReadinessAssetSelect,
        },
      }),
      prisma.employee.count({ where: { id: { in: employeeIds }, isActive: true } }),
    ])
    if (!asset) return disposalApiError("DISPOSAL_ASSET_NOT_FOUND", "Asset not found", 404)
    if (activeEmployees !== employeeIds.length) {
      return disposalApiError("DISPOSAL_EMPLOYEE_NOT_FOUND", "Requester or approver is inactive or missing")
    }
    const existingOpenRequest = await prisma.disposalRequest.findFirst({
      where: {
        assetId: input.assetId,
        isActive: true,
        requestStatus: { in: ["pending", "approved"] },
      },
      select: { disposalNo: true },
    })
    if (existingOpenRequest) {
      return disposalApiError("DISPOSAL_OPEN_REQUEST", `This asset already has an open disposal request: ${existingOpenRequest.disposalNo}`)
    }

    const eligibilityError = getDisposalAssetEligibilityError(asset.status)
    if (eligibilityError) return disposalApiError("DISPOSAL_ASSET_INELIGIBLE", eligibilityError)
    const readinessBlockers = getDisposalReadinessBlockersForAsset(asset)
    if (readinessBlockers.length > 0) {
      return disposalApiError("DISPOSAL_ASSET_BLOCKED", readinessBlockers.join(", "))
    }

    const pendingDisposalStatus = await prisma.assetStatus.findFirst({
      where: { OR: [{ name: "Pending Disposal" }, { nameTh: "รอตัดจำหน่าย" }] },
      select: { id: true },
    })
    if (!pendingDisposalStatus) {
      return disposalApiError("DISPOSAL_PENDING_STATUS_MISSING", "Pending Disposal asset status is not configured")
    }
    const { disposalNo, disposalRequest } = await withPrismaUniqueRetry(async () => {
      const disposalNo = await generateDisposalNo()
      const disposalRequest = await prisma.$transaction(async (tx) => {
        const statusUpdate = await tx.asset.updateMany({
          where: { id: asset.id, statusId: asset.statusId, isActive: true },
          data: { statusId: pendingDisposalStatus.id, updatedBy: user.id },
        })
        if (statusUpdate.count !== 1) {
          throw new Error("Asset status changed while creating the disposal request")
        }

        const record = await tx.disposalRequest.create({
          data: {
            disposalNo,
            assetId: input.assetId,
            disposalType: input.disposalType,
            reason: input.reason,
            requestedById: input.requestedById,
            approverId: input.approverId,
            saleValue: input.saleValue,
            salvageValue: input.salvageValue,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            createdBy: user.id,
            updatedBy: user.id,
          },
          omit: { batchId: true },
          include: disposalInclude,
        })

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: "disposal_request",
            fromValue: asset.statusId,
            toValue: pendingDisposalStatus.id,
            reason: input.reason,
            referenceType: "disposal",
            referenceId: record.id,
            performedBy: user.id,
            remark: input.disposalType,
          },
        })

        return record
      })
      return { disposalNo, disposalRequest }
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "disposal",
      recordId: disposalRequest.id,
      newValue: { ...input, disposalNo },
    })

    return NextResponse.json(disposalRequest, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function generateDisposalNo() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await prisma.disposalRequest.count({
    where: { createdAt: { gte: start, lt: end } },
  })

  return `DP-${datePart}-${String(count + 1).padStart(4, "0")}`
}
