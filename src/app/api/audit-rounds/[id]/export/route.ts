import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { auditResultColumns, createAuditWorkbook, finalizeAuditWorksheet, workbookResponse } from "@/lib/audit-excel"
import {
  buildAuditExportFilterLabel,
  buildAuditExportFilename,
  buildAuditExportWorksheetName,
  buildAuditRoundItemWhere,
  buildAuditRoundScanHistoryWhere,
  isAuditRoundScanHistoryResultFilter,
  resolveAuditRoundResultFilter,
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
    const result = resolveAuditRoundResultFilter(request.nextUrl.searchParams.get("result"))
    const search = request.nextUrl.searchParams.get("search") ?? ""
    const isOutOfScopeExport = isAuditRoundScanHistoryResultFilter(result)
    const filterLabel = buildAuditExportFilterLabel({ result, search })

    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, auditNo: true, name: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    const rows = isOutOfScopeExport
      ? await buildOutOfScopeExportRows(id, search)
      : await buildAuditItemExportRows(id, result, search)
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
    return workbookResponse(buffer, buildAuditExportFilename({ prefix: "audit-result", auditNo: round.auditNo, result, search, extension: "xlsx" }))
  } catch (error) {
    return errorResponse(error)
  }
}

async function buildAuditItemExportRows(roundId: string, result: ReturnType<typeof resolveAuditRoundResultFilter>, search: string): Promise<AuditExportRow[]> {
  const items = await prisma.auditItem.findMany({
    where: buildAuditRoundItemWhere({ roundId, result, search }),
    orderBy: [{ auditStatus: "asc" }, { createdAt: "asc" }],
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

async function buildOutOfScopeExportRows(roundId: string, search: string): Promise<AuditExportRow[]> {
  const scanRows = await prisma.auditScanHistory.findMany({
    where: buildAuditRoundScanHistoryWhere({ roundId, search }),
    orderBy: { scannedAt: "desc" },
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true,
          departmentId: true,
          currentLocationId: true,
          custodianId: true,
          conditionId: true,
        },
      },
    },
  })

  return scanRows.map((history) => ({
    assetTag: history.asset.assetTag,
    assetName: history.asset.name,
    expectedLocationId: null,
    expectedCustodianId: null,
    expectedDepartmentId: null,
    expectedConditionId: null,
    actualLocationId: history.asset.currentLocationId,
    actualCustodianId: history.asset.custodianId,
    actualDepartmentId: history.asset.departmentId,
    actualConditionId: history.asset.conditionId,
    auditStatus: "out_of_scope",
    auditResult: "out_of_scope",
    reconcileStatus: "",
    scanCount: 1,
    scannedAt: history.scannedAt,
    lastScanAt: history.scannedAt,
    remark: history.remark ?? "",
  }))
}

async function buildAuditReferenceLabels(ids: Array<string | null>) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const [locations, employees, departments, conditions] = await Promise.all([
    prisma.location.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, code: true, name: true },
    }),
    prisma.employee.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, code: true, fullNameTh: true },
    }),
    prisma.department.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, code: true, name: true },
    }),
    prisma.assetCondition.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, nameTh: true },
    }),
  ])

  const labels = new Map<string, string>()
  for (const location of locations) labels.set(location.id, `${location.code} - ${location.name}`)
  for (const employee of employees) labels.set(employee.id, `${employee.code} - ${employee.fullNameTh}`)
  for (const department of departments) labels.set(department.id, `${department.code} - ${department.name}`)
  for (const condition of conditions) labels.set(condition.id, condition.nameTh || condition.name)
  return labels
}

function labelOrBlank(labels: Map<string, string>, id?: string | null) {
  if (!id) return ""
  return labels.get(id) ?? id
}
