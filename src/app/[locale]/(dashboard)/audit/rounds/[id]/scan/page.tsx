import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AuditScanForm, type AuditRecentScan } from "@/components/audit/audit-scan-form"
import { getAuditRoundOptions } from "@/lib/audit-options"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { normalizeAuditRoundDetailReturnTo } from "@/lib/operational-return-navigation"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"

type AuditScanPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; assetId?: string | string[]; mode?: string | string[] }>
}

type ChecklistSettingRow = {
  key: string
  value: string | null
}

type AuditScanHistoryRow = {
  id: string
  scanSource: string
  scannedAt: Date
  auditItem: { auditResult: string | null } | null
  asset: { id: string; assetTag: string; name: string }
}

const AUDIT_SCAN_HISTORY_LIMIT = 8

export default async function AuditScanPage({ params, searchParams }: AuditScanPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "audit", "edit")

  const [round, options, scanHistory] = await withPerformanceTiming(
    "audit-scan.initial-data",
    () => Promise.all([
      prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: {
          id: true,
          name: true,
          auditNo: true,
          status: true,
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
                  parentComponents: {
                    where: { status: "installed", removedAt: null },
                    select: {
                      componentRole: true,
                      slotNo: true,
                      componentAsset: { select: { id: true, assetTag: true, name: true } },
                    },
                  },
                  installedInLinks: {
                    where: { status: "installed", removedAt: null },
                    select: {
                      componentRole: true,
                      slotNo: true,
                      parentAsset: { select: { id: true, assetTag: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      getAuditRoundOptions(),
      prisma.auditScanHistory.findMany({
        where: { auditRoundId: id },
        orderBy: { scannedAt: "desc" },
        take: AUDIT_SCAN_HISTORY_LIMIT,
        select: {
          id: true,
          scanSource: true,
          scannedAt: true,
          auditItem: { select: { auditResult: true } },
          asset: { select: { id: true, assetTag: true, name: true } },
        },
      }),
    ]),
    { route: "/audit/rounds/[id]/scan", locale }
  )
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()
  const returnToHref = normalizeAuditRoundDetailReturnTo(locale, round.id, rawSearchParams.returnTo)

  const categoryIds = Array.from(new Set(round.items.map((item) => item.asset.categoryId).filter(Boolean)))
  const checklistSettings = await withPerformanceTiming<ChecklistSettingRow[]>(
    "audit-scan.checklist-data",
    () => categoryIds.length > 0
      ? prisma.systemSetting.findMany({
          where: { key: { in: categoryIds.map(categoryPhotoChecklistKey) } },
          select: { key: true, value: true },
        })
      : Promise.resolve<ChecklistSettingRow[]>([]),
    { route: "/audit/rounds/[id]/scan", locale, itemCount: round.items.length, categoryCount: categoryIds.length }
  )
  const checklistByCategoryId = new Map(
    checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )
  const auditItemByAssetId = new Map(round.items.map((item) => [item.assetId, item]))
  const initialRecentScans = buildInitialRecentScanRows(scanHistory)

  return (
    <AuditScanForm
      locale={locale}
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
        actualDepartmentId: item.actualDepartmentId,
        actualLocationId: item.actualLocationId,
        actualCustodianId: item.actualCustodianId,
        actualConditionId: item.actualConditionId,
        ownershipType: item.asset.ownershipType,
        photoChecklist: checklistByCategoryId.get(item.asset.categoryId) ?? [],
        components: buildAuditScanComponentRows(item.asset.parentComponents, auditItemByAssetId),
        installedIn: item.asset.installedInLinks.map((link) => ({
          parentAssetId: link.parentAsset.id,
          assetTag: link.parentAsset.assetTag,
          name: link.parentAsset.name,
          componentRole: link.componentRole,
          slotNo: link.slotNo,
        })),
      }))}
      options={{
        locations: options.locations,
        departments: options.departments,
        employees: options.employees,
        conditions: options.conditions,
      }}
      initialRecentScans={initialRecentScans}
      initialAssetId={resolveFirstSearchParam(rawSearchParams.assetId)}
      initialMode={resolveAuditScanInitialMode(rawSearchParams.mode)}
    />
  )
}

function resolveFirstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function resolveAuditScanInitialMode(value?: string | string[]) {
  return resolveFirstSearchParam(value) === "edit" ? "edit" : "scan"
}

function buildInitialRecentScanRows(scanHistory: AuditScanHistoryRow[]): AuditRecentScan[] {
  return scanHistory.map((history) => {
    const label = `${history.asset.assetTag} - ${history.asset.name}`
    return {
      id: `history-${history.id}`,
      status: getInitialRecentScanStatus(history.auditItem?.auditResult ?? null, Boolean(history.auditItem)),
      title: label,
      description: "",
      assetId: history.asset.id,
      assetTag: history.asset.assetTag,
      source: history.scanSource === "qr" ? "qr" : "manual",
      at: history.scannedAt.getTime(),
    }
  })
}

function getInitialRecentScanStatus(auditResult: string | null, hasAuditItem: boolean): AuditRecentScan["status"] {
  if (!hasAuditItem || auditResult === "out_of_scope") return "out_of_scope"
  if (!auditResult || auditResult === "found" || auditResult === "confirmed_with_parent") return "saved"
  return "mismatch"
}

function buildAuditScanComponentRows(
  components: Array<{
    componentRole: string
    slotNo: string | null
    componentAsset: { id: string; assetTag: string; name: string }
  }>,
  auditItemByAssetId: Map<string, { id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  return components.map((component) => {
    const auditItem = auditItemByAssetId.get(component.componentAsset.id)
    return {
      assetId: component.componentAsset.id,
      assetTag: component.componentAsset.assetTag,
      name: component.componentAsset.name,
      componentRole: component.componentRole,
      slotNo: component.slotNo,
      auditItemId: auditItem?.id ?? null,
      auditStatus: auditItem?.auditStatus ?? "out_of_round",
      auditResult: auditItem?.auditResult ?? null,
    }
  })
}
