// The asset's history as Excel (group 1 spec §7.6): every event, newest first, at most 5,000, in the page's language.
import { NextRequest, NextResponse } from "next/server"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { getAssetHistory } from "@/lib/asset-history"
import {
  ASSET_HISTORY_EXCEL_COLUMNS,
  ASSET_HISTORY_EXPORT_LIMIT,
  assetHistoryExcelRow,
  buildAssetHistoryExportFilename,
} from "@/lib/asset-history-rules"
import { ASSET_MOVEMENT_DOCUMENT_PERMISSION, type AssetMovementDocumentKind } from "@/lib/asset-movement-labels"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")
    const { id } = await context.params
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true }, select: { assetTag: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const [{ events }, t] = await Promise.all([getAssetHistory(id, locale, { limit: ASSET_HISTORY_EXPORT_LIMIT }), getTranslations({ locale })])
    // A document's code only for a kind the downloader may open, as the page shows it (R52).
    const canOpen = (kind: AssetMovementDocumentKind) => hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind].module, "view")
    const visible = events.map((event) => ({ ...event, document: event.document && canOpen(event.document.kind) ? event.document : null }))
    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet(t("asset.history.exportSheet"))
    worksheet.columns = ASSET_HISTORY_EXCEL_COLUMNS.map((column) => ({ header: t(column.headerKey), key: column.key, width: column.width }))
    worksheet.addRows(visible.map((event) => assetHistoryExcelRow(event, t)))
    styleWorksheetHeader(worksheet)
    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, buildAssetHistoryExportFilename(asset.assetTag, new Date()))
  } catch (error) {
    return errorResponse(error)
  }
}
