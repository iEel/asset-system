import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "create")

    const [brands, categories] = await Promise.all([
      prisma.assetBrand.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.assetCategory.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ])

    const workbook = createWorkbook()
    const brandSheet = workbook.addWorksheet("Brands")
    brandSheet.columns = [
      { header: "Brand Name", key: "name", width: 34 },
      { header: "Active", key: "active", width: 12 },
    ]
    brandSheet.addRow({ name: "Dell", active: "Y" })
    brandSheet.addRow({ name: "HP", active: "Y" })
    styleWorksheetHeader(brandSheet)

    const modelSheet = workbook.addWorksheet("Models")
    modelSheet.columns = [
      { header: "Model Name", key: "name", width: 34 },
      { header: "Brand Name", key: "brand", width: 28 },
      { header: "Category Code", key: "categoryCode", width: 18 },
      { header: "Specifications", key: "specs", width: 60 },
      { header: "Active", key: "active", width: 12 },
    ]
    modelSheet.addRow({
      name: "OptiPlex 3050 SFF",
      brand: "Dell",
      categoryCode: categories[0]?.code ?? "Computer",
      specs: "CPU: Intel Core i5 · Memory: 8GB · Storage: 256GB SSD",
      active: "Y",
    })
    styleWorksheetHeader(modelSheet)

    addReferenceSheet(workbook, "Existing Brands", ["Brand Name"], brands.map((brand) => [brand.name]))
    addReferenceSheet(workbook, "Categories", ["Category Code", "Category Name"], categories.map((category) => [category.code, category.name]))

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, "brand-model-import-template.xlsx")
  } catch (error) {
    return errorResponse(error)
  }
}

function addReferenceSheet(workbook: ReturnType<typeof createWorkbook>, name: string, headers: string[], rows: string[][]) {
  const worksheet = workbook.addWorksheet(name)
  worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(18, header.length + 8) }))
  rows.forEach((row) => worksheet.addRow(row))
  styleWorksheetHeader(worksheet)
}
