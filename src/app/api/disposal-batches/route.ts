import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { prepareDisposalBatchPacket } from "@/lib/disposal-batch"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import { withPrismaUniqueRetry } from "@/lib/prisma-unique-retry"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import {
  disposalReadinessAssetSelect,
  getDisposalReadinessBlockersForAsset,
} from "@/lib/disposal-readiness"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "view")
    if (!(await isDisposalBatchSchemaReady())) return batchSchemaRequired()

    const batches = await prisma.disposalBatch.findMany({
      where: { isActive: true },
      include: {
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
        _count: { select: { disposalRequests: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ data: batches })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "create")
    if (!(await isDisposalBatchSchemaReady())) return batchSchemaRequired()
    const packet = prepareDisposalBatchPacket(await request.json())
    if (packet.approverId === packet.requestedById) {
      return batchError("DISPOSAL_BATCH_SOD_CONFLICT", "Requester and assigned approver must be different")
    }

    const [assets, employees, pendingDisposalStatus] = await Promise.all([
      prisma.asset.findMany({
        where: { id: { in: packet.assetIds }, isActive: true },
        select: {
          id: true,
          assetTag: true,
          statusId: true,
          status: { select: { name: true, nameTh: true } },
          ...disposalReadinessAssetSelect,
        },
      }),
      prisma.employee.findMany({
        where: { id: { in: [packet.requestedById, packet.approverId].filter(Boolean) as string[] }, isActive: true },
        select: { id: true },
      }),
      prisma.assetStatus.findFirst({
        where: { isActive: true, OR: [{ name: "Pending Disposal" }, { nameTh: "รอตัดจำหน่าย" }] },
        select: { id: true },
      }),
    ])

    if (assets.length !== packet.assetIds.length) return batchError("DISPOSAL_BATCH_ASSET_NOT_FOUND", "One or more assets were not found", 404)
    if (employees.length !== (packet.approverId ? 2 : 1)) return batchError("DISPOSAL_BATCH_EMPLOYEE_NOT_FOUND", "Requester or approver is inactive or missing")
    if (!pendingDisposalStatus) return batchError("DISPOSAL_PENDING_STATUS_MISSING", "Pending Disposal asset status is not configured")

    const ineligible = assets.find((asset) => getDisposalAssetEligibilityError(asset.status) !== null)
    if (ineligible) return batchError("DISPOSAL_BATCH_ASSET_INELIGIBLE", `Asset ${ineligible.assetTag} is not eligible for disposal`)
    const blocked = assets.find((asset) => getDisposalReadinessBlockersForAsset(asset).length > 0)
    if (blocked) {
      return batchError(
        "DISPOSAL_BATCH_ASSET_BLOCKED",
        `Asset ${blocked.assetTag} has open operational work: ${getDisposalReadinessBlockersForAsset(blocked).join(", ")}`
      )
    }

    const openRequests = await prisma.disposalRequest.findMany({
      where: { assetId: { in: packet.assetIds }, isActive: true, requestStatus: { in: ["pending", "approved"] } },
      select: { disposalNo: true, asset: { select: { assetTag: true } } },
    })
    if (openRequests.length > 0) {
      return batchError(
        "DISPOSAL_BATCH_OPEN_REQUEST",
        `Open disposal requests already exist for: ${openRequests.map((item) => `${item.asset.assetTag} (${item.disposalNo})`).join(", ")}`
      )
    }

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const result = await withPrismaUniqueRetry(async () => {
      const [requestCount, batchCount] = await Promise.all([
        prisma.disposalRequest.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.disposalBatch.count({ where: { createdAt: { gte: start, lt: end } } }),
      ])

      return prisma.$transaction(async (tx) => {
        const batch = await tx.disposalBatch.create({
          data: {
            batchNo: `DPB-${datePart}-${String(batchCount + 1).padStart(4, "0")}`,
            disposalType: packet.disposalType,
            reason: packet.reason,
            requestedById: packet.requestedById,
            approverId: packet.approverId,
            saleValue: packet.saleValue,
            salvageValue: packet.salvageValue,
            createdBy: user.id,
            updatedBy: user.id,
          },
        })

        const requests = []
        const orderedAssetIds = [...packet.assetIds].sort()
        for (const [index, assetId] of orderedAssetIds.entries()) {
          const asset = assets.find((item) => item.id === assetId)!
          const statusUpdate = await tx.asset.updateMany({
            where: { id: assetId, statusId: asset.statusId, isActive: true },
            data: { statusId: pendingDisposalStatus.id, updatedBy: user.id },
          })
          if (statusUpdate.count !== 1) {
            throw new Error(`Asset ${asset.assetTag} changed while creating the disposal batch`)
          }
          const child = await tx.disposalRequest.create({
            data: {
              disposalNo: `DP-${datePart}-${String(requestCount + index + 1).padStart(4, "0")}`,
              assetId,
              batchId: batch.id,
              disposalType: packet.disposalType,
              reason: packet.reason,
              requestedById: packet.requestedById,
              approverId: packet.approverId,
              saleValue: packet.saleValue,
              salvageValue: packet.salvageValue,
              createdBy: user.id,
              updatedBy: user.id,
            },
            select: { id: true, disposalNo: true, assetId: true },
          })
          await tx.assetMovement.create({
            data: {
              assetId,
              movementType: "disposal_request",
              fromValue: asset.statusId,
              toValue: pendingDisposalStatus.id,
              reason: packet.reason,
              referenceType: "disposal",
              referenceId: child.id,
              performedBy: user.id,
              remark: `${packet.disposalType}; batch=${batch.batchNo}`,
            },
          })
          requests.push(child)
        }

        return { batch, requests }
      })
    })

    await logAudit({
      userId: user.id,
      action: "create_batch",
      module: "disposal",
      recordId: result.batch.id,
      newValue: { batchNo: result.batch.batchNo, assetIds: packet.assetIds, disposalType: packet.disposalType },
    })
    await Promise.all(result.requests.map((child) => logAudit({
      userId: user.id,
      action: "create",
      module: "disposal",
      recordId: child.id,
      newValue: { disposalNo: child.disposalNo, assetId: child.assetId, batchId: result.batch.id, disposalType: packet.disposalType },
    })))

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function batchError(code: string, error: string, status = 400) {
  return NextResponse.json({ code, error }, { status })
}

function batchSchemaRequired() {
  return batchError("DISPOSAL_BATCH_SCHEMA_REQUIRED", "Disposal batch database migration is required", 503)
}
