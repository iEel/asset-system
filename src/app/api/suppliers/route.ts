import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { supplierSchema } from "@/lib/validations/supplier"
import { getSupplierApiError } from "@/lib/supplier-api-error"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "supplier", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { contactPerson: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "supplier", "create")

    const input = supplierSchema.parse(await request.json())
    const supplier = await prisma.supplier.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "supplier",
      recordId: supplier.id,
      newValue: input,
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    const supplierError = getSupplierApiError(error)
    if (supplierError) return NextResponse.json(supplierError.payload, { status: supplierError.status })
    return errorResponse(error, 400)
  }
}
