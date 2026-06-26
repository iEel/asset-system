import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { pdfResponse, renderAuditResultPdf } from "@/lib/audit-pdf"
import { formatDate, formatDateTime } from "@/lib/utils"
import { isSuccessfulAuditResult } from "@/lib/audit-result-summary"
import {
  buildAuditExportFilterLabel,
  buildAuditExportFilename,
  buildAuditRoundItemWhere,
  buildAuditRoundScanHistoryWhere,
  isAuditRoundScanHistoryResultFilter,
  resolveAuditRoundResultFilter,
  type AuditRoundResultFilter,
} from "@/lib/audit-round-result-filters"

export const runtime = "nodejs"

type AuditPdfExportContext = {
  params: Promise<{ id: string }>
}

type AuditPdfExportRow = {
  assetTag: string
  assetName: string
  expectedLocationId: string | null
  actualLocationId: string | null
  auditStatus: string
  auditResult: string
  reconcileStatus: string
  scanCount: number
  lastScanAt: Date | null
}

export async function GET(request: NextRequest, context: AuditPdfExportContext) {
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
      select: { id: true, auditNo: true, name: true, startDate: true, endDate: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    const rows = isOutOfScopeExport
      ? await buildOutOfScopeExportRows(id, search)
      : await buildAuditItemExportRows(id, result, search)
    const labels = await buildAuditReferenceLabels(rows.flatMap((row) => [row.expectedLocationId, row.actualLocationId]))
    const pendingCount = rows.filter((row) => row.auditStatus === "pending").length
    const scannedCount = rows.filter((row) => row.auditStatus === "scanned" || row.auditStatus === "reconciled" || row.auditStatus === "out_of_scope").length
    const findingCount = rows.filter((row) => row.auditResult && !isSuccessfulAuditResult(row.auditResult)).length

    const buffer = await renderAuditResultPdf({
      title: `Audit Result - ${round.auditNo}`,
      subtitle: `${round.name} | ${formatDate(round.startDate)} - ${formatDate(round.endDate)} | Filter: ${filterLabel}`,
      summary: [
        { label: "Exported Rows", value: rows.length },
        { label: "Pending", value: pendingCount },
        { label: "Scanned/Reconciled", value: scannedCount },
        { label: "Needs Review/Out of Scope", value: findingCount },
      ],
      rows: rows.map((row) => ({
        assetTag: row.assetTag,
        assetName: row.assetName,
        expectedLocation: labelOrBlank(labels, row.expectedLocationId),
        actualLocation: labelOrBlank(labels, row.actualLocationId),
        auditStatus: row.auditStatus,
        auditResult: row.auditResult,
        reconcileStatus: row.reconcileStatus,
        scanCount: String(row.scanCount),
        lastScanAt: formatDateTime(row.lastScanAt),
      })),
    })

    return pdfResponse(buffer, buildAuditExportFilename({ prefix: "audit-result", auditNo: round.auditNo, result, search, extension: "pdf" }))
  } catch (error) {
    return errorResponse(error)
  }
}

async function buildAuditItemExportRows(roundId: string, result: AuditRoundResultFilter, search: string): Promise<AuditPdfExportRow[]> {
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
    actualLocationId: item.actualLocationId,
    auditStatus: item.auditStatus,
    auditResult: item.auditResult ?? "",
    reconcileStatus: item.reconcileStatus ?? "",
    scanCount: item.scanCount,
    lastScanAt: item.lastScanAt,
  }))
}

async function buildOutOfScopeExportRows(roundId: string, search: string): Promise<AuditPdfExportRow[]> {
  const scanRows = await prisma.auditScanHistory.findMany({
    where: buildAuditRoundScanHistoryWhere({ roundId, search }),
    orderBy: { scannedAt: "desc" },
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true,
          currentLocationId: true,
        },
      },
    },
  })

  return scanRows.map((history) => ({
    assetTag: history.asset.assetTag,
    assetName: history.asset.name,
    expectedLocationId: null,
    actualLocationId: history.asset.currentLocationId,
    auditStatus: "out_of_scope",
    auditResult: "out_of_scope",
    reconcileStatus: "",
    scanCount: 1,
    lastScanAt: history.scannedAt,
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
