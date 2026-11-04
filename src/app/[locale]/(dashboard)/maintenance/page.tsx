import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Download, Plus, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildMaintenanceQueryString,
  getMaintenanceDateRangeError,
  maintenanceStatusFilters,
  parseMaintenanceListParams,
} from "@/lib/maintenance-query"
import { buildMaintenancePagination } from "@/lib/maintenance-list"
import { buildMaintenancePageHref } from "@/lib/maintenance-view"
import { readRepairListPage } from "@/lib/repair-list-page-data"
import type { RepairListLine } from "@/lib/repair-list-view"
import { getRepairRecordStatusTone } from "@/lib/repair-record-policy"
import { cn, formatDate } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { FilterChipList } from "@/components/ui/filter-chips"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { RepairDateRangeChip } from "@/components/maintenance/repair-date-range-chip"
import { RepairListStrip } from "@/components/maintenance/repair-list-strip"
import { RepairPmDueCard } from "@/components/maintenance/repair-pm-due-card"
import { RepairStuckCard } from "@/components/maintenance/repair-stuck-card"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; assetId?: string; dateFrom?: string; dateTo?: string; page?: string; pageSize?: string; stuck?: string }>
}

export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canExport = hasPermission(user, "maintenance", "export")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const filters = parseMaintenanceListParams(await searchParams)
  const listQuery = buildMaintenanceQueryString(filters)
  const returnHref = `/${locale}/maintenance?${listQuery}`
  const now = new Date()
  // One read for the records, the tab counts, the cost total, the strip and both cards (group 5 plan 5).
  const { rows, total, statusCounts, cost, strip, stuck, pm } = await readRepairListPage(prisma, filters, now)
  // A page past the last one (an old link, or a narrower filter) shows the last page, not an empty table (spec 2B I21).
  const lastPage = lastListPage(total, filters.pageSize)
  if (rows.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(buildMaintenancePageHref(locale, listQuery, { page: lastPage }))
  }
  const pagination = buildMaintenancePagination(filters.page, filters.pageSize, total)
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  // The status tabs (spec §11.3): ทั้งหมด first, then the three statuses; each keeps the other filters and goes to page 1.
  const statusTabs = [
    { key: "all", label: tCommon("all"), count: formatCount(statusCounts.all), href: buildMaintenancePageHref(locale, listQuery, { status: "", page: 1 }) },
    ...maintenanceStatusFilters.map((status) => ({
      key: status,
      label: t(`status.${status}`),
      count: formatCount(statusCounts[status]),
      href: buildMaintenancePageHref(locale, listQuery, { status, page: 1 }),
    })),
  ]
  // The status cell's plain secondary line (G5P5-R6): the outcome when closed, the day count when open (plan 3's words),
  // the cancel reason when cancelled.
  const statusLine = (line: RepairListLine) =>
    line == null
      ? null
      : line.kind === "outcome"
        ? t(`outcome.${line.key}`)
        : line.kind === "duration"
          ? t(`detail.${line.key}`, { days: line.days })
          : line.text
  const clearHref = filters.assetId ? `/${locale}/maintenance?assetId=${encodeURIComponent(filters.assetId)}` : `/${locale}/maintenance`
  // The filters the form shows. The asset filter has its own chip; page and page size are not filters (spec 2B §6.4).
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.dateFrom || filters.dateTo)
  const createHref = appendOperationalReturnTo(`/${locale}/maintenance/new${filters.assetId ? `?assetId=${encodeURIComponent(filters.assetId)}` : ""}`, returnHref)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href={`/${locale}/maintenance/pm`} className={buttonVariants({ variant: "outline", size: "md" })}>
              {t("pmManage")}
            </Link>
            {canCreate ? (
              <Link href={createHref} className={buttonVariants({ size: "md" })}>
                <Plus aria-hidden="true" />
                {t("createTitle")}
              </Link>
            ) : null}
          </>
        }
      />

      <RepairListStrip strip={strip} locale={locale} current={filters.status === "in_progress"} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RepairStuckCard
          rows={stuck.rows}
          total={stuck.total}
          expanded={filters.stuck === "all"}
          locale={locale}
          returnTo={returnHref}
          canCreate={canCreate}
          moreHref={`/${locale}/maintenance?${buildMaintenanceQueryString(filters, { stuck: "all" })}#stuck`}
          lessHref={`/${locale}/maintenance?${buildMaintenanceQueryString(filters, { stuck: "" })}#stuck`}
        />
        <RepairPmDueCard
          rows={pm.rows}
          overdue={pm.overdue}
          week={pm.week}
          locale={locale}
          returnTo={returnHref}
          canCreate={canCreate}
        />
      </div>

      <ContentPanel divided flush className="overflow-hidden" title={t("listTitle")}>
        <div className="space-y-3 px-4 py-3 md:px-5">
          <TabNav data-repair-tabs aria-label={tCommon("status")} items={statusTabs} current={filters.status || "all"} />
          <form id="repair-list-filter" role="search" action={`/${locale}/maintenance`} className="flex flex-wrap items-center gap-2">
            {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            {filters.stuck ? <input type="hidden" name="stuck" value={filters.stuck} /> : null}
            <input type="hidden" name="pageSize" value={filters.pageSize} />
            <SearchField
              name="search"
              defaultValue={filters.search}
              aria-label={tCommon("search")}
              placeholder={t("searchPlaceholder")}
              className="w-full md:w-96"
            />
            <RepairDateRangeChip
              key={`${filters.dateFrom}|${filters.dateTo}`}
              formId="repair-list-filter"
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              labels={{
                chip: t("dateRange"),
                applied: t("dateRangeApplied", { from: filters.dateFrom ? formatDate(filters.dateFrom) : "–", to: filters.dateTo ? formatDate(filters.dateTo) : "–" }),
                apply: t("dateRangeApply"),
                clear: t("dateRangeClear"),
                from: t("dateFrom"),
                to: t("dateTo"),
              }}
              clearHref={`/${locale}/maintenance?${buildMaintenanceQueryString(filters, { dateFrom: "", dateTo: "", page: 1 })}`}
            />
            {canExport ? (
              <a href={`/api/maintenance-tickets/export?${listQuery}`} download className={cn(buttonVariants({ variant: "outline", size: "md" }), "md:ms-auto")}>
                <Download aria-hidden="true" />
                {t("export")}
              </a>
            ) : null}
          </form>
          {filters.assetId ? (
            <FilterChipList
              label={t("activeFilters")}
              removeLabel={t("clearFilters")}
              chips={[{ key: "assetId", label: t("assetFilter"), href: `/${locale}/maintenance?${buildMaintenanceQueryString(filters, { assetId: "", page: 1 })}` }]}
            />
          ) : null}
          {getMaintenanceDateRangeError(filters) ? (
            <Notice tone="danger" role="alert">{t("invalidDateRange")}</Notice>
          ) : null}
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            {hasActiveFilters ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyFilteredTitle")} description={t("emptyFilteredHelp")} actionHref={clearHref} actionLabel={t("clearFilters")} actionVariant="secondary" />
            ) : (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyTitle")} description={canCreate ? t("emptyHelp") : undefined} actionHref={canCreate ? createHref : undefined} actionLabel={canCreate ? t("createTitle") : undefined} />
            )}
          </div>
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {rows.map((row) => {
                const line = statusLine(row.line)
                return (
                  <Link key={row.id} href={recordHref(row.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{row.asset.name}</div>
                        <div className="mt-1 text-meta text-muted-foreground"><span className="tag break-all">{row.asset.assetTag}</span></div>
                      </div>
                      <StatusBadge className="shrink-0" label={t(`status.${row.status}`)} tone={getRepairRecordStatusTone(row.status)} />
                    </div>
                    {line ? <p className="mt-2 text-meta text-muted-foreground">{line}</p> : null}
                    <div className="mt-2 text-meta text-muted-foreground">
                      {formatDate(row.reportedDate)} · {row.vendorName ?? t("internal")}
                      {row.cost == null ? "" : ` · ${formatMoney(row.cost, { unit: tCommon("baht") })}`}
                    </div>
                  </Link>
                )
              })}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("listTitle")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("colDateNo")}</DataTableHead>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("problem")}</DataTableHead>
                  <DataTableHead>{t("colStatusOutcome")}</DataTableHead>
                  <DataTableHead>{t("vendor")}</DataTableHead>
                  <DataTableHead align="right">{t("cost")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {rows.map((row) => {
                  const line = statusLine(row.line)
                  return (
                    <ClickableTableRow key={row.id} href={recordHref(row.id)} label={`${tCommon("view")}: ${row.repairNo}`} rowData={{ "data-repair-row": row.id }}>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="text-foreground">{formatDate(row.reportedDate)}</div>
                        <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{row.repairNo}</span></div>
                      </DataTableCell>
                      <DataTableCell className="min-w-48">
                        <div className="font-medium text-foreground">{row.asset.name}</div>
                        <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{row.asset.assetTag}</span></div>
                      </DataTableCell>
                      <DataTableCell className="min-w-64 max-w-md">
                        {row.resolution ? (
                          <>
                            <div className="line-clamp-1 text-foreground">{row.problem}</div>
                            <div className="mt-1 line-clamp-1 text-meta text-muted-foreground">{row.resolution}</div>
                          </>
                        ) : (
                          <div className="line-clamp-2 text-foreground">{row.problem}</div>
                        )}
                      </DataTableCell>
                      <DataTableCell className="min-w-40">
                        <StatusBadge label={t(`status.${row.status}`)} tone={getRepairRecordStatusTone(row.status)} />
                        {line ? <div className="mt-1 line-clamp-1 text-meta text-muted-foreground">{line}</div> : null}
                      </DataTableCell>
                      <DataTableCell className="min-w-40">
                        <div className="text-foreground">{row.vendorName ?? t("internal")}</div>
                        <div className="mt-1 text-meta text-muted-foreground">{t("recordedBy", { name: row.reporterName })}</div>
                      </DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">{row.cost == null ? <Nil /> : formatMoney(row.cost)}</DataTableCell>
                    </ClickableTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
          </>
        )}
        {total > 0 ? (
          <DataTableFoot>
            {/* G5P5-R4: the filtered list less its cancelled records; on the ยกเลิก tab the foot holds the pager alone. */}
            {filters.status !== "cancelled" ? (
              <div data-repair-cost className="space-y-0.5">
                <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span>{t("costTotal", { count: formatCount(cost.count) })}</span>
                  <span data-repair-cost-total className="font-semibold text-foreground">{formatMoney(cost.sum, { unit: tCommon("baht") })}</span>
                </p>
                {cost.cancelled > 0 ? <p>{t("costExcludesCancelled", { count: formatCount(cost.cancelled) })}</p> : null}
              </div>
            ) : null}
            <Pagination
              className={filters.status !== "cancelled" ? "mt-2.5 border-t border-border pt-2.5" : undefined}
              page={pagination.page}
              totalPages={pagination.totalPages}
              previousHref={buildMaintenancePageHref(locale, listQuery, { page: pagination.page - 1 })}
              nextHref={buildMaintenancePageHref(locale, listQuery, { page: pagination.page + 1 })}
              pageSize={pagination.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: buildMaintenancePageHref(locale, listQuery, { pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: pagination.page, total: pagination.totalPages }),
                range: tCommon("showingRange", { from: formatCount(pagination.start), to: formatCount(pagination.end), total: formatCount(pagination.total) }),
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
