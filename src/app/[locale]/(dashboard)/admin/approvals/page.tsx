import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users, Wrench } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
import { approvalInboxFilters, filterApprovalInboxItems, parseApprovalInboxFilter, type ApprovalInboxFilter } from "@/lib/approval-inbox-filter"
import { getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { buildApprovalPermissionMatrix, type ApprovalPermissionMatrixItem } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

type ApprovalInboxPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[] }>
}

export default async function ApprovalInboxPage({ params, searchParams }: ApprovalInboxPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) redirect(`/${locale}/login`)

  const snapshot = await getApprovalInboxSnapshot(user, locale)
  if (!snapshot.access.canAnyApproval) notFound()

  const [t, approverUsers] = await Promise.all([
    getTranslations("approvalInboxPage"),
    getApprovalPermissionMatrixUsers(),
  ])
  const { access, policy, items, summary } = snapshot
  const approverMatrix = buildApprovalPermissionMatrix(approverUsers, policy.minApprovers)
  const sortedItems = sortApprovalInboxItemsByAge(items, policy.slaDays)
  const activeFilter = parseApprovalInboxFilter(query.module)
  const filteredItems = filterApprovalInboxItems(sortedItems, activeFilter)
  const filterOptions: Array<{ key: ApprovalInboxFilter; label: string; count: number }> = approvalInboxFilters.map((filter) => ({
    key: filter,
    label: t(`filter_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/approvals/history`}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <History className="h-4 w-4" />
            {t("openDecisionHistory")}
          </Link>
          <Link
            href={`/${locale}/admin/settings`}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t("openPolicySettings")}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("total")} value={summary.total} tone={summary.total > 0 ? "danger" : "success"} />
        <SummaryCard label={t("disposal")} value={summary.disposal} tone={summary.disposal > 0 ? "danger" : "muted"} />
        <SummaryCard label={t("maintenance")} value={summary.maintenance} tone={summary.maintenance > 0 ? "warning" : "muted"} />
        <SummaryCard label={t("audit")} value={summary.audit} tone={summary.audit > 0 ? "warning" : "muted"} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("policyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("policyDescription")}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <PolicyBadge label={t("policyDisposal")} enabled={policy.disposalRequired && access.canApproveDisposal} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyMaintenance")} enabled={policy.maintenanceCloseRequired && access.canCloseMaintenance} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyAuditClose")} enabled={policy.auditCloseRequired && access.canApproveAudit} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("minApprovers")}</div>
              <div className="font-semibold text-foreground">
                {policy.minApprovers} / {policy.segregationRequired ? t("sodOn") : t("sodOff")}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("approvalSla")}</div>
              <div className="font-semibold text-foreground">{t("slaDays", { days: policy.slaDays })}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("approverMatrixTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("approverMatrixDescription", { min: policy.minApprovers })}</p>
          </div>
          <Link
            href={`/${locale}/admin/roles`}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            {t("manageRoles")}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {approverMatrix.map((item) => (
            <ApproverMatrixCard
              key={item.key}
              item={item}
              labels={{
                workflow: t(`matrixWorkflow_${item.key}`),
                approverCount: (count) => t("approverCount", { count }),
                permissionKey: t("permissionKey"),
                roles: t("roles"),
                approvers: t("approvers"),
                noRoles: t("noRoles"),
                noApprovers: t("noApprovers"),
                moreApprovers: (count) => t("moreApprovers", { count }),
                status: t(`matrixStatus_${item.status}`),
              }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{t("queueTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("queueDescription")}</p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">{t("filteredCount", { count: filteredItems.length })}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <FilterChip
                key={filter.key}
                href={filter.key === "all" ? `/${locale}/admin/approvals` : `/${locale}/admin/approvals?module=${filter.key}`}
                active={activeFilter === filter.key}
                label={filter.label}
                count={filter.count}
              />
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={items.length === 0 ? t("emptyTitle") : t("emptyFilterTitle")}
              description={items.length === 0 ? t("emptyDescription") : t("emptyFilterDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <ApprovalInboxRow
                key={item.id}
                item={item}
                locale={locale}
                slaDays={policy.slaDays}
                labels={{
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
                  overdueDays: (days) => t("overdueDays", { days }),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground">{count.toLocaleString("th-TH")}</span>
    </Link>
  )
}

function ApprovalInboxRow({
  item,
  locale,
  slaDays,
  labels,
}: {
  item: ApprovalInboxItem
  locale: string
  slaDays: number
  labels: {
    requestedBy: string
    requestedAt: string
    waitingDays: (days: number) => string
    overdueDays: (days: number) => string
  }
}) {
  const ageStatus = getApprovalAgeStatus(item.requestedAt, new Date(), slaDays)
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-accent">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${toneClass(item.tone)}`}>{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pillClass(item.tone)}`}>{moduleLabel(item.module, locale)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ageStatus.isOverdue ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"}`}>
                {ageStatus.isOverdue ? labels.overdueDays(ageStatus.daysOverdue) : labels.waitingDays(ageStatus.ageDays)}
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{labels.requestedBy}: {item.requestedBy || "-"}</span>
              <span>{labels.requestedAt}: {formatDateTime(item.requestedAt)}</span>
            </div>
          </div>
        </div>
        <div className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground">
          {item.actionLabel}
        </div>
      </div>
    </Link>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "danger" | "warning" | "success" | "muted"
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        <FileCheck2 className="h-5 w-5 text-current" />
      </div>
    </div>
  )
}

function PolicyBadge({
  label,
  enabled,
  enabledLabel,
  disabledLabel,
}: {
  label: string
  enabled: boolean
  enabledLabel: string
  disabledLabel: string
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${enabled ? "border-success/30 bg-success/5" : "border-border bg-background"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${enabled ? "text-success" : "text-muted-foreground"}`}>
        {enabled ? enabledLabel : disabledLabel}
      </div>
    </div>
  )
}

function ApproverMatrixCard({
  item,
  labels,
}: {
  item: ApprovalPermissionMatrixItem
  labels: {
    workflow: string
    approverCount: (count: number) => string
    permissionKey: string
    roles: string
    approvers: string
    noRoles: string
    noApprovers: string
    moreApprovers: (count: number) => string
    status: string
  }
}) {
  const visibleApprovers = item.approverLabels.slice(0, 4)
  const hiddenApproverCount = item.approverLabels.length - visibleApprovers.length

  return (
    <div className={`rounded-lg border p-4 ${matrixCardClass(item.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{labels.workflow}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.approverCount(item.approverCount)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${matrixStatusClass(item.status)}`}>
          {matrixStatusIcon(item.status)}
          {labels.status}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.permissionKey}</div>
          <div className="mt-1 font-mono text-xs text-foreground">{item.permissionKey}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.roles}</div>
          <div className="mt-1 text-foreground">{item.roleLabels.length > 0 ? item.roleLabels.join(", ") : labels.noRoles}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.approvers}</div>
          {visibleApprovers.length === 0 ? (
            <div className="mt-1 text-danger">{labels.noApprovers}</div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleApprovers.map((approver) => (
                <span key={approver} className="rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground">
                  {approver}
                </span>
              ))}
              {hiddenApproverCount > 0 ? (
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {labels.moreApprovers(hiddenApproverCount)}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function kindIcon(kind: ApprovalInboxItem["kind"]): React.ReactNode {
  if (kind === "disposal_review") return <Trash2 className="h-4 w-4" />
  if (kind === "maintenance_close") return <Wrench className="h-4 w-4" />
  if (kind === "audit_round_close") return <ShieldCheck className="h-4 w-4" />
  return <ClipboardCheck className="h-4 w-4" />
}

function moduleLabel(module: ApprovalInboxItem["module"], locale: string) {
  const labels = {
    th: { disposal: "ตัดจำหน่าย", maintenance: "ซ่อมบำรุง", audit: "ตรวจนับ" },
    en: { disposal: "Disposal", maintenance: "Maintenance", audit: "Audit" },
  }
  return (locale === "th" ? labels.th : labels.en)[module]
}

function toneClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  return "border-primary/30 bg-primary/5 text-primary"
}

function pillClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "bg-danger/10 text-danger"
  if (tone === "warning") return "bg-warning/10 text-warning"
  return "bg-primary/10 text-primary"
}

function summaryClass(tone: "danger" | "warning" | "success" | "muted") {
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  return "border-border bg-surface text-muted-foreground"
}

function matrixCardClass(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "missing") return "border-danger/30 bg-danger/5"
  if (status === "thin") return "border-warning/30 bg-warning/5"
  return "border-success/30 bg-success/5"
}

function matrixStatusClass(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "missing") return "bg-danger/10 text-danger"
  if (status === "thin") return "bg-warning/10 text-warning"
  return "bg-success/10 text-success"
}

function matrixStatusIcon(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "ready") return <CheckCircle2 className="h-3 w-3" />
  return <AlertTriangle className="h-3 w-3" />
}

async function getApprovalPermissionMatrixUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              displayName: true,
              displayNameTh: true,
              isActive: true,
              rolePermissions: {
                select: {
                  permission: { select: { module: true, action: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  })

  return users.map((user) => {
    const activeRoles = user.userRoles.map((userRole) => userRole.role).filter((role) => role.isActive)
    const permissionKeys = new Set(
      activeRoles.flatMap((role) => role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`))
    )

    return {
      id: user.id,
      label: `${user.displayName} (${user.username})`,
      roleKeys: activeRoles.map((role) => role.name),
      roleLabels: activeRoles.map((role) => role.displayNameTh ?? role.displayName),
      permissionKeys: Array.from(permissionKeys),
    }
  })
}
