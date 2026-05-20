import Link from "next/link"
import type React from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Rocket, ShieldCheck, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildProductionReadinessChecks, summarizeProductionReadiness, type ProductionReadinessCheck } from "@/lib/production-readiness"
import { systemSettingDefaults } from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"

type ProductionReadinessPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ProductionReadinessPage({ params }: ProductionReadinessPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")

  const t = await getTranslations("productionReadinessPage")
  const savedSettingsPromise = prisma.systemSetting.findMany({ select: { key: true, value: true } })
  const approverUsersPromise = getApprovalPermissionMatrixUsers()
  const masterDataCountsPromise = getMasterDataCounts()

  const [savedSettings, approverUsers, masterDataCounts] = await Promise.all([
    savedSettingsPromise,
    approverUsersPromise,
    masterDataCountsPromise,
  ])
  const settings = mergeSettings(savedSettings)
  const policy = parseWorkflowApprovalPolicy(settings)
  const approverMatrix = buildApprovalPermissionMatrix(approverUsers, policy.minApprovers)
  const checks = buildProductionReadinessChecks({
    settings,
    approverMatrix,
    activeAdminUsers: approverUsers.filter((user) => user.roleKeys.includes("system_admin")).length,
    activeUserCount: approverUsers.length,
    deployment: {
      nodeEnv: process.env.NODE_ENV,
      authUrl: process.env.AUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      authSecret: process.env.AUTH_SECRET,
      nextAuthSecret: process.env.NEXTAUTH_SECRET,
      uploadDir: process.env.UPLOAD_DIR,
      databaseUrl: process.env.DATABASE_URL,
      dbServer: process.env.DB_SERVER,
      dbUser: process.env.DB_USER,
      dbPassword: process.env.DB_PASSWORD,
    },
    masterDataCounts,
  })
  const summary = summarizeProductionReadiness(checks)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("summaryTotal")} value={summary.total} tone="primary" icon={<Rocket className="h-5 w-5" />} />
        <SummaryCard label={t("summaryPass")} value={summary.pass} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label={t("summaryWarning")} value={summary.warning} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard label={t("summaryFail")} value={summary.fail} tone="danger" icon={<XCircle className="h-5 w-5" />} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("checklistTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checklistDescription")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {checks.map((check) => (
            <ReadinessCheckCard
              key={check.key}
              check={check}
              locale={locale}
              labels={{
                title: t(`check_${check.key}_title`),
                description: t(`check_${check.key}_description`),
                status: t(`status_${check.status}`),
                value: t("value"),
                action: t(`check_${check.key}_action`),
              }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border bg-background p-2 text-muted-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("scopeTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("scopeDescription")}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: "primary" | "success" | "warning" | "danger"
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function ReadinessCheckCard({
  check,
  locale,
  labels,
}: {
  check: ProductionReadinessCheck
  locale: string
  labels: {
    title: string
    description: string
    status: string
    value: string
    action: string
  }
}) {
  return (
    <article className={`rounded-lg border p-4 ${checkCardClass(check.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(check.status)}`}>
          {statusIcon(check.status)}
          {labels.status}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.value}</div>
          <div className="mt-1 break-all font-mono text-xs text-foreground">{check.value}</div>
        </div>
        <Link
          href={`/${locale}${check.href}`}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          {labels.action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

async function getMasterDataCounts() {
  const [companies, branches, departments, locations, categories, statuses, conditions] = await Promise.all([
    prisma.company.count({ where: { isActive: true } }),
    prisma.branch.count({ where: { isActive: true } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),
    prisma.assetCategory.count({ where: { isActive: true } }),
    prisma.assetStatus.count({ where: { isActive: true } }),
    prisma.assetCondition.count({ where: { isActive: true } }),
  ])
  return { companies, branches, departments, locations, categories, statuses, conditions }
}

function mergeSettings(savedSettings: Array<{ key: string; value: string }>) {
  const settings = new Map(systemSettingDefaults.map((setting) => [setting.key, setting.value]))
  for (const setting of savedSettings) settings.set(setting.key, setting.value)
  return settings
}

function statusIcon(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return <CheckCircle2 className="h-3 w-3" />
  if (status === "warning") return <AlertTriangle className="h-3 w-3" />
  return <XCircle className="h-3 w-3" />
}

function checkCardClass(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return "border-success/30 bg-success/5"
  if (status === "warning") return "border-warning/30 bg-warning/5"
  return "border-danger/30 bg-danger/5"
}

function statusPillClass(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return "bg-success/10 text-success"
  if (status === "warning") return "bg-warning/10 text-warning"
  return "bg-danger/10 text-danger"
}

function summaryClass(tone: "primary" | "success" | "warning" | "danger") {
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  return "border-primary/30 bg-primary/5 text-primary"
}
