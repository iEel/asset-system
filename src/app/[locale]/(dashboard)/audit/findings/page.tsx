import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, ClipboardCheck, Download, FileText, ListChecks } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import {
  auditFindingResolutionStatuses,
  buildAuditFindingWhere,
  getAuditFindingToday,
  isOpenAuditFindingActionStatus,
  resolveAuditFindingStatus,
  type AuditFindingResolutionStatus,
} from "@/lib/audit-finding-filters"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string }>
}

export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status: statusParam = "pending" } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canEdit = hasPermission(user, "audit", "edit")
  const canApprove = hasPermission(user, "audit", "approve")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")
  const pageLoadedAt = new Date()
  const searchText = search.trim()
  const status = resolveAuditFindingStatus(statusParam)
  const today = getAuditFindingToday()
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, status, searchText)
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  exportParams.set("status", status)
  const [findings, employees, pendingReviewCount, openActionCount, overdueCount, closedCount] = await Promise.all([
    prisma.auditFinding.findMany({
      where: buildAuditFindingWhere({ status, search: searchText, now: today }),
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        auditItem: { select: { auditStatus: true, reconcileStatus: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 200,
    }),
    canEdit
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "pending", search: searchText, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "action_open", search: searchText, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "overdue", search: searchText, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "closed", search: searchText, now: today }) }),
  ])
  const findingIds = findings.map((finding) => finding.id)
  const attachmentCounts = findingIds.length
    ? await prisma.attachment.groupBy({
        by: ["referenceId"],
        where: { module: "audit_finding", referenceId: { in: findingIds }, isActive: true },
        _count: { _all: true },
      })
    : []
  const attachmentCountByFindingId = new Map(attachmentCounts.map((row) => [row.referenceId, row._count._all]))
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))
  const employeeLabelById = new Map(employeeOptions.map((employee) => [employee.id, employee.label]))
  const valueLabels = await buildFindingValueLabels(findings)
  const batchReviewFindings = findings
    .filter((finding) => finding.reviewStatus === "pending" && !isSameAuditActor(user.id, finding.reportedBy))
    .map((finding) => ({
      id: finding.id,
      label: finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo,
      detail: `${finding.auditRound.auditNo} · ${t(`type_${finding.findingType}`)}`,
    }))
  const resolutionFilterLabels: Record<AuditFindingResolutionStatus, string> = {
    pending: t("status_pending"),
    action_open: t("filterActionOpen"),
    overdue: t("filterOverdue"),
    closed: t("filterClosed"),
    approved: t("status_approved"),
    rejected: t("status_rejected"),
    exception: t("status_exception"),
    all: t("status_all"),
  }
  const resolutionStateLabels: Record<ResolutionState, string> = {
    pending_review: t("resolutionStatePendingReview"),
    open_action: t("resolutionStateOpenAction"),
    overdue: t("resolutionStateOverdue"),
    closed: t("resolutionStateClosed"),
    resolved: t("resolutionStateResolved"),
  }
  const resolutionSummaryItems = [
    {
      status: "pending" as const,
      label: t("summaryPendingReview"),
      help: t("summaryPendingReviewHelp"),
      count: pendingReviewCount,
      tone: "warning" as const,
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      status: "action_open" as const,
      label: t("summaryOpenActions"),
      help: t("summaryOpenActionsHelp"),
      count: openActionCount,
      tone: "info" as const,
      icon: <ListChecks className="h-5 w-5" />,
    },
    {
      status: "overdue" as const,
      label: t("summaryOverdue"),
      help: t("summaryOverdueHelp"),
      count: overdueCount,
      tone: "danger" as const,
      icon: <CalendarClock className="h-5 w-5" />,
    },
    {
      status: "closed" as const,
      label: t("summaryClosed"),
      help: t("summaryClosedHelp"),
      count: closedCount,
      tone: "success" as const,
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
  ]
  const resolutionFilters = auditFindingResolutionStatuses.map((item) => ({
    value: item,
    label: resolutionFilterLabels[item],
    href: buildAuditFindingsHref(locale, item, searchText),
  }))

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds`}
        createLabel={t("backToRounds")}
      />

      <DataFreshnessBanner
        loadedAtIso={pageLoadedAt.toISOString()}
        loadedAtLabel={formatDateTime(pageLoadedAt)}
        labels={{
          freshTitle: t("freshnessFreshTitle"),
          freshHelp: t("freshnessFreshHelp"),
          staleTitle: t("freshnessStaleTitle"),
          staleHelp: t("freshnessStaleHelp"),
          refresh: t("freshnessRefresh"),
          refreshing: t("freshnessRefreshing"),
        }}
      />

      <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("resolutionTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("resolutionHelp")}</p>
          </div>
          <StatusBadge label={resolutionFilterLabels[status]} status={status} size="sm" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resolutionSummaryItems.map((item) => (
            <ResolutionMetric
              key={item.status}
              href={buildAuditFindingsHref(locale, item.status, searchText)}
              active={status === item.status}
              label={item.label}
              help={item.help}
              count={item.count}
              tone={item.tone}
              icon={item.icon}
            />
          ))}
        </div>
      </section>

      <MasterDataSearch
        action={`/${locale}/audit/findings`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
      />

      <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("quickFilters")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("quickFiltersHelp")}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={`/api/audit-findings/export?${exportParams.toString()}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
            >
              <Download className="h-4 w-4" />
              {t("exportFindings")}
            </a>
            <a
              href={`/api/audit-findings/export-pdf?${exportParams.toString()}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
            >
              <FileText className="h-4 w-4" />
              {t("exportFindingsPdf")}
            </a>
          </div>
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          {resolutionFilters.map((item) => (
            <Link
              key={item.value}
              href={item.href}
              scroll={false}
              aria-current={status === item.value ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors sm:h-9 sm:min-h-0 ${
                status === item.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {canApprove ? <AuditFindingsBatchActions findings={batchReviewFindings} /> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="grid gap-3 p-3 md:hidden">
          {findings.length === 0 ? (
            <ActionEmptyState
              icon={<FileText className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("backToRounds")}
            />
          ) : (
            findings.map((finding) => {
              const resolutionState = resolveFindingState(finding, today)
              const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
              const findingTypeLabel = t(`type_${finding.findingType}`)
              const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
              const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)

              return (
                <div key={finding.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{assetLabel}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(finding.reportedAt)}</div>
                    </div>
                    <ResolutionStateBadge state={resolutionState} labels={resolutionStateLabels} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ReviewStatusBadge status={finding.reviewStatus} label={t(`status_${finding.reviewStatus}`)} />
                    <ActionStatusBadge status={finding.actionStatus} label={t(`actionStatus_${finding.actionStatus}`)} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <Info label={t("auditRound")} value={`${finding.auditRound.auditNo} · ${finding.auditRound.name}`} />
                    <Info label={t("findingType")} value={findingTypeLabel} />
                    <FindingComparison
                      expectedLabel={t("systemValue")}
                      actualLabel={t("foundValue")}
                      expectedValue={expectedValue}
                      actualValue={actualValue}
                    />
                    <Info label={t("actionOwner")} value={finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"} />
                    <Info label={t("actionDueDate")} value={formatDateTime(finding.actionDueDate)} />
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium"
                    >
                      {tCommon("view")}
                    </Link>
                    {canEdit || canApprove ? (
                      <AuditFindingReviewActions
                        findingId={finding.id}
                        assetLabel={assetLabel}
                        findingTypeLabel={findingTypeLabel}
                        expectedValue={expectedValue}
                        actualValue={actualValue}
                        reviewStatus={finding.reviewStatus}
                        actionStatus={finding.actionStatus}
                        actionPlan={finding.actionPlan}
                        actionOwnerId={finding.actionOwnerId}
                        actionDueDate={finding.actionDueDate}
                        evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                        employees={employeeOptions}
                        reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                        reviewBlockedReason={t("segregationReviewBlocked")}
                      />
                    ) : null}
                    {canCreateDisposal && finding.asset ? (
                      <Link
                        href={appendOperationalReturnTo(`/${locale}/disposal?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-warning/40 bg-warning/5 px-3 text-sm font-medium text-warning"
                      >
                        {t("openDisposalRequest")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("reportedAt")}</ColumnHeader>
                <ColumnHeader>{t("auditRound")}</ColumnHeader>
                <ColumnHeader>{t("asset")}</ColumnHeader>
                <ColumnHeader>{t("findingType")}</ColumnHeader>
                <ColumnHeader>{t("comparison")}</ColumnHeader>
                <ColumnHeader>{t("resolutionState")}</ColumnHeader>
                <ColumnHeader>{t("reviewStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionOwner")}</ColumnHeader>
                <ColumnHeader>{t("actionDueDate")}</ColumnHeader>
                <ColumnHeader>{t("itemStatus")}</ColumnHeader>
                <ColumnHeader>{t("reconcileStatus")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-6">
                    <ActionEmptyState
                      icon={<FileText className="h-6 w-6" />}
                      title={t("emptyTitle")}
                      description={t("emptyHelp")}
                      actionHref={`/${locale}/audit/rounds`}
                      actionLabel={t("backToRounds")}
                    />
                  </td>
                </tr>
              ) : (
                findings.map((finding) => {
                  const resolutionState = resolveFindingState(finding, today)
                  const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
                  const findingTypeLabel = t(`type_${finding.findingType}`)
                  const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
                  const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)

                  return (
                    <ClickableTableRow
                      key={finding.id}
                      href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                      label={`${tCommon("view")}: ${finding.asset?.assetTag ?? finding.auditRound.auditNo}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.reportedAt)}</td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className="text-primary hover:underline">
                          {finding.auditRound.auditNo}
                        </Link>
                        <div className="text-xs text-muted-foreground">{finding.auditRound.name}</div>
                      </td>
                      <td className="min-w-64 px-4 py-3 text-foreground">
                        {finding.asset ? assetLabel : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{findingTypeLabel}</td>
                      <td className="min-w-80 px-4 py-3">
                        <FindingComparison
                          expectedLabel={t("systemValue")}
                          actualLabel={t("foundValue")}
                          expectedValue={expectedValue}
                          actualValue={actualValue}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ResolutionStateBadge state={resolutionState} labels={resolutionStateLabels} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ReviewStatusBadge status={finding.reviewStatus} label={t(`status_${finding.reviewStatus}`)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActionStatusBadge status={finding.actionStatus} label={t(`actionStatus_${finding.actionStatus}`)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.actionDueDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.auditStatus}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.reconcileStatus ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {canEdit || canApprove ? (
                          <AuditFindingReviewActions
                            findingId={finding.id}
                            assetLabel={assetLabel}
                            findingTypeLabel={findingTypeLabel}
                            expectedValue={expectedValue}
                            actualValue={actualValue}
                            reviewStatus={finding.reviewStatus}
                            actionStatus={finding.actionStatus}
                            actionPlan={finding.actionPlan}
                            actionOwnerId={finding.actionOwnerId}
                            actionDueDate={finding.actionDueDate}
                            evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                            employees={employeeOptions}
                            reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                            reviewBlockedReason={t("segregationReviewBlocked")}
                          />
                        ) : (
                          "-"
                        )}
                        {canCreateDisposal && finding.asset ? (
                          <Link
                            href={appendOperationalReturnTo(`/${locale}/disposal?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)}
                            className="ml-2 inline-flex h-8 items-center rounded-md border border-warning/40 bg-warning/5 px-2 text-xs font-medium text-warning"
                          >
                            {t("openDisposalRequest")}
                          </Link>
                        ) : null}
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

type FindingResolutionSnapshot = {
  reviewStatus: string
  actionStatus: string
  actionDueDate: Date | string | null
}

function ResolutionMetric({
  href,
  active,
  label,
  help,
  count,
  tone,
  icon,
}: {
  href: string
  active: boolean
  label: string
  help: string
  count: number
  tone: "warning" | "info" | "danger" | "success"
  icon: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/5 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning/5 text-warning"
        : tone === "success"
          ? "border-success/30 bg-success/5 text-success"
          : "border-info/30 bg-info/5 text-info"

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-32 items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-accent ${
        active ? toneClass : "border-border bg-background text-muted-foreground"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-2 block text-3xl font-semibold leading-none text-foreground">{count.toLocaleString("th-TH")}</span>
        <span className="mt-2 block text-xs text-muted-foreground">{help}</span>
      </span>
      <span className={`rounded-md border p-2 ${active ? "border-current bg-background/60" : "border-border bg-surface text-muted-foreground group-hover:text-foreground"}`}>
        {icon}
      </span>
    </Link>
  )
}

function FindingComparison({
  expectedLabel,
  actualLabel,
  expectedValue,
  actualValue,
}: {
  expectedLabel: string
  actualLabel: string
  expectedValue?: string | null
  actualValue?: string | null
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{expectedLabel}</div>
        <div className="mt-1 break-words text-sm text-foreground">{expectedValue || "-"}</div>
      </div>
      <div className="min-w-0 border-t border-border pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
        <div className="text-xs font-medium text-muted-foreground">{actualLabel}</div>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{actualValue || "-"}</div>
      </div>
    </div>
  )
}

function resolveFindingState(finding: FindingResolutionSnapshot, today: Date): ResolutionState {
  if (finding.actionStatus === "closed") return "closed"
  if (finding.reviewStatus === "pending") return "pending_review"

  if (isOpenAuditFindingActionStatus(finding.actionStatus)) {
    if (finding.actionDueDate) {
      const dueDate = new Date(finding.actionDueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < today) return "overdue"
    }

    return "open_action"
  }

  return "resolved"
}

function ResolutionStateBadge({ state, labels }: { state: ResolutionState; labels: Record<ResolutionState, string> }) {
  const toneByState: Record<ResolutionState, string> = {
    pending_review: "warning",
    open_action: "info",
    overdue: "danger",
    closed: "success",
    resolved: "primary",
  }

  return <StatusBadge label={labels[state]} tone={toneByState[state]} size="xs" />
}

function buildAuditFindingsHref(locale: string, status: AuditFindingResolutionStatus, searchText: string) {
  const params = new URLSearchParams()
  params.set("status", status)
  if (searchText) params.set("search", searchText)
  return `/${locale}/audit/findings?${params.toString()}`
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-foreground">{value || "-"}</div>
    </div>
  )
}

function ReviewStatusBadge({ status, label }: { status: string; label: string }) {
  return <StatusBadge label={label} status={status} size="xs" />
}

function ActionStatusBadge({ status, label }: { status: string; label: string }) {
  return <StatusBadge label={label} status={status} size="xs" />
}
