import Link from "next/link"
import type React from "react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import { redirectToLogin } from "@/lib/page-auth"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
import { approvalInboxFilters, filterApprovalInboxItems, parseApprovalInboxFilter, type ApprovalInboxFilter } from "@/lib/approval-inbox-filter"
import { getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { buildApprovalPermissionMatrix, type ApprovalPermissionMatrixItem } from "@/lib/approval-permission-matrix"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { formatCount } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalInboxPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[] }>
}

export default async function ApprovalInboxPage({ params, searchParams }: ApprovalInboxPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) return redirectToLogin(locale)

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
  const disposalPolicyOn = policy.disposalRequired && access.canApproveDisposal
  const auditPolicyOn = policy.auditCloseRequired && access.canApproveAudit

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href={`/${locale}/admin/approvals/history`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <History aria-hidden="true" />
              {t("openDecisionHistory")}
            </Link>
            <Link href={`/${locale}/admin/settings`} className={buttonVariants({ variant: "outline", size: "md" })}>
              {t("openPolicySettings")}
            </Link>
          </>
        }
      />

      <StatStrip
        items={[
          { key: "total", label: t("total"), value: formatCount(summary.total) },
          { key: "disposal", label: t("disposal"), value: formatCount(summary.disposal) },
          { key: "audit", label: t("audit"), value: formatCount(summary.audit) },
        ]}
      />

      {/* The policy in effect: facts as label and value pairs, on and off as status badges (no tinted boxes). */}
      <ContentPanel title={t("policyTitle")} description={t("policyDescription")}>
        <KeyValueList
          items={[
            { key: "disposal", label: t("policyDisposal"), value: <StatusBadge label={disposalPolicyOn ? t("enabled") : t("disabled")} tone={disposalPolicyOn ? "success" : "muted"} /> },
            { key: "auditClose", label: t("policyAuditClose"), value: <StatusBadge label={auditPolicyOn ? t("enabled") : t("disabled")} tone={auditPolicyOn ? "success" : "muted"} /> },
            { key: "minApprovers", label: t("minApprovers"), value: `${formatCount(policy.minApprovers)} / ${policy.segregationRequired ? t("sodOn") : t("sodOff")}` },
            { key: "sla", label: t("approvalSla"), value: t("slaDays", { days: policy.slaDays }) },
          ]}
        />
      </ContentPanel>

      <ContentPanel
        title={t("approverMatrixTitle")}
        description={t("approverMatrixDescription", { min: policy.minApprovers })}
        actions={
          <Link href={`/${locale}/admin/roles`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Users aria-hidden="true" />
            {t("manageRoles")}
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
      </ContentPanel>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("queueTitle")}
        description={t("queueDescription")}
        actions={<span className="text-sm font-medium text-muted-foreground num">{t("filteredCount", { count: formatCount(filteredItems.length) })}</span>}
      >
        <TabNav
          aria-label={t("queueTitle")}
          items={filterOptions.map((filter) => ({
            key: filter.key,
            label: filter.label,
            count: formatCount(filter.count),
            href: filter.key === "all" ? `/${locale}/admin/approvals` : `/${locale}/admin/approvals?module=${filter.key}`,
          }))}
          current={activeFilter}
          className="px-4 md:px-5"
        />
        {filteredItems.length === 0 ? (
          <div className="p-4 md:p-5">
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
                slaDays={policy.slaDays}
                labels={{
                  modules: { disposal: t("disposal"), audit: t("audit") },
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
                  overdueDays: (days) => t("overdueDays", { days }),
                }}
              />
            ))}
          </div>
        )}
      </ContentPanel>
    </div>
  )
}

// A row is one link (2B bug §5.10 #3). The module is a name, so a Chip; only an overdue request is a danger badge.
function ApprovalInboxRow({
  item,
  slaDays,
  labels,
}: {
  item: ApprovalInboxItem
  slaDays: number
  labels: {
    modules: Record<ApprovalInboxItem["module"], string>
    requestedBy: string
    requestedAt: string
    waitingDays: (days: number) => string
    overdueDays: (days: number) => string
  }
}) {
  const ageStatus = getApprovalAgeStatus(item.requestedAt, new Date(), slaDays)
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-row-hover">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div aria-hidden="true" className="mt-1 text-muted-foreground">{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{labels.modules[item.module]}</Chip>
              <StatusBadge
                label={ageStatus.isOverdue ? labels.overdueDays(ageStatus.daysOverdue) : labels.waitingDays(ageStatus.ageDays)}
                tone={ageStatus.isOverdue ? "danger" : "muted"}
              />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{labels.requestedBy}: {orNil(item.requestedBy)}</span>
              <span>{labels.requestedAt}: {formatDateTime(item.requestedAt)}</span>
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          {item.actionLabel}
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Link>
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

  // A neutral card in the panel; the coverage is its status badge (ready, thin, missing).
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{labels.workflow}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.approverCount(item.approverCount)}</p>
        </div>
        <StatusBadge label={labels.status} tone={matrixTone(item.status)} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.permissionKey}</div>
          <div className="mt-1 text-xs text-foreground"><span className="tag">{item.permissionKey}</span></div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.roles}</div>
          <div className="mt-1 text-foreground">{item.roleLabels.length > 0 ? item.roleLabels.join(", ") : labels.noRoles}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.approvers}</div>
          {visibleApprovers.length === 0 ? (
            <div className="mt-1 text-muted-foreground">{labels.noApprovers}</div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {visibleApprovers.map((approver) => (
                <Chip key={approver}>{approver}</Chip>
              ))}
              {hiddenApproverCount > 0 ? (
                <span className="text-meta text-muted-foreground">{labels.moreApprovers(hiddenApproverCount)}</span>
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
  if (kind === "audit_round_close") return <ShieldCheck className="h-4 w-4" />
  return <ClipboardCheck className="h-4 w-4" />
}

function matrixTone(status: ApprovalPermissionMatrixItem["status"]): StatusTone {
  if (status === "missing") return "danger"
  if (status === "thin") return "warning"
  return "success"
}
