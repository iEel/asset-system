import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { auditResultColumns, createAuditWorkbook, finalizeAuditWorksheet, workbookResponse } from "@/lib/audit-excel"

type AuditExportContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: AuditExportContext) {
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

    const workbook = createAuditWorkbook()
    const worksheet = workbook.addWorksheet("Audit Results")
    worksheet.columns = auditResultColumns
    worksheet.addRows(
      round.items.map((item) => ({
        auditNo: round.auditNo,
        auditName: round.name,
        assetTag: item.asset.assetTag,
        assetName: item.asset.name,
        expectedLocation: labels.get(item.expectedLocationId) ?? item.expectedLocationId,
        expectedCustodian: labelOrBlank(labels, item.expectedCustodianId),
        expectedDepartment: labelOrBlank(labels, item.expectedDepartmentId),
        expectedCondition: labelOrBlank(labels, item.expectedConditionId),
        actualLocation: labelOrBlank(labels, item.actualLocationId),
        actualCustodian: labelOrBlank(labels, item.actualCustodianId),
        actualDepartment: labelOrBlank(labels, item.actualDepartmentId),
        actualCondition: labelOrBlank(labels, item.actualConditionId),
        auditStatus: item.auditStatus,
        auditResult: item.auditResult ?? "",
        reconcileStatus: item.reconcileStatus ?? "",
        scanCount: item.scanCount,
        scannedAt: item.scannedAt ?? "",
        lastScanAt: item.lastScanAt ?? "",
        remark: item.remark ?? "",
      }))
    )
    finalizeAuditWorksheet(worksheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `audit-result-${round.auditNo}-${new Date().toISOString().slice(0, 10)}.xlsx`)
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
