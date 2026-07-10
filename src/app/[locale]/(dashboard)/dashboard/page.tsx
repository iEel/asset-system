import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import {
  Package,
  Monitor,
  Wrench,
  AlertTriangle,
  Shield,
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxCounts, type ApprovalInboxCounts } from "@/lib/approval-inbox-query"
import { buildDashboardActionCardKeys, type DashboardActionCardKey } from "@/lib/dashboard-action-cards"
import { shouldUseEmployeeHome } from "@/lib/default-home"
import { prisma } from "@/lib/db"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { buildDashboardAssetCrossScopeSummary, type AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels, type AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation, type SystemLogPresentation } from "@/lib/system-log-presenter"
import { cn } from "@/lib/utils"
import { withPerformanceTiming } from "@/lib/performance-timing"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
}

type DashboardActionTone = "primary" | "warning" | "danger"

type DashboardActionCard = {
  label: string
  value: number
  detail: string
  href: string
  icon: ReactNode
  tone: DashboardActionTone
}

const actionCardToneClass: Record<DashboardActionTone, string> = {
  primary: "border-primary/30 bg-primary/5",
  warning: "border-warning/30 bg-warning/5",
  danger: "border-danger/30 bg-danger/5",
}

const actionCardIconClass: Record<DashboardActionTone, string> = {
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-danger",
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const user = await getSessionUser()

  if (user && shouldUseEmployeeHome(user)) {
    redirect(`/${locale}/my-assets`)
  }

  const [t, messages] = await Promise.all([getTranslations("dashboard"), getMessages()])
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateSystemLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthRange = getMonthRange(new Date())
  const approvalInboxAccess = user ? getApprovalInboxAccess(user) : null
  const emptyApprovalInboxCounts: ApprovalInboxCounts = { total: 0, disposal: 0, maintenance: 0, audit: 0 }
  const dashboardTimingMeta = { route: "/dashboard", locale, approvalInbox: Boolean(approvalInboxAccess?.canAnyApproval) }

  const [
    [totalAssets, inUse, ready, pendingRepair, warrantyExpiring],
    recentLogs,
    [overdueMaintenance, pendingAuditFindings, pendingDisposals, approvedDisposals],
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
          prisma.asset.count({
            where: {
              isActive: true,
              status: { OR: [{ name: { contains: "In Use" } }, { nameTh: { contains: "ใช้งาน" } }] },
            },
          }),
          prisma.asset.count({
            where: {
              isActive: true,
              status: { OR: [{ name: { contains: "Ready" } }, { nameTh: { contains: "พร้อม" } }] },
            },
          }),
          prisma.asset.count({
            where: {
              isActive: true,
              status: { OR: [{ name: { contains: "Repair" } }, { nameTh: { contains: "ซ่อม" } }] },
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
          prisma.maintenanceTicket.count({
            where: {
              isActive: true,
              dueDate: { lt: today },
              repairStatus: { in: ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"] },
            },
          }),
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
  const kpiCards = [
    { label: t("totalAssets"), value: totalAssets.toLocaleString("th-TH"), icon: <Package size={24} />, color: "text-primary", href: `/${locale}/assets` },
    { label: t("inUse"), value: inUse.toLocaleString("th-TH"), icon: <Monitor size={24} />, color: "text-success", href: `/${locale}/assets` },
    { label: t("readyToDeploy"), value: ready.toLocaleString("th-TH"), icon: <Shield size={24} />, color: "text-info", href: `/${locale}/assets` },
    { label: t("pendingRepair"), value: pendingRepair.toLocaleString("th-TH"), icon: <Wrench size={24} />, color: "text-warning", href: `/${locale}/maintenance` },
    { label: t("warrantyExpiring"), value: warrantyExpiring.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-danger", href: `/${locale}/assets` },
    { label: t("crossScopeAssets"), value: crossScopeTotal.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-warning", href: crossScopeAssetsHref },
  ]

  const actionCardMap: Record<DashboardActionCardKey, DashboardActionCard> = {
    approvalInbox: {
      label: t("approvalInbox"),
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      icon: <FileCheck2 className="h-5 w-5" />,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
    },
    overdueMaintenance: {
      label: t("overdueMaintenance"),
      value: overdueMaintenance,
      detail: t("overdueMaintenanceDetail"),
      href: `/${locale}/maintenance?overdue=yes`,
      icon: <Wrench className="h-5 w-5" />,
      tone: "danger",
    },
    pendingAuditFindings: {
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "warning",
    },
    pendingDisposals: {
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "danger",
    },
    approvedDisposals: {
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "warning",
    },
  }
  const crossScopeActionCard: DashboardActionCard = {
    label: t("crossScopeActionTitle"),
    value: crossScopeSummary.custodianCompany,
    detail: t("crossScopeActionDetail"),
    href: buildDashboardCrossScopeHref(locale, "custodian_company"),
    icon: <AlertTriangle className="h-5 w-5" />,
    tone: "warning",
  }
  const actionCards = [
    ...buildDashboardActionCardKeys({
    approvalInbox: {
      visible: Boolean(approvalInboxAccess?.canAnyApproval),
      ...approvalInboxCounts,
    },
    overdueMaintenance,
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
      href: `/${locale}/assets`,
      current: currentMonthAssets,
      previous: previousMonthAssets,
      tone: "primary" as const,
    },
    {
      label: t("trendMaintenanceOpened"),
      href: `/${locale}/maintenance`,
      current: currentMonthMaintenance,
      previous: previousMonthMaintenance,
      tone: "warning" as const,
    },
    {
      label: t("trendAuditFindings"),
      href: `/${locale}/audit/findings?status=all`,
      current: currentMonthAuditFindings,
      previous: previousMonthAuditFindings,
      tone: "info" as const,
    },
    {
      label: t("trendDisposalsRequested"),
      href: `/${locale}/disposal`,
      current: currentMonthDisposals,
      previous: previousMonthDisposals,
      tone: "danger" as const,
    },
  ]
  const recentLogLabels = await buildSystemLogRecordLabels(recentLogs)
  const readableLogs = recentLogs.map((log) => formatDashboardLog(buildSystemLogPresentation(log, recentLogLabels, locale, translateSystemLog), t))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
            href={card.href}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
              <div className={card.color}>{card.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mb-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("actionableTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("actionableSubtitle")}</p>
          </div>
          <Link href={`/${locale}/work-center?panel=overview`} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("openWorkCenter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", actionCards.length >= 6 ? "xl:grid-cols-3 2xl:grid-cols-6" : actionCards.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={cn("rounded-md border p-4 transition-colors hover:bg-accent", actionCardToneClass[card.tone])}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                </div>
                <div className={actionCardIconClass[card.tone]}>{card.icon}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("crossScopePanelTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("crossScopePanelSubtitle")}</p>
          </div>
          <Link href={crossScopeAssetsHref} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("crossScopeViewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crossScopeCards.map((card) => (
            <Link
              key={card.key}
              href={buildDashboardCrossScopeHref(locale, card.crossScope)}
              className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent"
            >
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</div>
            </Link>
          ))}
        </div>
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
      </section>

      <section className="mb-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("monthlyTrendTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("monthlyTrendSubtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {trendCards.map((card) => (
            <TrendCard
              key={card.label}
              href={card.href}
              label={card.label}
              current={card.current}
              previous={card.previous}
              currentLabel={t("thisMonth")}
              previousLabel={t("previousMonth")}
              tone={card.tone}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t("statusOverview")}</h2>
          <div className="grid gap-3">
            {[
              { label: t("inUse"), value: inUse, href: `/${locale}/assets`, tone: "border-success/30 bg-success/5" },
              { label: t("readyToDeploy"), value: ready, href: `/${locale}/assets`, tone: "border-info/30 bg-info/5" },
              { label: t("pendingRepair"), value: pendingRepair, href: `/${locale}/maintenance`, tone: "border-warning/30 bg-warning/5" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent ${item.tone}`}>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-lg font-bold text-foreground">{item.value.toLocaleString("th-TH")}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t("recentActivity")}</h2>
          {recentLogs.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">{t("noRecentActivity")}</div>
          ) : (
            <div className="space-y-3">
              {readableLogs.map((log) =>
                log.href ? (
                  <Link key={log.id} href={log.href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
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
        </div>
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

function TrendCard({
  href,
  label,
  current,
  previous,
  currentLabel,
  previousLabel,
  tone,
}: {
  href: string
  label: string
  current: number
  previous: number
  currentLabel: string
  previousLabel: string
  tone: "primary" | "warning" | "info" | "danger"
}) {
  const delta = current - previous
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0
  const trendClass = delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted-foreground"
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/5"
      : tone === "warning"
        ? "border-warning/30 bg-warning/5"
        : tone === "info"
          ? "border-info/30 bg-info/5"
          : "border-primary/30 bg-primary/5"

  return (
    <Link href={href} className={cn("rounded-md border p-4 transition-colors hover:bg-accent", toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{current.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentLabel} · {previousLabel}: {previous.toLocaleString("th-TH")}
          </p>
        </div>
        <div className={cn("inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-medium", trendClass)}>
          {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          {delta === 0 ? "0%" : `${delta > 0 ? "+" : ""}${percent}%`}
        </div>
      </div>
    </Link>
  )
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
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
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
                    <div className="font-semibold text-foreground">{row.assetTag}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.ownerBranch}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:max-w-md md:justify-end">
                    {flagLabels.map((label) => (
                      <span key={label} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                        {label}
                      </span>
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
  return `/${locale}/assets?crossScope=${crossScope}&page=1`
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
    meta: new Date(log.createdAt).toLocaleString("th-TH"),
    href: log.href,
  }
}
