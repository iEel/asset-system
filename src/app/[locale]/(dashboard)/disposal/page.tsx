import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Download, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { buildDisposalQueryString, buildDisposalWhere, parseDisposalListParams } from "@/lib/disposal-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getDisposalNextAction, getDisposalStage, type DisposalStage } from "@/lib/disposal-stage"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; disposalType?: string; dateFrom?: string; dateTo?: string; assetId?: string; reason?: string; sourceType?: string; sourceId?: string }>
}

export default async function DisposalPage({ params, searchParams }: DisposalPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const canApprove = hasPermission(user, "disposal", "approve")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canExport = hasPermission(user, "disposal", "export")
  const t = await getTranslations("disposalPage")
  const tCommon = await getTranslations("common")
  const filters = parseDisposalListParams(rawSearchParams)
  const exportQuery = buildDisposalQueryString(filters)
  const disposalReturnHref = `/${locale}/disposal${exportQuery ? `?${exportQuery}` : ""}`

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
    canCreate || canApprove || canEdit ? getDisposalOptions() : Promise.resolve(null),
  ])
  const statuses = options?.statuses ?? []
  const employees = options?.employees ?? []
  const stageLabels = {
    pending_approval: t("stages.pending_approval"),
    awaiting_execution: t("stages.awaiting_execution"),
    complete: t("stages.complete"),
    rejected: t("stages.rejected"),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {canCreate && options ? (
        <DisposalRequestForm
          assets={options.assets}
          employees={options.employees}
          initialAssetId={rawSearchParams.assetId}
          initialReason={rawSearchParams.reason}
          initialSourceType={rawSearchParams.sourceType}
          initialSourceId={rawSearchParams.sourceId}
        />
      ) : null}

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
              <option value="disposed">{t("statuses.disposed")}</option>
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
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button
              type="submit"
              className="min-h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0 sm:w-auto"
            >
              {t("filter")}
            </button>
            <Link
              href={`/${locale}/disposal`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
            >
              <Download className="h-4 w-4" />
              {t("exportRequests")}
            </a>
          ) : null}
        </div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {requests.length === 0 ? (
            <ActionEmptyState
              icon={<Trash2 className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/disposal`}
              actionLabel={t("clearFilters")}
            />
          ) : (
            requests.map((request) => {
              const stage = getDisposalStage(request.requestStatus)

              return (
                <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <Link href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                    {request.disposalNo}
                  </Link>
                  <div>
                    <div className="break-words text-sm font-medium text-foreground">{request.asset.assetTag}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.asset.name}</div>
                  </div>
                  <p className="break-words text-sm text-muted-foreground">{request.reason}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <DisposalStatusBadge status={request.requestStatus} labels={{
                    pending: t("statuses.pending"),
                    approved: t("statuses.approved"),
                    disposed: t("statuses.disposed"),
                    rejected: t("statuses.rejected"),
                  }} />
                  <DisposalStageBadge stage={stage} label={stageLabels[stage]} />
                  <StatusBadge label={t(`types.${request.disposalType}`)} tone="muted" size="xs" />
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <MobileDisposalField label={t("requestedBy")} value={`${request.requestedBy.code} - ${request.requestedBy.fullNameTh}`} />
                  <MobileDisposalField label={t("approver")} value={request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : "-"} />
                  <MobileDisposalField
                    label={t("value")}
                    value={
                      request.saleValue != null
                        ? formatCurrency(Number(request.saleValue))
                        : request.salvageValue != null
                          ? formatCurrency(Number(request.salvageValue))
                          : "-"
                    }
                  />
                  <MobileDisposalField label={t("requestDate")} value={formatDateTime(request.requestDate)} />
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <DisposalNextAction
                    request={request}
                    href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)}
                    canApprove={canApprove}
                    canExecute={canEdit}
                    statuses={statuses}
                    employees={employees}
                    viewLabel={tCommon("view")}
                  />
                </div>
              </article>
              )
            })
          )}
        </div>
        <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
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
                {canApprove || canEdit ? <ColumnHeader>{tCommon("actions")}</ColumnHeader> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={canApprove || canEdit ? 10 : 9} className="px-4 py-6">
                    <ActionEmptyState
                      icon={<Trash2 className="h-6 w-6" />}
                      title={t("emptyTitle")}
                      description={t("emptyHelp")}
                      actionHref={`/${locale}/disposal`}
                      actionLabel={t("clearFilters")}
                    />
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const stage = getDisposalStage(request.requestStatus)

                  return (
                    <ClickableTableRow
                    key={request.id}
                    href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)}
                    label={`${tCommon("view")}: ${request.disposalNo}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      <Link href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)} className="hover:text-primary">
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
                        disposed: t("statuses.disposed"),
                        rejected: t("statuses.rejected"),
                      }} />
                      <div className="mt-1">
                        <DisposalStageBadge stage={stage} label={stageLabels[stage]} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(request.requestDate)}</td>
                    {canApprove || canEdit ? (
                      <td className="whitespace-nowrap px-4 py-3">
                        <DisposalNextAction
                          request={request}
                          href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)}
                          canApprove={canApprove}
                          canExecute={canEdit}
                          statuses={statuses}
                          employees={employees}
                          viewLabel={tCommon("view")}
                        />
                      </td>
                    ) : null}
                  </ClickableTableRow>
                  )
                })
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
  labels: { pending: string; approved: string; disposed: string; rejected: string }
}) {
  return <StatusBadge label={labels[status as keyof typeof labels] ?? status} status={status} size="xs" />
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"

  return <StatusBadge label={label} tone={tone} size="xs" />
}

type DisposalActionRequest = {
  id: string
  disposalNo: string
  disposalType: string
  requestStatus: string
  saleValue: { toString(): string } | number | null
  salvageValue: { toString(): string } | number | null
}

type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalEmployeeOption = { id: string; label: string }

function DisposalNextAction({
  request,
  href,
  canApprove,
  canExecute,
  statuses,
  employees,
  viewLabel,
}: {
  request: DisposalActionRequest
  href: string
  canApprove: boolean
  canExecute: boolean
  statuses: DisposalStatusOption[]
  employees: DisposalEmployeeOption[]
  viewLabel: string
}) {
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove, canExecute })
  const defaultSaleValue = request.saleValue != null ? String(request.saleValue) : undefined
  const defaultSalvageValue = request.salvageValue != null ? String(request.salvageValue) : undefined

  if (nextAction === "review" && statuses.length > 0) {
    return (
      <DisposalDecisionButton
        requestId={request.id}
        disposalNo={request.disposalNo}
        disposalType={request.disposalType}
        statuses={statuses}
        defaultSaleValue={defaultSaleValue}
        defaultSalvageValue={defaultSalvageValue}
      />
    )
  }

  if (nextAction === "execute" && statuses.length > 0) {
    return (
      <DisposalExecutionButton
        requestId={request.id}
        disposalNo={request.disposalNo}
        disposalType={request.disposalType}
        statuses={statuses}
        employees={employees}
        defaultActualSaleValue={defaultSaleValue}
        defaultActualSalvageValue={defaultSalvageValue}
      />
    )
  }

  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
      {viewLabel}
    </Link>
  )
}

function MobileDisposalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  )
}
