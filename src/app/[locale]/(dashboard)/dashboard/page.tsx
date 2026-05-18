import Link from "next/link"
import { getTranslations } from "next-intl/server"
import {
  Package,
  Monitor,
  Wrench,
  AlertTriangle,
  Shield,
  ArrowRight,
  ClipboardCheck,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { cn } from "@/lib/utils"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const t = await getTranslations("dashboard")
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthRange = getMonthRange(new Date())

  const [
    totalAssets,
    inUse,
    ready,
    pendingRepair,
    warrantyExpiring,
    recentLogs,
    overdueMaintenance,
    pendingAuditFindings,
    pendingDisposals,
    approvedDisposals,
    currentMonthAssets,
    previousMonthAssets,
    currentMonthMaintenance,
    previousMonthMaintenance,
    currentMonthAuditFindings,
    previousMonthAuditFindings,
    currentMonthDisposals,
    previousMonthDisposals,
  ] = await Promise.all([
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
    prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { displayName: true, username: true } } },
    }),
    prisma.maintenanceTicket.count({
      where: {
        isActive: true,
        dueDate: { lt: today },
        repairStatus: { in: ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"] },
      },
    }),
    prisma.auditFinding.count({ where: { reviewStatus: "pending" } }),
    prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } }),
    prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "approved" } }),
    prisma.asset.count({ where: { isActive: true, createdAt: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
    prisma.asset.count({ where: { isActive: true, createdAt: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
    prisma.maintenanceTicket.count({ where: { isActive: true, reportedDate: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
    prisma.maintenanceTicket.count({ where: { isActive: true, reportedDate: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
    prisma.auditFinding.count({ where: { reportedAt: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
    prisma.auditFinding.count({ where: { reportedAt: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
    prisma.disposalRequest.count({ where: { isActive: true, requestDate: { gte: monthRange.currentStart, lt: monthRange.nextStart } } }),
    prisma.disposalRequest.count({ where: { isActive: true, requestDate: { gte: monthRange.previousStart, lt: monthRange.currentStart } } }),
  ])

  const kpiCards = [
    { label: t("totalAssets"), value: totalAssets.toLocaleString("th-TH"), icon: <Package size={24} />, color: "text-primary", href: `/${locale}/assets` },
    { label: t("inUse"), value: inUse.toLocaleString("th-TH"), icon: <Monitor size={24} />, color: "text-success", href: `/${locale}/assets` },
    { label: t("readyToDeploy"), value: ready.toLocaleString("th-TH"), icon: <Shield size={24} />, color: "text-info", href: `/${locale}/assets` },
    { label: t("pendingRepair"), value: pendingRepair.toLocaleString("th-TH"), icon: <Wrench size={24} />, color: "text-warning", href: `/${locale}/maintenance` },
    { label: t("warrantyExpiring"), value: warrantyExpiring.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-danger", href: `/${locale}/assets` },
  ]

  const actionCards = [
    {
      label: t("overdueMaintenance"),
      value: overdueMaintenance,
      detail: t("overdueMaintenanceDetail"),
      href: `/${locale}/maintenance?overdue=yes`,
      icon: <Wrench className="h-5 w-5" />,
      tone: "danger",
    },
    {
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "warning",
    },
    {
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "danger",
    },
    {
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "warning",
    },
  ]
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
  const readableLogs = recentLogs.map((log) => formatDashboardLog(log, locale, t))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <Link href={`/${locale}/work-center`} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("openWorkCenter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`rounded-md border p-4 transition-colors hover:bg-accent ${card.tone === "danger" ? "border-danger/30 bg-danger/5" : "border-warning/30 bg-warning/5"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                </div>
                <div className={card.tone === "danger" ? "text-danger" : "text-warning"}>{card.icon}</div>
              </div>
            </Link>
          ))}
        </div>
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

type DashboardLog = {
  id: string
  module: string
  action: string
  recordId: string | null
  newValue: string | null
  oldValue: string | null
  remark: string | null
  createdAt: Date
  user: { displayName: string | null; username: string } | null
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

function getMonthRange(now: Date) {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { previousStart, currentStart, nextStart }
}

function formatDashboardLog(log: DashboardLog, locale: string, t: DashboardTranslator): ReadableDashboardLog {
  const userLabel = log.user?.displayName ?? log.user?.username ?? t("systemUser")
  const moduleLabel = getDashboardModuleLabel(log.module, t)
  const actionLabel = getDashboardActionLabel(log.action, t)
  const recordLabel = getLogRecordLabel(log)
  const href = getLogHref(log, locale)

  return {
    id: log.id,
    title: recordLabel ? t("activityTitleWithRecord", { action: actionLabel, module: moduleLabel, record: recordLabel }) : t("activityTitle", { action: actionLabel, module: moduleLabel }),
    detail: log.remark || t("activityDetail", { user: userLabel }),
    meta: new Date(log.createdAt).toLocaleString("th-TH"),
    href,
  }
}

function getDashboardModuleLabel(module: string, t: DashboardTranslator) {
  const labels: Record<string, string> = {
    asset: t("module_asset"),
    maintenance: t("module_maintenance"),
    disposal: t("module_disposal"),
    audit: t("module_audit"),
    employee: t("module_employee"),
    role: t("module_role"),
    user: t("module_user"),
    setting: t("module_setting"),
    company: t("module_company"),
    branch: t("module_branch"),
    department: t("module_department"),
    location: t("module_location"),
    category: t("module_category"),
    brand: t("module_brand"),
    supplier: t("module_supplier"),
    purchase_document: t("module_purchaseDocument"),
  }
  return labels[module] ?? module
}

function getDashboardActionLabel(action: string, t: DashboardTranslator) {
  const labels: Record<string, string> = {
    create: t("action_create"),
    update: t("action_update"),
    delete: t("action_delete"),
    login: t("action_login"),
    checkout: t("action_checkout"),
    checkin: t("action_checkin"),
    transfer: t("action_transfer"),
    approve: t("action_approve"),
    reject: t("action_reject"),
    close: t("action_close"),
    upload: t("action_upload"),
  }
  return labels[action] ?? action.replaceAll("_", " ")
}

function getLogRecordLabel(log: DashboardLog) {
  const values = [parseLogJson(log.newValue), parseLogJson(log.oldValue)].filter((value): value is Record<string, unknown> => Boolean(value))
  for (const value of values) {
    const label = getFirstString(value, ["assetTag", "repairNo", "disposalNo", "auditNo", "documentNo", "code", "nameTh", "name", "title", "username", "email"])
    if (label) return label
  }
  return log.recordId
}

function parseLogJson(value?: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function getLogHref(log: DashboardLog, locale: string) {
  if (log.module === "asset" && log.recordId) return `/${locale}/assets/${log.recordId}`
  if (log.module === "maintenance" && log.recordId) return `/${locale}/maintenance/${log.recordId}`
  if (log.module === "disposal" && log.recordId) return `/${locale}/disposal/${log.recordId}`
  if (log.module === "audit") return `/${locale}/audit/findings`
  if (log.module === "employee") return `/${locale}/master-data/employees`
  if (log.module === "role") return `/${locale}/admin/roles`
  if (log.module === "user") return `/${locale}/admin/users`
  if (log.module === "setting") return `/${locale}/admin/settings`
  if (log.module === "company") return `/${locale}/master-data/companies`
  if (log.module === "branch") return `/${locale}/master-data/branches`
  if (log.module === "department") return `/${locale}/master-data/departments`
  if (log.module === "location") return `/${locale}/master-data/locations`
  if (log.module === "category") return `/${locale}/master-data/categories`
  if (log.module === "brand") return `/${locale}/master-data/brands`
  if (log.module === "supplier") return `/${locale}/master-data/suppliers`
  return null
}
