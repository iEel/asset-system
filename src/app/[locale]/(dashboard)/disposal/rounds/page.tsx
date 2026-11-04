import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FolderOpen, Layers } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount, formatMoney } from "@/lib/display-format"
import { readDisposalRoundList } from "@/lib/disposal-round-page-data"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { cn, formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"

type DisposalRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

// The rounds list (DP-Batches look, group 6 spec §11.4): newest first, searched by the round number, the document, the
// buyer and the machines; paging 25/50/100 and phone cards. A round is always complete, so it has no progress column.
export default async function DisposalRoundsPage({ params, searchParams }: DisposalRoundsPageProps) {
  const { locale } = await params
  const raw = await searchParams
  await requirePagePermission(locale, "disposal", "view")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const search = ((Array.isArray(raw.search) ? raw.search[0] : raw.search) ?? "").trim().slice(0, 100)
  const listPage = parseListPage({ page: raw.page, pageSize: raw.pageSize })
  const basePath = `/${locale}/disposal/rounds`
  // The list URL with its search, page and page size; the defaults stay out of it.
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (search) query.set("search", search)
    const text = appendListPage(query, next).toString()
    return text ? `${basePath}?${text}` : basePath
  }

  const { rows, total } = await readDisposalRoundList(prisma, {
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
  const roundHref = (id: string) => `/${locale}/disposal/rounds/${id}`
  const money = (value: number | null) => (value == null ? null : formatMoney(value, { unit: tCommon("baht") }))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: t("rounds.listTitle") }]}
        title={t("rounds.listTitle")}
        meta={t("rounds.listHelp")}
        back={<PageBackLink href={`/${locale}/disposal`} label={t("rounds.backToQueue")} />}
      />

      {total === 0 && !search ? (
        <ActionEmptyState
          icon={<Layers className="h-6 w-6" />}
          title={t("rounds.emptyTitle")}
          description={t("rounds.emptyHelp")}
          actionHref={`/${locale}/disposal?status=approved`}
          actionLabel={t("rounds.emptyAction")}
        />
      ) : (
        <ContentPanel divided flush>
          <form action={basePath} method="get" role="search" className="flex flex-wrap items-center gap-2 p-4">
            <SearchField
              name="search"
              defaultValue={search}
              maxLength={100}
              aria-label={t("rounds.searchLabel")}
              placeholder={t("rounds.searchPlaceholder")}
              className="w-full sm:w-96"
            />
            <input type="hidden" name="pageSize" value={listPage.pageSize} />
            <Button type="submit" variant="outline">{t("rounds.searchSubmit")}</Button>
            {search ? <Link href={basePath} className={linkVariants({ size: "inherit" })}>{t("clearFilters")}</Link> : null}
          </form>
          {rows.length === 0 ? (
            <EmptyNote padded>{t("rounds.searchEmpty")}</EmptyNote>
          ) : (
            <>
              <ContentPanelRows className="md:hidden">
                {rows.map((row) => (
                  <li key={row.id}>
                    <article>
                      <Link href={roundHref(row.id)} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm font-medium text-foreground [overflow-wrap:anywhere]")}>
                        {row.title}
                      </Link>
                      <p className="text-meta text-muted-foreground">
                        <span className="tag">{row.roundNo}</span> · {t(`types.${row.disposalType}`)} · {formatDate(row.executionDate)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground [overflow-wrap:anywhere]">{row.recipientName ?? "–"}</span>
                        {row.saleValue != null ? <span className="num font-medium text-foreground">{money(row.saleValue)}</span> : null}
                      </div>
                      <Link href={roundHref(row.id)} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>{t("rounds.openRound")}</Link>
                    </article>
                  </li>
                ))}
              </ContentPanelRows>
              <DataTable framed={false} className="hidden md:block" caption={t("rounds.listTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("rounds.colRound")}</DataTableHead>
                    <DataTableHead>{t("rounds.colMachines")}</DataTableHead>
                    <DataTableHead>{t("rounds.colMethod")}</DataTableHead>
                    <DataTableHead>{t("rounds.colRecipient")}</DataTableHead>
                    <DataTableHead>{t("rounds.colDate")}</DataTableHead>
                    <DataTableHead align="right">{t("rounds.colSaleValue")}</DataTableHead>
                    <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {rows.map((row) => {
                    const href = roundHref(row.id)
                    return (
                      <ClickableTableRow key={row.id} href={href} label={`${t("rounds.openRound")}: ${row.roundNo}`}>
                        <DataTableCell className="whitespace-nowrap"><span className="tag font-medium text-foreground">{row.roundNo}</span></DataTableCell>
                        <DataTableCell className="min-w-56">
                          <div className="font-medium text-foreground [overflow-wrap:anywhere]">{row.title}</div>
                          <div className="text-meta text-muted-foreground">{t("rounds.machineCount", { count: row.machineCount })}</div>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">{t(`types.${row.disposalType}`)}</DataTableCell>
                        <DataTableCell className="min-w-40 text-muted-foreground [overflow-wrap:anywhere]">{row.recipientName ?? "–"}</DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.executionDate)}</DataTableCell>
                        <DataTableCell align="right" className="whitespace-nowrap"><span className="num">{money(row.saleValue) ?? "–"}</span></DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <RowActions
                            code={row.roundNo}
                            menuLabel={tCommon("moreActionsFor", { code: row.roundNo })}
                            next={{ label: t("rounds.openRound"), href, icon: <FolderOpen aria-hidden="true" /> }}
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
      )}
    </div>
  )
}
