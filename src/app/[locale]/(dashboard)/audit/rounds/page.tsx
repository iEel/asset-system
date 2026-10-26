import Link from "next/link"
import { Fragment, type ReactNode } from "react"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Eye, ListChecks, Plus, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate } from "@/lib/utils"
import { toDisplayYear } from "@/lib/display-year"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterChipList } from "@/components/ui/filter-chips"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PaceBar } from "@/components/ui/pace-bar"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { toneIcons } from "@/components/ui/tone-icons"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount, formatPercent } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import {
  auditRoundCoverageWhere,
  auditRoundStatusLabelKey,
  effectiveAuditRoundStatus,
  isAuditRoundOperationalStatus,
} from "@/lib/audit-round-status"
import { getAuditRoundCounts } from "@/lib/audit-round-counts"
import { type AuditRoundCounts, withAuditRoundOwnItems } from "@/lib/audit-round-counts-rules"
import { openAuditFindingActionStatuses } from "@/lib/audit-finding-filters"
import {
  auditRoundTabOf,
  auditRoundTabs,
  bangkokYear,
  buildAuditRoundDueLine,
  buildAuditRoundInsights,
  buildAuditRoundNextStep,
  buildAuditRoundProgress,
  buildAuditRoundScopeParts,
  buildAuditRoundSearchWhere,
  buildAuditRoundsHref,
  emptyAuditRoundListInsight,
  filterRoundsByView,
  foldAuditRoundFindingWork,
  isAuditRoundAwaitingDecision,
  isAuditRoundWorkView,
  parseAuditRoundView,
  sumAuditRoundWork,
  type AuditRoundDueLine,
  type AuditRoundListInsight,
  type AuditRoundProgress,
  type AuditRoundScopeKey,
  type AuditRoundScopeSource,
  type AuditRoundStepKey,
  type AuditRoundStepLink,
  type AuditRoundTab,
  type AuditRoundView,
} from "@/lib/audit-rounds-list-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"

const WarningIcon = toneIcons.warning

type AuditRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; view?: string; page?: string | string[]; pageSize?: string | string[] }>
}

type CoverageAsset = {
  id: string
  categoryId: string
  departmentId: string | null
  category: { code: string; name: string }
  department: { code: string; name: string } | null
}

type CoverageGap = {
  id: string
  label: string
  href?: string
  total: number
  covered: number
  missing: number
  percent: number
}

type ActionPanelItem = {
  label: string
  help: string
  count: number
  href?: string
  tone: "primary" | "warning" | "success"
}

// Every scope condition of a round (group 2 spec §6, §13 bug 3), as AuditRoundScopeSource needs them.
const auditRoundListInclude = {
  scopeCompany: { select: { code: true, nameTh: true } },
  scopeBranch: { select: { code: true, name: true } },
  scopeDepartment: { select: { code: true, name: true } },
  scopeLocation: { select: { code: true, name: true } },
  scopeCategory: { select: { code: true, name: true } },
  scopeCustodian: { select: { code: true, fullNameTh: true } },
  scopeStatus: { select: { name: true, nameTh: true } },
  scopeCondition: { select: { name: true, nameTh: true } },
} satisfies Prisma.AuditRoundInclude

