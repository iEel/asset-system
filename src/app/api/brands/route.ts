import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { brandSchema } from "@/lib/validations/brand-model"
import { findBrandNameClash, nameClashBody } from "@/lib/brand-model-duplicates"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const brands = await prisma.assetBrand.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search } } : {}),
      },
      include: {
        _count: {
          select: {
            models: true,
            assets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(brands)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "create")

    const input = brandSchema.parse(await request.json())
    const { source, ...data } = input
    // The duplicate rule (spec §4.1) first; the database unique key stays as the fallback below.
    const clash = await findBrandNameClash(prisma, data.name)
    if (clash) return NextResponse.json(nameClashBody("brand", clash), { status: 409 })

    const brand = await prisma.assetBrand.create({ data })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "brand",
      recordId: brand.id,
      newValue: { ...data, source },
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("name", "Brand name already exists")
    return errorResponse(error, 400)
  }
}
