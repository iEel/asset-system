import Link from "next/link"
import type React from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, Clock, Download, Hourglass, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getMaintenanceOptions } from "@/lib/maintenance-options"
import { buildMaintenanceQueryString, buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenanceTicketForm } from "@/components/maintenance/maintenance-ticket-form"
import { MaintenanceTicketCloseButton } from "@/components/maintenance/maintenance-ticket-close-button"
import { MaintenanceTicketStatusButton } from "@/components/maintenance/maintenance-ticket-status-button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, isMaintenanceClosed, isMaintenanceOverdue, maintenanceStatuses } from "@/lib/maintenance-status"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; repairType?: string; evidence?: string; overdue?: string; dateFrom?: string; dateTo?: string; assetId?: string }>
}

export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {
  const { locale } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const canExport = hasPermission(user, "maintenance", "export")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const listFilters = parseMaintenanceListParams(filters)
  const exportQuery = buildMaintenanceQueryString(listFilters)
  const evidenceTicketIds = await getMaintenanceAttachmentTicketIds()

  const today = startOfToday(new Date())
  const [tickets, options, summary] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where: buildMaintenanceWhere(listFilters, evidenceTicketIds),
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        assignedTo: { select: { code: true, fullNameTh: true } },
        inspectedBy: { select: { code: true, fullNameTh: true } },
        vendor: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    canCreate || canEdit ? getMaintenanceOptions() : Promise.resolve(null),
    getMaintenanceSummary(today),
  ])
  const statuses = options?.statuses ?? []
  const statusLabels = getStatusLabels(t)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {canCreate && options ? (
        <MaintenanceTicketForm
          assets={options.assets}
          employees={options.employees}
          suppliers={options.suppliers}
          initialAssetId={filters.assetId}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MaintenanceMetric
          label={t("summaryOpen")}
          value={summary.openWork}
          detail={t("summaryOpenDetail")}
          tone="primary"
          icon={<Wrench className="h-5 w-5" />}
        />
        <MaintenanceMetric
          label={t("summaryOverdue")}
          value={summary.overdue}
          detail={t("summaryOverdueDetail")}
          tone="danger"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MaintenanceMetric
          label={t("summaryWaiting")}
          value={summary.waiting}
          detail={t("summaryWaitingDetail")}
          tone="warning"
          icon={<Hourglass className="h-5 w-5" />}
        />
        <MaintenanceMetric
          label={t("summaryCompleted")}
          value={summary.completedPendingClose}
          detail={t("summaryCompletedDetail")}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(140px,160px))]" action={`/${locale}/maintenance`}>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listFilters.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select
              name="status"
              defaultValue={listFilters.status}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              {maintenanceStatuses.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("repairType")}</span>
            <select
              name="repairType"
              defaultValue={listFilters.repairType}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="internal">{t("internalRepair")}</option>
              <option value="vendor">{t("vendorRepair")}</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("sla")}</span>
            <select
              name="overdue"
              defaultValue={listFilters.overdue}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="yes">{t("overdueOnly")}</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("evidence")}</span>
            <select
              name="evidence"
              defaultValue={listFilters.evidence}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="with">{t("withEvidence")}</option>
              <option value="without">{t("withoutEvidence")}</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={listFilters.dateFrom}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={listFilters.dateTo}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <div className="flex min-w-0 flex-wrap gap-2 self-end md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="h-10 min-w-24 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              {t("filter")}
            </button>
            <Link
              href={`/${locale}/maintenance`}
              className="inline-flex h-10 min-w-24 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("kanbanTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("kanbanSubtitle")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {["reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"].map((status) => (
            <MaintenanceKanbanColumn
              key={status}
              locale={locale}
              status={status}
              label={statusLabels[status] ?? status}
              tickets={tickets.filter((ticket) => ticket.repairStatus === status)}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("ticketList")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultCount", { count: tickets.length })}</p>
          </div>
          {canExport ? (
            <a
              href={`/api/maintenance-tickets/export${exportQuery ? `?${exportQuery}` : ""}`}
              className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("exportTickets")}
            </a>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("repairNo")}</ColumnHeader>
                <ColumnHeader>{t("asset")}</ColumnHeader>
                <ColumnHeader>{t("problem")}</ColumnHeader>
                <ColumnHeader>{t("reportedBy")}</ColumnHeader>
                <ColumnHeader>{t("assignedTo")}</ColumnHeader>
                <ColumnHeader>{t("repairType")}</ColumnHeader>
                <ColumnHeader>{t("repairCost")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader>{t("dueDate")}</ColumnHeader>
                <ColumnHeader>{t("reportedDate")}</ColumnHeader>
                <ColumnHeader>{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <ClickableTableRow
                    key={ticket.id}
                    href={`/${locale}/maintenance/${ticket.id}`}
                    label={`${tCommon("view")}: ${ticket.repairNo}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{ticket.repairNo}</td>
                    <td className="min-w-56 px-4 py-3">
                      <div className="font-medium text-foreground">{ticket.asset.assetTag}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{ticket.asset.name}</div>
                    </td>
                    <td className="min-w-72 px-4 py-3 text-muted-foreground">{ticket.problem}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {ticket.reportedBy.code} - {ticket.reportedBy.fullNameTh}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {ticket.repairType === "vendor"
                        ? `${t("vendorRepair")}${ticket.vendor ? `: ${ticket.vendor.name}` : ""}`
                        : t("internalRepair")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {ticket.repairCost == null ? "-" : formatCurrency(Number(ticket.repairCost))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <MaintenanceStatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, statusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {ticket.dueDate ? (
                        <div>
                          <div className="text-muted-foreground">{formatDateTime(ticket.dueDate)}</div>
                          {isMaintenanceOverdue(ticket.repairStatus, ticket.dueDate) ? (
                            <div className="mt-1 text-xs font-medium text-danger">{t("overdue")}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(ticket.reportedDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${locale}/maintenance/${ticket.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          {tCommon("view")}
                        </Link>
                        <Link
                          href={`/${locale}/maintenance/${ticket.id}/print`}
                          className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          {t("printRepair")}
                        </Link>
                        {canEdit && !isMaintenanceClosed(ticket.repairStatus) && options ? (
                          <>
                            <MaintenanceTicketStatusButton
                              ticketId={ticket.id}
                              repairNo={ticket.repairNo}
                              currentStatus={ticket.repairStatus}
                              assignedToId={ticket.assignedToId}
                              dueDate={ticket.dueDate}
                              employees={options.employees}
                            />
                            <MaintenanceTicketCloseButton
                              ticketId={ticket.id}
                              repairNo={ticket.repairNo}
                              statuses={statuses}
                              defaultLaborCost={ticket.laborCost?.toString()}
                              defaultPartsCost={ticket.partsCost?.toString()}
                              defaultRepairCost={ticket.repairCost?.toString()}
                              defaultQuotationNo={ticket.quotationNo}
                              defaultInvoiceNo={ticket.invoiceNo}
                              defaultWarrantyClaim={ticket.warrantyClaim}
                              employees={options.employees}
                            />
                          </>
                        ) : canEdit ? <span className="text-muted-foreground">-</span> : null}
                      </div>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function getStatusLabels(t: (key: string) => string) {
  return Object.fromEntries(maintenanceStatuses.map((status) => [status, t(`statuses.${status}`)]))
}

async function getMaintenanceSummary(today: Date) {
  const [openWork, overdue, waiting, completedPendingClose] = await Promise.all([
    prisma.maintenanceTicket.count({ where: { isActive: true, repairStatus: { not: "closed" } } }),
    prisma.maintenanceTicket.count({
      where: { isActive: true, repairStatus: { not: "closed" }, dueDate: { lt: today } },
    }),
    prisma.maintenanceTicket.count({
      where: { isActive: true, repairStatus: { in: ["waiting_parts", "waiting_vendor"] } },
    }),
    prisma.maintenanceTicket.count({ where: { isActive: true, repairStatus: "completed" } }),
  ])
  return { openWork, overdue, waiting, completedPendingClose }
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function MaintenanceMetric({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string
  value: number
  detail: string
  tone: "primary" | "danger" | "warning" | "success"
  icon: React.ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/5 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning/5 text-warning"
        : tone === "success"
          ? "border-success/30 bg-success/5 text-success"
          : "border-primary/30 bg-primary/5 text-primary"

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  )
}

function MaintenanceKanbanColumn({
  locale,
  status,
  label,
  tickets,
}: {
  locale: string
  status: string
  label: string
  tickets: Array<{
    id: string
    repairNo: string
    problem: string
    dueDate: Date | null
    repairStatus: string
    asset: { assetTag: string; name: string }
    assignedTo: { code: string; fullNameTh: string } | null
  }>
}) {
  return (
    <div className="min-h-48 rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{tickets.length}</span>
      </div>
      <div className="space-y-2">
        {tickets.slice(0, 4).map((ticket) => (
          <Link
            key={ticket.id}
            href={`/${locale}/maintenance/${ticket.id}`}
            className="block rounded-md border border-border bg-surface p-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="font-medium text-foreground">{ticket.repairNo}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</div>
            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{ticket.problem}</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {ticket.dueDate ? formatDateTime(ticket.dueDate) : "-"}
            </div>
          </Link>
        ))}
        {tickets.length > 4 ? (
          <Link
            href={`/${locale}/maintenance?status=${status}`}
            className="block rounded-md border border-dashed border-border px-3 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            +{tickets.length - 4}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function MaintenanceStatusBadge({ label, tone }: { label: string; tone: string }) {
  const className =
    tone === "info"
      ? "bg-info/10 text-info"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/10 text-warning"
          : tone === "primary"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{label}</span>
}

async function getMaintenanceAttachmentTicketIds() {
  const rows = await prisma.attachment.findMany({
    where: { module: "maintenance", isActive: true },
    select: { referenceId: true },
    distinct: ["referenceId"],
  })
  return rows.map((row) => row.referenceId)
}
