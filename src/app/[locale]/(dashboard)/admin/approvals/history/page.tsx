import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { History } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { APPROVAL_PERMISSION, buildAccessDeniedHref } from "@/lib/access-denied"
import { requestPathHeader } from "@/lib/login-redirect"
import { redirectToLogin } from "@/lib/page-auth"
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  buildApprovalDecisionLogWhere,
  buildApprovalHistoryQuery,
  groupDecisionsByDay,
  parseApprovalHistoryFilters,
  summarizeApprovalDecisionChipCounts,
  type ApprovalDecision,
  type ApprovalDecisionFilter,
  type ApprovalDecisionLogItem,
  type ApprovalDecisionModuleFilter,
  type ApprovalHistoryFilters,
} from "@/lib/approval-decision-log"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { formatHistoryTime } from "@/lib/asset-history-view"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { presetRange, type LogDatePreset } from "@/lib/system-log-filters"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { systemLogEventDetail } from "@/lib/system-log-row"
import { formatDate } from "@/lib/utils"
import { ApprovalActorFilter } from "@/components/admin/approvals/approval-actor-filter"
import { ApprovalDecisionRow, type ApprovalDecisionRowData } from "@/components/admin/approvals/approval-decision-row"
import { RepairDateRangeChip } from "@/components/maintenance/repair-date-range-chip"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalHistoryPageProps = {
  params: Promise<{ locale: string }>
  // module, decision, actorId, dateFrom, dateTo, page, pageSize (src/lib/approval-decision-log.ts).
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DATE_PRESETS: LogDatePreset[] = ["today", "7d", "30d"]
const PRESET_LABEL_KEYS: Record<LogDatePreset, string> = { today: "presetToday", "7d": "preset7d", "30d": "preset30d" }
const FILTER_FORM_ID = "approval-history-filter"

type DecisionRecord = ApprovalDecisionRowData["record"]

export default async function ApprovalHistoryPage({ params, searchParams }: ApprovalHistoryPageProps) {
  const { locale } = await params
  const query = await searchParams
  const user = await getSessionUser()
  if (!user) return redirectToLogin(locale)

  const access = getApprovalInboxAccess(user)
  // Page group 12 §9: a viewer with no approval right lands on the denied page (it was a 404).
  if (!access.canAnyApproval) {
    redirect(buildAccessDeniedHref({ locale, module: APPROVAL_PERMISSION, action: "approve", from: (await headers()).get(requestPathHeader) }))
  }

  const t = await getTranslations("approvalHistoryPage")
  const tLog = await getTranslations("systemLogPage")
  const tCommon = await getTranslations("common")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key

  // Every filter in the URL (spec §5): module and decision keep their names and values (other pages link with them).
  const filters = parseApprovalHistoryFilters(query)
  const listPage = parseListPage({ page: query.page, pageSize: query.pageSize })
  const basePath = `/${locale}/admin/approvals/history`
  const hrefFor = (next: ApprovalHistoryFilters, page: { page?: number; pageSize?: number }) => {
    const search = buildApprovalHistoryQuery(next, page)
    return search ? `${basePath}?${search}` : basePath
  }
  // The list URL keeps every filter; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => hrefFor(filters, next)
  const decisionAccess = { access, canSeeRepairCloseHistory: hasPermission(user, "maintenance", "edit") }
  // The list: the chosen tabs, actor and dates. The chips: the actor and dates over every decision the viewer may see
  // (each chip group then ignores its own tab). The actor list: everyone with a decision the viewer may see. All three
  // keep the permission OR, so the repair-close history still needs maintenance:edit (spec 2B §5.9.2 row 2, §5).
  const allowedWhere = buildApprovalDecisionLogWhere({ ...decisionAccess, module: "all", decision: "all" })
  const countWhere = buildApprovalDecisionLogWhere({ ...decisionAccess, module: "all", decision: "all", actorId: filters.actorId, dateFrom: filters.dateFrom, dateTo: filters.dateTo })
  const where = buildApprovalDecisionLogWhere({ ...decisionAccess, module: filters.module, decision: filters.decision, actorId: filters.actorId, dateFrom: filters.dateFrom, dateTo: filters.dateTo })
  const { skip, take } = listPageWindow(listPage)
  const [logs, total, decisionCounts, actors] = await withPerformanceTiming("approval-history.list-data", () => Promise.all([
    prisma.systemLog.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.systemLog.count({ where }),
    prisma.systemLog.groupBy({ by: ["module", "action"], where: countWhere, _count: { _all: true } }),
    prisma.user.findMany({
      where: { systemLogs: { some: allowedWhere } },
      select: { id: true, username: true, displayName: true },
      orderBy: { username: "asc" },
    }),
  ]))
  // A page past the last one (an old link, or a filter with fewer decisions) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (logs.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const items = buildApprovalDecisionLogItems(logs, recordLabels, locale, translateLog)
  const records = await loadDecisionRecords(items)
  const chipCounts = summarizeApprovalDecisionChipCounts(decisionCounts, filters.module, filters.decision)

  const moduleOptions = approvalDecisionModuleFilters.map((filter) => ({
    key: filter,
    label: t(`filter_module_${filter}`),
    count: chipCounts.module[filter],
  }))
  const decisionOptions = approvalDecisionFilters.map((filter) => ({
    key: filter,
    label: t(`filter_decision_${filter}`),
    count: chipCounts.decision[filter],
  }))
  const actorOptions = actors.map((actor) => ({ value: actor.id, label: `${actor.displayName ?? actor.username} · ${actor.username}` }))

  // ช่วงวันที่: ทั้งหมด by default; presets are Bangkok calendar days ending today (the system log's chip and words).
  const now = new Date()
  const presets = DATE_PRESETS.map((preset) => {
    const range = presetRange(preset, now)
    return {
      key: preset,
      label: tLog(PRESET_LABEL_KEYS[preset]),
      href: hrefFor({ ...filters, ...range }, { pageSize: listPage.pageSize }),
      active: filters.dateFrom === range.dateFrom && filters.dateTo === range.dateTo,
    }
  })
  const rangeText = filters.dateFrom && filters.dateTo
    ? tLog("rangeBetween", { from: formatDate(filters.dateFrom), to: formatDate(filters.dateTo) })
    : filters.dateFrom
      ? tLog("rangeFrom", { from: formatDate(filters.dateFrom) })
      : filters.dateTo
        ? tLog("rangeTo", { to: formatDate(filters.dateTo) })
        : tLog("rangeAll")

  const rowLabels = { viewDetails: t("viewDetails"), hideDetails: t("hideDetails"), field: t("field"), before: t("before"), after: t("after"), remark: t("remark") }
  const rowOf = (item: ApprovalDecisionLogItem): ApprovalDecisionRowData => ({
    id: item.id,
    decisionLabel: t(`filter_decision_${item.decision}`),
    tone: decisionTone(item.decision),
    actorLabel: item.actorLabel,
    actionLabel: item.actionLabel,
    record: (item.recordId ? records.get(`${item.module}:${item.recordId}`) : undefined) ?? { docNo: null, assetName: null, assetTag: null },
    recordLabel: item.recordLabel,
    detail: systemLogEventDetail(item.summary, item.recordLabel),
    moduleLabel: item.moduleLabel,
    time: formatHistoryTime(item.createdAt),
    changes: item.changes,
    remark: item.remark,
    href: item.href,
    openRecordLabel: t(openRecordKey(item)),
  })
  const groups = groupDecisionsByDay(items, now)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("breadcrumbInbox"), href: `/${locale}/admin/approvals` }, { label: t("breadcrumbHistory") }]}
        title={t("title")}
        meta={t("subtitle")}
        back={<PageBackLink href={`/${locale}/admin/approvals`} label={t("backToInbox")} />}
      />

      <ContentPanel title={t("filterTitle")} description={t("filterDescription")}>
        <div className="flex flex-col gap-4">
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
            current={filters.module}
            param="module"
            hrefFor={hrefFor}
            filters={filters}
            pageSize={listPage.pageSize}
          />
          <FilterGroup
            label={t("decisionFilter")}
            options={decisionOptions}
            current={filters.decision}
            param="decision"
            hrefFor={hrefFor}
            filters={filters}
            pageSize={listPage.pageSize}
          />
          {/* ผู้ตัดสินใจ and ช่วงวันที่: one GET form that carries the chosen tabs and the page size along. Keyed on the
              query, so after Back or a Link the actor chip shows the URL's actor, not the one it last held. */}
          <form
            key={buildApprovalHistoryQuery(filters, {})}
            id={FILTER_FORM_ID}
            role="search"
            aria-label={t("filterTitle")}
            action={basePath}
            className="flex min-w-0 flex-wrap items-center gap-2"
          >
            {filters.module !== "all" ? <input type="hidden" name="module" value={filters.module} /> : null}
            {filters.decision !== "all" ? <input type="hidden" name="decision" value={filters.decision} /> : null}
            {listPage.pageSize !== LIST_PAGE_SIZES[0] ? <input type="hidden" name="pageSize" value={listPage.pageSize} /> : null}
            <ApprovalActorFilter value={filters.actorId ?? ""} options={actorOptions} labels={{ label: t("actor"), all: t("actorAll"), search: t("actorSearch"), empty: t("actorEmpty") }} />
            <RepairDateRangeChip
              key={`${filters.dateFrom ?? ""}|${filters.dateTo ?? ""}`}
              formId={FILTER_FORM_ID}
              dateFrom={filters.dateFrom ?? ""}
              dateTo={filters.dateTo ?? ""}
              labels={{
                chip: tLog("dateRange"),
                applied: tLog("dateRangeApplied", { range: rangeText }),
                apply: tLog("dateRangeApply"),
                clear: tLog("dateRangeClear"),
                from: tLog("dateFrom"),
                to: tLog("dateTo"),
              }}
              clearHref={hrefFor({ ...filters, dateFrom: null, dateTo: null }, { pageSize: listPage.pageSize })}
              presets={presets}
            />
          </form>
        </div>
      </ContentPanel>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("timelineTitle")}
        actions={<span className="text-sm font-medium text-muted-foreground num">{`${t("filteredCount", { count: total })} · ${t("newestFirst")}`}</span>}
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
          groups.map((group) => {
            // The heading: วันนี้ / เมื่อวาน with the date, or the date alone (Bangkok, Buddhist year in Thai).
            const date = formatAssetDetailDate(group.items[0].createdAt, locale)
            const heading = group.key === "today" ? `${t("today")} · ${date}` : group.key === "yesterday" ? `${t("yesterday")} · ${date}` : date
            return (
              <section key={group.key} aria-label={heading} className="border-b border-border last:border-b-0">
                <h3 className="border-b border-border-soft bg-background px-4 py-2 text-meta font-semibold text-muted-foreground md:px-5">{heading}</h3>
                <ol className="divide-y divide-border-soft">
                  {group.items.map((item) => (
                    <ApprovalDecisionRow key={item.id} row={rowOf(item)} labels={rowLabels} />
                  ))}
                </ol>
              </section>
            )
          })
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

