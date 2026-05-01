import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetModelSchema } from "@/lib/validations/brand-model"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const models = await prisma.assetModel.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { specs: { contains: search } },
                { brand: { name: { contains: search } } },
                { category: { code: { contains: search } } },
                { category: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(models)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "create")

    const input = assetModelSchema.parse(await request.json())
    const model = await prisma.assetModel.create({ data: input })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "brand",
      recordId: model.id,
      newValue: input,
    })

    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
