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
} from "lucide-react"
import { prisma } from "@/lib/db"

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

      {/* Placeholder sections */}
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
            <div className="flex h-48 items-center justify-center text-muted-foreground">ยังไม่มีกิจกรรมล่าสุด</div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="rounded-md border border-border bg-background p-3 text-sm">
                  <div className="font-medium text-foreground">{log.module} · {log.action}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {log.user?.displayName ?? log.user?.username ?? "-"} · {new Date(log.createdAt).toLocaleString("th-TH")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
