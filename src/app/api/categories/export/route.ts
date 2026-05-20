import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { buildCategoryExportRows } from "@/lib/category-excel"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { parseCategoryPrefixMap } from "@/lib/category-list-query"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "export")

    const [categories, checklistSettings, prefixSetting] = await Promise.all([
      prisma.assetCategory.findMany({
        where: { isActive: true },
        include: {
          customFieldDefs: {
            where: { isActive: true },
            select: { fieldName: true, fieldLabel: true, fieldType: true, isRequired: true },
            orderBy: { sortOrder: "asc" },
          },
          _count: { select: { assets: true, models: true, customFieldDefs: true } },
        },
        orderBy: { code: "asc" },
      }),
      prisma.systemSetting.findMany({
        where: { key: { startsWith: categoryPhotoChecklistKey("") } },
        select: { key: true, value: true },
      }),
      prisma.systemSetting.findUnique({
        where: { key: assetTagCategoryPrefixesKey },
        select: { value: true },
      }),
    ])

    const prefixByCategoryId = parseCategoryPrefixMap(prefixSetting?.value)
    const categoryIdByCode = new Map(categories.map((category) => [category.code, category.id]))
    const prefixByCategoryCode = new Map(
      categories
        .map((category) => [category.code, prefixByCategoryId[category.id] ?? ""] as const)
        .filter(([, prefix]) => prefix)
    )
    const checklistByCategoryId = new Map(
      checklistSettings.map((setting) => [
        setting.key.replace(categoryPhotoChecklistKey(""), ""),
        parsePhotoChecklist(setting.value),
      ])
    )

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet("Categories")
    worksheet.columns = [
      { header: "Category Code", key: "code", width: 18 },
      { header: "Category Name", key: "name", width: 30 },
      { header: "Description", key: "description", width: 42 },
      { header: "Models", key: "models", width: 12 },
      { header: "Assets", key: "assets", width: 12 },
      { header: "Custom Fields", key: "customFields", width: 60 },
      { header: "Photo Checklist", key: "photoChecklist", width: 50 },
      { header: "Asset Tag Prefix", key: "assetTagPrefix", width: 18 },
      { header: "Active", key: "active", width: 10 },
    ]
    worksheet.addRows(buildCategoryExportRows(categories, { categoryIdByCode, checklistByCategoryId, prefixByCategoryCode }))
    styleWorksheetHeader(worksheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `categories-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
