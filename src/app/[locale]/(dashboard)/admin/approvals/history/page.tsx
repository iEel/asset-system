import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { CheckCircle2, ClipboardList, History, RotateCcw, XCircle } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { redirectToLogin } from "@/lib/page-auth"
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  buildApprovalDecisionLogWhere,
  parseApprovalDecisionFilter,
  parseApprovalDecisionModuleFilter,
  summarizeApprovalDecisionCounts,
  type ApprovalDecision,
  type ApprovalDecisionFilter,
  type ApprovalDecisionLogItem,
  type ApprovalDecisionModuleFilter,
} from "@/lib/approval-decision-log"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { cn, formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; decision?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function ApprovalHistoryPage({ params, searchParams }: ApprovalHistoryPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) return redirectToLogin(locale)

  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) notFound()

  const t = await getTranslations("approvalHistoryPage")
  const tCommon = await getTranslations("common")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key

  const activeModule = parseApprovalDecisionModuleFilter(query.module)
  const activeDecision = parseApprovalDecisionFilter(query.decision)
  const listPage = parseListPage({ page: query.page, pageSize: query.pageSize })
  // The list URL keeps both tabs; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => buildFilterHref(locale, activeModule, activeDecision, "module", activeModule, next)
  const decisionAccess = { access, canSeeRepairCloseHistory: hasPermission(user, "maintenance", "edit") }
  // Every decision this user may see (the strip and the tab counts), and the decisions of the chosen tabs (the list):
  // full totals and real pages instead of the newest 150 rows (spec 2B §5.9.2 row 2, §5.9.3).
  const allowedWhere = buildApprovalDecisionLogWhere({ ...decisionAccess, module: "all", decision: "all" })
  const where = buildApprovalDecisionLogWhere({ ...decisionAccess, module: activeModule, decision: activeDecision })
  const { skip, take } = listPageWindow(listPage)
  const [logs, total, decisionCounts] = await withPerformanceTiming("approval-history.list-data", () => Promise.all([
    prisma.systemLog.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.systemLog.count({ where }),
    prisma.systemLog.groupBy({ by: ["module", "action"], where: allowedWhere, _count: { _all: true } }),
  ]))
  // A page past the last one (an old link, or a tab with fewer decisions) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (logs.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const items = buildApprovalDecisionLogItems(logs, recordLabels, locale, translateLog)
  const summary = summarizeApprovalDecisionCounts(decisionCounts)

  const moduleOptions = approvalDecisionModuleFilters.map((filter) => ({
    key: filter,
    label: t(`filter_module_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
  const decisionOptions = approvalDecisionFilters.map((filter) => ({
    key: filter,
    label: t(`filter_decision_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        back={<PageBackLink href={`/${locale}/admin/approvals`} label={t("backToInbox")} />}
      />

      <StatStrip
        items={[
          { key: "total", label: t("total"), value: formatCount(summary.total) },
          { key: "approved", label: t("approved"), value: formatCount(summary.approve) },
          { key: "rejected", label: t("rejected"), value: formatCount(summary.reject) },
          { key: "closed", label: t("closed"), value: formatCount(summary.close + summary.execute) },
        ]}
      />

      <ContentPanel title={t("filterTitle")} description={t("filterDescription")}>
        <div className="flex flex-col gap-4">
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="module"
            pageSize={listPage.pageSize}
          />
          <FilterGroup
            label={t("decisionFilter")}
            options={decisionOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="decision"
            pageSize={listPage.pageSize}
          />
        </div>
      </ContentPanel>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("timelineTitle")}
        description={t("timelineDescription")}
        actions={<span className="text-sm font-medium text-muted-foreground num">{t("filteredCount", { count: formatCount(total) })}</span>}
      >
        {items.length === 0 ? (
          <div className="p-4 md:p-5">
            <ActionEmptyState
              icon={<History className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <DecisionRow key={item.id} item={item} labels={{ actor: t("actor"), decidedAt: t("decidedAt"), viewDetails: t("viewDetails"), remark: t("remark"), field: t("field"), before: t("before"), after: t("after") }} />
            ))}
          </div>
        )}
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </ContentPanel>
    </div>
  )
}

