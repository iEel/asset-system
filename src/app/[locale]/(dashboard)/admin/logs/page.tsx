import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import {
  buildSystemLogFilterHref,
  resolveSystemLogQuickFilter,
  systemLogQuickFilters,
  type SystemLogQuickFilterKey,
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { cn, formatDateTime } from "@/lib/utils"
import { linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { TabNav } from "@/components/ui/tab-nav"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; action?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function LogsPage({ params, searchParams }: LogsPageProps) {
  const { locale } = await params
  const rawFilters = await searchParams
  const filters = {
    module: getSearchParam(rawFilters.module),
    action: getSearchParam(rawFilters.action),
  }
  await requirePagePermission(locale, "system", "view")
  const t = await getTranslations("systemLogPage")
  const tCommon = await getTranslations("common")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}

  const listPage = parseListPage({ page: rawFilters.page, pageSize: rawFilters.pageSize })
  const basePath = `/${locale}/admin/logs`
  // The list URL keeps the module and action filters; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (filters.module) query.set("module", filters.module)
    if (filters.action) query.set("action", filters.action)
    const search = appendListPage(query, next).toString()
    return search ? `${basePath}?${search}` : basePath
  }
  // A quick filter goes back to page 1 and keeps the page size; buildSystemLogFilterHref itself stays as it is.
  const quickFilterHref = (key: SystemLogQuickFilterKey) => {
    const [path, query = ""] = buildSystemLogFilterHref(locale, key).split("?")
    const search = appendListPage(new URLSearchParams(query), { pageSize: listPage.pageSize }).toString()
    return search ? `${path}?${search}` : path
  }

  const where: Prisma.SystemLogWhereInput = {
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  }
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
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const translate = (key: string) => {
    const messageKey = key.replaceAll(".", "_")
    return systemLogMessages[messageKey] ?? key
  }
  const displayLogs = logs.map((log) => buildSystemLogPresentation(log, recordLabels, locale, translate))
  const activeQuickFilter = resolveSystemLogQuickFilter(filters)
  const quickFilters: Array<{ key: SystemLogQuickFilterKey; labelKey: string }> = [
    { key: "all", labelKey: "quickFilterAll" },
    ...systemLogQuickFilters.map((filter) => ({ key: filter.key, labelKey: filter.labelKey })),
  ]
  const hasFilters = Boolean(filters.module || filters.action)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <FilterPanel>
        <TabNav
          aria-label={t("quickFilters")}
          items={quickFilters.map((filter) => ({ key: filter.key, label: t(filter.labelKey), href: quickFilterHref(filter.key) }))}
          current={activeQuickFilter}
          className="mb-4"
        />
        <form role="search" className="grid grid-cols-1 gap-3 md:grid-cols-4" action={basePath}>
          {listPage.pageSize !== LIST_PAGE_SIZES[0] ? <input type="hidden" name="pageSize" value={listPage.pageSize} /> : null}
          <Field label={t("module")}>
            <Input name="module" defaultValue={filters.module ?? ""} />
          </Field>
          <Field label={t("action")}>
            <Input name="action" defaultValue={filters.action ?? ""} />
          </Field>
          <FilterFormActions submitLabel={t("filter")} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
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
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("date")}</DataTableHead>
            <DataTableHead>{t("user")}</DataTableHead>
            <DataTableHead>{t("module")}</DataTableHead>
            <DataTableHead>{t("action")}</DataTableHead>
            <DataTableHead>{t("record")}</DataTableHead>
            <DataTableHead>{t("detail")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {displayLogs.length === 0 ? (
            <TableEmptyRow colSpan={6}>{hasFilters ? t("emptyFiltered") : t("empty")}</TableEmptyRow>
          ) : (
            displayLogs.map((log) => (
              <DataTableRow key={log.id}>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-foreground">{log.userLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{log.moduleLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-foreground">{log.actionLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  {log.href ? (
                    <Link href={log.href} className={linkVariants({ size: "inherit" })}>
                      {log.recordLabel}
                    </Link>
                  ) : (
                    log.recordLabel
                  )}
                </DataTableCell>
                <DataTableCell className="min-w-[28rem] text-muted-foreground">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{log.summary}</p>
                    {(log.changes.length > 0 || log.remark) ? (
                      <details className="group">
                        {/* list-item keeps the disclosure triangle that linkVariants' inline display would hide. */}
                        <summary className={cn(linkVariants(), "list-item cursor-pointer")}>
                          {t("viewDetails")}
                        </summary>
                        <div className="mt-2 space-y-2">
                          {log.changes.length > 0 ? (
                            <DataTable caption={t("viewDetails")}>
                              <DataTableHeader>
                                <tr>
                                  <DataTableHead>{t("field")}</DataTableHead>
                                  <DataTableHead>{t("before")}</DataTableHead>
                                  <DataTableHead>{t("after")}</DataTableHead>
                                </tr>
                              </DataTableHeader>
                              <DataTableBody>
                                {log.changes.map((change, index) => (
                                  <DataTableRow key={`${log.id}-${change.field}-${index}`}>
                                    <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                                    <DataTableCell>{change.before}</DataTableCell>
                                    <DataTableCell className="text-foreground">{change.after}</DataTableCell>
                                  </DataTableRow>
                                ))}
                              </DataTableBody>
                            </DataTable>
                          ) : null}
                          {log.remark ? (
                            <p className="text-meta">
                              <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                            </p>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
