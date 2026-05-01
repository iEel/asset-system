import { getTranslations } from "next-intl/server"
import {
  Package,
  Monitor,
  Wrench,
  AlertTriangle,
  Shield,
} from "lucide-react"
import { prisma } from "@/lib/db"

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)

  const [totalAssets, inUse, ready, pendingRepair, warrantyExpiring, recentLogs] = await Promise.all([
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
  ])

  const kpiCards = [
    { label: t("totalAssets"), value: totalAssets.toLocaleString("th-TH"), icon: <Package size={24} />, color: "text-primary" },
    { label: t("inUse"), value: inUse.toLocaleString("th-TH"), icon: <Monitor size={24} />, color: "text-success" },
    { label: t("readyToDeploy"), value: ready.toLocaleString("th-TH"), icon: <Shield size={24} />, color: "text-info" },
    { label: t("pendingRepair"), value: pendingRepair.toLocaleString("th-TH"), icon: <Wrench size={24} />, color: "text-warning" },
    { label: t("warrantyExpiring"), value: warrantyExpiring.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-danger" },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
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
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t("assetByStatus")}</h2>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            Chart จะแสดงเมื่อมีข้อมูลทรัพย์สิน
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
