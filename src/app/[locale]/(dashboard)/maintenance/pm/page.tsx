import type { ComponentProps } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { CalendarClock, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { cn, formatDate } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { getAssetStateTone, getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { bangkokDayDiff } from "@/lib/preventive-maintenance"
import { buildPmPlanHref, parsePmPlanQuery, pmPlanSearchMaxLength, pmPlanTabs, type PmPlanRowView } from "@/lib/pm-plan-list"
import { readPmPlanPage } from "@/lib/pm-plan-page-data"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { FilterChipList } from "@/components/ui/filter-chips"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { MaintenancePlanRowActions } from "@/components/maintenance/maintenance-plan-row-actions"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The due cells, in the words of the plan-1 due states (spec §9).
const dueBuckets = ["overdue", "soon", "later"] as const
const dueCellLabels = { overdue: "overdue", soon: "due_soon", later: "upcoming" } as const

// แผนบำรุงรักษาตามรอบ (PM) (group 5 spec §9, plan 4 Task 3): one state per tab, a search over the plan and its asset,
// the due cells on the active tab, the table (phone cards below md) and paging.
export default async function MaintenancePlansPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = parsePmPlanQuery(await searchParams)
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const [t, tRecord, tCommon] = await Promise.all([getTranslations("maintenancePage"), getTranslations("repairRecord"), getTranslations("common")])
  const now = new Date()
  // The list URL keeps the tab, the search and the due filter; the default page and page size stay out of it (spec 2B
  // B4). Every link of a row brings the person back to this page as it is.
  const listHref = (next: { page?: number; pageSize?: number }) => buildPmPlanHref(locale, query, next)
  const returnTo = listHref({ page: query.page })

  // One state per page, in that state's order (G5P4-R4), with the open repair record of each plan's asset (G5P4-R5).
  // The tab counts and the due cells follow the search (G5P4-R1).
  const { rows: plans, total, tabCounts, due, allPlansCount } = await readPmPlanPage(prisma, query, now)
  // A page past the last one (an old or hand-typed link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, query.pageSize)
  if (plans.length === 0 && total > 0 && query.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: query.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(query.page, query.pageSize, total)
  // เพิ่มแผน PM (the header and the empty state) brings the person back to this page as it is, like the row links.
  const createHref = appendOperationalReturnTo(`/${locale}/maintenance/pm/new`, returnTo)
  const clearHref = buildPmPlanHref(locale, query, { q: "", due: null })
  const showActions = query.tab !== "ended"

  // The sum under the cells, with the active plans of written-off or inactive assets the cells leave out (G5P4-R3).
  const dueSum = due
    ? [
        t("pmDueSum", { overdue: formatCount(due.overdue.count), soon: formatCount(due.soon.count), later: formatCount(due.later.count), total: due.total }),
        due.outOfScope > 0 ? t("pmDueOutOfScope", { count: due.outOfScope }) : null,
      ].filter(Boolean).join(" ")
    : ""
  const dueItems: StatStripItem[] = due
    ? dueBuckets.map((bucket) => ({
        key: bucket,
        label: t(`pmDueState.${dueCellLabels[bucket]}`),
        value: formatCount(due[bucket].count),
        // A cell in use links back to the list without the filter (G5P4-R2).
        href: buildPmPlanHref(locale, query, { due: bucket }),
        current: query.due === bucket,
        attention: bucket === "overdue" && due.overdue.count > 0,
        foot:
          bucket === "overdue"
            ? due.overdue.earliest ? t("pmDueCellOverdueFoot", { days: bangkokDayDiff(due.overdue.earliest, now) }) : undefined
            : bucket === "soon"
              ? due.soon.earliest ? t("pmDueCellSoonFoot", { date: formatDate(due.soon.earliest) }) : t("pmDueCellSoonWindow")
              : t("pmDueCellLaterFoot"),
        data: { "data-pm-due-cell": bucket },
      }))
    : []

  // No plans at all, no match for the search or filter, or an empty tab (spec §9).
  const emptyIcon = <CalendarClock />
  const createAction = canCreate ? { actionHref: createHref, actionLabel: t("pmCreateTitle") } : {}
  const emptyState: ComponentProps<typeof ActionEmptyState> =
    allPlansCount === 0
      ? { icon: emptyIcon, title: t("pmEmptyTitle"), description: t("pmEmptyHelp"), ...createAction }
      : query.q || query.due
        ? { icon: emptyIcon, title: t("pmEmptyFiltered"), actionHref: clearHref, actionLabel: tRecord("clearFilters"), actionVariant: "secondary" }
        : query.tab === "paused"
          ? { icon: emptyIcon, title: t("pmEmptyPaused") }
          : query.tab === "ended"
            ? { icon: emptyIcon, title: t("pmEmptyEnded") }
            : { icon: emptyIcon, title: t("pmEmptyTitle"), ...createAction }

  // The due column: the date and its badge on the active tab, the asset's status where the asset is written off or
  // inactive (G5P4-R3), the date alone for a paused plan and the day it ended for an ended one (decision 10.1).
  function dueCell(plan: PmPlanRowView) {
    const { due } = plan
    if (due.kind === "endedAt") return <span className="text-muted-foreground">{t("pmEndedAt", { date: formatDate(due.at) })}</span>
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="whitespace-nowrap text-foreground num">{formatDate(plan.nextDueDate)}</span>
        {due.kind === "badge" ? <StatusBadge label={t(`pmDue.${due.badge.key}`, { days: due.badge.days })} tone={due.badge.tone} /> : null}
        {due.kind === "assetStatus" ? <StatusBadge label={due.statusLabel} tone={getAssetStateTone(due.statusName)} /> : null}
      </div>
    )
  }

  function planTitle(plan: PmPlanRowView, editHref: string | null) {
    return editHref ? (
      <Link href={editHref} className={cn(linkVariants({ size: "inherit" }), "font-medium text-foreground")}>
        {plan.title}
      </Link>
    ) : (
      <span className="font-medium text-foreground">{plan.title}</span>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]}
        title={t("pmTitle")}
        meta={<span>{t("pmSubtitle")} {t("pmPlanCount", { count: allPlansCount })}</span>}
        back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />}
        actions={
          canCreate ? (
            <Link href={createHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("pmCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <TabNav
          data-pm-tabs
          aria-label={tCommon("status")}
          items={pmPlanTabs.map((tab) => ({ key: tab, label: t(`pmPlanStates.${tab}`), count: formatCount(tabCounts[tab]), href: buildPmPlanHref(locale, query, { tab }) }))}
          current={query.tab}
        />
        <form role="search" action={`/${locale}/maintenance/pm`} className="max-w-md">
          {query.tab !== "active" ? <input type="hidden" name="state" value={query.tab} /> : null}
          {query.due ? <input type="hidden" name="due" value={query.due} /> : null}
          {query.pageSize !== LIST_PAGE_SIZES[0] ? <input type="hidden" name="pageSize" value={query.pageSize} /> : null}
          <SearchField name="q" defaultValue={query.q} aria-label={tCommon("search")} placeholder={t("pmSearchPlaceholder")} maxLength={pmPlanSearchMaxLength} />
        </form>
        {query.tab === "active" && due ? (
          <div>
            <StatStrip
              items={dueItems}
            />
            <p data-pm-due-sum className="mt-2 text-meta text-muted-foreground">{dueSum}</p>
          </div>
        ) : null}
        {query.due === "week" ? (
          <FilterChipList
            label={tRecord("activeFilters")}
            removeLabel={tRecord("clearFilters")}
            chips={[{ key: "due", label: t("pmDueWeekChip"), href: buildPmPlanHref(locale, query, { due: null }) }]}
          />
        ) : null}
      </div>

      <ContentPanel divided flush className="overflow-hidden">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {plans.length === 0 ? (
            <ActionEmptyState {...emptyState} />
          ) : (
            plans.map((plan) => {
              const editHref = canEdit && plan.planState !== "ended" ? appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, returnTo) : null
              return (
                <article key={plan.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="text-sm">{planTitle(plan, editHref)}</div>
                  <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{plan.planNo}</span></div>
                  <div className="mt-2 text-meta text-muted-foreground">
                    {plan.assetName} · <span className="tag">{plan.assetTag}</span>
                  </div>
                  <div className="mt-2 text-sm">{dueCell(plan)}</div>
                  {showActions ? (
                    <div className="mt-3">
                      <MaintenancePlanRowActions plan={plan} locale={locale} returnTo={returnTo} canCreate={canCreate} canEdit={canEdit} openRecord={plan.openRecord} assetOut={plan.due.kind === "assetStatus"} />
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("pmTitle")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("pmColumnPlan")}</DataTableHead>
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("pmFrequencyLabel")}</DataTableHead>
              <DataTableHead>{t("pmNextDueDate")}</DataTableHead>
              <DataTableHead>{t("pmExternalProvider")}</DataTableHead>
              {showActions ? <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead> : null}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {plans.length === 0 ? (
              <TableEmptyRow colSpan={showActions ? 6 : 5} emptyState={emptyState} />
            ) : (
              plans.map((plan) => {
                // The title and the row open the edit page on the active and paused tabs, with edit (G5P4-R7).
                const editHref = canEdit && plan.planState !== "ended" ? appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, returnTo) : null
                const rowData = { "data-pm-plan-row": plan.id } as const
                const cells = (
                  <>
                    <DataTableCell className="min-w-56">
                      {planTitle(plan, editHref)}
                      <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{plan.planNo}</span></div>
                    </DataTableCell>
                    <DataTableCell className="min-w-48">
                      <div className="text-foreground">{plan.assetName}</div>
                      <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{plan.assetTag}</span></div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Chip>{t(`pmFrequencies.${plan.frequency}`)}</Chip>
                    </DataTableCell>
                    <DataTableCell className="min-w-44">{dueCell(plan)}</DataTableCell>
                    <DataTableCell className="min-w-40">
                      {plan.vendor ? (
                        <>
                          <div className="text-foreground">{plan.vendor.name}</div>
                          <div className="mt-1 text-meta text-muted-foreground"><span className="tag">{plan.vendor.code}</span></div>
                        </>
                      ) : (
                        <Nil />
                      )}
                    </DataTableCell>
                    {showActions ? (
                      <DataTableCell align="right" sticky="right">
                        <MaintenancePlanRowActions plan={plan} locale={locale} returnTo={returnTo} canCreate={canCreate} canEdit={canEdit} openRecord={plan.openRecord} assetOut={plan.due.kind === "assetStatus"} />
                      </DataTableCell>
                    ) : null}
                  </>
                )
                return editHref ? (
                  <ClickableTableRow key={plan.id} href={editHref} label={`${tCommon("edit")}: ${plan.title}`} rowData={rowData}>
                    {cells}
                  </ClickableTableRow>
                ) : (
                  <DataTableRow key={plan.id} {...rowData}>
                    {cells}
                  </DataTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
        {total > 0 ? (
          <DataTableFoot>
            <p className="mb-2">{t("pmNoVendorNote")}</p>
            <Pagination
              page={query.page}
              totalPages={totalPages}
              previousHref={listHref({ page: query.page - 1, pageSize: query.pageSize })}
              nextHref={listHref({ page: query.page + 1, pageSize: query.pageSize })}
              pageSize={query.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: query.page, total: totalPages }),
                range: `${t("pmRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) })} · ${t(query.tab === "ended" ? "pmOrderByEnded" : "pmOrderByDue")}`,
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </ContentPanel>
    </div>
  )
}
