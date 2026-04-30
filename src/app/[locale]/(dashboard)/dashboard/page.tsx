import { useTranslations } from "next-intl"
import {
  Package,
  Monitor,
  Wrench,
  AlertTriangle,
  Shield,
} from "lucide-react"

export default function DashboardPage() {
  const t = useTranslations("dashboard")

  const kpiCards = [
    { label: t("totalAssets"), value: "0", icon: <Package size={24} />, color: "text-primary" },
    { label: t("inUse"), value: "0", icon: <Monitor size={24} />, color: "text-success" },
    { label: t("readyToDeploy"), value: "0", icon: <Shield size={24} />, color: "text-info" },
    { label: t("pendingRepair"), value: "0", icon: <Wrench size={24} />, color: "text-warning" },
    { label: t("warrantyExpiring"), value: "0", icon: <AlertTriangle size={24} />, color: "text-danger" },
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
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            ยังไม่มีกิจกรรมล่าสุด
          </div>
        </div>
      </div>
    </div>
  )
}
