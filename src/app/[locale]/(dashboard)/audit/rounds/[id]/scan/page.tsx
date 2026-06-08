import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AuditScanForm } from "@/components/audit/audit-scan-form"
import { getAuditRoundOptions } from "@/lib/audit-options"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { normalizeAuditRoundDetailReturnTo } from "@/lib/operational-return-navigation"

type AuditScanPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function AuditScanPage({ params, searchParams }: AuditScanPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
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
                id: true,
                assetTag: true,
                name: true,
                categoryId: true,
                ownershipType: true,
              },
            },
          },
        },
      },
    }),
    getAuditRoundOptions(),
  ])
  if (!round) notFound()
  const returnToHref = normalizeAuditRoundDetailReturnTo(locale, round.id, rawSearchParams.returnTo)

  const categoryIds = Array.from(new Set(round.items.map((item) => item.asset.categoryId).filter(Boolean)))
  const checklistSettings = categoryIds.length > 0
    ? await prisma.systemSetting.findMany({
        where: { key: { in: categoryIds.map(categoryPhotoChecklistKey) } },
        select: { key: true, value: true },
      })
    : []
  const checklistByCategoryId = new Map(
    checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )

  return (
    <AuditScanForm
      roundId={round.id}
      roundName={`${round.auditNo} - ${round.name}`}
      backHref={returnToHref}
      items={round.items.map((item) => ({
        id: item.id,
        assetId: item.assetId,
        assetTag: item.asset.assetTag,
        label: `${item.asset.assetTag} - ${item.asset.name}`,
        auditStatus: item.auditStatus,
        auditResult: item.auditResult,
        expectedDepartmentId: item.expectedDepartmentId,
        expectedLocationId: item.expectedLocationId,
        expectedCustodianId: item.expectedCustodianId,
        expectedConditionId: item.expectedConditionId,
        ownershipType: item.asset.ownershipType,
        photoChecklist: checklistByCategoryId.get(item.asset.categoryId) ?? [],
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