// A label over the row of tab links of one filter. A tab keeps the actor and the dates, goes back to page 1 and keeps
// the page size (spec 2B B4).
function FilterGroup({
  label,
  options,
  current,
  param,
  hrefFor,
  filters,
  pageSize,
}: {
  label: string
  options: Array<{ key: ApprovalDecisionModuleFilter | ApprovalDecisionFilter; label: string; count: number }>
  current: ApprovalDecisionModuleFilter | ApprovalDecisionFilter
  param: "module" | "decision"
  hrefFor: (next: ApprovalHistoryFilters, page: { page?: number; pageSize?: number }) => string
  filters: ApprovalHistoryFilters
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
          href: hrefFor({ ...filters, [param]: option.key }, { pageSize }),
        }))}
        current={current}
      />
    </div>
  )
}

// The document number and the asset (name and tag) of each decision on this page, keyed "module:recordId": disposal
// requests, repair tickets and audit findings. An audit round's close has no asset and keeps its record label.
async function loadDecisionRecords(items: ApprovalDecisionLogItem[]): Promise<Map<string, DecisionRecord>> {
  const idsOf = (pick: (item: ApprovalDecisionLogItem) => boolean) => [...new Set(items.filter(pick).flatMap((item) => (item.recordId ? [item.recordId] : [])))]
  const disposalIds = idsOf((item) => item.module === "disposal")
  const repairIds = idsOf((item) => item.module === "maintenance")
  const findingIds = idsOf((item) => item.module === "audit" && item.decision !== "close")
  const asset = { select: { assetTag: true, name: true } }
  const [disposals, repairs, findings] = await Promise.all([
    disposalIds.length > 0 ? prisma.disposalRequest.findMany({ where: { id: { in: disposalIds } }, select: { id: true, disposalNo: true, asset } }) : [],
    repairIds.length > 0 ? prisma.maintenanceTicket.findMany({ where: { id: { in: repairIds } }, select: { id: true, repairNo: true, asset } }) : [],
    findingIds.length > 0 ? prisma.auditFinding.findMany({ where: { id: { in: findingIds } }, select: { id: true, asset, auditRound: { select: { auditNo: true } } } }) : [],
  ])
  const records = new Map<string, DecisionRecord>()
  for (const row of disposals) records.set(`disposal:${row.id}`, { docNo: row.disposalNo, assetName: row.asset.name, assetTag: row.asset.assetTag })
  for (const row of repairs) records.set(`maintenance:${row.id}`, { docNo: row.repairNo, assetName: row.asset.name, assetTag: row.asset.assetTag })
  for (const row of findings) records.set(`audit:${row.id}`, { docNo: row.auditRound.auditNo, assetName: row.asset?.name ?? null, assetTag: row.asset?.assetTag ?? null })
  return records
}

function openRecordKey(item: ApprovalDecisionLogItem) {
  if (item.module === "disposal") return "openRecord_disposal"
  if (item.module === "maintenance") return "openRecord_maintenance"
  return item.decision === "close" ? "openRecord_auditRound" : "openRecord_auditFinding"
}

// A decision is a past state: calm badges, red only for a rejection; closing a round is neutral (not a warning).
function decisionTone(decision: ApprovalDecision): StatusTone {
  if (decision === "approve") return "success"
  if (decision === "reject") return "danger"
  if (decision === "execute") return "primary"
  return "neutral"
}
