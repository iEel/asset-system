import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { assetModelSchema } from "@/lib/validations/brand-model"
import { findModelNameClash, nameClashBody } from "@/lib/brand-model-duplicates"

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
    const { source, ...data } = input
    // The duplicate rule (spec §4.1) first; the database unique key stays as the fallback below.
    const clash = await findModelNameClash(prisma, data.brandId, data.name)
    if (clash) return NextResponse.json(nameClashBody("model", clash), { status: 409 })

    const model = await prisma.assetModel.create({ data })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "brand",
      recordId: model.id,
      newValue: { ...data, source },
    })

    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("name", "Model name already exists for this brand")
    return errorResponse(error, 400)
  }
}
