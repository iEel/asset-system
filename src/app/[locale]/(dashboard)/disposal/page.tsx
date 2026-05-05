import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DisposalPage({ params }: DisposalPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const canApprove = hasPermission(user, "disposal", "approve")
  const t = await getTranslations("disposalPage")
  const tCommon = await getTranslations("common")

  const [requests, options] = await Promise.all([
    prisma.disposalRequest.findMany({
      where: { isActive: true },
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

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("requestList")}</h2>
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
                  <tr key={request.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{request.disposalNo}</td>
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
