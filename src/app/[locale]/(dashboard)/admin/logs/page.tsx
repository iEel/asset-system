import Link from "next/link"
import { redirect } from "next/navigation"
import { History } from "lucide-react"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { buildAssetDetailViewHref } from "@/lib/asset-detail-view"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import {
  assetTagMatchWhere,
  buildSystemLogQuery,
  parseSystemLogFilters,
  presetRange,
  systemLogWhere,
  TAG_MATCH_CAP,
  type LogDatePreset,
  type SystemLogFilters,
} from "@/lib/system-log-filters"
import {
  buildSystemLogFilterHref,
  resolveSystemLogQuickFilter,
  systemLogQuickFilters,
  type SystemLogQuickFilterKey,
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { splitAssetRecordLabel, systemLogEventDetail, systemLogIntegrationClientIds, systemLogUserLabel } from "@/lib/system-log-row"
import { formatDate, formatDateTime } from "@/lib/utils"
import { LogEventCard, LogEventRow, type LogEventData } from "@/components/admin/logs/log-event-row"
import { LogFiltersBar } from "@/components/admin/logs/log-filters-bar"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterPanel } from "@/components/ui/filter-panel"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { TabNav } from "@/components/ui/tab-nav"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  // tag, userId, dateFrom, dateTo, module, action, recordId, page, pageSize (src/lib/system-log-filters.ts).
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DATE_PRESETS: LogDatePreset[] = ["today", "7d", "30d"]
const PRESET_LABEL_KEYS: Record<LogDatePreset, string> = { today: "presetToday", "7d": "preset7d", "30d": "preset30d" }
const FILTER_FORM_ID = "system-log-filter"

