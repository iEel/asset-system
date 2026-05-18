import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { errorResponse } from "@/lib/api-response"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "report", "export")

    const [totalAssets, totalValue, byStatus, byCategory, byCompany, byBranch, byDepartment, dataQuality] = await Promise.all([
      prisma.asset.count({ where: { isActive: true } }),
      prisma.asset.aggregate({ where: { isActive: true }, _sum: { purchasePrice: true } }),
      prisma.asset.groupBy({ by: ["statusId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["categoryId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["companyId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["branchId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["departmentId"], where: { isActive: true, departmentId: { not: null } }, _count: { _all: true } }),
      getAssetDataQualityCounts(),
    ])

    const [statuses, categories, companies, branches, departments] = await Promise.all([
      prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
      prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
      prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
      prisma.branch.findMany({ where: { id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, code: true, name: true } }),
      prisma.department.findMany({ where: { id: { in: byDepartment.map((item) => item.departmentId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, name: true } }),
    ])
    const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
    const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
    const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))
    const branchMap = new Map(branches.map((branch) => [branch.id, `${branch.code} - ${branch.name}`]))
    const departmentMap = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))

    const workbook = createWorkbook()
    const summarySheet = workbook.addWorksheet("Overview")
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 34 },
      { header: "Value", key: "value", width: 18 },
    ]
    summarySheet.addRows([
      { metric: "Total Assets", value: totalAssets },
      { metric: "Total Purchase Value", value: Number(totalValue._sum.purchasePrice ?? 0) },
      { metric: "Missing Custodian", value: dataQuality.missingCustodian },
      { metric: "Missing Serial Number", value: dataQuality.missingSerial },
      { metric: "Missing Asset Photo", value: dataQuality.missingPhoto },
      { metric: "Warranty Expiring in 30 Days", value: dataQuality.warrantyExpiring },
    ])
    styleWorksheetHeader(summarySheet)

    addGroupSheet(workbook, "By Status", byStatus.map((item) => [statusMap.get(item.statusId) ?? item.statusId, item._count._all]))
    addGroupSheet(workbook, "By Category", byCategory.map((item) => [categoryMap.get(item.categoryId) ?? item.categoryId, item._count._all]))
    addGroupSheet(workbook, "By Company", byCompany.map((item) => [companyMap.get(item.companyId) ?? item.companyId, item._count._all]))
    addGroupSheet(workbook, "By Branch", byBranch.map((item) => [branchMap.get(item.branchId) ?? item.branchId, item._count._all]))
    addGroupSheet(workbook, "By Department", byDepartment.map((item) => [departmentMap.get(item.departmentId ?? "") ?? item.departmentId ?? "Unassigned", item._count._all]))

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `asset-overview-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}

async function getAssetDataQualityCounts() {
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const [missingCustodian, missingSerial, missingPhoto, warrantyExpiring] = await Promise.all([
    prisma.asset.count({ where: { isActive: true, custodianId: null } }),
    prisma.asset.count({ where: { isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] } }),
    prisma.asset.count({
      where: { isActive: true, attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
    }),
    prisma.asset.count({ where: { isActive: true, warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } } }),
  ])
  return { missingCustodian, missingSerial, missingPhoto, warrantyExpiring }
}

function addGroupSheet(workbook: ReturnType<typeof createWorkbook>, title: string, rows: Array<[string, number]>) {
  const sheet = workbook.addWorksheet(title)
  sheet.columns = [
    { header: "Group", key: "group", width: 48 },
    { header: "Asset Count", key: "assetCount", width: 16 },
  ]
  sheet.addRows(rows.map(([group, assetCount]) => ({ group, assetCount })))
  styleWorksheetHeader(sheet)
}
