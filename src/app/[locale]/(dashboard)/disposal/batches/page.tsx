import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { FileStack, FolderOpen, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn, formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"

type DisposalBatchHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}

export default async function DisposalBatchHistoryPage({ params, searchParams }: DisposalBatchHistoryPageProps) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/disposal/batches`
  // The list URL with its page and page size; the defaults stay out of it, so page 1 keeps today's URL (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  // A batch page's back button comes back here, on the same page and page size (spec 2B §5.9.2 row 5).
  const batchesReturnHref = listHref(listPage)
  const batchHref = (id: string) => appendOperationalReturnTo(`/${locale}/disposal/batches/${id}`, batchesReturnHref)

  const where: Prisma.DisposalBatchWhereInput = { isActive: true }
  const { skip, take } = listPageWindow(listPage)
  const [batches, total] = await Promise.all([
    prisma.disposalBatch.findMany({
      where,
      include: {
        requestedBy: { select: { code: true, fullNameTh: true } },
        disposalRequests: { where: { isActive: true }, select: { requestStatus: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.disposalBatch.count({ where }),
  ])
  // A page past the last one (an old link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (batches.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("batchHistory")}
        meta={t("batchHistoryHelp")}
        back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}
        actions={
          canCreate && total > 0 ? (
            <Link href={`/${locale}/disposal/batch/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("batchCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      {batches.length === 0 ? (
        <ActionEmptyState icon={<FileStack className="h-6 w-6" />} title={t("batchHistoryEmpty")} description={t("batchHistoryEmptyHelp")} actionHref={canCreate ? `/${locale}/disposal/batch/new` : undefined} actionLabel={canCreate ? t("batchCreateTitle") : undefined} />
      ) : (
        <ContentPanel divided flush>
          <ContentPanelRows className="md:hidden">
            {batches.map((batch) => {
              const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
              const href = batchHref(batch.id)
              return <li key={batch.id}><article><div className="flex items-start justify-between gap-3"><div><Link href={href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0")}><span className="tag font-medium">{batch.batchNo}</span></Link><p className="mt-1 text-meta text-muted-foreground">{t(`types.${batch.disposalType}`)} · {formatDateTime(batch.requestDate)}</p></div><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{batch.requestedBy.fullNameTh}</span><span className="font-medium text-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</span></div><Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>{t("openBatch")}</Link></article></li>
            })}
          </ContentPanelRows>
          <DataTable framed={false} className="hidden md:block" caption={t("batchHistory")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("sourceBatch")}</DataTableHead>
                <DataTableHead>{t("disposalType")}</DataTableHead>
                <DataTableHead>{t("requestedBy")}</DataTableHead>
                <DataTableHead>{t("requestDate")}</DataTableHead>
                <DataTableHead>{tCommon("status")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {batches.map((batch) => {
                const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
                const href = batchHref(batch.id)
                return (
                  <ClickableTableRow key={batch.id} href={href} label={`${t("openBatch")}: ${batch.batchNo}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{batch.batchNo}</span>
                      <div className="mt-1 text-meta text-muted-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</div>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{t(`types.${batch.disposalType}`)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground"><span className="tag">{batch.requestedBy.code}</span> - {batch.requestedBy.fullNameTh}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(batch.requestDate)}</DataTableCell>
                    <DataTableCell><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={batch.batchNo}
                        menuLabel={tCommon("moreActionsFor", { code: batch.batchNo })}
                        next={{ label: t("openBatch"), href, icon: <FolderOpen aria-hidden="true" /> }}
                        groups={[]}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        </ContentPanel>
      )}
    </div>
  )
}

function BatchStatus({ status, label }: { status: string; label: string }) {
  const tone = status === "disposed" ? "success" : status === "rejected" ? "danger" : status === "approved" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} />
}
