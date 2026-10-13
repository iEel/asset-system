import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, PackageCheck } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { appendOperationalReturnTo, normalizeDisposalBatchReturnTo } from "@/lib/operational-return-navigation"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DisposalBatchDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function DisposalBatchDetailPage({ params, searchParams }: DisposalBatchDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canManage = hasPermission(user, "disposal", "create") || hasPermission(user, "disposal", "edit") || hasPermission(user, "disposal", "approve")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  // Back to the batch history list and its page when the user came from there, else to the disposal queue (spec 2B §5.9.2 row 5).
  const returnToHref = normalizeDisposalBatchReturnTo(locale, rawSearchParams.returnTo)
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: batch.batchNo, code: true }]}
        title={<span className="tag font-medium">{batch.batchNo}</span>}
        meta={
          <>
            <StatusBadge label={statusLabel} status={status} />
            <span>{t("batchDetailHelp", { count: batch.disposalRequests.length })}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />

      <StatStrip
        items={[
          { key: "total", label: t("batchTotal"), value: formatCount(batch.disposalRequests.length) },
          { key: "pending", label: t("statuses.pending"), value: formatCount(counts.pending) },
          { key: "approved", label: t("statuses.approved"), value: formatCount(counts.approved) },
          { key: "disposed", label: t("statuses.disposed"), value: formatCount(counts.disposed) },
          { key: "rejected", label: t("statuses.rejected"), value: formatCount(counts.rejected) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><PackageCheck className="h-5 w-5 text-primary" />{t("batchSharedDetail")}</h2>
            <KeyValueList
              className="mt-5"
              items={[
                { key: "disposalType", label: t("disposalType"), value: t(`types.${batch.disposalType}`) },
                { key: "requestedBy", label: t("requestedBy"), value: <><span className="tag">{batch.requestedBy.code}</span> - {batch.requestedBy.fullNameTh}</> },
                { key: "approver", label: t("approver"), value: batch.approver ? <><span className="tag">{batch.approver.code}</span> - {batch.approver.fullNameTh}</> : t("centralApprovalQueue") },
                { key: "requestDate", label: t("requestDate"), value: formatDateTime(batch.requestDate) },
                ...(batch.saleValue != null ? [{ key: "saleValue", label: t("saleValue"), value: <span className="num">{formatMoney(Number(batch.saleValue), { unit: tCommon("baht") })}</span> }] : []),
                ...(batch.salvageValue != null ? [{ key: "salvageValue", label: t("salvageValue"), value: <span className="num">{formatMoney(Number(batch.salvageValue), { unit: tCommon("baht") })}</span> }] : []),
                { key: "reason", label: t("reason"), value: <span className="whitespace-pre-wrap">{batch.reason}</span> },
              ]}
            />
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-3"><h2 className="text-base font-semibold text-foreground">{t("batchChildren")}</h2></div>
            <div className="divide-y divide-border md:hidden">
              {batch.disposalRequests.length === 0 ? <EmptyNote padded>{tCommon("noData")}</EmptyNote> : batch.disposalRequests.map((request) => <BatchRequestCard key={request.id} href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, batchHref)} request={request} statusLabel={t(`statuses.${request.requestStatus}`)} openLabel={t("openRequest")} />)}
            </div>
            <DataTable framed={false} className="hidden md:block" caption={t("batchChildren")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("disposalNo")}</DataTableHead>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("currentLocation")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" sticky="right" hideLabel>{t("nextAction")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {batch.disposalRequests.length === 0 ? (
                  <TableEmptyRow colSpan={5}>{tCommon("noData")}</TableEmptyRow>
                ) : batch.disposalRequests.map((request) => {
                  const requestHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, batchHref)
                  return (
                    <ClickableTableRow key={request.id} href={requestHref} label={`${t("openRequest")}: ${request.disposalNo}`}>
                      <DataTableCell className="whitespace-nowrap"><span className="tag font-medium text-foreground">{request.disposalNo}</span></DataTableCell>
                      <DataTableCell>
                        <div className="text-foreground"><span className="tag">{request.asset.assetTag}</span></div>
                        <div className="text-xs text-muted-foreground">{request.asset.name}</div>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{request.asset.currentLocation.name}</DataTableCell>
                      <DataTableCell><StatusBadge label={t(`statuses.${request.requestStatus}`)} status={request.requestStatus} /></DataTableCell>
                      <DataTableCell align="right" sticky="right">
                        <RowActions
                          code={request.disposalNo}
                          menuLabel={tCommon("moreActionsFor", { code: request.disposalNo })}
                          next={{ label: t("openRequest"), href: requestHref, icon: <FileText aria-hidden="true" /> }}
                          groups={[]}
                        />
                      </DataTableCell>
                    </ClickableTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
          </section>
        </div>

        <aside><DisposalAttachments requestId={batch.id} attachments={attachments} canManage={canManage} uploadEndpoint={`/api/disposal-batches/${batch.id}/attachments`} title={t("batchSharedEvidence")} /></aside>
      </div>
    </div>
  )
}

function BatchRequestCard({ href, request, statusLabel, openLabel }: { href: string; request: { id: string; disposalNo: string; requestStatus: string; asset: { assetTag: string; name: string; currentLocation: { name: string }; custodian: { fullNameTh: string } | null } }; statusLabel: string; openLabel: string }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-foreground"><span className="tag font-medium">{request.disposalNo}</span></div>
          <div className="mt-1 text-sm text-foreground"><span className="tag">{request.asset.assetTag}</span> · {request.asset.name}</div>
        </div>
        <StatusBadge label={statusLabel} status={request.requestStatus} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{request.asset.currentLocation.name}{request.asset.custodian ? ` · ${request.asset.custodian.fullNameTh}` : ""}</div>
      <div className="mt-3">
        <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <FileText aria-hidden="true" />
          {openLabel}
        </Link>
      </div>
    </article>
  )
}
