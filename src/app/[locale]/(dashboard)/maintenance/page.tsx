import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, Download, Plus, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  getMaintenanceDateRangeError,
  maintenanceStatusFilters,
  parseMaintenanceListParams,
} from "@/lib/maintenance-query"
import { buildMaintenancePagination } from "@/lib/maintenance-list"
import { buildMaintenancePageHref } from "@/lib/maintenance-view"
import { buildDuePmPlanWhere, getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, openRepairRecordWhere, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatDate } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; assetId?: string; dateFrom?: string; dateTo?: string; page?: string; pageSize?: string }>
}

const stuckAssetWhere = {
  isActive: true,
  status: { name: { in: ["Pending Repair", "Under Maintenance"] } },
  maintenanceTickets: { none: openRepairRecordWhere },
}

export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canExport = hasPermission(user, "maintenance", "export")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const filters = parseMaintenanceListParams(await searchParams)
  const where = buildMaintenanceWhere(filters)
  const listQuery = buildMaintenanceQueryString(filters)
  const returnHref = `/${locale}/maintenance?${listQuery}`
  const now = new Date()
  const todayKey = getBangkokDateKey(now)

  const [records, total, duePlans, stuckAssets, stuckTotal] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        vendor: { select: { name: true } },
      },
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.maintenanceTicket.count({ where }),
    prisma.maintenancePlan.findMany({
      where: buildDuePmPlanWhere(now),
      select: {
        id: true,
        planNo: true,
        title: true,
        nextDueDate: true,
        asset: { select: { assetTag: true, name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { nextDueDate: "asc" },
      take: 20,
    }),
    prisma.asset.findMany({
      where: stuckAssetWhere,
      select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
      orderBy: { assetTag: "asc" },
      take: 20,
    }),
    prisma.asset.count({ where: stuckAssetWhere }),
  ])
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
          canCreate ? (
            <Link href={createHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />

      {stuckTotal > 0 ? (
        <section id="stuck" className="rounded-lg border border-warning-border bg-warning-soft p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />{t("stuckTitle")} ({stuckTotal})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("stuckHelp")}</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {stuckAssets.map((asset) => (
              <li key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 min-w-0 items-center truncate text-sm font-medium text-foreground hover:text-primary">
                  <span className="truncate">
                    {asset.assetTag} - {asset.name} <span className="text-xs text-muted-foreground">({asset.status.nameTh})</span>
                  </span>
                </Link>
                {canCreate ? (
                  <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?assetId=${asset.id}`, returnHref)} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent">
                    {t("createTitle")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          {stuckTotal > stuckAssets.length ? <p className="mt-2 text-xs text-muted-foreground">{t("stuckMore", { count: stuckTotal - stuckAssets.length })}</p> : null}
        </section>
      ) : null}

      <section id="pm-due" className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarClock className="h-5 w-5 text-primary" />{t("pmDueTitle")} ({duePlans.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pmDueHelp")}</p>
          </div>
          <Link href={`/${locale}/maintenance/pm`} className={buttonVariants({ variant: "outline" })}>
            {t("pmManage")}
          </Link>
        </div>
        {duePlans.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {duePlans.map((plan) => {
              const overdue = getBangkokDateKey(plan.nextDueDate) < todayKey
              return (
                <li key={plan.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{plan.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}{plan.vendor ? ` · ${plan.vendor.name}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={overdue ? t("pmOverdue") : t("pmDueOn", { date: formatDate(plan.nextDueDate) })} tone={overdue ? "danger" : "warning"} />
                    {canCreate ? (
                      <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?planId=${plan.id}`, returnHref)} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary-hover">
                        {t("pmRecordDone")}
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      <FilterPanel>
        <form role="search" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <input type="hidden" name="pageSize" value={filters.pageSize} />
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
          <p role="alert" className="mt-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">{t("invalidDateRange")}</p>
        ) : null}
      </FilterPanel>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("listTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultCount", { count: total })}</p>
          </div>
          {canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("export")}
            </a>
          ) : null}
        </div>
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
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="tag font-medium">{record.asset.assetTag}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
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
                      <div className="mt-1 text-xs text-muted-foreground">{record.asset.name}</div>
                    </DataTableCell>
                    <DataTableCell className="min-w-72 text-foreground">{record.problem}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                    </DataTableCell>
                    <DataTableCell className={`whitespace-nowrap ${record.outcome === "beyond_repair" ? "text-warning" : record.outcome === "usable" ? "text-success" : "text-muted-foreground"}`}>
                      {orNil(outcomeLabel(record.outcome, record.repairStatus))}
                    </DataTableCell>
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
      </section>
    </div>
  )
}
