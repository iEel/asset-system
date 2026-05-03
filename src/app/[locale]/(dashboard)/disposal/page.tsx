import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"

type DisposalPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DisposalPage({ params }: DisposalPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
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
    canCreate ? getDisposalOptions() : Promise.resolve(null),
  ])

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-32 px-4 text-center text-muted-foreground">
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
                      {request.requestStatus === "pending" ? (
                        <ActiveBadge label={t("statuses.pending")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {request.requestStatus}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(request.requestDate)}</td>
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
