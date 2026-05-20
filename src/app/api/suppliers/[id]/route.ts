import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { supplierSchema } from "@/lib/validations/supplier"
import { getSupplierDeleteBlockReason } from "@/lib/organization-master-query"

type SupplierRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: SupplierRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "supplier", "view")

    const { id } = await context.params
    const supplier = await prisma.supplier.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: SupplierRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "supplier", "edit")

    const { id } = await context.params
    const input = supplierSchema.parse(await request.json())
    const existing = await prisma.supplier.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            assets: { where: { isActive: true } },
            maintenanceTickets: { where: { isActive: true } },
            purchaseDocuments: { where: { isActive: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const blockReason = getSupplierDeleteBlockReason({
      assets: existing._count.assets,
      maintenanceTickets: existing._count.maintenanceTickets,
      purchaseDocuments: existing._count.purchaseDocuments,
    })

    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "supplier",
      recordId: supplier.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(supplier)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: SupplierRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "supplier", "delete")

    const { id } = await context.params
    const existing = await prisma.supplier.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "supplier",
      recordId: id,
      oldValue: existing,
      newValue: supplier,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
