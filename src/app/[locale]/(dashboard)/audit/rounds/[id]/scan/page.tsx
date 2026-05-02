import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AuditScanForm } from "@/components/audit/audit-scan-form"
import { getAuditRoundOptions } from "@/lib/audit-options"

type AuditScanPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AuditScanPage({ params }: AuditScanPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "audit", "edit")

  const [round, options] = await Promise.all([
    prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        auditNo: true,
        items: {
          orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }],
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
    }),
    getAuditRoundOptions(),
  ])
  if (!round) notFound()

  return (
    <AuditScanForm
      roundId={round.id}
      roundName={`${round.auditNo} - ${round.name}`}
      items={round.items.map((item) => ({
        id: item.id,
        assetId: item.assetId,
        label: `${item.asset.assetTag} - ${item.asset.name}`,
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
        expectedDepartmentId: item.expectedDepartmentId,
        expectedLocationId: item.expectedLocationId,
        expectedCustodianId: item.expectedCustodianId,
        expectedConditionId: item.expectedConditionId,
      }))}
      options={{
        locations: options.locations,
        departments: options.departments,
        employees: options.employees,
        conditions: options.conditions,
      }}
    />
  )
}
