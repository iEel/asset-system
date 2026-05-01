import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { brandSchema } from "@/lib/validations/brand-model"

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
    const brand = await prisma.assetBrand.create({ data: input })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "brand",
      recordId: brand.id,
      newValue: input,
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
