import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { buildCategoryTemplateRows } from "@/lib/category-excel"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "category", "create")

    const existingCategories = await prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    })
    const rows = buildCategoryTemplateRows()

    const workbook = createWorkbook()
    const categoriesSheet = workbook.addWorksheet("Categories")
    categoriesSheet.columns = [
      { header: "Category Code", key: "code", width: 18 },
      { header: "Category Name", key: "name", width: 30 },
      { header: "Description", key: "description", width: 42 },
      { header: "Active", key: "active", width: 10 },
    ]
    categoriesSheet.addRows(rows.categories)
    styleWorksheetHeader(categoriesSheet)

    const customFieldsSheet = workbook.addWorksheet("Custom Fields")
    customFieldsSheet.columns = [
      { header: "Category Code", key: "categoryCode", width: 18 },
      { header: "Field Name", key: "fieldName", width: 22 },
      { header: "Field Label", key: "fieldLabel", width: 28 },
      { header: "Thai Label", key: "fieldLabelTh", width: 28 },
      { header: "Field Type", key: "fieldType", width: 16 },
      { header: "Options", key: "options", width: 40 },
      { header: "Required", key: "required", width: 12 },
      { header: "Active", key: "active", width: 10 },
    ]
    customFieldsSheet.addRows(rows.customFields)
    styleWorksheetHeader(customFieldsSheet)

    const checklistSheet = workbook.addWorksheet("Photo Checklist")
    checklistSheet.columns = [
      { header: "Category Code", key: "categoryCode", width: 18 },
      { header: "Photo Item", key: "item", width: 40 },
    ]
    checklistSheet.addRows(rows.photoChecklist)
    styleWorksheetHeader(checklistSheet)

    const referenceSheet = workbook.addWorksheet("Existing Categories")
    referenceSheet.columns = [
      { header: "Category Code", key: "code", width: 18 },
      { header: "Category Name", key: "name", width: 30 },
    ]
    referenceSheet.addRows(existingCategories)
    styleWorksheetHeader(referenceSheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, "category-import-template.xlsx")
  } catch (error) {
    return errorResponse(error)
  }
}
