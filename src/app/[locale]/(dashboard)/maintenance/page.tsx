import Link from "next/link"
import { getTranslations } from "next-intl/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getMaintenanceOptions } from "@/lib/maintenance-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenanceTicketForm } from "@/components/maintenance/maintenance-ticket-form"
import { MaintenanceTicketCloseButton } from "@/components/maintenance/maintenance-ticket-close-button"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; repairType?: string }>
}

export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {
  const { locale } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")

  const searchText = filters.search?.trim() ?? ""
  const statusFilter = filters.status === "open" || filters.status === "closed" ? filters.status : ""
  const repairTypeFilter = filters.repairType === "internal" || filters.repairType === "vendor" ? filters.repairType : ""
  const where: Prisma.MaintenanceTicketWhereInput = {
    isActive: true,
    ...(statusFilter ? { repairStatus: statusFilter } : {}),
    ...(repairTypeFilter ? { repairType: repairTypeFilter } : {}),
    ...(searchText
      ? {
          OR: [
            { repairNo: { contains: searchText } },
            { problem: { contains: searchText } },
            { asset: { assetTag: { contains: searchText } } },
            { asset: { name: { contains: searchText } } },
            { reportedBy: { fullNameTh: { contains: searchText } } },
            { assignedTo: { fullNameTh: { contains: searchText } } },
            { vendor: { name: { contains: searchText } } },
          ],
        }
      : {}),
  }

  const [tickets, options] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
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
        <MaintenanceTicketForm assets={options.assets} employees={options.employees} suppliers={options.suppliers} />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]" action={`/${locale}/maintenance`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={searchText}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select
              name="status"
              defaultValue={statusFilter}
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
              defaultValue={repairTypeFilter}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="internal">{t("internalRepair")}</option>
              <option value="vendor">{t("vendorRepair")}</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            {t("filter")}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("ticketList")}</h2>
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
                  <tr key={ticket.id} className="hover:bg-accent/50">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
