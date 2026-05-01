import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { brandSchema } from "@/lib/validations/brand-model"

type BrandRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: BrandRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "view")

    const { id } = await context.params
    const brand = await prisma.assetBrand.findFirst({
      where: { id, isActive: true },
      include: { _count: { select: { models: true, assets: true } } },
    })

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: BrandRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "edit")

    const { id } = await context.params
    const input = brandSchema.parse(await request.json())
    const existing = await prisma.assetBrand.findFirst({ where: { id, isActive: true } })

    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    const brand = await prisma.assetBrand.update({ where: { id }, data: input })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "brand",
      recordId: brand.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(brand)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: BrandRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "delete")

    const { id } = await context.params
    const existing = await prisma.assetBrand.findFirst({ where: { id, isActive: true } })

    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    const brand = await prisma.assetBrand.update({
      where: { id },
      data: { isActive: false },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "brand",
      recordId: id,
      oldValue: existing,
      newValue: brand,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
