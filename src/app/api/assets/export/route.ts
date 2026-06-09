import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { buildAssetOrderBy, buildAssetWhere, parseAssetListParams } from "@/lib/asset-list-query"
import { applyAssetCrossScopeFilter, formatAssetCrossScopeFlags } from "@/lib/asset-cross-scope"
import { assetExportColumns, createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const filters = parseAssetListParams(request.nextUrl.searchParams)
    const assets = await prisma.asset.findMany({
      where: await applyAssetCrossScopeFilter(buildAssetWhere(filters), filters.crossScope),
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true, company: { select: { code: true } } } },
        department: { select: { code: true, name: true } },
        custodian: {
          select: {
            code: true,
            fullNameTh: true,
            companyId: true,
            branchId: true,
            company: { select: { code: true, nameTh: true } },
            branch: { select: { code: true, name: true, company: { select: { code: true } } } },
          },
        },
        homeLocation: {
          select: {
            code: true,
            name: true,
            branchId: true,
            branch: { select: { code: true, name: true, company: { select: { code: true } } } },
          },
        },
        currentLocation: {
          select: {
            code: true,
            name: true,
            branchId: true,
            branch: { select: { code: true, name: true, company: { select: { code: true } } } },
          },
        },
        status: { select: { nameTh: true } },
        condition: { select: { nameTh: true } },
        supplier: { select: { code: true, name: true } },
        licenseAssignedAsset: { select: { assetTag: true, name: true } },
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
        ownershipType: normalizeAssetOwnershipType(asset.ownershipType),
        licenseTotalSeats: asset.licenseTotalSeats ?? "",
        licenseUsedSeats: asset.licenseUsedSeats ?? "",
        licenseAssignedAsset: asset.licenseAssignedAsset ? `${asset.licenseAssignedAsset.assetTag} - ${asset.licenseAssignedAsset.name}` : "",
        category: `${asset.category.code} - ${asset.category.name}`,
        company: `${asset.company.code} - ${asset.company.nameTh}`,
        branch: formatBranch(asset.branch),
        department: asset.department ? `${asset.department.code} - ${asset.department.name}` : "",
        custodian: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "",
        custodianCompany: asset.custodian ? `${asset.custodian.company.code} - ${asset.custodian.company.nameTh}` : "",
        custodianBranch: asset.custodian ? formatBranch(asset.custodian.branch) : "",
        homeLocation: asset.homeLocation ? `${asset.homeLocation.code} - ${asset.homeLocation.name}` : "",
        homeLocationBranch: asset.homeLocation ? formatBranch(asset.homeLocation.branch) : "",
        currentLocation: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
        currentLocationBranch: formatBranch(asset.currentLocation.branch),
        crossScopeFlags: formatAssetCrossScopeFlags(asset),
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

function formatBranch(branch: { code: string; name: string; company?: { code: string } | null }) {
  return `${branch.company?.code ? `${branch.company.code} / ` : ""}${branch.code} - ${branch.name}`
}
