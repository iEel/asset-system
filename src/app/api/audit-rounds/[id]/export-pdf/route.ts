import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { pdfResponse, renderAuditResultPdf } from "@/lib/audit-pdf"
import { formatDate, formatDateTime } from "@/lib/utils"

export const runtime = "nodejs"

type AuditPdfExportContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: AuditPdfExportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const { id } = await context.params
    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      include: {
        items: {
          orderBy: [{ auditStatus: "asc" }, { createdAt: "asc" }],
          include: {
            asset: {
              select: {
                assetTag: true,
                name: true,
              },
            },
          },
        },
      },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    const labels = await buildAuditReferenceLabels(
      round.items.flatMap((item) => [
        item.expectedLocationId,
        item.actualLocationId,
        item.expectedCustodianId,
        item.actualCustodianId,
        item.expectedDepartmentId,
        item.actualDepartmentId,
        item.expectedConditionId,
        item.actualConditionId,
      ])
    )
    const pendingCount = round.items.filter((item) => item.auditStatus === "pending").length
    const scannedCount = round.items.filter((item) => item.auditStatus === "scanned" || item.auditStatus === "reconciled").length
    const findingCount = round.items.filter((item) => item.auditResult && item.auditResult !== "matched").length

    const buffer = await renderAuditResultPdf({
      title: `Audit Result - ${round.auditNo}`,
      subtitle: `${round.name} | ${formatDate(round.startDate)} - ${formatDate(round.endDate)}`,
      summary: [
        { label: "Total Expected", value: round.items.length },
        { label: "Pending", value: pendingCount },
        { label: "Scanned/Reconciled", value: scannedCount },
        { label: "Mismatched/Not Found", value: findingCount },
      ],
      rows: round.items.map((item) => ({
        assetTag: item.asset.assetTag,
        assetName: item.asset.name,
        expectedLocation: labels.get(item.expectedLocationId) ?? item.expectedLocationId,
        actualLocation: labelOrBlank(labels, item.actualLocationId),
        auditStatus: item.auditStatus,
        auditResult: item.auditResult ?? "",
        reconcileStatus: item.reconcileStatus ?? "",
        scanCount: String(item.scanCount),
        lastScanAt: formatDateTime(item.lastScanAt),
      })),
    })

    return pdfResponse(buffer, `audit-result-${round.auditNo}-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (error) {
    return errorResponse(error)
  }
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
