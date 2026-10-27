import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { pdfResponse, renderAuditResultPdf } from "@/lib/audit-pdf"
import { formatDate, formatDateTime } from "@/lib/utils"
import { buildAuditReferenceLabels } from "@/lib/audit-finding-labels"
import { resolveAuditRoundExportFilters } from "@/lib/audit-round-list-lookups"
import {
  buildAuditExportFilterLabel,
  buildAuditExportFilename,
  buildAuditRoundExportSummary,
  buildAuditRoundItemWhere,
  type AuditRoundItemWhereInput,
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
  auditResult: string | null
  reconcileStatus: string
  scanCount: number
  lastScanAt: Date | null
}

export async function GET(request: NextRequest, context: AuditPdfExportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const { id } = await context.params
    const [round, exportFilters] = await Promise.all([
      prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: { id: true, auditNo: true, name: true, startDate: true, endDate: true, status: true },
      }),
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
    const labels = await buildAuditReferenceLabels(rows.flatMap((row) => [row.expectedLocationId, row.actualLocationId]))
    const summary = buildAuditRoundExportSummary(rows)

    const buffer = await renderAuditResultPdf({
      title: `Audit Result - ${round.auditNo}`,
      subtitle: `${round.name} | ${formatDate(round.startDate)} - ${formatDate(round.endDate)} | Filter: ${filterLabel}`,
      summary: [
        { label: "Exported Rows", value: summary.exported },
        { label: "Pending", value: summary.pending },
        { label: "Checked", value: summary.checked },
        { label: "Mismatch/Not Found", value: summary.mismatchOrNotFound },
        { label: "Out of Scope", value: summary.outOfScope },
      ],
      rows: rows.map((row) => ({
        assetTag: row.assetTag,
        assetName: row.assetName,
        expectedLocation: labelOrBlank(labels, row.expectedLocationId),
        actualLocation: labelOrBlank(labels, row.actualLocationId),
        auditStatus: row.auditStatus,
        auditResult: row.auditResult ?? "",
        reconcileStatus: row.reconcileStatus,
        scanCount: String(row.scanCount),
        lastScanAt: formatDateTime(row.lastScanAt),
      })),
    })

    return pdfResponse(buffer, buildAuditExportFilename({ prefix: "audit-result", auditNo: round.auditNo, ...labelInput, extension: "pdf" }))
  } catch (error) {
    return errorResponse(error)
  }
}

async function buildAuditItemExportRows(whereInput: AuditRoundItemWhereInput): Promise<AuditPdfExportRow[]> {
  const items = await prisma.auditItem.findMany({
    where: buildAuditRoundItemWhere(whereInput),
    orderBy: [{ auditStatus: "asc" }, { createdAt: "asc" }, { id: "asc" }],
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
    auditResult: item.auditResult,
    reconcileStatus: item.reconcileStatus ?? "",
    scanCount: item.scanCount,
    lastScanAt: item.lastScanAt,
  }))
}

function labelOrBlank(labels: Map<string, string>, id?: string | null) {
  if (!id) return ""
  return labels.get(id) ?? id
}
