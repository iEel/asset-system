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
import { getRepairRecordStatusTone, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatDate } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
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
  // One read for the records, the strip and both cards (group 5 plan 5). Until Task 3 rebuilds the records part, it
  // reads the row views in the shape today's markup uses.
  const { rows, total, strip, stuck, pm } = await readRepairListPage(prisma, filters, now)
  const records = rows.map((row) => ({
    id: row.id,
    repairNo: row.repairNo,
    reportedDate: row.reportedDate,
    asset: row.asset,
    problem: row.problem,
    repairStatus: row.status,
    outcome: row.line?.kind === "outcome" && row.line.key !== "unknown" ? row.line.key : null,
    vendor: row.vendorName == null ? null : { name: row.vendorName },
    repairCost: row.cost,
    reportedBy: { fullNameTh: row.reporterName },
  }))
  // A page past the last one (an old link, or a narrower filter) shows the last page, not an empty table (spec 2B I21).
  const lastPage = lastListPage(total, filters.pageSize)
  if (records.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(buildMaintenancePageHref(locale, listQuery, { page: lastPage }))
  }
  const pagination = buildMaintenancePagination(filters.page, filters.pageSize, total)
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  const outcomeLabel = (outcome: string | null, status: string) =>
    outcome === "usable" || outcome === "beyond_repair"
      ? t(`outcome.${outcome}`)
      : toRepairRecordStatus(status) === "closed" ? t("outcome.unknown") : null
  // The outcome is a state badge (plan 2D-4 R2): usable success, beyond repair warning, unknown muted, none Nil.
  const outcomeBadge = (outcome: string | null, status: string) => {
    const label = outcomeLabel(outcome, status)
    if (label == null) return null
    return <StatusBadge label={label} tone={outcome === "usable" ? "success" : outcome === "beyond_repair" ? "warning" : "muted"} />
  }
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

      <FilterPanel>
        <form role="search" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <input type="hidden" name="pageSize" value={filters.pageSize} />
          {filters.stuck ? <input type="hidden" name="stuck" value={filters.stuck} /> : null}
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("filterStatus")}
            name="status"
            defaultValue={filters.status}
            allLabel={tCommon("all")}
            options={maintenanceStatusFilters.map((status) => ({ value: status, label: t(`status.${status}`) }))}
          />
          <Field label={t("dateFrom")}>
            <Input type="date" name="dateFrom" defaultValue={filters.dateFrom} />
          </Field>
          <Field label={t("dateTo")}>
            <Input type="date" name="dateTo" defaultValue={filters.dateTo} />
          </Field>
          <FilterFormActions submitLabel={t("filter")} clear={hasActiveFilters ? { href: clearHref, label: t("clearFilters") } : undefined} />
        </form>
        {filters.assetId ? (
          <FilterChipList
            className="mt-3"
            label={t("activeFilters")}
            removeLabel={t("clearFilters")}
            chips={[{ key: "assetId", label: t("assetFilter"), href: `/${locale}/maintenance?${buildMaintenanceQueryString(filters, { assetId: "", page: 1 })}` }]}
          />
        ) : null}
        {getMaintenanceDateRangeError(filters) ? (
          <Notice tone="danger" role="alert" className="mt-3">{t("invalidDateRange")}</Notice>
        ) : null}
      </FilterPanel>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("listTitle")}
        description={t("resultCount", { count: total })}
        actions={
          canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("export")}
            </a>
          ) : undefined
        }
      >
        {records.length === 0 ? (
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
              {records.map((record) => (
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="tag font-medium">{record.asset.assetTag}</span>
                      </div>
                      <div className="truncate text-meta text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-meta text-muted-foreground">
                    {formatDate(record.reportedDate)} · {record.vendor?.name ?? t("internal")}
                    {record.repairCost == null ? "" : ` · ${formatMoney(Number(record.repairCost), { unit: tCommon("baht") })}`}
                  </div>
                </Link>
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("listTitle")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("date")}</DataTableHead>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("problem")}</DataTableHead>
                  <DataTableHead>{t("statusLabel")}</DataTableHead>
                  <DataTableHead>{t("outcomeQuestion")}</DataTableHead>
                  <DataTableHead>{t("vendor")}</DataTableHead>
                  <DataTableHead align="right">{t("cost")}</DataTableHead>
                  <DataTableHead>{t("reporter")}</DataTableHead>
                  <DataTableHead>{t("repairNo")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {records.map((record) => (
                  <ClickableTableRow key={record.id} href={recordHref(record.id)} label={`${tCommon("view")}: ${record.repairNo}`}>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(record.reportedDate)}</DataTableCell>
                    <DataTableCell className="min-w-48">
                      <div className="font-medium text-foreground">
                        <span className="tag font-medium">{record.asset.assetTag}</span>
                      </div>
                      <div className="mt-1 text-meta text-muted-foreground">{record.asset.name}</div>
                    </DataTableCell>
                    <DataTableCell className="min-w-72 text-foreground">{record.problem}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{orNil(outcomeBadge(record.outcome, record.repairStatus))}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{record.vendor?.name ?? t("internal")}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{record.repairCost == null ? <Nil /> : formatMoney(Number(record.repairCost))}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{record.reportedBy.fullNameTh}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="tag">{record.repairNo}</span>
                    </DataTableCell>
                  </ClickableTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </>
        )}
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
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
