import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Download } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { buildDisposalQueryString, buildDisposalWhere, parseDisposalListParams } from "@/lib/disposal-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; disposalType?: string; dateFrom?: string; dateTo?: string }>
}

export default async function DisposalPage({ params, searchParams }: DisposalPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canExport = hasPermission(user, "disposal", "export")
  const t = await getTranslations("disposalPage")
  const tCommon = await getTranslations("common")
  const filters = parseDisposalListParams(rawSearchParams)
  const exportQuery = buildDisposalQueryString(filters)

  const [requests, options] = await Promise.all([
    prisma.disposalRequest.findMany({
      where: buildDisposalWhere(filters),
      include: {
        asset: { select: { assetTag: true, name: true } },
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    canCreate || canApprove ? getDisposalOptions() : Promise.resolve(null),
  ])
  const statuses = options?.statuses ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {canCreate && options ? <DisposalRequestForm assets={options.assets} employees={options.employees} /> : null}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]" action={`/${locale}/disposal`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select
              name="status"
              defaultValue={filters.status}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              <option value="pending">{t("statuses.pending")}</option>
              <option value="approved">{t("statuses.approved")}</option>
              <option value="rejected">{t("statuses.rejected")}</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("disposalType")}</span>
            <select
              name="disposalType"
              defaultValue={filters.disposalType}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{tCommon("all")}</option>
              {["sell", "donate", "destroy", "lost", "dispose"].map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo}
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
              href={`/${locale}/disposal`}
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
            <h2 className="text-base font-semibold text-foreground">{t("requestList")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultCount", { count: requests.length })}</p>
          </div>
          {canExport ? (
            <a
              href={`/api/disposal-requests/export${exportQuery ? `?${exportQuery}` : ""}`}
              className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("exportRequests")}
            </a>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("disposalNo")}</ColumnHeader>
                <ColumnHeader>{t("asset")}</ColumnHeader>
                <ColumnHeader>{t("disposalType")}</ColumnHeader>
                <ColumnHeader>{t("reason")}</ColumnHeader>
                <ColumnHeader>{t("requestedBy")}</ColumnHeader>
                <ColumnHeader>{t("approver")}</ColumnHeader>
                <ColumnHeader>{t("value")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader>{t("requestDate")}</ColumnHeader>
                {canApprove ? <ColumnHeader>{tCommon("actions")}</ColumnHeader> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? 10 : 9} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <ClickableTableRow
                    key={request.id}
                    href={`/${locale}/disposal/${request.id}`}
                    label={`${tCommon("view")}: ${request.disposalNo}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      <Link href={`/${locale}/disposal/${request.id}`} className="hover:text-primary">
                        {request.disposalNo}
                      </Link>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      <div className="font-medium text-foreground">{request.asset.assetTag}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{request.asset.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t(`types.${request.disposalType}`)}</td>
                    <td className="min-w-72 px-4 py-3 text-muted-foreground">{request.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {request.requestedBy.code} - {request.requestedBy.fullNameTh}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {request.saleValue != null
                        ? formatCurrency(Number(request.saleValue))
                        : request.salvageValue != null
                          ? formatCurrency(Number(request.salvageValue))
                          : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <DisposalStatusBadge status={request.requestStatus} labels={{
                        pending: t("statuses.pending"),
                        approved: t("statuses.approved"),
                        rejected: t("statuses.rejected"),
                      }} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(request.requestDate)}</td>
                    {canApprove ? (
                      <td className="whitespace-nowrap px-4 py-3">
                        {request.requestStatus === "pending" && statuses.length > 0 ? (
                          <DisposalDecisionButton
                            requestId={request.id}
                            disposalNo={request.disposalNo}
                            disposalType={request.disposalType}
                            statuses={statuses}
                            defaultSaleValue={request.saleValue != null ? String(request.saleValue) : undefined}
                            defaultSalvageValue={request.salvageValue != null ? String(request.salvageValue) : undefined}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ) : null}
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

function DisposalStatusBadge({
  status,
  labels,
}: {
  status: string
  labels: { pending: string; approved: string; rejected: string }
}) {
  if (status === "pending") return <ActiveBadge label={labels.pending} />
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
        {labels.approved}
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
        {labels.rejected}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {status}
    </span>
  )
}
