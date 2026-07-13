import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, FileStack, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function DisposalBatchHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const batches = await prisma.disposalBatch.findMany({
    where: { isActive: true },
    include: {
      requestedBy: { select: { code: true, fullNameTh: true } },
      disposalRequests: { where: { isActive: true }, select: { requestStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/${locale}/disposal`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{t("backToQueue")}</Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t("batchHistory")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchHistoryHelp")}</p>
        </div>
        {canCreate && batches.length > 0 ? <Link href={`/${locale}/disposal/batch/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"><Plus className="h-4 w-4" />{t("batchCreateTitle")}</Link> : null}
      </header>

      {batches.length === 0 ? (
        <ActionEmptyState icon={<FileStack className="h-6 w-6" />} title={t("batchHistoryEmpty")} description={t("batchHistoryEmptyHelp")} actionHref={canCreate ? `/${locale}/disposal/batch/new` : undefined} actionLabel={canCreate ? t("batchCreateTitle") : undefined} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="divide-y divide-border md:hidden">
            {batches.map((batch) => {
              const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
              return <article key={batch.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/${locale}/disposal/batches/${batch.id}`} className="text-sm font-semibold text-foreground hover:text-primary">{batch.batchNo}</Link><p className="mt-1 text-xs text-muted-foreground">{t(`types.${batch.disposalType}`)} · {formatDateTime(batch.requestDate)}</p></div><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{batch.requestedBy.fullNameTh}</span><span className="font-medium text-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</span></div><Link href={`/${locale}/disposal/batches/${batch.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium hover:bg-accent">{t("openBatch")}</Link></article>
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground"><tr><th className="px-4 py-3">{t("sourceBatch")}</th><th className="px-4 py-3">{t("disposalType")}</th><th className="px-4 py-3">{t("requestedBy")}</th><th className="px-4 py-3">{t("requestDate")}</th><th className="px-4 py-3">{tCommon("status")}</th><th className="sticky right-0 bg-muted/95 px-4 py-3 text-right">{tCommon("actions")}</th></tr></thead>
              <tbody className="divide-y divide-border">{batches.map((batch) => {
                const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
                return <tr key={batch.id}><td className="px-4 py-3"><Link href={`/${locale}/disposal/batches/${batch.id}`} className="font-semibold text-foreground hover:text-primary">{batch.batchNo}</Link><div className="mt-1 text-xs text-muted-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</div></td><td className="px-4 py-3 text-muted-foreground">{t(`types.${batch.disposalType}`)}</td><td className="px-4 py-3 text-muted-foreground">{batch.requestedBy.code} - {batch.requestedBy.fullNameTh}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(batch.requestDate)}</td><td className="px-4 py-3"><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></td><td className="sticky right-0 border-l border-border bg-surface px-4 py-3 text-right"><Link href={`/${locale}/disposal/batches/${batch.id}`} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 font-medium hover:bg-accent">{t("openBatch")}</Link></td></tr>
              })}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function BatchStatus({ status, label }: { status: string; label: string }) {
  const tone = status === "disposed" ? "success" : status === "rejected" ? "danger" : status === "approved" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} size="xs" />
}
