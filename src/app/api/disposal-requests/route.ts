import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { disposalRequestSchema } from "@/lib/validations/disposal"

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
    const asset = await prisma.asset.findFirst({
      where: { id: input.assetId, isActive: true },
      select: { id: true, statusId: true },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const existingOpenRequest = await prisma.disposalRequest.findFirst({
      where: {
        assetId: input.assetId,
        isActive: true,
        requestStatus: { in: ["pending", "approved"] },
      },
      select: { disposalNo: true },
    })
    if (existingOpenRequest) {
      return NextResponse.json(
        { error: `This asset already has an open disposal request: ${existingOpenRequest.disposalNo}` },
        { status: 400 }
      )
    }

    const pendingDisposalStatus = await prisma.assetStatus.findFirst({
      where: { OR: [{ name: "Pending Disposal" }, { nameTh: "รอตัดจำหน่าย" }] },
      select: { id: true },
    })
    const disposalNo = await generateDisposalNo()

    const disposalRequest = await prisma.$transaction(async (tx) => {
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
        include: disposalInclude,
      })

      if (pendingDisposalStatus && pendingDisposalStatus.id !== asset.statusId) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { statusId: pendingDisposalStatus.id, updatedBy: user.id },
        })
      }

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          movementType: "disposal_request",
          fromValue: asset.statusId,
          toValue: pendingDisposalStatus?.id ?? asset.statusId,
          reason: input.reason,
          referenceType: "disposal",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.disposalType,
        },
      })

      return record
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
