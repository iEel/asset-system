import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckoutSchema } from "@/lib/validations/asset-operations"

type CheckoutContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: CheckoutContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetCheckoutSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const inUseStatus = await prisma.assetStatus.findFirst({
      where: {
        isActive: true,
        OR: [{ name: { contains: "In Use" } }, { nameTh: { contains: "ใช้งาน" } }],
      },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    })

    const nextLocationId = input.locationId ?? asset.currentLocationId
    const nextCustodianId = input.checkoutType === "user" ? input.custodianId : asset.custodianId
    const nextDepartmentId = input.checkoutType === "department" ? input.departmentId : asset.departmentId

    const checkout = await prisma.$transaction(async (tx) => {
      const record = await tx.assetCheckout.create({
        data: {
          assetId: id,
          checkoutType: input.checkoutType,
          custodianId: input.checkoutType === "user" ? input.custodianId : null,
          departmentId: input.checkoutType === "department" ? input.departmentId : null,
          locationId: input.checkoutType === "location" ? input.locationId : null,
          parentAssetId: input.checkoutType === "asset" ? input.parentAssetId : null,
          checkoutDate: input.checkoutDate,
          expectedReturnDate: input.expectedReturnDate,
          conditionBefore: input.conditionBefore,
          remark: input.remark,
          checkedOutBy: user.id,
          receiverSignature: input.receiverSignature,
        },
      })

      await tx.asset.update({
        where: { id },
        data: {
          statusId: inUseStatus?.id ?? asset.statusId,
          currentLocationId: nextLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
          updatedBy: user.id,
        },
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "checkout",
          fromValue: asset.currentLocationId,
          toValue: nextLocationId,
          reason: "Asset checkout",
          referenceType: "checkout",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.remark,
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "checkout",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkoutId: checkout.id },
    })

    return NextResponse.json(checkout, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
