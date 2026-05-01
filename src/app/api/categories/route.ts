import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { categorySchema } from "@/lib/validations/category"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const categories = await prisma.assetCategory.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            models: true,
            assets: true,
            customFieldDefs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(categories)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "create")

    const input = categorySchema.parse(await request.json())
    const category = await prisma.assetCategory.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "category",
      recordId: category.id,
      newValue: input,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