// A label over the row of tab links of one filter. A tab goes back to page 1 and keeps the page size (spec 2B B4).
function FilterGroup({
  label,
  options,
  activeModule,
  activeDecision,
  locale,
  param,
  pageSize,
}: {
  label: string
  options: Array<{ key: ApprovalDecisionModuleFilter | ApprovalDecisionFilter; label: string; count: number }>
  activeModule: ApprovalDecisionModuleFilter
  activeDecision: ApprovalDecisionFilter
  locale: string
  param: "module" | "decision"
  pageSize: number
}) {
  return (
    <div>
      <div className="mb-1 text-meta font-medium text-muted-foreground">{label}</div>
      <TabNav
        aria-label={label}
        items={options.map((option) => ({
          key: option.key,
          label: option.label,
          count: formatCount(option.count),
          href: buildFilterHref(locale, activeModule, activeDecision, param, option.key, { pageSize }),
        }))}
        current={param === "module" ? activeModule : activeDecision}
      />
    </div>
  )
}

function DecisionRow({
  item,
  labels,
}: {
  item: ApprovalDecisionLogItem
  labels: {
    actor: string
    decidedAt: string
    viewDetails: string
    remark: string
    field: string
    before: string
    after: string
  }
}) {
  return (
    <article className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div aria-hidden="true" className="mt-1 text-muted-foreground">{decisionIcon(item.decision)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{item.moduleLabel}</Chip>
              <StatusBadge label={item.actionLabel} tone={decisionTone(item.decision)} />
              {item.href ? (
                <Link href={item.href} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>
                  {item.recordLabel}
                </Link>
              ) : (
                <h3 className="font-semibold text-foreground">{item.recordLabel}</h3>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{labels.actor}: {item.actorLabel}</span>
              <span>{labels.decidedAt}: {formatDateTime(item.createdAt)}</span>
            </div>
          </div>
        </div>

        {(item.changes.length > 0 || item.remark) ? (
          <details className="shrink-0 lg:w-[28rem]">
            {/* list-item keeps the disclosure triangle that linkVariants' inline display would hide. */}
            <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{labels.viewDetails}</summary>
            <div className="mt-2 space-y-2">
              {item.changes.length > 0 ? (
                <DataTable caption={labels.viewDetails}>
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>{labels.field}</DataTableHead>
                      <DataTableHead>{labels.before}</DataTableHead>
                      <DataTableHead>{labels.after}</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {item.changes.map((change, index) => (
                      <DataTableRow key={`${item.id}-${change.field}-${index}`}>
                        <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                        <DataTableCell className="text-muted-foreground">{change.before}</DataTableCell>
                        <DataTableCell className="text-foreground">{change.after}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : null}
              {item.remark ? (
                <p className="text-meta">
                  <span className="font-medium text-foreground">{labels.remark}:</span> {item.remark}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  )
}

function buildFilterHref(
  locale: string,
  activeModule: ApprovalDecisionModuleFilter,
  activeDecision: ApprovalDecisionFilter,
  param: "module" | "decision",
  value: ApprovalDecisionModuleFilter | ApprovalDecisionFilter,
  listPage: { page?: number; pageSize?: number },
) {
  const moduleFilterValue = param === "module" ? value : activeModule
  const decision = param === "decision" ? value : activeDecision
  const query = new URLSearchParams()
  if (moduleFilterValue !== "all") query.set("module", moduleFilterValue)
  if (decision !== "all") query.set("decision", decision)
  const queryString = appendListPage(query, listPage).toString()
  return `/${locale}/admin/approvals/history${queryString ? `?${queryString}` : ""}`
}

function decisionIcon(decision: ApprovalDecision): React.ReactNode {
  if (decision === "approve") return <CheckCircle2 className="h-4 w-4" />
  if (decision === "reject") return <XCircle className="h-4 w-4" />
  if (decision === "execute") return <RotateCcw className="h-4 w-4" />
  return <ClipboardList className="h-4 w-4" />
}

// A decision is a past state: calm badges, red only for a rejection; closing a round is neutral (not a warning).
function decisionTone(decision: ApprovalDecision): StatusTone {
  if (decision === "approve") return "success"
  if (decision === "reject") return "danger"
  if (decision === "execute") return "primary"
  return "neutral"
}
