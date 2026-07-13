import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, FileText, PackageCheck } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function DisposalBatchDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canManage = hasPermission(user, "disposal", "create") || hasPermission(user, "disposal", "edit") || hasPermission(user, "disposal", "approve")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const batch = await prisma.disposalBatch.findFirst({
    where: { id, isActive: true },
    include: {
      requestedBy: { select: { code: true, fullNameTh: true } },
      approver: { select: { code: true, fullNameTh: true } },
      disposalRequests: {
        where: { isActive: true },
        include: {
          asset: {
            select: {
              assetTag: true,
              name: true,
              currentLocation: { select: { name: true } },
              custodian: { select: { fullNameTh: true } },
            },
          },
        },
        orderBy: { disposalNo: "asc" },
      },
    },
  })
  if (!batch) notFound()

  const attachments = await prisma.attachment.findMany({
    where: { module: "disposal_batch", referenceId: batch.id, isActive: true },
    orderBy: { uploadedAt: "desc" },
  })
  const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
  const counts = Object.fromEntries(["pending", "approved", "disposed", "rejected"].map((key) => [key, batch.disposalRequests.filter((request) => request.requestStatus === key).length])) as Record<string, number>
  const statusLabel = status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)
  const batchHref = `/${locale}/disposal/batches/${batch.id}`

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Breadcrumbs items={[{ label: t("title"), href: `/${locale}/disposal` }, { label: batch.batchNo }]} />
          <h1 className="mt-3 text-2xl font-bold text-foreground">{batch.batchNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchDetailHelp", { count: batch.disposalRequests.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/disposal`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent"><ArrowLeft className="h-4 w-4" />{tCommon("back")}</Link>
          <StatusBadge label={statusLabel} status={status} />
        </div>
      </div>

      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <BatchMetric label={t("batchTotal")} value={batch.disposalRequests.length} />
        <BatchMetric label={t("statuses.pending")} value={counts.pending} />
        <BatchMetric label={t("statuses.approved")} value={counts.approved} />
        <BatchMetric label={t("statuses.disposed")} value={counts.disposed} />
        <BatchMetric label={t("statuses.rejected")} value={counts.rejected} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><PackageCheck className="h-5 w-5 text-primary" />{t("batchSharedDetail")}</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BatchInfo label={t("disposalType")} value={t(`types.${batch.disposalType}`)} />
              <BatchInfo label={t("requestedBy")} value={`${batch.requestedBy.code} - ${batch.requestedBy.fullNameTh}`} />
              <BatchInfo label={t("approver")} value={batch.approver ? `${batch.approver.code} - ${batch.approver.fullNameTh}` : t("centralApprovalQueue")} />
              <BatchInfo label={t("requestDate")} value={formatDateTime(batch.requestDate)} />
              {batch.saleValue != null ? <BatchInfo label={t("saleValue")} value={formatCurrency(Number(batch.saleValue))} /> : null}
              {batch.salvageValue != null ? <BatchInfo label={t("salvageValue")} value={formatCurrency(Number(batch.salvageValue))} /> : null}
            </dl>
            <div className="mt-5 border-t border-border pt-4"><BatchInfo label={t("reason")} value={batch.reason} /></div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3"><h2 className="text-base font-semibold text-foreground">{t("batchChildren")}</h2></div>
            <div className="divide-y divide-border md:hidden">
              {batch.disposalRequests.map((request) => <BatchRequestCard key={request.id} locale={locale} batchHref={batchHref} request={request} statusLabel={t(`statuses.${request.requestStatus}`)} openLabel={t("openRequest")} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t("disposalNo")}</th><th className="px-4 py-3">{t("asset")}</th><th className="px-4 py-3">{t("currentLocation")}</th><th className="px-4 py-3">{tCommon("status")}</th><th className="sticky right-0 bg-muted/50 px-4 py-3 text-right">{t("nextAction")}</th></tr></thead>
                <tbody className="divide-y divide-border">{batch.disposalRequests.map((request) => <tr key={request.id}><td className="px-4 py-3 font-medium">{request.disposalNo}</td><td className="px-4 py-3"><div>{request.asset.assetTag}</div><div className="text-xs text-muted-foreground">{request.asset.name}</div></td><td className="px-4 py-3">{request.asset.currentLocation.name}</td><td className="px-4 py-3"><StatusBadge label={t(`statuses.${request.requestStatus}`)} status={request.requestStatus} size="xs" /></td><td className="sticky right-0 bg-surface px-4 py-3 text-right"><RequestLink locale={locale} requestId={request.id} returnTo={batchHref} label={t("openRequest")} /></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>

        <aside><DisposalAttachments requestId={batch.id} attachments={attachments} canManage={canManage} uploadEndpoint={`/api/disposal-batches/${batch.id}/attachments`} title={t("batchSharedEvidence")} /></aside>
      </div>
    </div>
  )
}

function BatchMetric({ label, value }: { label: string; value: number }) { return <div className="bg-surface px-4 py-4"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold text-foreground">{value}</div></div> }
function BatchInfo({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{value}</dd></div> }
function RequestLink({ locale, requestId, returnTo, label }: { locale: string; requestId: string; returnTo: string; label: string }) { return <Link href={`/${locale}/disposal/${requestId}?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 font-medium hover:bg-accent"><FileText className="h-4 w-4" />{label}</Link> }
function BatchRequestCard({ locale, batchHref, request, statusLabel, openLabel }: { locale: string; batchHref: string; request: { id: string; disposalNo: string; requestStatus: string; asset: { assetTag: string; name: string; currentLocation: { name: string }; custodian: { fullNameTh: string } | null } }; statusLabel: string; openLabel: string }) { return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{request.disposalNo}</div><div className="mt-1 text-sm text-foreground">{request.asset.assetTag} · {request.asset.name}</div></div><StatusBadge label={statusLabel} status={request.requestStatus} size="xs" /></div><div className="mt-2 text-xs text-muted-foreground">{request.asset.currentLocation.name}{request.asset.custodian ? ` · ${request.asset.custodian.fullNameTh}` : ""}</div><div className="mt-3"><RequestLink locale={locale} requestId={request.id} returnTo={batchHref} label={openLabel} /></div></article> }
