import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AuditScanWorkspace } from "@/components/audit/audit-scan-workspace"
import { getAuditRoundOptions } from "@/lib/audit-options"
import { loadAuditScanRows } from "@/lib/audit-scan-data"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo } from "@/lib/operational-return-navigation"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { hasPermission } from "@/lib/auth-utils"
import { canApplyAuditScanCorrections } from "@/lib/audit-segregation"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

type AuditScanPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; assetId?: string | string[]; mode?: string | string[] }>
}

type ChecklistSettingRow = {
  key: string
  value: string | null
}

export default async function AuditScanPage({ params, searchParams }: AuditScanPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "audit", "edit")
  const canApplyCorrections = canApplyAuditScanCorrections({
    canApprove: hasPermission(user, "audit", "approve"),
    segregationRequired: parseWorkflowApprovalPolicy(await prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    })).segregationRequired,
  })

  // Taken before loading so changes saved during the load are pulled by the first poll.
  const serverTime = new Date()
  const [round, options, rows] = await withPerformanceTiming(
    "audit-scan.initial-data",
    () => Promise.all([
      prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: { id: true, name: true, auditNo: true, status: true },
      }),
      getAuditRoundOptions(),
      loadAuditScanRows(id),
    ]),
    { route: "/audit/rounds/[id]/scan", locale }
  )
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()
  const returnToHref = normalizeAuditRoundDetailReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/scan`, returnToHref)
  const pendingHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, scanHref)

  const categoryIds = Array.from(new Set(rows.map((row) => row.categoryId)))
  const checklistSettings = await withPerformanceTiming<ChecklistSettingRow[]>(
    "audit-scan.checklist-data",
    () => categoryIds.length > 0
      ? prisma.systemSetting.findMany({
          where: { key: { in: categoryIds.map(categoryPhotoChecklistKey) } },
          select: { key: true, value: true },
        })
      : Promise.resolve<ChecklistSettingRow[]>([]),
    { route: "/audit/rounds/[id]/scan", locale, itemCount: rows.length, categoryCount: categoryIds.length }
  )
  const photoChecklistByCategory = Object.fromEntries(
    checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )

  return (
    <AuditScanWorkspace
      roundId={round.id}
      roundName={`${round.auditNo} - ${round.name}`}
      backHref={returnToHref}
      pendingHref={pendingHref}
      initialItems={rows}
      initialServerTime={serverTime.toISOString()}
      options={{
        locations: options.locations,
        departments: options.departments,
        employees: options.employees,
        conditions: options.conditions,
      }}
      photoChecklistByCategory={photoChecklistByCategory}
      canApplyCorrections={canApplyCorrections}
      initialAssetId={resolveFirstSearchParam(rawSearchParams.assetId)}
    />
  )
}

function resolveFirstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
