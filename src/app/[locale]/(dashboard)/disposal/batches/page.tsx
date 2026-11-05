import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileStack, FolderOpen, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { readDisposalBatchList, type DisposalBatchListRow } from "@/lib/disposal-batch-page-data"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn, formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { PaceBar } from "@/components/ui/pace-bar"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"

type DisposalBatchHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

const stages = ["pending", "approved", "disposed", "rejected"] as const

// The batch list, board DP-Batches (request batches spec §6), in the rounds list's look: newest first, searched by the
// batch number, a machine's name or tag and the requester; each batch with its name built from its machines, its
// progress "ตัดจำหน่ายแล้ว {x}/{y}" with a bar, and the strip of every batch's requests by stage (PB-R5). Paging
// 25/50/100 and phone cards; the link to a batch carries the list's search and page, so its back button returns here.
export default async function DisposalBatchHistoryPage({ params, searchParams }: DisposalBatchHistoryPageProps) {
  const { locale } = await params
  const raw = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const search = ((Array.isArray(raw.q) ? raw.q[0] : raw.q) ?? "").trim().slice(0, 100)
  const listPage = parseListPage({ page: raw.page, pageSize: raw.pageSize })
  const basePath = `/${locale}/disposal/batches`
  // The list URL with its search, page and page size; the defaults stay out of it, so page 1 keeps today's URL (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (search) query.set("q", search)
    const text = appendListPage(query, next).toString()
    return text ? `${basePath}?${text}` : basePath
  }
  // A batch page's back button comes back here, on the same search, page and page size (spec 2B §5.9.2 row 5).
  const batchesReturnHref = listHref(listPage)
  const batchHref = (id: string) => appendOperationalReturnTo(`/${locale}/disposal/batches/${id}`, batchesReturnHref)

  const { rows, total, strip } = await readDisposalBatchList(prisma, {
    search,
    page: listPage.page,
    pageSize: listPage.pageSize,
    titleWords: {
      same: (name, count) => t("rounds.titleSame", { name, count }),
      mixed: (name, count) => t("rounds.titleMixed", { name, count }),
    },
  })
  // A page past the last one (an old link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (rows.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const method = (type: string) => (t.has(`types.${type}`) ? t(`types.${type}`) : type)
  const progressOf = (row: DisposalBatchListRow) =>
    t("batchPage.progress", { disposed: formatCount(row.counts.disposed), total: formatCount(row.counts.total) })
  const hasBatches = strip.batches > 0

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: t("batchHistory") }]}
        title={t("batchHistory")}
        meta={t("batchHistoryHelp")}
        back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}
        actions={
          canCreate && hasBatches ? (
            <Link href={`/${locale}/disposal/batch/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("batchCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      {!hasBatches ? (
        <ActionEmptyState
          icon={<FileStack className="h-6 w-6" />}
          title={t("batchList.emptyTitle")}
          description={t("batchHistoryEmptyHelp")}
          actionHref={canCreate ? `/${locale}/disposal/batch/new` : undefined}
          actionLabel={canCreate ? t("batchCreateTitle") : undefined}
        />
      ) : (
        <>
          <div data-batch-strip="" className="space-y-2">
            <p className="text-meta text-muted-foreground">
              {t("batchList.stripLine", { requests: formatCount(strip.total), batches: formatCount(strip.batches) })}
            </p>
            <StatStrip items={stages.map((stage) => ({ key: stage, label: t(`statuses.${stage}`), value: formatCount(strip[stage]) }))} />
          </div>

          <ContentPanel divided flush>
            <form action={basePath} method="get" role="search" className="flex flex-wrap items-center gap-2 p-4">
              <SearchField
                name="q"
                defaultValue={search}
                maxLength={100}
                aria-label={t("batchList.searchLabel")}
                placeholder={t("batchList.searchPlaceholder")}
                className="w-full sm:w-96"
              />
              <input type="hidden" name="pageSize" value={listPage.pageSize} />
              <Button type="submit" variant="outline">{t("batchList.searchSubmit")}</Button>
              {search ? <Link href={basePath} className={linkVariants({ size: "inherit" })}>{t("clearFilters")}</Link> : null}
            </form>
            {rows.length === 0 ? (
              <EmptyNote padded>{t("batchList.searchEmpty")}</EmptyNote>
            ) : (
              <>
                <ContentPanelRows className="md:hidden">
                  {rows.map((row) => {
                    const href = batchHref(row.id)
                    const progress = progressOf(row)
                    return (
                      <li key={row.id}>
                        <article>
                          <Link href={href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm font-medium text-foreground [overflow-wrap:anywhere]")}>
                            {row.title}
                          </Link>
                          <p className="text-meta text-muted-foreground">
                            <span className="tag">{row.batchNo}</span> · {method(row.disposalType)} · {formatDate(row.requestDate)}
                          </p>
                          <p className="mt-1 text-meta text-muted-foreground [overflow-wrap:anywhere]">
                            {row.requestedByShortName ?? "–"} · {t("batchList.machineCount", { count: formatCount(row.machineCount) })}
                          </p>
                          <div data-batch-progress="" className="mt-2 space-y-1">
                            <p className="text-meta text-foreground">{progress}</p>
                            <PaceBar value={row.counts.total > 0 ? row.counts.disposed / row.counts.total : 0} pace={null} label={progress} behind={false} />
                          </div>
                          <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>{t("openBatch")}</Link>
                        </article>
                      </li>
                    )
                  })}
                </ContentPanelRows>
                <DataTable framed={false} className="hidden md:block" caption={t("batchHistory")} scrollHint={tCommon("tableScrollHint")}>
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>{t("batchNo")}</DataTableHead>
                      <DataTableHead>{t("batchList.colName")}</DataTableHead>
                      <DataTableHead>{t("batchList.colMethod")}</DataTableHead>
                      <DataTableHead>{t("requestedBy")}</DataTableHead>
                      <DataTableHead>{t("requestDate")}</DataTableHead>
                      <DataTableHead>{t("batchList.colProgress")}</DataTableHead>
                      <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {rows.map((row) => {
                      const href = batchHref(row.id)
                      const progress = progressOf(row)
                      return (
                        <ClickableTableRow key={row.id} href={href} label={`${t("openBatch")}: ${row.batchNo}`}>
                          <DataTableCell className="whitespace-nowrap"><span className="tag font-medium text-foreground">{row.batchNo}</span></DataTableCell>
                          <DataTableCell className="min-w-56">
                            <div className="font-medium text-foreground [overflow-wrap:anywhere]">{row.title}</div>
                            <div className="text-meta text-muted-foreground">{t("batchList.machineCount", { count: formatCount(row.machineCount) })}</div>
                          </DataTableCell>
                          <DataTableCell className="whitespace-nowrap text-muted-foreground">{method(row.disposalType)}</DataTableCell>
                          <DataTableCell className="min-w-40 text-muted-foreground [overflow-wrap:anywhere]">{row.requestedByShortName ?? "–"}</DataTableCell>
                          <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.requestDate)}</DataTableCell>
                          <DataTableCell className="min-w-40">
                            <div data-batch-progress="" className="space-y-1">
                              <div className="whitespace-nowrap text-meta text-foreground">{progress}</div>
                              <PaceBar value={row.counts.total > 0 ? row.counts.disposed / row.counts.total : 0} pace={null} label={progress} behind={false} />
                            </div>
                          </DataTableCell>
                          <DataTableCell align="right" sticky="right">
                            <RowActions
                              code={row.batchNo}
                              menuLabel={tCommon("moreActionsFor", { code: row.batchNo })}
                              next={{ label: t("openBatch"), href, icon: <FolderOpen aria-hidden="true" /> }}
                              groups={[]}
                            />
                          </DataTableCell>
                        </ClickableTableRow>
                      )
                    })}
                  </DataTableBody>
                </DataTable>
              </>
            )}
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
        </>
      )}
    </div>
  )
}
