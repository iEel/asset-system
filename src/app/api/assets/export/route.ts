import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { buildAssetOrderBy, buildAssetWhere, parseAssetListParams } from "@/lib/asset-list-query"
import { assetExportColumns, createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const filters = parseAssetListParams(request.nextUrl.searchParams)
    const assets = await prisma.asset.findMany({
      where: buildAssetWhere(filters),
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { nameTh: true } },
        condition: { select: { nameTh: true } },
        supplier: { select: { code: true, name: true } },
      },
      orderBy: buildAssetOrderBy(filters),
      take: 5000,
    })

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet("Assets")
    worksheet.columns = assetExportColumns
    worksheet.addRows(
      assets.map((asset) => ({
        assetTag: asset.assetTag,
        name: asset.name,
        serialNumber: asset.serialNumber ?? "",
        category: `${asset.category.code} - ${asset.category.name}`,
        company: `${asset.company.code} - ${asset.company.nameTh}`,
        branch: `${asset.company.code} / ${asset.branch.code} - ${asset.branch.name}`,
        department: asset.department ? `${asset.department.code} - ${asset.department.name}` : "",
        custodian: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "",
        currentLocation: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
        status: asset.status.nameTh,
        condition: asset.condition.nameTh,
        purchaseDate: toExcelDate(asset.purchaseDate),
        purchasePrice: asset.purchasePrice == null ? "" : Number(asset.purchasePrice),
        supplier: asset.supplier ? `${asset.supplier.code} - ${asset.supplier.name}` : "",
        fixedAssetCode: asset.fixedAssetCode ?? "",
        poNumber: asset.poNumber ?? "",
        invoiceNumber: asset.invoiceNumber ?? "",
        remark: asset.remark ?? "",
      }))
    )
    styleWorksheetHeader(worksheet)
    worksheet.getColumn("purchasePrice").numFmt = "#,##0.00"

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `assets-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
