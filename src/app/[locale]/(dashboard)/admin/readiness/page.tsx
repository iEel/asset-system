import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildProductionReadinessChecks, summarizeProductionReadiness, type ProductionReadinessCheck } from "@/lib/production-readiness"
import {
  groupReadiness,
  nextSteps,
  parseReadinessFilter,
  type ReadinessFilter,
  type ReadinessGroup,
} from "@/lib/readiness-presenter"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import {
  ldapSyncLastStatusKey,
  notificationDigestLastStatusKey,
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { cn, formatDateTime } from "@/lib/utils"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { ReadinessFilterChips } from "@/components/admin/readiness/readiness-filter-chips"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"

type ProductionReadinessPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ filter?: string | string[] }>
}

type CheckLabels = {
  title: string
  description: string
  status: string
  value: string
  action: string | null
  fix: string | null
}

// Group 12 plan 1 Task 3 (spec §6, board AD-Readiness): the checked-at line, the "ขั้นถัดไป" card for the ต้องแก้ items,
// the status chips with the sum line, then the four groups (a table from md, a card per check below). The StatStrip
// went: the chips carry the counts. Nothing on the page shows a secret: the values come from check.display only.
export default async function ProductionReadinessPage({ params, searchParams }: ProductionReadinessPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")
  const filter = parseReadinessFilter((await searchParams).filter)

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
  const groups = groupReadiness(checks, filter)
  const steps = nextSteps(checks)
  const checkedAt = formatDateTime(new Date())
  const basePath = `/${locale}/admin/readiness`
  const hrefFor = (value: ReadinessFilter) => (value === "all" ? basePath : `${basePath}?filter=${value}`)
  const labelsFor = (check: ProductionReadinessCheck): CheckLabels => ({
    title: t(`check_${check.key}_title`),
    description: t(`check_${check.key}_description`),
    status: t(`status_${check.status}`),
    value: t(`values.${check.display.key}`, {
      ...check.display.values,
      ...Object.fromEntries(Object.entries(check.display.words ?? {}).map(([name, word]) => [name, t(`words.${word}`)])),
    }),
    action: check.href ? t(`check_${check.key}_action`) : null,
    fix: check.href ? null : t(`check_${check.key}_fix`),
  })
  const tableLabels = { status: t("col_status"), check: t("col_check"), value: t("value"), fix: t("col_fix"), fixEnvLead: t("fixEnvLead") }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={
          <>
            <span>{t("subtitle")}</span>
            <span>{t("checkedAt", { time: checkedAt })}</span>
          </>
        }
      />

      {steps.length > 0 ? (
        <ReadinessNextSteps
          steps={steps}
          locale={locale}
          title={t("nextStepsTitle", { count: steps.length })}
          serverNote={steps.some((check) => check.fixEnv.length > 0) ? t("nextStepsServerNote") : null}
          lineFor={(check) => ({
            title: t(`check_${check.key}_title`),
            env: check.fixEnv.length > 0 ? t("nextStepEnv", { names: check.fixEnv.join(" · ") }) : null,
            action: check.href ? t(`check_${check.key}_action`) : null,
            fix: check.href ? null : t(`check_${check.key}_fix`),
          })}
        />
      ) : null}

      <ContentPanel title={t("checklistTitle")} description={t("checklistDescription")}>
        <div className="space-y-6">
          <ReadinessFilterChips value={filter} counts={summary} hrefFor={hrefFor} />
          {groups.length === 0 ? <EmptyNote role="status">{t("filterEmpty")}</EmptyNote> : null}
          {groups.map((group) => (
            <ReadinessGroupSection
              key={group.key}
              group={group}
              locale={locale}
              heading={t(`group_${group.key}`)}
              countsLine={groupCountsLine(group, (status, count) => t("groupCount", { label: t(`status_${status}`), count }), t("groupTotal", { count: group.counts.fail + group.counts.warning + group.counts.pass }))}
              tableLabels={tableLabels}
              labelsFor={labelsFor}
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

// The group heading's counts: only the statuses it has, then the total (board: "ต้องแก้ 1 · ควรตรวจ 1 · พร้อม 2 · รวม 4").
function groupCountsLine(group: ReadinessGroup, part: (status: ProductionReadinessCheck["status"], count: number) => string, total: string) {
  const statuses: ProductionReadinessCheck["status"][] = ["fail", "warning", "pass"]
  return [...statuses.filter((status) => group.counts[status] > 0).map((status) => part(status, group.counts[status])), total].join(" · ")
}

function ReadinessNextSteps({
  steps,
  locale,
  title,
  serverNote,
  lineFor,
}: {
  steps: ProductionReadinessCheck[]
  locale: string
  title: string
  serverNote: string | null
  lineFor: (check: ProductionReadinessCheck) => { title: string; env: string | null; action: string | null; fix: string | null }
}) {
  return (
    <Notice tone="danger" title={title} data-slot="readiness-next-steps">
      <ul className="space-y-1.5 text-foreground">
        {steps.map((check) => {
          const line = lineFor(check)
          return (
            <li key={check.key} className="break-words">
              <span className="font-medium">{line.title}</span>
              {" · "}
              {/* Final review: the env names, then the check's own fix sentence (what to do first; it ends in restart). */}
              {line.env ? <>{line.env} </> : null}
              {line.fix}
              {check.href ? (
                <Link href={`/${locale}${check.href}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                  {line.action}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
      {serverNote ? <p className="mt-2">{serverNote}</p> : null}
    </Notice>
  )
}

function ReadinessGroupSection({
  group,
  locale,
  heading,
  countsLine,
  tableLabels,
  labelsFor,
}: {
  group: ReadinessGroup
  locale: string
  heading: string
  countsLine: string
  tableLabels: { status: string; check: string; value: string; fix: string; fixEnvLead: string }
  labelsFor: (check: ProductionReadinessCheck) => CheckLabels
}) {
  return (
    <section aria-label={heading} className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-semibold text-foreground">{heading}</h3>
        <p className="num text-meta text-muted-foreground">{countsLine}</p>
      </div>

      <DataTable caption={heading} layout="fixed" className="max-md:hidden">
        <colgroup>
          <col className="w-36" />
          <col />
          <col className="w-[28%]" />
          <col className="w-[30%]" />
        </colgroup>
        <DataTableHeader>
          <tr>
            <DataTableHead>{tableLabels.status}</DataTableHead>
            <DataTableHead>{tableLabels.check}</DataTableHead>
            <DataTableHead>{tableLabels.value}</DataTableHead>
            <DataTableHead>{tableLabels.fix}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {group.checks.map((check) => {
            const labels = labelsFor(check)
            return (
              <DataTableRow key={check.key}>
                <DataTableCell>
                  <StatusBadge label={labels.status} tone={checkTone(check.status)} />
                </DataTableCell>
                <DataTableCell>
                  <div className="font-medium text-foreground">{labels.title}</div>
                  <p className="mt-1 text-meta text-muted-foreground">{labels.description}</p>
                </DataTableCell>
                <DataTableCell className="[overflow-wrap:anywhere]">{labels.value}</DataTableCell>
                <DataTableCell>
                  <ReadinessFix check={check} locale={locale} labels={labels} fixEnvLead={tableLabels.fixEnvLead} />
                </DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>

      <ul className="space-y-3 md:hidden">
        {group.checks.map((check) => (
          <li key={check.key}>
            <ReadinessCheckCard check={check} locale={locale} labels={labelsFor(check)} valueLabel={tableLabels.value} fixEnvLead={tableLabels.fixEnvLead} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// Below md, one card per check: title, badge, why it matters, the detected value, then where to fix it.
function ReadinessCheckCard({
  check,
  locale,
  labels,
  valueLabel,
  fixEnvLead,
}: {
  check: ProductionReadinessCheck
  locale: string
  labels: CheckLabels
  valueLabel: string
  fixEnvLead: string
}) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-foreground">{labels.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
        </div>
        <StatusBadge label={labels.status} tone={checkTone(check.status)} />
      </div>
      <div className="mt-4">
        <div className="text-xs font-medium text-muted-foreground">{valueLabel}</div>
        <div className="mt-1 text-sm text-foreground [overflow-wrap:anywhere]">{labels.value}</div>
      </div>
      <div className="mt-4">
        <ReadinessFix check={check} locale={locale} labels={labels} fixEnvLead={fixEnvLead} />
      </div>
    </article>
  )
}

// Where to fix: the env names in the code font, then the fix line (it ends in แล้วรีสตาร์ตแอป), or the link to the page
// that fixes it in the app (critique 2026-10-20 F1).
function ReadinessFix({ check, locale, labels, fixEnvLead }: { check: ProductionReadinessCheck; locale: string; labels: CheckLabels; fixEnvLead: string }) {
  return (
    <div className="min-w-0">
      {check.fixEnv.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">{fixEnvLead}</p>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-foreground">
            {check.fixEnv.map((name) => (
              <span key={name} className="tag">{name}</span>
            ))}
          </p>
        </>
      ) : null}
      {labels.fix ? <p className="mt-2 text-xs text-muted-foreground">{labels.fix}</p> : null}
      {check.href ? (
        <Link
          href={`/${locale}${check.href}`}
          className={cn(buttonVariants({ variant: "outline", size: "md" }), "h-auto whitespace-normal py-2 text-left md:h-auto md:min-h-9")}
          aria-label={`${labels.action}: ${labels.title}`}
        >
          {labels.action}
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
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
