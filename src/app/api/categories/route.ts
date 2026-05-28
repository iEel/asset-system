import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { categorySchema, type CategoryInput } from "@/lib/validations/category"
import { saveCategoryPhotoChecklist } from "@/lib/category-photo-checklist"

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
    const existingInactiveCategory = await prisma.assetCategory.findFirst({
      where: { code: input.code, isActive: false },
      include: {
        _count: {
          select: {
            assets: true,
            models: true,
          },
        },
      },
    })
    const category = existingInactiveCategory
      ? await prisma.assetCategory.update({
          where: { id: existingInactiveCategory.id },
          data: {
            code: input.code,
            name: input.name,
            description: input.description,
            isActive: input.isActive,
            updatedBy: user.id,
            ...(existingInactiveCategory._count.assets === 0 && existingInactiveCategory._count.models === 0
              ? { customFieldDefs: buildCustomFieldDefsWrite(input.customFieldDefs) }
              : {}),
          },
        })
      : await prisma.assetCategory.create({
          data: {
            code: input.code,
            name: input.name,
            description: input.description,
            isActive: input.isActive,
            createdBy: user.id,
            updatedBy: user.id,
            customFieldDefs: buildCustomFieldDefsWrite(input.customFieldDefs),
          },
        })
    await saveCategoryPhotoChecklist(category.id, input.photoChecklist, user.id)

    await logAudit({
      userId: user.id,
      action: existingInactiveCategory ? "reactivate" : "create",
      module: "category",
      recordId: category.id,
      oldValue: existingInactiveCategory,
      newValue: input,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function buildCustomFieldDefsWrite(customFieldDefs: CategoryInput["customFieldDefs"]) {
  return {
    deleteMany: {},
    create: customFieldDefs.map((field, index) => ({
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldLabelTh: field.fieldLabelTh,
      fieldType: field.fieldType,
      options: normalizeFieldOptions(field.options),
      isRequired: field.isRequired,
      sortOrder: field.sortOrder || index,
      isActive: field.isActive,
    })),
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
