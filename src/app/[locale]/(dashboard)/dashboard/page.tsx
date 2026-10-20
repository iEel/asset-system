import Link from "next/link"
import { redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxCounts, type ApprovalInboxCounts } from "@/lib/approval-inbox-query"
import {
  buildDashboardActionCardKeys,
  buildDashboardAssetStatusMetrics,
  dashboardAssetStatusNames,
  type DashboardActionCardKey,
} from "@/lib/dashboard-action-cards"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { shouldUseEmployeeHome } from "@/lib/default-home"
import { prisma } from "@/lib/db"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { buildDashboardAssetCrossScopeSummary, type AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels, type AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation, type SystemLogPresentation } from "@/lib/system-log-presenter"
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { splitStatRows } from "@/lib/stat-strip-rows"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
}

type DashboardActionTone = "primary" | "warning" | "danger"

// tone says whether a count above 0 needs action (warning, danger); it is never a fill (R-d).
type DashboardActionCard = {
  label: string
  value: number
  detail: string
  href: string
  tone: DashboardActionTone
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const user = await getSessionUser()

  if (user && shouldUseEmployeeHome(user)) {
    redirect(`/${locale}/my-assets`)
  }

  // C2: the work center needs dashboard:view, so its link shows only to people who can open it.
  const canOpenWorkCenter = user ? hasPermission(user, "dashboard", "view") : false
  const [t, messages] = await Promise.all([getTranslations("dashboard"), getMessages()])
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateSystemLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const monthRange = getMonthRange(new Date())
  const approvalInboxAccess = user ? getApprovalInboxAccess(user) : null
  const emptyApprovalInboxCounts: ApprovalInboxCounts = { total: 0, disposal: 0, audit: 0 }
  const dashboardTimingMeta = { route: "/dashboard", locale, approvalInbox: Boolean(approvalInboxAccess?.canAnyApproval) }

  const [
    [totalAssets, assetStatusRows, warrantyExpiring],
    recentLogs,
    [openRepairs, pendingAuditFindings, pendingDisposals, approvedDisposals],
    approvalInboxCounts,
    crossScopeSummary,
    [
      currentMonthAssets,
      previousMonthAssets,
      currentMonthMaintenance,
      previousMonthMaintenance,
      currentMonthAuditFindings,
      previousMonthAuditFindings,
      currentMonthDisposals,
      previousMonthDisposals,
    ],
  ] = await withPerformanceTiming(
    "dashboard.initial-data",
    () => Promise.all([
      withPerformanceTiming(
        "dashboard.kpi-counts",
        () => Promise.all([
          prisma.asset.count({ where: { isActive: true } }),
          prisma.assetStatus.findMany({
            where: { isActive: true, name: { in: [...dashboardAssetStatusNames] } },
            select: {
              id: true,
              name: true,
              _count: { select: { assets: { where: { isActive: true } } } },
            },
          }),
          prisma.asset.count({
            where: {
              isActive: true,
              warrantyEndDate: { gte: new Date(), lte: warrantyThreshold },
            },
          }),
        ]),
        dashboardTimingMeta
      ),
      withPerformanceTiming(
        "dashboard.recent-activity",
        () => prisma.systemLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: { select: { displayName: true, username: true } } },
        }),
        { ...dashboardTimingMeta, limit: 8 }
      ),
      withPerformanceTiming(
        "dashboard.urgent-work",
        () => Promise.all([
          prisma.maintenanceTicket.count({ where: openRepairRecordWhere }),
          prisma.auditFinding.count({ where: { reviewStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } } }),
          prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } }),
          prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "approved" } }),
        ]),
        dashboardTimingMeta
      ),
      withPerformanceTiming(
        "dashboard.approval-inbox",
        () => user && approvalInboxAccess?.canAnyApproval ? getApprovalInboxCounts(user) : Promise.resolve(emptyApprovalInboxCounts),
        dashboardTimingMeta
      ),
      withPerformanceTiming(
        "dashboard.cross-scope",
        () => buildDashboardAssetCrossScopeSummary(),
        { ...dashboardTimingMeta, limit: 5 }
      ),
      withPerformanceTiming(
        "dashboard.monthly-trends",
        () => Promise.all([
          prisma.asset.count({ where: { isActive: true, createdAt: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
          prisma.asset.count({ where: { isActive: true, createdAt: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
          prisma.maintenanceTicket.count({ where: { isActive: true, reportedDate: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
          prisma.maintenanceTicket.count({ where: { isActive: true, reportedDate: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
          prisma.auditFinding.count({ where: { reportedAt: { gte: monthRange.currentStart, lt: monthRange.nextStart }, auditRound: { isActive: true, status: auditRoundCoverageWhere } } }),
          prisma.auditFinding.count({ where: { reportedAt: { gte: monthRange.previousStart, lt: monthRange.currentStart }, auditRound: { isActive: true, status: auditRoundCoverageWhere } } }),
          prisma.disposalRequest.count({ where: { isActive: true, requestDate: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
          prisma.disposalRequest.count({ where: { isActive: true, requestDate: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
        ]),
        dashboardTimingMeta
      ),
    ]),
    dashboardTimingMeta
  )

  const crossScopeTotal = crossScopeSummary.all
  const crossScopeAssetsHref = buildDashboardCrossScopeHref(locale, "all")
  const assetStatusMetrics = buildDashboardAssetStatusMetrics(
    locale,
    assetStatusRows.map((row) => ({ id: row.id, name: row.name, count: row._count.assets })),
  )
  const inUse = assetStatusMetrics.inUse.count
  const ready = assetStatusMetrics.ready.count
  const pendingRepair = assetStatusMetrics.pendingRepair.count
  const underMaintenance = assetStatusMetrics.underMaintenance.count
  // The seven totals are StatStrip cells, each opening its list (no icons and no tone colors).
  const kpiItems: StatStripItem[] = [
    { key: "totalAssets", label: t("totalAssets"), value: formatCount(totalAssets), href: buildExactAssetRegisterHref(locale) },
    { key: "inUse", label: t("inUse"), value: formatCount(inUse), href: assetStatusMetrics.inUse.href },
    { key: "readyToDeploy", label: t("readyToDeploy"), value: formatCount(ready), href: assetStatusMetrics.ready.href },
    { key: "pendingRepair", label: t("pendingRepair"), value: formatCount(pendingRepair), href: assetStatusMetrics.pendingRepair.href },
    { key: "underMaintenance", label: t("underMaintenance"), value: formatCount(underMaintenance), href: assetStatusMetrics.underMaintenance.href },
    { key: "warrantyExpiring", label: t("warrantyExpiring"), value: formatCount(warrantyExpiring), href: buildExactAssetRegisterHref(locale, { dataQuality: "warranty" }) },
    { key: "crossScopeAssets", label: t("crossScopeAssets"), value: formatCount(crossScopeTotal), href: crossScopeAssetsHref },
  ]

  const actionCardMap: Record<DashboardActionCardKey, DashboardActionCard> = {
    approvalInbox: {
      label: t("approvalInbox"),
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
    },
    openRepairs: {
      label: t("openRepairs"),
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      tone: openRepairs > 0 ? "warning" : "primary",
    },
    pendingAuditFindings: {
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      tone: "warning",
    },
    pendingDisposals: {
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
    },
    approvedDisposals: {
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
    },
  }
  const crossScopeActionCard: DashboardActionCard = {
    label: t("crossScopeActionTitle"),
    value: crossScopeSummary.custodianCompany,
    detail: t("crossScopeActionDetail"),
    href: buildDashboardCrossScopeHref(locale, "custodian_company"),
    tone: "warning",
  }
  const actionCards = [
    ...buildDashboardActionCardKeys({
    approvalInbox: {
      visible: Boolean(approvalInboxAccess?.canAnyApproval),
      ...approvalInboxCounts,
    },
    openRepairs,
    pendingAuditFindings,
    pendingDisposals,
    approvedDisposals,
    }).map((key) => actionCardMap[key]),
    ...(crossScopeTotal > 0 ? [crossScopeActionCard] : []),
  ]
  const crossScopeCards = [
    {
      key: "all",
      label: t("crossScopeAll"),
      value: crossScopeSummary.all,
      crossScope: "all" as const,
    },
    {
      key: "custodian_company",
      label: t("crossScopeCustodianCompany"),
      value: crossScopeSummary.custodianCompany,
      crossScope: "custodian_company" as const,
    },
    {
      key: "custodian_branch",
      label: t("crossScopeCustodianBranch"),
      value: crossScopeSummary.custodianBranch,
      crossScope: "custodian_branch" as const,
    },
    {
      key: "location_branch",
      label: t("crossScopeLocationBranch"),
      value: crossScopeSummary.locationBranch,
      crossScope: "location_branch" as const,
    },
  ]
  const crossScopePreviewRows = crossScopeSummary.rows
  const trendCards = [
    {
      label: t("trendAssetsCreated"),
      href: buildExactAssetRegisterHref(locale, { sort: "createdAt", direction: "desc" }),
      current: currentMonthAssets,
      previous: previousMonthAssets,
    },
    {
      label: t("trendMaintenanceOpened"),
      href: `/${locale}/maintenance`,
      current: currentMonthMaintenance,
      previous: previousMonthMaintenance,
    },
    {
      label: t("trendAuditFindings"),
      href: `/${locale}/audit/findings?status=all`,
      current: currentMonthAuditFindings,
      previous: previousMonthAuditFindings,
    },
    {
      label: t("trendDisposalsRequested"),
      href: `/${locale}/disposal`,
      current: currentMonthDisposals,
      previous: previousMonthDisposals,
    },
  ]
  // Like the work center (2B R-d): no tone fill; a count that needs action and is above 0 gets the warning foot line.
  const actionItems = actionCards.map((card): StatStripItem => ({
    key: card.label,
    label: card.label,
    value: formatCount(card.value),
    href: card.href,
    foot: card.detail,
    footTitle: card.detail,
    attention: card.value > 0 && (card.tone === "warning" || card.tone === "danger"),
  }))
  // This month's count, with last month and the change in the foot line (it was a colored arrow pill).
  const trendItems = trendCards.map((card): StatStripItem => ({
    key: card.label,
    label: card.label,
    value: formatCount(card.current),
    href: card.href,
    foot: `${t("thisMonth")} · ${t("previousMonth")}: ${formatCount(card.previous)} · ${formatTrendDelta(card.current, card.previous)}`,
  }))
  const statusItems = [
    { key: "inUse", label: t("inUse"), value: inUse, href: assetStatusMetrics.inUse.href, tone: "success" as const },
    { key: "readyToDeploy", label: t("readyToDeploy"), value: ready, href: assetStatusMetrics.ready.href, tone: "info" as const },
    { key: "pendingRepair", label: t("pendingRepair"), value: pendingRepair, href: assetStatusMetrics.pendingRepair.href, tone: "warning" as const },
    { key: "underMaintenance", label: t("underMaintenance"), value: underMaintenance, href: assetStatusMetrics.underMaintenance.href, tone: "danger" as const },
  ]
  const recentLogLabels = await buildSystemLogRecordLabels(recentLogs)
  const readableLogs = recentLogs.map((log) => formatDashboardLog(buildSystemLogPresentation(log, recentLogLabels, locale, translateSystemLog), t))

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="space-y-3">
        {splitStatRows(kpiItems).map((row) => (
          <StatStrip key={row[0].key} items={row} />
        ))}
      </div>

      <ContentPanel
        title={t("actionableTitle")}
        description={t("actionableSubtitle")}
        actions={canOpenWorkCenter ? (
          <Link href={`/${locale}/work-center?panel=overview`} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("openWorkCenter")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : undefined}
      >
        <div className="space-y-3">
          {splitStatRows(actionItems).map((row) => (
            <StatStrip key={row[0].key} items={row} />
          ))}
        </div>
      </ContentPanel>

      <ContentPanel
        title={t("crossScopePanelTitle")}
        description={t("crossScopePanelSubtitle")}
        actions={
          <Link href={crossScopeAssetsHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("crossScopeViewAll")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      >
        <StatStrip
          items={crossScopeCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: buildDashboardCrossScopeHref(locale, card.crossScope) }))}
        />
        <DashboardCrossScopePreview
          rows={crossScopePreviewRows}
          locale={locale}
          labels={{
            title: t("crossScopePreviewTitle"),
            empty: t("crossScopePreviewEmpty"),
            custodianCompany: t("crossScopeCustodianCompany"),
            custodianBranch: t("crossScopeCustodianBranch"),
            locationBranch: t("crossScopeLocationBranch"),
          }}
        />
      </ContentPanel>

      <ContentPanel title={t("monthlyTrendTitle")} description={t("monthlyTrendSubtitle")}>
        <StatStrip items={trendItems} />
      </ContentPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContentPanel title={t("statusOverview")}>
          <div className="grid gap-1">
            {statusItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0 md:py-1.5"
              >
                <StatusBadge label={item.label} tone={item.tone} />
                <span className="num font-semibold text-foreground">{formatCount(item.value)}</span>
              </Link>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel title={t("recentActivity")}>
          {recentLogs.length === 0 ? (
            <EmptyNote>{t("noRecentActivity")}</EmptyNote>
          ) : (
            <div className="space-y-3">
              {readableLogs.map((log) =>
                log.href ? (
                  <Link key={log.id} href={log.href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-row-hover">
                    <ActivityLogContent log={log} />
                  </Link>
                ) : (
                  <div key={log.id} className="rounded-md border border-border bg-background p-3 text-sm">
                    <ActivityLogContent log={log} />
                  </div>
                ),
              )}
            </div>
          )}
        </ContentPanel>
      </div>
    </div>
  )
}

type ReadableDashboardLog = {
  id: string
  title: string
  detail: string
  meta: string
  href: string | null
}

type DashboardTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
}

// The change against last month in whole percent, as the old trend pill showed it: "+20%", "-5%" or "0%"; with no
// previous month, any count is "+100%".
function formatTrendDelta(current: number, previous: number) {
  const delta = current - previous
  if (delta === 0) return "0%"
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : 100
  return `${delta > 0 ? "+" : ""}${percent}%`
}

function ActivityLogContent({ log }: { log: ReadableDashboardLog }) {
  return (
    <div>
      <div className="font-medium text-foreground">{log.title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{log.detail}</div>
      <div className="mt-1 text-xs text-muted-foreground">{log.meta}</div>
    </div>
  )
}

function DashboardCrossScopePreview({
  rows,
  locale,
  labels,
}: {
  rows: AssetCrossScopeSummaryRow[]
  locale: string
  labels: {
    title: string
    empty: string
    custodianCompany: string
    custodianBranch: string
    locationBranch: string
  }
}) {
  return (
    <div className="mt-4 rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{labels.title}</div>
      {rows.length === 0 ? (
        <EmptyNote padded>{labels.empty}</EmptyNote>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => {
            const flagLabels = getAssetCrossScopeFlagLabels(row.flags, {
              custodianCompany: labels.custodianCompany,
              custodianBranch: labels.custodianBranch,
              locationBranch: labels.locationBranch,
            })

            return (
              <Link key={row.id} href={`/${locale}/assets/${row.id}`} className="block px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground"><span className="tag">{row.assetTag}</span></div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.ownerBranch}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:max-w-md md:justify-end">
                    {flagLabels.map((label) => (
                      <StatusBadge key={label} label={label} tone="warning" />
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function buildDashboardCrossScopeHref(locale: string, crossScope: AssetCrossScopeFilter) {
  return buildExactAssetRegisterHref(locale, { crossScope, page: "1" })
}

function getMonthRange(now: Date) {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { previousStart, currentStart, nextStart }
}

function formatDashboardLog(log: SystemLogPresentation, t: DashboardTranslator): ReadableDashboardLog {
  const userLabel = log.userLabel === "-" ? t("systemUser") : log.userLabel
  const recordLabel = log.recordLabel !== "-" ? log.recordLabel : null

  return {
    id: log.id,
    title: recordLabel ? t("activityTitleWithRecord", { action: log.actionLabel, module: log.moduleLabel, record: recordLabel }) : t("activityTitle", { action: log.actionLabel, module: log.moduleLabel }),
    detail: log.remark || t("activityDetail", { user: userLabel }),
    meta: formatDateTime(log.createdAt),
    href: log.href,
  }
}