export default async function LogsPage({ params, searchParams }: LogsPageProps) {
  const { locale } = await params
  const rawFilters = await searchParams
  // Every filter in the URL (spec §4): the module, action and recordId values stay the codes other pages link with
  // (buildSystemLogFilterHref, buildSystemLogRecordHref); a missing date is ทั้งหมด, so old links behave as before.
  const filters = parseSystemLogFilters(rawFilters)
  const user = await requirePagePermission(locale, "system", "view")
  // The approval decision history 404s without approval access, so its link shows only with it.
  const canSeeApprovalHistory = getApprovalInboxAccess(user).canAnyApproval
  const t = await getTranslations("systemLogPage")
  const tCommon = await getTranslations("common")
  const tAsset = await getTranslations("asset")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}

  const listPage = parseListPage({ page: rawFilters.page, pageSize: rawFilters.pageSize })
  const basePath = `/${locale}/admin/logs`
  const hrefFor = (next: SystemLogFilters, page: { page?: number; pageSize?: number }) => {
    const search = buildSystemLogQuery(next, page)
    return search ? `${basePath}?${search}` : basePath
  }
  // The list URL keeps every filter; the default page and page size stay out of it (spec 2B B4). recordId: null drops
  // the record filter (its chip).
  const listHref = ({ recordId, ...next }: { page?: number; pageSize?: number; recordId?: null }) =>
    hrefFor(recordId === null ? { ...filters, recordId: "" } : filters, next)
  // A quick filter sets the module and action, goes back to page 1 and keeps the page size, the record filter and
  // the tag, user and date filters; buildSystemLogFilterHref itself stays as it is.
  const quickFilterHref = (key: SystemLogQuickFilterKey) => {
    const [path, query = ""] = buildSystemLogFilterHref(locale, key).split("?")
    const params = new URLSearchParams(query)
    if (filters.recordId) params.set("recordId", filters.recordId)
    if (filters.tag) params.set("tag", filters.tag)
    if (filters.userId) params.set("userId", filters.userId)
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
    if (filters.dateTo) params.set("dateTo", filters.dateTo)
    const search = appendListPage(params, { pageSize: listPage.pageSize }).toString()
    return search ? `${path}?${search}` : path
  }

  // Tag search (spec §15 item 5): the assets first, by an exact or prefix tag, one more than the cap so the page knows
  // it was cut; then the asset logs of those ids through the indexed recordId. Never a LIKE over log values. Every
  // user is listed for the ผู้ใช้ menu (searchable).
  const [found, userRows] = await Promise.all([
    filters.tag
      ? prisma.asset.findMany({
          where: assetTagMatchWhere(filters.tag),
          select: { id: true, assetTag: true, name: true },
          orderBy: { assetTag: "asc" },
          take: TAG_MATCH_CAP + 1,
        })
      : Promise.resolve(null),
    prisma.user.findMany({ select: { id: true, username: true, displayName: true }, orderBy: { username: "asc" } }),
  ])
  const tagCapped = found !== null && found.length > TAG_MATCH_CAP
  const matchedAssets = found === null ? null : found.slice(0, TAG_MATCH_CAP)
  const tagNotFound = matchedAssets !== null && matchedAssets.length === 0
  const singleMatch = matchedAssets?.length === 1 ? matchedAssets[0] : null

  const where = systemLogWhere(filters, matchedAssets ? matchedAssets.map((asset) => asset.id) : null)
  const { skip, take } = listPageWindow(listPage)
  // Real pages instead of the newest 100 (spec 2B §5.9.2 row 1). The count runs on a table that grows with every
  // action, so the pair is timed (PERFORMANCE_TIMING=1); 2B adds no index (B4, spec §10.7 item 3).
  const [logs, total] = await withPerformanceTiming("admin-logs.list-data", () => Promise.all([
    prisma.systemLog.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.systemLog.count({ where }),
  ]))
  // A page past the last one (an old link, or a filter that now finds fewer entries) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (logs.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  // Integration API rows with no user name their client (spec §15 item 6): one query for the clients on this page.
  const integrationClientIds = systemLogIntegrationClientIds(logs)
  const [recordLabels, clients] = await Promise.all([
    buildSystemLogRecordLabels(logs),
    integrationClientIds.length > 0
      ? prisma.integrationApiClient.findMany({ where: { clientId: { in: integrationClientIds } }, select: { clientId: true, displayName: true } })
      : Promise.resolve([]),
  ])
  const clientNames = new Map(clients.map((client) => [client.clientId, client.displayName]))
  const translate = (key: string) => {
    const messageKey = key.replaceAll(".", "_")
    return systemLogMessages[messageKey] ?? key
  }
  const displayLogs = logs.map((log) => buildSystemLogPresentation(log, recordLabels, locale, translate))
  const userLabels = { system: t("userSystemRow"), integration: (client: string) => (client ? t("userIntegrationRow", { client }) : t("userIntegrationOption")) }
  const events: LogEventData[] = displayLogs.map((log, index) => {
    const source = logs[index]
    const asset = log.moduleKey === "asset" ? splitAssetRecordLabel(log.recordLabel) : null
    const eventName = asset ? `${log.actionLabel} ${asset.tag}` : `${log.actionLabel} ${log.recordLabel === "-" ? "" : log.recordLabel}`.trim()
    return {
      id: log.id,
      time: formatDateTime(log.createdAt),
      userLabel: systemLogUserLabel(source, clientNames, userLabels),
      actionLabel: log.actionLabel,
      asset,
      recordLabel: log.recordLabel,
      href: log.href,
      detail: systemLogEventDetail(log.summary, log.recordLabel),
      moduleLabel: log.moduleLabel,
      changes: log.changes,
      remark: log.remark,
      assetHref: log.moduleKey === "asset" ? log.href : null,
      expandLabel: t("expandRow", { event: eventName }),
      collapseLabel: t("collapseRow", { event: eventName }),
    }
  })
  const eventLabels = {
    field: t("field"),
    before: t("before"),
    after: t("after"),
    remark: t("remark"),
    changesCaption: t("changesCaption"),
    noChanges: t("noChanges"),
    openAsset: t("openAsset"),
  }

  const activeQuickFilter = resolveSystemLogQuickFilter(filters)
  const quickFilters: Array<{ key: SystemLogQuickFilterKey; labelKey: string }> = [
    { key: "all", labelKey: "quickFilterAll" },
    ...systemLogQuickFilters.map((filter) => ({ key: filter.key, labelKey: filter.labelKey })),
  ]
  const hasFilters = Boolean(filters.tag || filters.userId || filters.dateFrom || filters.dateTo || filters.module || filters.action || filters.recordId)
  // The chip names the record by the label the rows show (every loaded row is that record), or the id when no row
  // gives one.
  const recordRowIndex = filters.recordId ? logs.findIndex((log) => log.recordId === filters.recordId) : -1
  const recordRowLabel = recordRowIndex >= 0 ? displayLogs[recordRowIndex]?.recordLabel : undefined
  const recordFilterLabel = recordRowLabel && recordRowLabel !== "-" ? recordRowLabel : filters.recordId
  const recordFilterChips = filters.recordId
    ? [{ key: "recordId", label: t("recordFilterChip", { label: recordFilterLabel }), href: listHref({ pageSize: listPage.pageSize, recordId: null }) }]
    : []

  // ช่วงวันที่: ทั้งหมด by default; presets are Bangkok calendar days ending today.
  const now = new Date()
  const presets = DATE_PRESETS.map((preset) => {
    const range = presetRange(preset, now)
    return {
      key: preset,
      label: t(PRESET_LABEL_KEYS[preset]),
      href: hrefFor({ ...filters, ...range }, { pageSize: listPage.pageSize }),
      active: filters.dateFrom === range.dateFrom && filters.dateTo === range.dateTo,
    }
  })
  const rangeText = filters.dateFrom && filters.dateTo
    ? t("rangeBetween", { from: formatDate(filters.dateFrom), to: formatDate(filters.dateTo) })
    : filters.dateFrom
      ? t("rangeFrom", { from: formatDate(filters.dateFrom) })
      : filters.dateTo
        ? t("rangeTo", { to: formatDate(filters.dateTo) })
        : t("rangeAll")
  const moduleOptions = codeOptions(systemLogMessages, "module_", filters.module)
  const actionOptions = codeOptions(systemLogMessages, "action_", filters.action)
  const userOptions = userRows.map((item) => ({ value: item.id, label: `${item.displayName ?? item.username} · ${item.username}` }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canSeeApprovalHistory ? (
            <Link href={`/${locale}/admin/approvals/history`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <History aria-hidden="true" />
              {t("approvalHistoryLink")}
            </Link>
          ) : undefined
        }
      />

      <FilterPanel>
        <TabNav
          aria-label={t("quickFilters")}
          items={quickFilters.map((filter) => ({ key: filter.key, label: t(filter.labelKey), href: quickFilterHref(filter.key) }))}
          current={activeQuickFilter}
          className="mb-4"
        />
        {/* Keyed on the query: a Link to another filter keeps this page mounted, and a select's defaultValue and the
            user chip's state would keep the old filters for the next submit (group 12 plan 2 final review). */}
        <LogFiltersBar
          key={buildSystemLogQuery(filters, { pageSize: listPage.pageSize })}
          formId={FILTER_FORM_ID}
          action={basePath}
          filters={filters}
          pageSize={listPage.pageSize}
          recordId={filters.recordId}
          userOptions={userOptions}
          moduleOptions={moduleOptions}
          actionOptions={actionOptions}
          presets={presets}
          dateClearHref={hrefFor({ ...filters, dateFrom: null, dateTo: null }, { pageSize: listPage.pageSize })}
          hasActiveFilters={hasFilters}
          clearHref={hrefFor({ ...filters, tag: "", userId: null, dateFrom: null, dateTo: null, module: "", action: "", recordId: "" }, { pageSize: listPage.pageSize })}
          labels={{
            form: t("filterLabel"),
            tag: t("tagSearch"),
            tagPlaceholder: t("tagPlaceholder"),
            module: t("module"),
            moduleAll: t("moduleAll"),
            action: t("action"),
            actionAll: t("actionAll"),
            submit: t("filter"),
            clear: t("clearFilters"),
            user: {
              label: t("user"),
              all: t("userAll"),
              system: t("userSystemOption"),
              integration: t("userIntegrationOption"),
              search: t("userSearch"),
              empty: t("userEmpty"),
            },
            date: {
              chip: t("dateRange"),
              applied: t("dateRangeApplied", { range: rangeText }),
              apply: t("dateRangeApply"),
              clear: t("dateRangeClear"),
              from: t("dateFrom"),
              to: t("dateTo"),
            },
          }}
        />
        <FilterChipList chips={recordFilterChips} label={tAsset("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} className="mt-4" />
      </FilterPanel>

      <section aria-label={t("title")} className="min-w-0 space-y-3">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="min-w-0 space-y-1">
            {singleMatch ? (
              <p className="font-semibold text-foreground">
                {t("tagSingleMatch", { name: singleMatch.name, tag: singleMatch.assetTag })}
                {" · "}
                <Link href={buildAssetDetailViewHref(locale, singleMatch.id, "history")} className={linkVariants({ size: "inherit" })}>
                  {t("assetHistoryLink")}
                </Link>
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground tabular-nums">{t("headerLine", { range: rangeText, count: total })}</p>
            {tagCapped ? <p className="text-meta text-warning">{t("tagCapNote", { count: TAG_MATCH_CAP })}</p> : null}
          </div>
          <p className="text-meta text-muted-foreground max-md:hidden">{t("expandHint")}</p>
        </div>

        <DataTable
          caption={t("title")}
          scrollHint={tCommon("tableScrollHint")}
          className="max-md:hidden"
          footer={total > 0 ? pagination() : undefined}
        >
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("time")}</DataTableHead>
              <DataTableHead>{t("user")}</DataTableHead>
              <DataTableHead>{t("event")}</DataTableHead>
              <DataTableHead>{t("module")}</DataTableHead>
              <DataTableHead hideLabel>{t("detail")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {events.length === 0 ? (
              <TableEmptyRow colSpan={5}>{emptyText()}</TableEmptyRow>
            ) : (
              events.map((log) => <LogEventRow key={log.id} log={log} labels={eventLabels} />)
            )}
          </DataTableBody>
        </DataTable>

        <div data-slot="system-log-phone" className="min-w-0 space-y-3 md:hidden">
          {events.length === 0 ? (
            <EmptyNote>{emptyText()}</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {events.map((log) => <LogEventCard key={log.id} log={log} labels={eventLabels} />)}
            </ul>
          )}
          {total > 0 ? pagination() : null}
        </div>
      </section>
    </div>
  )

  function emptyText() {
    return tagNotFound ? t("tagNotFound") : hasFilters ? t("emptyFiltered") : t("empty")
  }

  function pagination() {
    return (
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
    )
  }
}

// The โมดูล and การกระทำ options: one per systemLogPage.module_* / action_* message, valued with the code other pages
// link with. A code in the URL with no message stays selectable as itself.
function codeOptions(messages: Record<string, string>, prefix: "module_" | "action_", current: string, locale = "th") {
  const options = Object.entries(messages)
    .filter(([key, value]) => key.startsWith(prefix) && typeof value === "string")
    .map(([key, label]) => ({ value: key.slice(prefix.length), label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
  if (current && !options.some((option) => option.value === current)) options.push({ value: current, label: current })
  return options
}