export default async function AuditRoundsPage({ params, searchParams }: AuditRoundsPageProps) {
  const { locale } = await params
  const { search = "", view, page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  // A view-only role is offered no create or scan link (their pages need audit:create and audit:edit; the E2E suite's M5).
  const canCreateRound = hasPermission(user, "audit", "create")
  const canScan = hasPermission(user, "audit", "edit")
  // The close action's permission (`api/audit-rounds/[id]/route.ts`).
  const canClose = hasPermission(user, "audit", "approve")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const tPending = await getTranslations("auditPending")
  const searchText = search.trim()
  const activeView = parseAuditRoundView(view)
  const activeTab = auditRoundTabOf(activeView)
  const listPage = parseListPage({ page, pageSize })
  // The coverage year is the Bangkok year (spec §5 Dates), whatever the server's time zone.
  const now = new Date()
  const currentYear = bangkokYear(now)
  const today = startOfBangkokDay(now)
  const [allRounds, matchedRounds, activeAssets, coveredItems, currentYearRoundCount] = await withPerformanceTiming(
    "audit-rounds.initial-data",
    () => Promise.all([
      // Every round, unsearched: the strip "งานที่ต้องทำต่อ" and the coverage's open work are round-wide (group 2 R1).
      prisma.auditRound.findMany({
        where: { isActive: true },
        include: auditRoundListInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      // The search narrows the tabs and the table only, so it reads ids.
      searchText ? prisma.auditRound.findMany({ where: { isActive: true, ...buildAuditRoundSearchWhere(searchText) }, select: { id: true } }) : null,
      prisma.asset.findMany({
        where: { isActive: true },
        select: {
          id: true,
          categoryId: true,
          departmentId: true,
          category: { select: { code: true, name: true } },
          department: { select: { code: true, name: true } },
        },
      }),
      // Coverage counts own items only (group 2 R6): an out-of-scope find never covers an asset.
      prisma.auditItem.findMany({
        where: withAuditRoundOwnItems({ auditRound: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } }),
        distinct: ["assetId"],
        select: { assetId: true },
      }),
      prisma.auditRound.count({ where: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } }),
    ]),
    { route: "/audit/rounds", locale, view: activeView, hasSearch: Boolean(searchText) }
  )
  const matchedRoundIds = new Set(matchedRounds?.map((round) => round.id))
  const rounds = matchedRounds ? allRounds.filter((round) => matchedRoundIds.has(round.id)) : allRounds
  const roundIds = allRounds.map((round) => round.id)
  const [countsByRoundId, findingWorkRows, outOfScopeWorkCounts] = roundIds.length
    ? await withPerformanceTiming(
        "audit-rounds.progress-data",
        () => Promise.all([
          // The round's own items, out-of-scope finds apart (group 2 spec §5 "What a round counts").
          getAuditRoundCounts(roundIds),
          // Pending decisions and open action plans (done included), as the close API counts them (R2, R3).
          prisma.auditFinding.groupBy({
            by: ["auditRoundId", "reviewStatus", "actionStatus"],
            where: {
              auditRoundId: { in: roundIds },
              OR: [{ reviewStatus: "pending" }, { actionStatus: { in: [...openAuditFindingActionStatuses] } }],
            },
            _count: { _all: true },
          }),
          // Out-of-scope finds stay from scan history in plan 1, like the round page's list they open (R4).
          prisma.auditScanHistory.groupBy({
            by: ["auditRoundId"],
            where: { auditRoundId: { in: roundIds }, auditItemId: null },
            _count: { _all: true },
          }),
        ]),
        { route: "/audit/rounds", locale, roundCount: roundIds.length }
      )
    : ([new Map<string, AuditRoundCounts>(), [], []] as const)
  const findingWorkByRoundId = foldAuditRoundFindingWork(
    findingWorkRows.map((row) => ({ auditRoundId: row.auditRoundId, reviewStatus: row.reviewStatus, actionStatus: row.actionStatus, count: row._count._all })),
  )
  const outOfScopeByRoundId = new Map(outOfScopeWorkCounts.map((row) => [row.auditRoundId, row._count._all]))
  const insightsByRoundId = buildAuditRoundInsights(allRounds, countsByRoundId, findingWorkByRoundId, outOfScopeByRoundId)
  const insightOf = (round: { id: string }): AuditRoundListInsight => insightsByRoundId.get(round.id) ?? emptyAuditRoundListInsight
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  // Real pages (spec 2B B4, §5.9.2 row 7, I21): the view filters and the tab counts need the insight of every round,
  // so the query stays whole and the page is a slice of filteredRounds. The total is known before the cut, so a page
  // past the last one is clamped to the last page instead of redirecting.
  const roundPage = { page: Math.min(listPage.page, lastListPage(filteredRounds.length, listPage.pageSize)), pageSize: listPage.pageSize }
  const { skip, take } = listPageWindow(roundPage)
  const pageRounds = filteredRounds.slice(skip, skip + take)
  const { start, end, totalPages } = paginationRange(roundPage.page, roundPage.pageSize, filteredRounds.length)
  // The strip and the coverage's open work: every open round, unsearched (R1). Each strip count is the list it opens.
  const operationalRounds = allRounds.filter((round) => isAuditRoundOperationalStatus(round.status))
  const openWork = sumAuditRoundWork(operationalRounds.map(insightOf))
  const pendingRounds = filterRoundsByView(allRounds, insightsByRoundId, "pending")
  const readyRounds = filterRoundsByView(allRounds, insightsByRoundId, "readyToClose")
  const viewLabels: Record<AuditRoundView, string> = {
    open: t("viewOpen"),
    closed: t("viewClosed"),
    cancelled: t("viewCancelled"),
    all: t("viewAll"),
    pending: t("viewPending"),
    review: t("viewReview"),
    readyToClose: t("viewReadyToClose"),
  }
  const scopeLabels: Record<AuditRoundScopeKey, string> = {
    company: t("scopeCompany"), branch: t("scopeBranch"), department: t("scopeDepartment"), location: t("scopeLocation"),
    category: t("scopeCategory"), custodian: t("scopeCustodian"), status: t("scopeStatus"), condition: t("scopeCondition"),
  }
  // The round detail and scan pages bring the user back to this page and page size (B4 returnTo).
  const auditRoundsReturnHref = buildAuditRoundsHref(locale, activeView, searchText, roundPage)
  // The status tabs (group 2 spec §6): their counts follow the search, like the table (R1).
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const statusTabs = auditRoundTabs.map((value) => ({
    value,
    label: viewLabels[value],
    count: filterRoundsByView(rounds, insightsByRoundId, value).length,
    href: buildAuditRoundsHref(locale, value, searchText, { pageSize: listPage.pageSize }),
  }))
  const clearSearchHref = buildAuditRoundsHref(locale, activeView, "", { pageSize: listPage.pageSize })
  const actionItems: ActionPanelItem[] = [
    {
      label: t("actionContinueScan"),
      help: t("actionContinueScanHelp", { count: formatCount(pendingRounds.length) }),
      count: openWork.pending,
      // The work view carries no search: the strip is round-wide (R1, R31).
      href: canScan && pendingRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${pendingRounds[0].id}/scan`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "pending", "", { pageSize: listPage.pageSize }),
      tone: "primary",
    },
    {
      label: t("actionReviewFindings"),
      help: t("actionReviewFindingsHelp"),
      count: openWork.pendingReview,
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending`, auditRoundsReturnHref),
      tone: "warning",
    },
    {
      // Open action plans apart from the decisions (R3, R28): the reason a reviewed round cannot close yet.
      label: t("actionOpenActions"),
      help: t("actionOpenActionsHelp"),
      count: openWork.openActions,
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=action_open`, auditRoundsReturnHref),
      tone: "primary",
    },
    {
      label: t("actionCloseReadyRounds"),
      help: t("actionCloseReadyRoundsHelp"),
      count: readyRounds.length,
      // No link at 0: the cell is plain (R8).
      href: readyRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${readyRounds[0].id}`, auditRoundsReturnHref) : undefined,
      tone: "success",
    },
  ]
  const coveredAssetIds = new Set(coveredItems.map((item) => item.assetId))
  const coveredAssetCount = activeAssets.filter((asset) => coveredAssetIds.has(asset.id)).length
  const uncoveredAssetCount = Math.max(activeAssets.length - coveredAssetCount, 0)
  const categoryGaps = buildCoverageGaps(
    activeAssets,
    coveredAssetIds,
    (asset) => ({
      id: asset.categoryId,
      label: `${asset.category.code} - ${asset.category.name}`,
      href: `/${locale}/assets?categoryId=${asset.categoryId}`,
    }),
  )
  const departmentGaps = buildCoverageGaps(
    activeAssets,
    coveredAssetIds,
    (asset) => ({
      id: asset.departmentId ?? "unassigned",
      label: asset.department ? `${asset.department.code} - ${asset.department.name}` : t("coverageUnassigned"),
    }),
  )

  const coverageShare = activeAssets.length > 0 ? coveredAssetCount / activeAssets.length : 0
  const coverageLine = t("coverageLine", { covered: formatCount(coveredAssetCount), total: formatCount(activeAssets.length), missing: formatCount(uncoveredAssetCount) })
  // A work view from a strip cell (รอตรวจ / รอพิจารณา / ปิดรอบได้) shows as a removable chip under the
  // กำลังดำเนินการ tab; removing it keeps the search (group 2 spec §6).
  const workViewChips = isAuditRoundWorkView(activeView)
    ? [{ key: activeView, label: viewLabels[activeView], href: buildAuditRoundsHref(locale, "open", searchText, { pageSize: listPage.pageSize }) }]
    : []
  // The label holds the count, so the link's name is whole (group 2 spec §6).
  const stepLabel = (link: AuditRoundStepLink): string => {
    const count = formatCount(link.count ?? 0)
    switch (link.key) {
      case "walk":
        return t("nextStepContinueScan", { count })
      case "pendingList":
        return `${t("roundActionPending")} ${count}`
      case "review":
        return t("nextStepReview", { count })
      case "actions":
        return t("nextStepActions", { count })
      case "close":
        return t("closeRound")
      case "outOfScope":
        return `${t("roundActionOutOfScope")} ${count}`
    }
  }
  // A row of the list, for the phone card and the table alike (group 2 spec §6).
  const describeRound = (round: (typeof rounds)[number]) => {
    const insight = insightOf(round)
    const detailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
    const step = buildAuditRoundNextStep({ locale, roundId: round.id, insight, canScan, canClose, returnTo: auditRoundsReturnHref })
    const more = step.more.map((link) => ({ key: link.key, label: stepLabel(link), href: link.href }))
    return {
      insight,
      detailHref,
      due: buildAuditRoundDueLine(round.status, round.endDate, today),
      progress: buildAuditRoundProgress(insight),
      nextStep: {
        main: step.main ? { label: stepLabel(step.main), href: step.main.href } : null,
        second: step.second ? (step.second.key === "review" ? t("blockedPendingReview", { count: formatCount(step.second.count) }) : t("openActionsCount", { count: formatCount(step.second.count) })) : null,
        outOfScope: step.outOfScope ? { label: stepLabel(step.outOfScope), href: step.outOfScope.href } : null,
      },
      more,
      groups: [{ key: "round", items: [
        ...more.map((link) => ({ kind: "link" as const, key: link.key, label: link.label, href: link.href, icon: roundStepIcons[link.key] })),
        { kind: "link" as const, key: "view", label: tCommon("view"), href: detailHref, icon: <Eye aria-hidden="true" /> },
      ] }] satisfies RowActionGroup[],
    }
  }
  const badgeLabels = (status: string) => ({ status: getAuditRoundStatusLabel(status, t), pendingReview: t("pendingReview"), ready: t("readyToClose") })
  const dueLabels = { left: (days: number) => t("daysLeft", { days: formatCount(days) }), overdue: (days: number) => t("daysOverdue", { days: formatCount(days) }) }
  const progressText = (insight: AuditRoundListInsight, progress: AuditRoundProgress) =>
    t("progressLine", { checked: formatCount(insight.checked), total: formatCount(insight.total), percent: formatPercent(progress.percent / 100) })
  const progressBarText = (insight: AuditRoundListInsight) => t("progressBarLabel", { checked: formatCount(insight.checked), total: formatCount(insight.total) })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("roundCount", { count: formatCount(filteredRounds.length) })}
        actions={canCreateRound ? (
          <Link href={`/${locale}/audit/rounds/new`} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {t("createTitle")}
          </Link>
        ) : undefined}
      />

      <ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />

      <div className="space-y-3">
        <QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />
        <FilterChipList chips={workViewChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />
      </div>

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        {/* The table's top bar (group 2 spec §6): the search. MasterDataSearch's mb-4 is the bar's bottom space. */}
        <div className="border-b border-border-soft px-4 pt-4">
          <MasterDataSearch
            action={`/${locale}/audit/rounds`}
            defaultValue={searchText}
            placeholder={t("searchRounds")}
            submitLabel={tCommon("search")}
            hiddenInputs={{ ...(activeView === "open" ? {} : { view: activeView }), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
          />
        </div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {pageRounds.length === 0 ? (
            <EmptyNote padded>{tCommon("noData")}</EmptyNote>
          ) : (
            pageRounds.map((round) => {
              const row = describeRound(round)

              return (
                <article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={row.detailHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                        <span className="tag font-medium">{round.auditNo}</span>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <RoundStatusBadges status={round.status} insight={row.insight} labels={badgeLabels(round.status)} />
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "scope", label: t("scope"), value: <>{formatScope(round, t("all"), scopeLabels)}{" · "}{t("itemCount", { count: formatCount(row.insight.total) })}</> },
                      { key: "dateRange", label: t("dateRange"), value: <RoundDates start={round.startDate} end={round.endDate} due={row.due} labels={dueLabels} /> },
                      { key: "progress", label: t("progress"), value: <RoundProgress progress={row.progress} text={progressText(row.insight, row.progress)} barLabel={progressBarText(row.insight)} notStarted={t("notStarted")} /> },
                    ]}
                  />
                  <div className="mt-3"><RoundNextStep {...row.nextStep} /></div>
                  <RoundWorkflowLinks links={row.more} />
                  <Link href={row.detailHref} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>
                    <Eye aria-hidden="true" />
                    {tCommon("view")}
                  </Link>
                </article>
              )
            })
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("round")}</DataTableHead>
              <DataTableHead>{t("scope")}</DataTableHead>
              <DataTableHead>{t("dateRange")}</DataTableHead>
              <DataTableHead>{t("progress")}</DataTableHead>
              <DataTableHead>{t("status")}</DataTableHead>
              <DataTableHead>{t("nextStep")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {pageRounds.length === 0 ? (
              searchText ? (
                <TableEmptyRow
                  colSpan={7}
                  emptyState={{ title: tCommon("noData"), actionHref: clearSearchHref, actionLabel: tPending("clearSearch"), actionVariant: "secondary" }}
                />
              ) : (
                <TableEmptyRow colSpan={7}>{tCommon("noData")}</TableEmptyRow>
              )
            ) : (
              pageRounds.map((round) => {
                const row = describeRound(round)

                return (
                  <ClickableTableRow
                    key={round.id}
                    href={row.detailHref}
                    label={`${tCommon("view")}: ${round.auditNo}`}
                  >
                    <DataTableCell className="min-w-56">
                      <Link href={row.detailHref} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>{round.name}</Link>
                      <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag">{round.auditNo}</span></div>
                    </DataTableCell>
                    <DataTableCell className="min-w-64 text-muted-foreground">
                      {formatScope(round, t("all"), scopeLabels)}{" · "}{t("itemCount", { count: formatCount(row.insight.total) })}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground"><RoundDates start={round.startDate} end={round.endDate} due={row.due} labels={dueLabels} /></DataTableCell>
                    <DataTableCell className="min-w-44"><RoundProgress progress={row.progress} text={progressText(row.insight, row.progress)} barLabel={progressBarText(row.insight)} notStarted={t("notStarted")} /></DataTableCell>
                    <DataTableCell className="whitespace-nowrap"><RoundStatusBadges status={round.status} insight={row.insight} labels={badgeLabels(round.status)} /></DataTableCell>
                    <DataTableCell className="min-w-44">
                      <RoundNextStep {...row.nextStep} />
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={round.auditNo}
                        name={round.name}
                        menuLabel={tCommon("moreActionsFor", { code: round.auditNo })}
                        next={undefined}
                        groups={row.groups}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
        {filteredRounds.length > 0 ? (
          <DataTableFoot>
            <Pagination
              page={roundPage.page}
              totalPages={totalPages}
              previousHref={buildAuditRoundsHref(locale, activeView, searchText, { page: roundPage.page - 1, pageSize: roundPage.pageSize })}
              nextHref={buildAuditRoundsHref(locale, activeView, searchText, { page: roundPage.page + 1, pageSize: roundPage.pageSize })}
              pageSize={roundPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: buildAuditRoundsHref(locale, activeView, searchText, { pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: roundPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(filteredRounds.length) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </div>

      {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). Folded to one line (group 2 spec §6). */}
      <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 md:min-h-0">
          <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}</h2>
          <span className="block w-full sm:w-48"><PaceBar value={coverageShare} pace={null} label={coverageLine} behind={false} /></span>
          <span className="num text-sm font-semibold text-foreground">{formatPercent(coverageShare)}</span>
          <span className="num text-sm text-muted-foreground">{coverageLine}</span>
          <span className={cn(linkVariants({ size: "inherit" }), "text-sm sm:ms-auto")}>{t("coverageBreakdown")}</span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-border-soft pt-4">
          <p className="text-sm text-muted-foreground">{t("coverageHelp")}</p>
          <p className="text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="num font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span>
          </p>
          <StatStrip
            items={[
              { key: "activeAssets", label: t("coverageActiveAssets"), value: formatCount(activeAssets.length) },
              { key: "covered", label: t("coverageCoveredThisYear"), value: formatCount(coveredAssetCount) },
              { key: "uncovered", label: t("coverageUncoveredThisYear"), value: formatCount(uncoveredAssetCount) },
              { key: "openPendingItems", label: t("coverageOpenPendingItems"), value: formatCount(openWork.pending), foot: t("coverageOpenChecked", { count: formatCount(openWork.checked) }) },
              { key: "openPendingReview", label: t("coverageOpenPendingReview"), value: formatCount(openWork.pendingReview) },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <CoverageGapList
              title={t("coverageByCategory")}
              help={t("coverageGapHelp")}
              rows={categoryGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
                scrollHint: tCommon("tableScrollHint"),
              }}
            />
            <CoverageGapList
              title={t("coverageByDepartment")}
              help={t("coverageGapHelp")}
              rows={departmentGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
                scrollHint: tCommon("tableScrollHint"),
              }}
            />
          </div>
        </div>
      </details>
    </div>
  )
}

function ActionPanel({ title, help, actions }: { title: string; help: string; actions: ActionPanelItem[] }) {
  return (
    <section aria-labelledby="audit-round-next-actions-title" className="space-y-3">
      <div>
        <h2 id="audit-round-next-actions-title" className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{help}</p>
      </div>
      <StatStrip
        items={actions.map((action) => ({
          key: action.label,
          label: action.label,
          value: formatCount(action.count),
          href: action.href,
          foot: action.help,
          footTitle: action.help,
          attention: action.tone === "warning" && action.count > 0,
        }))}
      />
    </section>
  )
}

// A thin wrapper of TabNav (spec 2B I20): the quick filters change the URL, so they are link tabs with counts. TabNav
// sets aria-current on the selected tab and passes scroll={false} to Link, so the page stays where it is.
function QuickFilterBar({
  title,
  current,
  filters,
}: {
  title: string
  current: AuditRoundTab
  filters: Array<{ value: AuditRoundTab; label: string; count: number; href: string }>
}) {
  // A work view keeps the กำลังดำเนินการ tab current (R31).
  return (
    <TabNav
      aria-label={title}
      items={filters.map((filter) => ({ key: filter.value, label: filter.label, count: formatCount(filter.count), href: filter.href }))}
      current={current}
      scroll={false}
    />
  )
}

// The phone card's extra next-step links (row.more, outline sm buttons). On desktop the same links sit in the row's ⋯ (RowActions groups).
function RoundWorkflowLinks({ links }: { links: Array<{ key: AuditRoundStepKey; label: string; href: string }> }) {
  if (links.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.key} href={link.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {roundStepIcons[link.key]}
          <span>{link.label}</span>
        </Link>
      ))}
    </div>
  )
}

// One status badge (group 2 spec §6, §14): a leftover draft reads เปิดตรวจ; a fully scanned round with decisions
// pending reads รอพิจารณา (computed, never stored); พร้อมปิดรอบ stays as a second badge.
function RoundStatusBadges({ status, insight, labels }: { status: string; insight: AuditRoundListInsight; labels: { status: string; pendingReview: string; ready: string } }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {isAuditRoundAwaitingDecision(insight) ? (
        <StatusBadge label={labels.pendingReview} tone="warning" />
      ) : (
        <StatusBadge label={labels.status} status={effectiveAuditRoundStatus(status)} />
      )}
      {insight.readyToClose ? <StatusBadge label={labels.ready} tone="success" /> : null}
    </div>
  )
}

// The dates, then days left (warning) or overdue (danger) on an open round, drawn with the page (group 2 spec §6).
function RoundDates({ start, end, due, labels }: { start: Date; end: Date; due: AuditRoundDueLine; labels: { left: (days: number) => string; overdue: (days: number) => string } }) {
  return (
    <>
      <span className="block whitespace-nowrap">{formatDate(start)} - {formatDate(end)}</span>
      {due ? <span className={cn("block text-meta", due.kind === "overdue" ? "text-danger" : "text-warning")}>{due.kind === "overdue" ? labels.overdue(due.days) : labels.left(due.days)}</span> : null}
    </>
  )
}

// Progress (group 2 spec §6): a PaceBar of the round's own items with "x / y · z%", or ยังไม่เริ่ม. No pace mark on
// the list, so the bar is never "behind" without the words DESIGN.md asks for.
function RoundProgress({ progress, text, barLabel, notStarted }: { progress: AuditRoundProgress; text: string; barLabel: string; notStarted: string }) {
  if (!progress.started) return <span className="text-muted-foreground">{notStarted}</span>
  return (
    <span className="block min-w-40 space-y-1">
      <PaceBar value={progress.value} pace={null} label={barLabel} behind={false} />
      <span className="block text-meta num text-muted-foreground">{text}</span>
    </span>
  )
}

// ขั้นถัดไป (group 2 spec §6, §13 bug 1): the main task as a link on line 1, wrapping, never cut; line 2 the second
// task in warning text with its icon (its link is in ⋯) and the out-of-scope link. Nothing to do: Nil.
function RoundNextStep({ main, second, outOfScope }: { main: { label: string; href: string } | null; second: string | null; outOfScope: { label: string; href: string } | null }) {
  if (!main && !second && !outOfScope) return <Nil />
  return (
    <div className="min-w-0 space-y-1">
      {main ? <Link href={main.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-start font-medium md:min-h-0")}>{main.label}</Link> : null}
      {second || outOfScope ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          {second ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <WarningIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {second}
            </span>
          ) : null}
          {outOfScope ? <Link href={outOfScope.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>{outOfScope.label}</Link> : null}
        </p>
      ) : null}
    </div>
  )
}

function CoverageGapList({
  title,
  help,
  rows,
  emptyLabel,
  labels,
}: {
  title: string
  help: string
  rows: CoverageGap[]
  emptyLabel: string
  labels: { group: string; missing: string; total: string; rate: string; scrollHint: string }
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-meta text-muted-foreground">{help}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyNote tone="clear">{emptyLabel}</EmptyNote>
      ) : (
        <>
          <div className="grid gap-2 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border bg-background p-3">
                <div className="break-words text-sm font-medium text-foreground">
                  {row.href ? (
                    <Link href={row.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-x-3">
                  <div className="min-w-0">
                    <dt className="text-meta text-faint-foreground">{labels.missing}</dt>
                    <dd className="text-sm num text-foreground">{formatCount(row.missing)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-meta text-faint-foreground">{labels.total}</dt>
                    <dd className="text-sm num text-foreground">{formatCount(row.total)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-meta text-faint-foreground">{labels.rate}</dt>
                    <dd className="text-sm num text-foreground">{`${formatCount(row.percent)}%`}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          {/* No frame of its own: the coverage panel is the frame (no frame in a frame). */}
          <DataTable framed={false} className="hidden sm:block" caption={title} scrollHint={labels.scrollHint}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.group}</DataTableHead>
                <DataTableHead align="right" className="whitespace-normal">{labels.missing}</DataTableHead>
                <DataTableHead align="right" className="whitespace-normal">{labels.total}</DataTableHead>
                <DataTableHead align="right" className="whitespace-normal">{labels.rate}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="min-w-44 font-medium text-foreground">
                    {row.href ? (
                      <Link href={row.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="font-semibold text-warning">{formatCount(row.missing)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.total)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.percent)}%</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </>
      )}
    </div>
  )
}

const roundStepIcons: Record<AuditRoundStepKey, ReactNode> = {
  walk: <ScanLine aria-hidden="true" />,
  pendingList: <ListChecks aria-hidden="true" />,
  review: <AlertTriangle aria-hidden="true" />,
  actions: <AlertTriangle aria-hidden="true" />,
  close: <Eye aria-hidden="true" />,
  outOfScope: <ScanLine aria-hidden="true" />,
}

function getAuditRoundStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  return t(auditRoundStatusLabelKey(status) ?? "statusOpen")
}

// Every scope condition the round has (group 2 spec §6, §13 bug 3): "<condition>: <code> - <name>", codes as tags.
function formatScope(round: AuditRoundScopeSource, allLabel: string, labels: Record<AuditRoundScopeKey, string>): ReactNode {
  const parts = buildAuditRoundScopeParts(round)
  if (parts.length === 0) return allLabel
  return parts.map((part, index) => (
    <Fragment key={part.key}>
      {index > 0 ? " / " : null}
      {labels[part.key]}: {part.code ? <><span className="tag">{part.code}</span> - </> : null}{part.name}
    </Fragment>
  ))
}

function buildCoverageGaps(
  assets: CoverageAsset[],
  coveredAssetIds: Set<string>,
  getGroup: (asset: CoverageAsset) => { id: string; label: string; href?: string },
) {
  const groups = new Map<string, { label: string; href?: string; total: number; covered: number }>()
  for (const asset of assets) {
    const group = getGroup(asset)
    const current = groups.get(group.id) ?? { label: group.label, href: group.href, total: 0, covered: 0 }
    current.total += 1
    if (coveredAssetIds.has(asset.id)) current.covered += 1
    groups.set(group.id, current)
  }

  return Array.from(groups.entries())
    .map(([id, group]) => {
      const missing = Math.max(group.total - group.covered, 0)
      return {
        id,
        label: group.label,
        href: group.href,
        total: group.total,
        covered: group.covered,
        missing,
        percent: group.total > 0 ? Math.round((group.covered / group.total) * 100) : 0,
      }
    })
    .filter((group) => group.missing > 0)
    .sort((a, b) => b.missing - a.missing || a.label.localeCompare(b.label))
    .slice(0, 5)
}
