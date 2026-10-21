import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse, uniqueConflictResponse } from "@/lib/field-error-response"
import { duplicateCustomFieldNameErrors } from "@/lib/category-custom-field-names"
import { categorySchema } from "@/lib/validations/category"
import { saveCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { getCategoryDeleteBlockReason } from "@/lib/category-delete-guard"
import { isDeactivation } from "@/lib/master-data-query"

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
    // An inactive record opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.assetCategory.findFirst({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
            models: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    // The code is unique across active and inactive categories (V track spec §6.2).
    const duplicate = await prisma.assetCategory.findFirst({ where: { code: input.code, id: { not: id } }, select: { id: true } })
    if (duplicate) return uniqueConflictResponse("code", "Category code already exists")
    // Two custom fields with one name break the unique index on the custom-field rows, which a save writes again (V track spec §6.2).
    const fieldNameErrors = duplicateCustomFieldNameErrors(input.customFieldDefs)
    if (fieldNameErrors) {
      return fieldErrorResponse({ status: 409, error: "Custom field names must be unique in a category", code: "DUPLICATE", fieldErrors: fieldNameErrors })
    }
    // Only unticking "ใช้งาน" is guarded like ลบ: an inactive category with assets still saves (user decision 2026-10-21 Y5).
    if (isDeactivation(existing.isActive, input.isActive)) {
      const blockReason = getCategoryDeleteBlockReason({
        assets: existing._count.assets,
        models: existing._count.models,
      })
      if (blockReason) {
        return NextResponse.json({ error: blockReason }, { status: 409 })
      }
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
    await saveCategoryPhotoChecklist(category.id, input.photoChecklist, user.id)

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
      include: {
        _count: {
          select: {
            assets: true,
            models: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    const blockReason = getCategoryDeleteBlockReason({
      assets: existing._count.assets,
      models: existing._count.models,
    })
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
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
