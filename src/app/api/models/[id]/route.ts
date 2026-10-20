import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { assetModelSchema } from "@/lib/validations/brand-model"

type AssetModelRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: AssetModelRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "view")

    const { id } = await context.params
    const model = await prisma.assetModel.findFirst({
      where: { id, isActive: true },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true } },
      },
    })

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    return NextResponse.json(model)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: AssetModelRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "edit")

    const { id } = await context.params
    const input = assetModelSchema.parse(await request.json())
    // An inactive record opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.assetModel.findFirst({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = await prisma.assetModel.update({ where: { id }, data: input })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "brand",
      recordId: model.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(model)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("name", "Model name already exists for this brand")
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: AssetModelRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "delete")

    const { id } = await context.params
    const existing = await prisma.assetModel.findFirst({ where: { id, isActive: true } })

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = await prisma.assetModel.update({
      where: { id },
      data: { isActive: false },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "brand",
      recordId: id,
      oldValue: existing,
      newValue: model,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
