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
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions, type RowActionGroup, type RowNextAction } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
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
  buildAuditRoundInsights,
  buildAuditRoundScopeParts,
  buildAuditRoundSearchWhere,
  buildAuditRoundsHref,
  emptyAuditRoundListInsight,
  filterRoundsByView,
  foldAuditRoundFindingWork,
  parseAuditRoundView,
  sumAuditRoundWork,
  type AuditRoundListInsight,
  type AuditRoundScopeKey,
  type AuditRoundScopeSource,
  type AuditRoundTab,
  type AuditRoundView,
} from "@/lib/audit-rounds-list-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"

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

type RoundWorkflowLink = {
  key: "pending" | "review" | "out_of_scope"
  label: string
  count: number
  href: string
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
      help: t("actionContinueScanHelp"),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={canCreateRound ? (
          <Link href={`/${locale}/audit/rounds/new`} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {t("createTitle")}
          </Link>
        ) : undefined}
      />

      <ContentPanel
        title={t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}
        description={t("coverageHelp")}
        actions={
          <p className="text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="num font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span>
          </p>
        }
      >
        <StatStrip
          className="mb-4"
          items={[
            { key: "activeAssets", label: t("coverageActiveAssets"), value: formatCount(activeAssets.length) },
            { key: "covered", label: t("coverageCoveredThisYear"), value: formatCount(coveredAssetCount) },
            { key: "uncovered", label: t("coverageUncoveredThisYear"), value: formatCount(uncoveredAssetCount) },
            { key: "openPendingItems", label: t("coverageOpenPendingItems"), value: formatCount(openWork.pending) },
            { key: "openPendingReview", label: t("coverageOpenPendingReview"), value: formatCount(openWork.pendingReview) },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <AuditProgressBar
            total={activeAssets.length}
            processed={coveredAssetCount}
            pending={uncoveredAssetCount}
            label={t("coverageProgress")}
            processedLabel={t("coverageCoveredLabel")}
            pendingLabel={t("coverageMissingLabel")}
            breakdown={[
              { label: t("coverageCoveredLabel"), value: coveredAssetCount, tone: "success" },
              { label: t("coverageMissingLabel"), value: uncoveredAssetCount, tone: "warning" },
              { label: t("scanned"), value: openWork.checked, tone: "info" },
              { label: t("pendingReview"), value: openWork.pendingReview, tone: "danger" },
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
      </ContentPanel>

      <ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />

      <QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />

      <MasterDataSearch
        action={`/${locale}/audit/rounds`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ ...(activeView === "open" ? {} : { view: activeView }), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
      />

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {pageRounds.length === 0 ? (
            <EmptyNote padded>{tCommon("noData")}</EmptyNote>
          ) : (
            pageRounds.map((round) => {
              const insight = insightOf(round)
              const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
              const workflowLinks = buildAuditRoundWorkflowLinks({
                locale,
                roundId: round.id,
                status: round.status,
                returnTo: auditRoundsReturnHref,
                insight,
                labels: {
                  pending: t("roundActionPending"),
                  review: t("roundActionReview"),
                  outOfScope: t("roundActionOutOfScope"),
                },
              })

              return (
                <article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={roundDetailHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                        <span className="tag font-medium">{round.auditNo}</span>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />
                      <ReadyToCloseBadge
                        status={round.status}
                        insight={insight}
                        labels={{
                          ready: t("readyToClose"),
                          pending: t("blockedPendingItems", { count: insight.pending }),
                          review: t("blockedPendingReview", { count: insight.pendingReview }),
                        }}
                      />
                    </div>
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "scope", label: t("scope"), value: formatScope(round, t("all"), scopeLabels) },
                      { key: "dateRange", label: t("dateRange"), value: `${formatDate(round.startDate)} - ${formatDate(round.endDate)}` },
                      { key: "items", label: t("items"), value: formatCount(insight.total) },
                    ]}
                  />
                  <div className="mt-3">
                    <AuditProgressBar
                      compact
                      total={insight.total}
                      processed={insight.checked}
                      pending={insight.pending}
                      label={t("progress")}
                      processedLabel={t("scanned")}
                      pendingLabel={t("pending")}
                    />
                  </div>
                  <RoundWorkflowLinks links={workflowLinks} />
                  <Link href={roundDetailHref} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>
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
              <DataTableHead>{t("auditNo")}</DataTableHead>
              <DataTableHead>{t("name")}</DataTableHead>
              <DataTableHead>{t("scope")}</DataTableHead>
              <DataTableHead>{t("dateRange")}</DataTableHead>
              <DataTableHead>{t("status")}</DataTableHead>
              <DataTableHead align="right">{t("items")}</DataTableHead>
              <DataTableHead>{t("progress")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {pageRounds.length === 0 ? (
              searchText ? (
                <TableEmptyRow
                  colSpan={8}
                  emptyState={{ title: tCommon("noData"), actionHref: clearSearchHref, actionLabel: tPending("clearSearch"), actionVariant: "secondary" }}
                />
              ) : (
                <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
              )
            ) : (
              pageRounds.map((round) => {
                const insight = insightOf(round)
                const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
                const workflowLinks = buildAuditRoundWorkflowLinks({
                  locale,
                  roundId: round.id,
                  status: round.status,
                  returnTo: auditRoundsReturnHref,
                  insight,
                  labels: {
                    pending: t("roundActionPending"),
                    review: t("roundActionReview"),
                    outOfScope: t("roundActionOutOfScope"),
                  },
                })
                const rowActions = buildRoundRowActions({ links: workflowLinks, viewHref: roundDetailHref, viewLabel: tCommon("view") })

                return (
                  <ClickableTableRow
                    key={round.id}
                    href={roundDetailHref}
                    label={`${tCommon("view")}: ${round.auditNo}`}
                  >
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{round.auditNo}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">{round.name}</DataTableCell>
                    <DataTableCell className="min-w-64 text-muted-foreground">{formatScope(round, t("all"), scopeLabels)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(round.startDate)} - {formatDate(round.endDate)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />
                        <ReadyToCloseBadge
                          status={round.status}
                          insight={insight}
                          labels={{
                            ready: t("readyToClose"),
                            pending: t("blockedPendingItems", { count: insight.pending }),
                            review: t("blockedPendingReview", { count: insight.pendingReview }),
                          }}
                        />
                      </div>
                    </DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(insight.total)}</DataTableCell>
                    <DataTableCell className="min-w-52">
                      <AuditProgressBar
                        compact
                        total={insight.total}
                        processed={insight.checked}
                        pending={insight.pending}
                        label={t("progress")}
                        processedLabel={t("scanned")}
                        pendingLabel={t("pending")}
                      />
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={round.auditNo}
                        name={round.name}
                        menuLabel={tCommon("moreActionsFor", { code: round.auditNo })}
                        next={rowActions.next}
                        groups={rowActions.groups}
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

// The workflow links of a phone card. On desktop the same links sit in RowActions (buildRoundRowActions).
function RoundWorkflowLinks({ links }: { links: RoundWorkflowLink[] }) {
  if (links.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.key} href={link.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {roundWorkflowIcons[link.key]}
          <span>{link.label}</span>
          <span className="num">{formatCount(link.count)}</span>
        </Link>
      ))}
    </div>
  )
}
function ReadyToCloseBadge({
  status,
  insight,
  labels,
}: {
  status: string
  insight: AuditRoundListInsight
  labels: { ready: string; pending: string; review: string }
}) {
  if (!isAuditRoundOperationalStatus(status)) return null
  if (insight.readyToClose) {
    return <StatusBadge label={labels.ready} tone="success" />
  }
  if (insight.pending > 0) {
    return <StatusBadge label={labels.pending} tone="warning" />
  }
  if (insight.pendingReview > 0) {
    return <StatusBadge label={labels.review} tone="danger" />
  }
  return null
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

function buildAuditRoundWorkflowLinks({
  locale,
  roundId,
  returnTo,
  insight,
  labels,
}: {
  locale: string
  roundId: string
  status: string
  returnTo: string
  insight: AuditRoundListInsight
  labels: { pending: string; review: string; outOfScope: string }
}): RoundWorkflowLink[] {
  if (!insight.operational) return []

  const links: RoundWorkflowLink[] = []

  if (insight.pending > 0) {
    links.push({
      key: "pending",
      label: labels.pending,
      count: insight.pending,
      href: appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/pending`, returnTo),
    })
  }

  if (insight.pendingReview > 0) {
    links.push({
      key: "review",
      label: labels.review,
      count: insight.pendingReview,
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending&roundId=${roundId}`, returnTo),
    })
  }

  if (insight.outOfScope > 0) {
    links.push({
      key: "out_of_scope",
      label: labels.outOfScope,
      count: insight.outOfScope,
      href: `/${locale}/audit/rounds/${roundId}?result=out_of_scope&returnTo=${encodeURIComponent(returnTo)}#audit-result-list`,
    })
  }

  return links
}

const roundWorkflowIcons: Record<RoundWorkflowLink["key"], ReactNode> = {
  pending: <ListChecks aria-hidden="true" />,
  review: <AlertTriangle aria-hidden="true" />,
  out_of_scope: <ScanLine aria-hidden="true" />,
}

// Row actions of a round (pattern ช1, spec 2B §5.4 row rounds): the first workflow link is the next step, and ⋯ holds
// the other links and "ดู". A round with no open work has "ดู" as its next step and no ⋯. Each label keeps its count.
function buildRoundRowActions({
  links,
  viewHref,
  viewLabel,
}: {
  links: RoundWorkflowLink[]
  viewHref: string
  viewLabel: string
}): { next: RowNextAction; groups: RowActionGroup[] } {
  const view = { label: viewLabel, href: viewHref, icon: <Eye aria-hidden="true" /> }
  const [first, ...rest] = links
  if (!first) return { next: view, groups: [] }

  return {
    next: { label: `${first.label} ${formatCount(first.count)}`, href: first.href, icon: roundWorkflowIcons[first.key] },
    groups: [
      {
        key: "round",
        items: [
          ...rest.map((link) => ({ kind: "link" as const, key: link.key, label: `${link.label} ${formatCount(link.count)}`, href: link.href, icon: roundWorkflowIcons[link.key] })),
          { kind: "link" as const, key: "view", ...view },
        ],
      },
    ],
  }
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
