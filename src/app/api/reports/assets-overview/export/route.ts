import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { errorResponse } from "@/lib/api-response"
import { buildAssetWhere, parseAssetListParams } from "@/lib/asset-list-query"
import { assetMissingResponsibilityWhere, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { buildDepreciationSummary } from "@/lib/asset-depreciation"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "report", "export")
    const filters = parseAssetListParams(request.nextUrl.searchParams)
    const assetWhere = buildAssetWhere(filters)

    const [totalAssets, totalValue, byStatus, byCategory, byCompany, byBranch, byDepartment, byOwnership, licenseSummary, dataQuality, depreciationAssets] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.aggregate({ where: assetWhere, _sum: { purchasePrice: true } }),
      prisma.asset.groupBy({ by: ["statusId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["categoryId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["companyId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["branchId"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["departmentId"], where: { ...assetWhere, departmentId: { not: null } }, _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["ownershipType"], where: assetWhere, _count: { _all: true } }),
      prisma.asset.aggregate({
        where: { AND: [assetWhere, { ownershipType: "software_license" }] },
        _count: { _all: true },
        _sum: { licenseTotalSeats: true, licenseUsedSeats: true },
      }),
      getAssetDataQualityCounts(assetWhere),
      prisma.asset.findMany({
        where: assetWhere,
        select: {
          id: true,
          assetTag: true,
          name: true,
          ownershipType: true,
          purchasePrice: true,
          purchaseDate: true,
          category: { select: { code: true, name: true } },
        },
      }),
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
    const depreciationSummary = buildDepreciationSummary(
      depreciationAssets.map((asset) => ({
        id: asset.id,
        label: `${asset.assetTag} - ${asset.name}`,
        categoryCode: asset.category.code,
        categoryName: asset.category.name,
        ownershipType: asset.ownershipType,
        purchasePrice: asset.purchasePrice == null ? null : Number(asset.purchasePrice),
        purchaseDate: asset.purchaseDate,
      }))
    )

    const workbook = createWorkbook()
    const summarySheet = workbook.addWorksheet("Overview")
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 34 },
      { header: "Value", key: "value", width: 18 },
    ]
    summarySheet.addRows([
      { metric: "Total Assets", value: totalAssets },
      { metric: "Total Purchase Value", value: Number(totalValue._sum.purchasePrice ?? 0) },
      { metric: "Software/License Assets", value: licenseSummary._count._all },
      { metric: "License Total Seats", value: Number(licenseSummary._sum.licenseTotalSeats ?? 0) },
      { metric: "License Used Seats", value: Number(licenseSummary._sum.licenseUsedSeats ?? 0) },
      { metric: "Accumulated Depreciation", value: depreciationSummary.totalAccumulatedDepreciation },
      { metric: "Net Book Value", value: depreciationSummary.totalNetBookValue },
      { metric: "Fully Depreciated Assets", value: depreciationSummary.fullyDepreciatedCount },
      { metric: "Missing Accounting Info", value: depreciationSummary.missingAccountingInfoCount },
      { metric: "Missing Responsibility", value: dataQuality.missingCustodian },
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
    addGroupSheet(workbook, "By Ownership Type", byOwnership.map((item) => [normalizeAssetOwnershipType(item.ownershipType), item._count._all]))
    addDepreciationSheet(workbook, depreciationSummary.depreciableAssets)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `asset-overview-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}

async function getAssetDataQualityCounts(assetWhere: ReturnType<typeof buildAssetWhere>) {
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const [missingCustodian, missingSerial, missingPhoto, warrantyExpiring] = await Promise.all([
    prisma.asset.count({ where: { AND: [assetWhere, assetMissingResponsibilityWhere] } }),
    prisma.asset.count({ where: { AND: [assetWhere, { OR: [{ serialNumber: null }, { serialNumber: "" }] }] } }),
    prisma.asset.count({
      where: {
        AND: [
          assetWhere,
          { ownershipType: { not: "software_license" } },
          { attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } } },
        ],
      },
    }),
    prisma.asset.count({ where: { AND: [assetWhere, { warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } }] } }),
  ])
  return { missingCustodian, missingSerial, missingPhoto, warrantyExpiring }
}

function addDepreciationSheet(workbook: ReturnType<typeof createWorkbook>, rows: ReturnType<typeof buildDepreciationSummary>["depreciableAssets"]) {
  const sheet = workbook.addWorksheet("Depreciation")
  sheet.columns = [
    { header: "Asset", key: "asset", width: 44 },
    { header: "Purchase Price", key: "purchasePrice", width: 16 },
    { header: "Purchase Date", key: "purchaseDate", width: 16 },
    { header: "Useful Life Months", key: "usefulLifeMonths", width: 18 },
    { header: "Age Months", key: "ageMonths", width: 14 },
    { header: "Accumulated Depreciation", key: "accumulatedDepreciation", width: 24 },
    { header: "Net Book Value", key: "netBookValue", width: 18 },
    { header: "Depreciated Ratio", key: "depreciatedRatio", width: 18 },
    { header: "Status", key: "status", width: 18 },
  ]
  sheet.addRows(
    rows.map((asset) => ({
      asset: asset.label,
      purchasePrice: asset.purchasePrice,
      purchaseDate: asset.purchaseDate,
      usefulLifeMonths: asset.usefulLifeMonths,
      ageMonths: asset.ageMonths,
      accumulatedDepreciation: asset.accumulatedDepreciation,
      netBookValue: asset.netBookValue,
      depreciatedRatio: asset.depreciatedRatio,
      status: asset.status,
    }))
  )
  sheet.getColumn("purchasePrice").numFmt = "#,##0.00"
  sheet.getColumn("purchaseDate").numFmt = "yyyy-mm-dd"
  sheet.getColumn("accumulatedDepreciation").numFmt = "#,##0.00"
  sheet.getColumn("netBookValue").numFmt = "#,##0.00"
  sheet.getColumn("depreciatedRatio").numFmt = "0.0%"
  styleWorksheetHeader(sheet)
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
