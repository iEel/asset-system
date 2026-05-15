import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Download } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getMaintenanceOptions } from "@/lib/maintenance-options"
import { buildMaintenanceQueryString, buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenanceTicketForm } from "@/components/maintenance/maintenance-ticket-form"
import { MaintenanceTicketCloseButton } from "@/components/maintenance/maintenance-ticket-close-button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; repairType?: string; evidence?: string; dateFrom?: string; dateTo?: string; assetId?: string }>
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

  const [tickets, options] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where: buildMaintenanceWhere(listFilters, evidenceTicketIds),
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        assignedTo: { select: { code: true, fullNameTh: true } },
        vendor: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    canCreate || canEdit ? getMaintenanceOptions() : Promise.resolve(null),
  ])
  const statuses = options?.statuses ?? []

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

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_150px_150px_auto]" action={`/${locale}/maintenance`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listFilters.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select
              name="status"
              defaultValue={listFilters.status}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="open">{t("statuses.open")}</option>
              <option value="closed">{t("statuses.closed")}</option>
            </select>
          </label>
          <label>
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
          <label>
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
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={listFilters.dateFrom}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={listFilters.dateTo}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <div className="flex gap-2 self-end">
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              {t("filter")}
            </button>
            <Link
              href={`/${locale}/maintenance`}
              className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
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
                <ColumnHeader>{t("reportedDate")}</ColumnHeader>
                <ColumnHeader>{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
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
                      {ticket.repairStatus === "open" ? (
                        <ActiveBadge label={t("statuses.open")} />
                      ) : ticket.repairStatus === "closed" ? (
                        <span className="inline-flex rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">
                          {t("statuses.closed")}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {ticket.repairStatus}
                        </span>
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
                        {ticket.repairStatus === "open" ? (
                          canEdit ? (
                            <MaintenanceTicketCloseButton
                              ticketId={ticket.id}
                              repairNo={ticket.repairNo}
                              statuses={statuses}
                              defaultRepairCost={ticket.repairCost?.toString()}
                              defaultWarrantyClaim={ticket.warrantyClaim}
                            />
                          ) : null
                        ) : (
                          canEdit ? <span className="text-muted-foreground">-</span> : null
                        )}
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

async function getMaintenanceAttachmentTicketIds() {
  const rows = await prisma.attachment.findMany({
    where: { module: "maintenance", isActive: true },
    select: { referenceId: true },
    distinct: ["referenceId"],
  })
  return rows.map((row) => row.referenceId)
}
