import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetImportColumns, createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const [companies, branches, departments, locations, categories, brands, models, statuses, conditions, employees, suppliers] =
      await Promise.all([
        prisma.company.findMany({ where: { isActive: true }, select: { code: true, nameTh: true }, orderBy: { code: "asc" } }),
        prisma.branch.findMany({ where: { isActive: true }, select: { code: true, name: true, company: { select: { code: true } } }, orderBy: { code: "asc" } }),
        prisma.department.findMany({ where: { isActive: true }, select: { code: true, name: true, company: { select: { code: true } } }, orderBy: { code: "asc" } }),
        prisma.location.findMany({ where: { isActive: true }, select: { code: true, name: true, branch: { select: { code: true } } }, orderBy: { code: "asc" } }),
        prisma.assetCategory.findMany({ where: { isActive: true }, select: { code: true, name: true }, orderBy: { code: "asc" } }),
        prisma.assetBrand.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: "asc" } }),
        prisma.assetModel.findMany({ where: { isActive: true }, select: { name: true, brand: { select: { name: true } }, category: { select: { code: true } } }, orderBy: { name: "asc" } }),
        prisma.assetStatus.findMany({ where: { isActive: true }, select: { nameTh: true, name: true }, orderBy: { sortOrder: "asc" } }),
        prisma.assetCondition.findMany({ where: { isActive: true }, select: { nameTh: true, name: true }, orderBy: { sortOrder: "asc" } }),
        prisma.employee.findMany({ where: { isActive: true }, select: { code: true, fullNameTh: true }, orderBy: { code: "asc" } }),
        prisma.supplier.findMany({ where: { isActive: true }, select: { code: true, name: true }, orderBy: { code: "asc" } }),
      ])

    const workbook = createWorkbook()
    const template = workbook.addWorksheet("Asset Import")
    template.columns = assetImportColumns
    template.addRow({
      name: "Notebook Dell Latitude 5450",
      categoryCode: categories[0]?.code ?? "IT",
      companyCode: companies[0]?.code ?? "COMP",
      branchCode: branches[0]?.code ?? "HQ",
      currentLocationCode: locations[0]?.code ?? "STORE",
      status: statuses[0]?.nameTh ?? "พร้อมใช้งาน",
      condition: conditions[0]?.nameTh ?? "ดี",
      serialNumber: "SN-EXAMPLE-001",
      purchaseDate: "2026-05-01",
      purchasePrice: 25000,
    })
    assetImportColumns.forEach((column, index) => {
      const cell = template.getCell(1, index + 1)
      cell.note = column.note
    })
    styleWorksheetHeader(template)

    addReferenceSheet(workbook, "Companies", ["Code", "Name"], companies.map((item) => [item.code, item.nameTh]))
    addReferenceSheet(workbook, "Branches", ["Code", "Name", "Company Code"], branches.map((item) => [item.code, item.name, item.company.code]))
    addReferenceSheet(workbook, "Departments", ["Code", "Name", "Company Code"], departments.map((item) => [item.code, item.name, item.company?.code ?? ""]))
    addReferenceSheet(workbook, "Locations", ["Code", "Name", "Branch Code"], locations.map((item) => [item.code, item.name, item.branch.code]))
    addReferenceSheet(workbook, "Categories", ["Code", "Name"], categories.map((item) => [item.code, item.name]))
    addReferenceSheet(workbook, "Brands", ["Name"], brands.map((item) => [item.name]))
    addReferenceSheet(workbook, "Models", ["Name", "Brand", "Category Code"], models.map((item) => [item.name, item.brand.name, item.category.code]))
    addReferenceSheet(workbook, "Statuses", ["Thai Name", "Name"], statuses.map((item) => [item.nameTh, item.name]))
    addReferenceSheet(workbook, "Conditions", ["Thai Name", "Name"], conditions.map((item) => [item.nameTh, item.name]))
    addReferenceSheet(workbook, "Employees", ["Code", "Name"], employees.map((item) => [item.code, item.fullNameTh]))
    addReferenceSheet(workbook, "Suppliers", ["Code", "Name"], suppliers.map((item) => [item.code, item.name]))

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, "asset-import-template.xlsx")
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
