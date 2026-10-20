import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { supplierSchema } from "@/lib/validations/supplier"
import { getSupplierDeleteBlockReason } from "@/lib/organization-master-query"
import { shouldBlockSupplierLifecycleChange } from "@/lib/supplier-lifecycle-policy"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"

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
    // An inactive record opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.supplier.findFirst({
      where: { id },
      include: {
        _count: {
          select: {
            assets: { where: { isActive: true } },
            maintenanceTickets: { where: { isActive: true } },
            maintenancePlans: { where: { isActive: true } },
            purchaseDocuments: { where: { isActive: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const relationshipCounts = {
      assets: existing._count.assets,
      maintenanceTickets: existing._count.maintenanceTickets,
      maintenancePlans: existing._count.maintenancePlans,
      purchaseDocuments: existing._count.purchaseDocuments,
    }

    if (shouldBlockSupplierLifecycleChange({
      currentIsActive: existing.isActive,
      nextIsActive: input.isActive,
      operation: "update",
      counts: relationshipCounts,
    })) {
      const blockReason = getSupplierDeleteBlockReason(relationshipCounts)
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
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("code", "Supplier code already exists")
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
      include: {
        _count: {
          select: {
            assets: { where: { isActive: true } },
            maintenanceTickets: { where: { isActive: true } },
            maintenancePlans: { where: { isActive: true } },
            purchaseDocuments: { where: { isActive: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const relationshipCounts = {
      assets: existing._count.assets,
      maintenanceTickets: existing._count.maintenanceTickets,
      maintenancePlans: existing._count.maintenancePlans,
      purchaseDocuments: existing._count.purchaseDocuments,
    }

    if (shouldBlockSupplierLifecycleChange({
      currentIsActive: existing.isActive,
      nextIsActive: false,
      operation: "delete",
      counts: relationshipCounts,
    })) {
      const blockReason = getSupplierDeleteBlockReason(relationshipCounts)
      return NextResponse.json({ error: blockReason }, { status: 409 })
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
