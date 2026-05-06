import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { categorySchema } from "@/lib/validations/category"

type CategoryRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: CategoryRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "view")

    const { id } = await context.params
    const category = await prisma.assetCategory.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            models: true,
            assets: true,
            customFieldDefs: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: CategoryRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "edit")

    const { id } = await context.params
    const input = categorySchema.parse(await request.json())
    const existing = await prisma.assetCategory.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const category = await prisma.assetCategory.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        updatedBy: user.id,
        customFieldDefs: {
          deleteMany: {},
          create: input.customFieldDefs.map((field, index) => ({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldLabelTh: field.fieldLabelTh,
            fieldType: field.fieldType,
            options: normalizeFieldOptions(field.options),
            isRequired: field.isRequired,
            sortOrder: field.sortOrder || index,
            isActive: field.isActive,
          })),
        },
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "category",
      recordId: category.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(category)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function normalizeFieldOptions(options?: string | null) {
  if (!options?.trim()) return null

  const parts = options
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.length > 0 ? JSON.stringify(parts) : null
}

export async function DELETE(_request: NextRequest, context: CategoryRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "delete")

    const { id } = await context.params
    const existing = await prisma.assetCategory.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const category = await prisma.assetCategory.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "category",
      recordId: id,
      oldValue: existing,
      newValue: category,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
