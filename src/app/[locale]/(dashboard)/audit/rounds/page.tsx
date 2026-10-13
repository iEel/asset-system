import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, ListChecks, Plus, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate } from "@/lib/utils"
import { toDisplayYear } from "@/lib/display-year"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions, type RowActionGroup, type RowNextAction } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundCoverageWhere, auditRoundOperationalWhere, isAuditRoundOperationalStatus } from "@/lib/audit-round-status"
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

const auditRoundViewValues = ["all", "open", "pending", "review", "mismatch", "readyToClose", "cancelled"] as const
type AuditRoundView = (typeof auditRoundViewValues)[number]

type AuditRoundListItem = {
  id: string
  auditNo: string
  status: string
  _count: { items: number; findings: number }
}

type AuditRoundInsight = {
  pending: number
  processed: number
  followUps: number
  outOfScope: number
  hasMismatch: boolean
  readyToClose: boolean
}

type RoundWorkflowLink = {
  key: "pending" | "review" | "out_of_scope"
  label: string
  count: number
  href: string
  tone: "warning" | "danger" | "info"
}
type ActionPanelItem = {
  label: string
  help: string
  count: number
  href: string
  icon: ReactNode
  tone: "primary" | "warning" | "success"
}

export default async function AuditRoundsPage({ params, searchParams }: AuditRoundsPageProps) {
  const { locale } = await params
  const { search = "", view = "all", page, pageSize } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const tPending = await getTranslations("auditPending")
  const searchText = search.trim()
  const activeView: AuditRoundView = auditRoundViewValues.includes(view as AuditRoundView) ? (view as AuditRoundView) : "all"
  const listPage = parseListPage({ page, pageSize })
  const currentYear = new Date().getFullYear()
  const [rounds, activeAssets, coveredItems, currentYearRoundCount, openItemStatusCounts, openFollowUpCount] = await withPerformanceTiming(
    "audit-rounds.initial-data",
    () => Promise.all([
      prisma.auditRound.findMany({
        where: {
          isActive: true,
          ...(searchText
            ? {
                OR: [
                  { auditNo: { contains: searchText } },
                  { name: { contains: searchText } },
                  { scopeCompany: { code: { contains: searchText } } },
                  { scopeBranch: { code: { contains: searchText } } },
                  { scopeLocation: { code: { contains: searchText } } },
                ],
              }
            : {}),
        },
        include: {
          scopeCompany: { select: { code: true, nameTh: true } },
          scopeBranch: { select: { code: true, name: true } },
          scopeLocation: { select: { code: true, name: true } },
          _count: { select: { items: true, findings: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
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
      prisma.auditItem.findMany({
        where: { auditRound: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } },
        distinct: ["assetId"],
        select: { assetId: true },
      }),
      prisma.auditRound.count({ where: { isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere } }),
      prisma.auditItem.groupBy({
        by: ["auditStatus"],
        where: { auditRound: { isActive: true, status: auditRoundOperationalWhere } },
        _count: { _all: true },
      }),
      prisma.auditFinding.count({
        where: {
          auditRound: { isActive: true, status: auditRoundOperationalWhere },
          OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
        },
      }),
    ]),
    { route: "/audit/rounds", locale, view: activeView, hasSearch: Boolean(searchText) }
  )
  const roundIds = rounds.map((round) => round.id)
  const [statusCounts, findingWorkCounts, outOfScopeWorkCounts] = roundIds.length
    ? await withPerformanceTiming(
        "audit-rounds.progress-data",
        () => Promise.all([
          prisma.auditItem.groupBy({
            by: ["auditRoundId", "auditStatus"],
            where: { auditRoundId: { in: roundIds } },
            _count: { _all: true },
          }),
          prisma.auditFinding.groupBy({
            by: ["auditRoundId"],
            where: {
              auditRoundId: { in: roundIds },
              OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
            },
            _count: { _all: true },
          }),
          prisma.auditScanHistory.groupBy({
            by: ["auditRoundId"],
            where: { auditRoundId: { in: roundIds }, auditItemId: null },
            _count: { _all: true },
          }),
        ]),
        { route: "/audit/rounds", locale, roundCount: roundIds.length }
      )
    : [[], [], []]
  const progressByRoundId = new Map<string, { pending: number; processed: number }>()
  for (const row of statusCounts) {
    const current = progressByRoundId.get(row.auditRoundId) ?? { pending: 0, processed: 0 }
    if (row.auditStatus === "pending") {
      current.pending += row._count._all
    } else {
      current.processed += row._count._all
    }
    progressByRoundId.set(row.auditRoundId, current)
  }
  const followUpsByRoundId = new Map(findingWorkCounts.map((row) => [row.auditRoundId, row._count._all]))
  const outOfScopeByRoundId = new Map(outOfScopeWorkCounts.map((row) => [row.auditRoundId, row._count._all]))
  const insightsByRoundId = buildAuditRoundInsights(rounds, progressByRoundId, followUpsByRoundId, outOfScopeByRoundId)
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  // Real pages (spec 2B B4, §5.9.2 row 7, I21): the view filters and the tab counts need the insight of every round,
  // so the query stays whole and the page is a slice of filteredRounds. The total is known before the cut, so a page
  // past the last one is clamped to the last page instead of redirecting.
  const roundPage = { page: Math.min(listPage.page, lastListPage(filteredRounds.length, listPage.pageSize)), pageSize: listPage.pageSize }
  const { skip, take } = listPageWindow(roundPage)
  const pageRounds = filteredRounds.slice(skip, skip + take)
  const { start, end, totalPages } = paginationRange(roundPage.page, roundPage.pageSize, filteredRounds.length)
  const pendingRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.pending ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const reviewRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.followUps ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const readyRounds = rounds.filter((round) => insightsByRoundId.get(round.id)?.readyToClose)
  const viewLabels: Record<AuditRoundView, string> = {
    all: t("viewAll"),
    open: t("viewOpen"),
    pending: t("viewPending"),
    review: t("viewReview"),
    mismatch: t("viewMismatch"),
    readyToClose: t("viewReadyToClose"),
    cancelled: t("viewCancelled"),
  }
  // The round detail and scan pages bring the user back to this page and page size (B4 returnTo).
  const auditRoundsReturnHref = buildAuditRoundsHref(locale, activeView, searchText, roundPage)
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const quickFilters = auditRoundViewValues.map((value) => ({
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
      count: pendingRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.pending ?? 0), 0),
      href: pendingRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${pendingRounds[0].id}/scan`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "pending", searchText, { pageSize: listPage.pageSize }),
      icon: <ScanLine className="h-5 w-5" />,
      tone: "primary",
    },
    {
      label: t("actionReviewFindings"),
      help: t("actionReviewFindingsHelp"),
      count: reviewRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.followUps ?? 0), 0),
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending`, auditRoundsReturnHref),
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "warning",
    },
    {
      label: t("actionCloseReadyRounds"),
      help: t("actionCloseReadyRoundsHelp"),
      count: readyRounds.length,
      href: readyRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${readyRounds[0].id}`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "readyToClose", searchText, { pageSize: listPage.pageSize }),
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "success",
    },
  ]
  const coveredAssetIds = new Set(coveredItems.map((item) => item.assetId))
  const coveredAssetCount = activeAssets.filter((asset) => coveredAssetIds.has(asset.id)).length
  const uncoveredAssetCount = Math.max(activeAssets.length - coveredAssetCount, 0)
  const openPendingItems = openItemStatusCounts.find((row) => row.auditStatus === "pending")?._count._all ?? 0
  const openProcessedItems = openItemStatusCounts
    .filter((row) => row.auditStatus !== "pending")
    .reduce((sum, row) => sum + row._count._all, 0)
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
        actions={
          <Link href={`/${locale}/audit/rounds/new`} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {t("createTitle")}
          </Link>
        }
      />

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("coverageHelp")}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span>
          </div>
        </div>

        <StatStrip
          className="mb-4"
          items={[
            { key: "activeAssets", label: t("coverageActiveAssets"), value: formatCount(activeAssets.length) },
            { key: "covered", label: t("coverageCoveredThisYear"), value: formatCount(coveredAssetCount) },
            { key: "uncovered", label: t("coverageUncoveredThisYear"), value: formatCount(uncoveredAssetCount) },
            { key: "openPending", label: t("coverageOpenPending"), value: formatCount(openPendingItems + openFollowUpCount) },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
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
              { label: t("scanned"), value: openProcessedItems, tone: "info" },
              { label: t("pendingReview"), value: openFollowUpCount, tone: "danger" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
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
      </section>

      <ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />

      <QuickFilterBar title={t("quickFiltersTitle")} activeView={activeView} filters={quickFilters} />

      <MasterDataSearch
        action={`/${locale}/audit/rounds`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ ...(activeView === "all" ? {} : { view: activeView }), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
      />

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {pageRounds.length === 0 ? (
            <EmptyNote padded>{tCommon("noData")}</EmptyNote>
          ) : (
            pageRounds.map((round) => {
              const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
              const insight = insightsByRoundId.get(round.id) ?? {
                pending: progress.pending,
                processed: progress.processed,
                followUps: 0,
                outOfScope: 0,
                hasMismatch: round._count.findings > 0,
                readyToClose: false,
              }
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
                      <Link href={roundDetailHref} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                        <span className="tag font-medium">{round.auditNo}</span>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                      <ReadyToCloseBadge
                        status={round.status}
                        insight={insight}
                        labels={{
                          ready: t("readyToClose"),
                          pending: t("blockedPendingItems", { count: insight.pending }),
                          review: t("blockedPendingReview", { count: insight.followUps }),
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <MobileAuditField label={t("scope")} value={formatScope(round)} />
                    <MobileAuditField label={t("dateRange")} value={`${formatDate(round.startDate)} - ${formatDate(round.endDate)}`} />
                    <MobileAuditField label={t("items")} value={formatCount(round._count.items)} />
                  </div>
                  <div className="mt-3">
                    <AuditProgressBar
                      compact
                      total={round._count.items}
                      processed={progress.processed}
                      pending={progress.pending}
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
                const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
                const insight = insightsByRoundId.get(round.id) ?? {
                  pending: progress.pending,
                  processed: progress.processed,
                  followUps: 0,
                  outOfScope: 0,
                  hasMismatch: round._count.findings > 0,
                  readyToClose: false,
                }
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
                    <DataTableCell className="min-w-64 text-muted-foreground">{formatScope(round)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(round.startDate)} - {formatDate(round.endDate)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                        <ReadyToCloseBadge
                          status={round.status}
                          insight={insight}
                          labels={{
                            ready: t("readyToClose"),
                            pending: t("blockedPendingItems", { count: insight.pending }),
                            review: t("blockedPendingReview", { count: insight.followUps }),
                          }}
                        />
                      </div>
                    </DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(round._count.items)}</DataTableCell>
                    <DataTableCell className="min-w-52">
                      <AuditProgressBar
                        compact
                        total={round._count.items}
                        processed={progress.processed}
                        pending={progress.pending}
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
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action) => {
          const toneClass =
            action.tone === "success"
              ? "border-success-border bg-success-soft text-success hover:bg-success-soft"
              : action.tone === "warning"
                ? "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"
                : "border-primary-border bg-primary-soft text-primary hover:bg-primary-soft"

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex min-h-24 items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${toneClass}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md">{action.icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{action.label}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.help}</p>
                </div>
              </div>
              <div className="shrink-0 text-2xl font-bold tabular-nums text-foreground">{formatCount(action.count)}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// A thin wrapper of TabNav (spec 2B I20): the quick filters change the URL, so they are link tabs with counts. TabNav
// sets aria-current on the selected tab and passes scroll={false} to Link, so the page stays where it is.
function QuickFilterBar({
  title,
  activeView,
  filters,
}: {
  title: string
  activeView: AuditRoundView
  filters: Array<{ value: AuditRoundView; label: string; count: number; href: string }>
}) {
  return (
    <TabNav
      aria-label={title}
      items={filters.map((filter) => ({ key: filter.value, label: filter.label, count: formatCount(filter.count), href: filter.href }))}
      current={activeView}
      scroll={false}
    />
  )
}

// The workflow links of a phone card. On desktop the same links sit in RowActions (buildRoundRowActions).
function RoundWorkflowLinks({ links }: { links: RoundWorkflowLink[] }) {
  if (links.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => {
        const toneClass =
          link.tone === "danger"
            ? "border-danger-border bg-danger-soft text-danger hover:bg-danger-soft"
            : link.tone === "info"
              ? "border-info-border bg-info-soft text-info hover:bg-info-soft"
              : "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"

        return (
          <Link
            key={link.key}
            href={link.href}
            className={`inline-flex min-h-11 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors ${toneClass}`}
          >
            <span>{link.label}</span>
            <span className="tabular-nums">{formatCount(link.count)}</span>
          </Link>
        )
      })}
    </div>
  )
}
function ReadyToCloseBadge({
  status,
  insight,
  labels,
}: {
  status: string
  insight: AuditRoundInsight
  labels: { ready: string; pending: string; review: string }
}) {
  if (!isAuditRoundOperationalStatus(status)) return null
  if (insight.readyToClose) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {labels.ready}
      </span>
    )
  }
  if (insight.pending > 0) {
    return <span className="inline-flex rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">{labels.pending}</span>
  }
  if (insight.followUps > 0) {
    return <span className="inline-flex rounded-full bg-danger-soft px-2 py-1 text-xs font-medium text-danger">{labels.review}</span>
  }
  return null
}

function MobileAuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
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
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <>
          <div className="grid gap-2 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border bg-surface p-3">
                <div className="break-words text-sm font-medium text-foreground">
                  {row.href ? (
                    <Link href={row.href} className="text-primary hover:underline">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <MobileAuditField label={labels.missing} value={formatCount(row.missing)} />
                  <MobileAuditField label={labels.total} value={formatCount(row.total)} />
                  <MobileAuditField label={labels.rate} value={`${formatCount(row.percent)}%`} />
                </div>
              </div>
            ))}
          </div>
          {/* No frame of its own: the gap box is the frame (no frame in a frame). */}
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
                      <Link href={row.href} className="text-primary hover:underline">
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

function AuditStatusBadge({ status, label = status }: { status: string; label?: string }) {
  const className =
    status === "open"
      ? "bg-info-soft text-info"
      : status === "closed"
        ? "bg-muted text-muted-foreground"
        : status === "cancelled"
          ? "bg-danger-soft text-danger"
          : "bg-warning-soft text-warning"

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{label}</span>
}

function buildAuditRoundInsights(
  rounds: AuditRoundListItem[],
  progressByRoundId: Map<string, { pending: number; processed: number }>,
  followUpsByRoundId: Map<string, number>,
  outOfScopeByRoundId: Map<string, number>,
) {
  const insights = new Map<string, AuditRoundInsight>()

  for (const round of rounds) {
    const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
    const followUps = followUpsByRoundId.get(round.id) ?? 0
    const outOfScope = outOfScopeByRoundId.get(round.id) ?? 0
    const hasMismatch = round._count.findings > 0
    insights.set(round.id, {
      pending: progress.pending,
      processed: progress.processed,
      followUps,
      outOfScope,
      hasMismatch,
      readyToClose: isAuditRoundOperationalStatus(round.status) && progress.pending === 0 && followUps === 0,
    })
  }

  return insights
}

function buildAuditRoundWorkflowLinks({
  locale,
  roundId,
  returnTo,
  status,
  insight,
  labels,
}: {
  locale: string
  roundId: string
  status: string
  returnTo: string
  insight: AuditRoundInsight
  labels: { pending: string; review: string; outOfScope: string }
}): RoundWorkflowLink[] {
  if (!isAuditRoundOperationalStatus(status)) return []

  const links: RoundWorkflowLink[] = []

  if (insight.pending > 0) {
    links.push({
      key: "pending",
      label: labels.pending,
      count: insight.pending,
      href: appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/pending`, returnTo),
      tone: "warning",
    })
  }

  if (insight.followUps > 0) {
    links.push({
      key: "review",
      label: labels.review,
      count: insight.followUps,
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending&roundId=${roundId}`, returnTo),
      tone: "danger",
    })
  }

  if (insight.outOfScope > 0) {
    links.push({
      key: "out_of_scope",
      label: labels.outOfScope,
      count: insight.outOfScope,
      href: `/${locale}/audit/rounds/${roundId}?result=out_of_scope&returnTo=${encodeURIComponent(returnTo)}#audit-result-list`,
      tone: "info",
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

function filterRoundsByView<T extends AuditRoundListItem>(
  rounds: T[],
  insightsByRoundId: Map<string, AuditRoundInsight>,
  activeView: AuditRoundView,
) {
  return rounds.filter((round) => {
    const insight = insightsByRoundId.get(round.id)
    if (activeView === "all") return true
    if (activeView === "cancelled") return round.status === "cancelled"
    if (activeView === "open") return isAuditRoundOperationalStatus(round.status)
    if (!isAuditRoundOperationalStatus(round.status)) return false
    if (activeView === "pending") return (insight?.pending ?? 0) > 0
    if (activeView === "review") return (insight?.followUps ?? 0) > 0
    if (activeView === "mismatch") return insight?.hasMismatch ?? (round._count.findings > 0)
    if (activeView === "readyToClose") return insight?.readyToClose ?? false

    return true
  })
}

function getAuditRoundStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (status === "draft") return t("statusDraft")
  if (status === "open") return t("statusOpen")
  if (status === "closed") return t("statusClosed")
  if (status === "cancelled") return t("statusCancelled")
  return status
}

// The list URL. appendListPage writes page only above 1 and pageSize only when it is not 25, so every default link
// (for example /th/audit/rounds?view=open) stays as it was (spec 2B §5.9.1).
function buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string, listPage: { page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams()
  if (searchText) params.set("search", searchText)
  if (view !== "all") params.set("view", view)
  const query = appendListPage(params, listPage).toString()
  return `/${locale}/audit/rounds${query ? `?${query}` : ""}`
}

function formatScope(round: {
  scopeCompany: { code: string; nameTh: string } | null
  scopeBranch: { code: string; name: string } | null
  scopeLocation: { code: string; name: string } | null
}) {
  const parts = [
    round.scopeCompany ? `${round.scopeCompany.code} - ${round.scopeCompany.nameTh}` : null,
    round.scopeBranch ? `${round.scopeBranch.code} - ${round.scopeBranch.name}` : null,
    round.scopeLocation ? `${round.scopeLocation.code} - ${round.scopeLocation.name}` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : "All assets"
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
