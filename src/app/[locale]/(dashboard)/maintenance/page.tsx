import Link from "next/link"
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
import { buildDuePmPlanWhere, getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, openRepairRecordWhere, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenancePagination } from "@/components/maintenance/maintenance-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
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
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  const outcomeLabel = (outcome: string | null, status: string) =>
    outcome === "usable" || outcome === "beyond_repair"
      ? t(`outcome.${outcome}`)
      : toRepairRecordStatus(status) === "closed" ? t("outcome.unknown") : "-"
  const clearHref = filters.assetId ? `/${locale}/maintenance?assetId=${encodeURIComponent(filters.assetId)}` : `/${locale}/maintenance`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreate ? (
          <Link
            href={appendOperationalReturnTo(`/${locale}/maintenance/new${filters.assetId ? `?assetId=${encodeURIComponent(filters.assetId)}` : ""}`, returnHref)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />{t("createTitle")}
          </Link>
        ) : null}
      </div>

      {stuckTotal > 0 ? (
        <section id="stuck" className="rounded-lg border border-warning/40 bg-warning-soft p-4 shadow-sm">
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

      <section id="pm-due" className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarClock className="h-5 w-5 text-primary" />{t("pmDueTitle")} ({duePlans.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pmDueHelp")}</p>
          </div>
          <Link href={`/${locale}/maintenance/pm`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
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
                    <StatusBadge label={overdue ? t("pmOverdue") : t("pmDueOn", { date: formatDate(plan.nextDueDate) })} tone={overdue ? "danger" : "warning"} size="xs" />
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

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("filterStatus")}</span>
            <select name="status" defaultValue={filters.status} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">
              <option value="">{tCommon("all")}</option>
              {maintenanceStatusFilters.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input type="date" name="dateTo" defaultValue={filters.dateTo} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">{t("filter")}</button>
            <Link href={clearHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">{t("clearFilters")}</Link>
          </div>
        </form>
        {filters.assetId ? <p className="mt-3 text-xs text-muted-foreground">{t("assetFilter")} · <Link href={`/${locale}/maintenance`} className="text-primary hover:underline">{t("clearFilters")}</Link></p> : null}
        {getMaintenanceDateRangeError(filters) ? (
          <p role="alert" className="mt-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">{t("invalidDateRange")}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("listTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultCount", { count: total })}</p>
          </div>
          {canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
              <Download className="h-4 w-4" />{t("export")}
            </a>
          ) : null}
        </div>
        {records.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyTitle")} description={t("emptyHelp")} actionHref={clearHref} actionLabel={t("clearFilters")} />
          </div>
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {records.map((record) => (
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{record.asset.assetTag}</div>
                      <div className="truncate text-xs text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} size="xs" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(record.reportedDate)} · {record.vendor?.name ?? t("internal")}
                    {record.repairCost == null ? "" : ` · ${formatCurrency(Number(record.repairCost))}`}
                  </div>
                </Link>
              ))}
            </div>
            <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <ColumnHeader>{t("date")}</ColumnHeader>
                    <ColumnHeader>{t("asset")}</ColumnHeader>
                    <ColumnHeader>{t("problem")}</ColumnHeader>
                    <ColumnHeader>{t("statusLabel")}</ColumnHeader>
                    <ColumnHeader>{t("outcomeQuestion")}</ColumnHeader>
                    <ColumnHeader>{t("vendor")}</ColumnHeader>
                    <ColumnHeader>{t("cost")}</ColumnHeader>
                    <ColumnHeader>{t("reporter")}</ColumnHeader>
                    <ColumnHeader>{t("repairNo")}</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((record) => (
                    <ClickableTableRow key={record.id} href={recordHref(record.id)} label={`${tCommon("view")}: ${record.repairNo}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(record.reportedDate)}</td>
                      <td className="min-w-48 px-4 py-3">
                        <div className="font-medium text-foreground">{record.asset.assetTag}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{record.asset.name}</div>
                      </td>
                      <td className="min-w-72 px-4 py-3 text-foreground">{record.problem}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} size="xs" />
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 ${record.outcome === "beyond_repair" ? "text-warning" : record.outcome === "usable" ? "text-success" : "text-muted-foreground"}`}>
                        {outcomeLabel(record.outcome, record.repairStatus)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.vendor?.name ?? t("internal")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.repairCost == null ? "-" : formatCurrency(Number(record.repairCost))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.reportedBy.fullNameTh}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{record.repairNo}</td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <MaintenancePagination
          locale={locale}
          currentQuery={listQuery}
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }}
        />
      </section>
    </div>
  )
}
