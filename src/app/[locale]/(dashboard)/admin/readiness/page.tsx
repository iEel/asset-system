import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { buildProductionReadinessChecks, summarizeProductionReadiness, type ProductionReadinessCheck } from "@/lib/production-readiness"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  ldapSyncLastStatusKey,
  notificationDigestLastStatusKey,
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"

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
      ldapSyncToken: process.env.LDAP_SYNC_TOKEN,
      notificationDigestToken: process.env.NOTIFICATION_DIGEST_TOKEN,
      uploadScanCommand: process.env.UPLOAD_SCAN_COMMAND,
      uploadScanArgs: process.env.UPLOAD_SCAN_ARGS,
      uploadScanTimeoutMs: process.env.UPLOAD_SCAN_TIMEOUT_MS,
      schedulerRunStatuses: [
        { name: "ldap_sync", status: settings.get(ldapSyncLastStatusKey) },
        { name: "notification_digest", status: settings.get(notificationDigestLastStatusKey) },
      ],
      backupStatus: process.env.BACKUP_STATUS,
      backupLastRunAt: process.env.BACKUP_LAST_RUN_AT,
      backupLastRestoreTestAt: process.env.BACKUP_LAST_RESTORE_TEST_AT,
      pwaAssets: getPwaAssetReadiness(),
    },
    masterDataCounts,
  })
  const summary = summarizeProductionReadiness(checks)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "total", label: t("summaryTotal"), value: formatCount(summary.total) },
          { key: "pass", label: t("summaryPass"), value: formatCount(summary.pass) },
          { key: "warning", label: t("summaryWarning"), value: formatCount(summary.warning) },
          { key: "fail", label: t("summaryFail"), value: formatCount(summary.fail) },
        ]}
      />

      <ContentPanel title={t("checklistTitle")} description={t("checklistDescription")}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
                action: check.href ? t(`check_${check.key}_action`) : null,
                fix: check.href ? null : t(`check_${check.key}_fix`),
              }}
            />
          ))}
        </div>
      </ContentPanel>

      {/* D7: what the checks cover is information, an info Notice with no box. */}
      <Notice tone="info" title={t("scopeTitle")}>
        {t("scopeDescription")}
      </Notice>
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
    action: string | null
    fix: string | null
  }
}) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
        </div>
        <StatusBadge label={labels.status} tone={checkTone(check.status)} />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.value}</div>
          <div className="mt-1 break-all text-xs text-foreground"><span className="tag">{check.value}</span></div>
          {labels.fix ? <p className="mt-2 text-xs text-muted-foreground">{labels.fix}</p> : null}
        </div>
        {check.href ? (
          <Link
            href={`/${locale}${check.href}`}
            className={buttonVariants({ variant: "outline", size: "md" })}
            aria-label={`${labels.action}: ${labels.title}`}
          >
            {labels.action}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
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

function getPwaAssetReadiness() {
  const root = process.cwd()
  const requiredFileChecks = [
    existsSync(join(root, "src", "app", "manifest.ts")),
    existsSync(join(root, "src", "app", "favicon.ico")),
    existsSync(join(root, "src", "app", "icon.png")),
    existsSync(join(root, "src", "app", "apple-icon.png")),
    existsSync(join(root, "public", "sw.js")),
    existsSync(join(root, "public", "offline.html")),
    existsSync(join(root, "public", "icons", "icon-192.png")),
    existsSync(join(root, "public", "icons", "icon-512.png")),
    existsSync(join(root, "public", "icons", "maskable-192.png")),
    existsSync(join(root, "public", "icons", "maskable-512.png")),
  ]
  return {
    available: requiredFileChecks.filter(Boolean).length,
    total: requiredFileChecks.length,
  }
}

// The check's state is its badge (no tinted card): pass is calm, warning and fail need action.
function checkTone(status: ProductionReadinessCheck["status"]): StatusTone {
  if (status === "pass") return "success"
  if (status === "warning") return "warning"
  return "danger"
}
