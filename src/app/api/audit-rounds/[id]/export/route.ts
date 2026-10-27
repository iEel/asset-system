import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { auditResultColumns, createAuditWorkbook, finalizeAuditWorksheet, workbookResponse } from "@/lib/audit-excel"
import { buildAuditReferenceLabels } from "@/lib/audit-finding-labels"
import { resolveAuditRoundExportFilters } from "@/lib/audit-round-list-lookups"
import {
  auditRoundItemListOrderBy,
  buildAuditExportFilterLabel,
  buildAuditExportFilename,
  buildAuditExportWorksheetName,
  buildAuditRoundItemWhere,
  type AuditRoundItemWhereInput,
} from "@/lib/audit-round-result-filters"

type AuditExportContext = {
  params: Promise<{ id: string }>
}

type AuditExportRow = {
  assetTag: string
  assetName: string
  expectedLocationId: string | null
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  auditStatus: string
  auditResult: string
  reconcileStatus: string
  scanCount: number
  scannedAt: Date | string
  lastScanAt: Date | string
  remark: string
}

export async function GET(request: NextRequest, context: AuditExportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const { id } = await context.params
    const [round, exportFilters] = await Promise.all([
      prisma.auditRound.findFirst({ where: { id, isActive: true }, select: { id: true, auditNo: true, name: true, status: true } }),
      resolveAuditRoundExportFilters(id, request.nextUrl.searchParams),
    ])
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "cancelled") {
      return NextResponse.json({ error: "Audit round is cancelled" }, { status: 400 })
    }
    // The export is the page's list (spec §8 "ตามตัวกรองที่เลือก"): every filter, the room search and อื่น ๆ included,
    // the out-of-scope finds as items (P2-R4). An unknown id exports as if absent, as the page's redirect shows (R13).
    const { filters, whereInput, company, branch, category } = exportFilters
    const labelInput = { result: filters.result, search: filters.search, company, branch, category, field: filters.field, components: filters.components }
    const filterLabel = buildAuditExportFilterLabel(labelInput)
    const rows = await buildAuditItemExportRows(whereInput)
    const labels = await buildAuditReferenceLabels(
      rows.flatMap((row) => [
        row.expectedLocationId,
        row.actualLocationId,
        row.expectedCustodianId,
        row.actualCustodianId,
        row.expectedDepartmentId,
        row.actualDepartmentId,
        row.expectedConditionId,
        row.actualConditionId,
      ])
    )

    const workbook = createAuditWorkbook()
    const worksheet = workbook.addWorksheet(buildAuditExportWorksheetName(filterLabel))
    worksheet.columns = auditResultColumns
    worksheet.addRows(
      rows.map((row) => ({
        auditNo: round.auditNo,
        auditName: round.name,
        assetTag: row.assetTag,
        assetName: row.assetName,
        expectedLocation: labelOrBlank(labels, row.expectedLocationId),
        expectedCustodian: labelOrBlank(labels, row.expectedCustodianId),
        expectedDepartment: labelOrBlank(labels, row.expectedDepartmentId),
        expectedCondition: labelOrBlank(labels, row.expectedConditionId),
        actualLocation: labelOrBlank(labels, row.actualLocationId),
        actualCustodian: labelOrBlank(labels, row.actualCustodianId),
        actualDepartment: labelOrBlank(labels, row.actualDepartmentId),
        actualCondition: labelOrBlank(labels, row.actualConditionId),
        auditStatus: row.auditStatus,
        auditResult: row.auditResult,
        reconcileStatus: row.reconcileStatus,
        scanCount: row.scanCount,
        scannedAt: row.scannedAt,
        lastScanAt: row.lastScanAt,
        remark: row.remark,
      }))
    )
    finalizeAuditWorksheet(worksheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, buildAuditExportFilename({ prefix: "audit-result", auditNo: round.auditNo, ...labelInput, extension: "xlsx" }))
  } catch (error) {
    return errorResponse(error)
  }
}

async function buildAuditItemExportRows(whereInput: AuditRoundItemWhereInput): Promise<AuditExportRow[]> {
  const items = await prisma.auditItem.findMany({
    where: buildAuditRoundItemWhere(whereInput),
    orderBy: auditRoundItemListOrderBy,
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true,
        },
      },
    },
  })

  return items.map((item) => ({
    assetTag: item.asset.assetTag,
    assetName: item.asset.name,
    expectedLocationId: item.expectedLocationId,
    expectedCustodianId: item.expectedCustodianId,
    expectedDepartmentId: item.expectedDepartmentId,
    expectedConditionId: item.expectedConditionId,
    actualLocationId: item.actualLocationId,
    actualCustodianId: item.actualCustodianId,
    actualDepartmentId: item.actualDepartmentId,
    actualConditionId: item.actualConditionId,
    auditStatus: item.auditStatus,
    auditResult: item.auditResult ?? "",
    reconcileStatus: item.reconcileStatus ?? "",
    scanCount: item.scanCount,
    scannedAt: item.scannedAt ?? "",
    lastScanAt: item.lastScanAt ?? "",
    remark: item.remark ?? "",
  }))
}

function labelOrBlank(labels: Map<string, string>, id?: string | null) {
  if (!id) return ""
  return labels.get(id) ?? id
}
