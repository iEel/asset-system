import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { ASSET_MOVEMENT_DOCUMENT_PERMISSION, assetMovementLabelKey, buildAssetMovementDocumentHref } from "@/lib/asset-movement-labels"
import { buildAuditRoundItemsHref } from "@/lib/audit-round-result-filters"
import { shouldUseEmployeeHome } from "@/lib/default-home"
import { prisma } from "@/lib/db"
import { getDashboardOverview } from "@/lib/dashboard-overview"
import { getRecentAssetEvents, type RecentAssetEvent } from "@/lib/dashboard-recent"
import {
  auditPercent,
  DASHBOARD_KPI_ORDER,
  DASHBOARD_SECTION_ORDER,
  formatAsOf,
  getDashboardProfile,
  isBehindPace,
  type DashboardKpiKey,
  type DashboardSectionKey,
} from "@/lib/dashboard-overview-rules"
import {
  buildDashboardHref,
  buildDashboardRegisterHref,
  buildDashboardStatusTable,
  buildDashboardWaiting,
  DASHBOARD_BRANCH_ROW_LIMIT,
  DASHBOARD_COMPANY_TAB_LIMIT,
  describeWaitingAge,
  formatRecentTime,
  normalizeDashboardCompanyId,
  pickDashboardBranchRows,
} from "@/lib/dashboard-page"
import { getWaitingWork, getWaitingWorkAges } from "@/lib/waiting-work"
import { buildWaitingWorkHref, type WaitingWorkAge, type WaitingWorkCounts, type WaitingWorkKey } from "@/lib/waiting-work-rules"
import { cn } from "@/lib/utils"
import { formatCount, formatPercent } from "@/lib/display-format"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { statusFillVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { DistributionBar } from "@/components/ui/distribution-bar"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PaceBar } from "@/components/ui/pace-bar"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { toneIcons } from "@/components/ui/tone-icons"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ companyId?: string | string[] }>
}

const OverdueIcon = toneIcons.warning

// Canvas B (group 1 spec §6): the header with its as-of line, the company links, four KPIs in the profile's order, then
// the sections on 12 columns from lg. Every number opens a list that shows the same count. It reads, never writes.
export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { locale } = await params
  const now = new Date()
  const user = await getSessionUser()

  if (user && shouldUseEmployeeHome(user)) {
    redirect(`/${locale}/my-assets`)
  }

  // C2: the work center needs dashboard:view, so its link shows only to people who can open it.
  const canOpenWorkCenter = user ? hasPermission(user, "dashboard", "view") : false
  // Each part needs the view permission of the lists it opens (R25).
  const canViewAssets = user ? hasPermission(user, "asset", "view") : false
  const canViewAudit = user ? hasPermission(user, "audit", "view") : false
  const profile = user ? getDashboardProfile(user, getApprovalInboxAccess(user).canAnyApproval) : "overview"
  const meta = { route: "/dashboard", locale, profile }

  // Round 1: the companies, the words, the waiting counts (the read-only source, which records nothing: R10) and the
  // recent asset events, which no company narrows.
  const [companies, t, tNotifications, tAll, waitingWork, recentEvents] = await withPerformanceTiming(
    "dashboard.initial-data",
    () => Promise.all([
      prisma.company.findMany({ where: { isActive: true }, select: { id: true, code: true, nameTh: true }, orderBy: { code: "asc" } }),
      getTranslations("dashboard"),
      getTranslations("notifications"),
      // The movement labels live in the asset namespace.
      getTranslations(),
      user ? withPerformanceTiming("dashboard.waiting-work", () => getWaitingWork(user, now), meta) : null,
      withPerformanceTiming("dashboard.recent-activity", (): Promise<RecentAssetEvent[]> => canViewAssets ? getRecentAssetEvents(5) : Promise.resolve([]), meta),
    ]),
    meta
  )

  const companyId = normalizeDashboardCompanyId((await searchParams).companyId, companies)
  const companyName = companyId ? companies.find((company) => company.id === companyId)?.nameTh ?? null : null
  const waitingKeysWithCount = waitingWork ? waitingWork.visibleKeys.filter((key) => waitingWork.counts[key] > 0) : []

  // Round 2: the overview for the chosen company, and the ages of the kinds that have a count (R11).
  const [overview, ages] = await Promise.all([
    withPerformanceTiming("dashboard.overview", () => getDashboardOverview({ companyId, now }), meta),
    withPerformanceTiming(
      "dashboard.waiting-ages",
      (): Promise<Partial<Record<WaitingWorkKey, WaitingWorkAge>>> =>
        user && waitingWork && waitingKeysWithCount.length > 0 ? getWaitingWorkAges(user, waitingKeysWithCount, waitingWork.rules, now) : Promise.resolve({}),
      meta
    ),
  ])

  // With no visible key nothing reads a count.
  const waiting = buildDashboardWaiting(waitingWork ?? { counts: {} as WaitingWorkCounts, visibleKeys: [] }, ages)
  const showWaiting = (waitingWork?.visibleKeys.length ?? 0) > 0
  const statusRows = buildDashboardStatusTable(overview.statusRows, locale, companyId)
  const round = overview.audit.round
  const auditValue = round && overview.audit.expected > 0 ? auditPercent(overview.audit.processed, overview.audit.expected) / 100 : null
  const withCompany = (note: string) => (companyName ? t("noteCompany", { company: companyName, note }) : note)
  const footLinkClassName = cn(linkVariants({ size: "inherit" }), "relative z-10")
  const idleFoot = t("idleFoot", { count: formatCount(overview.idle180) })
  const responsibilityFoot = t("responsibilityFoot", { count: formatCount(overview.responsibilityMissing) })
  const branchRows = pickDashboardBranchRows(overview.audit.branches)
  const rowLinkClassName = cn(linkVariants({ size: "inherit" }), "tag")

  const kpiCells: Record<DashboardKpiKey, StatStripItem | null> = {
    total: canViewAssets
      ? {
          key: "total",
          label: t("totalAssets"),
          value: formatCount(overview.total),
          href: buildDashboardRegisterHref(locale, "total", companyId),
          filterNote: withCompany(t("noteTotal")),
          foot: <Link href={buildDashboardRegisterHref(locale, "idle180", companyId)} className={footLinkClassName}>{idleFoot}</Link>,
          footTitle: idleFoot,
        }
      : null,
    custodian: canViewAssets
      ? {
          key: "custodian",
          label: t("custodianAssigned"),
          value: formatCount(overview.custodianAssigned),
          unit: overview.custodianShare === null ? undefined : formatPercent(overview.custodianShare),
          href: buildDashboardRegisterHref(locale, "custodianAssigned", companyId),
          filterNote: withCompany(t("noteCustodian")),
          foot: <Link href={buildDashboardRegisterHref(locale, "responsibilityMissing", companyId)} className={footLinkClassName}>{responsibilityFoot}</Link>,
          footTitle: responsibilityFoot,
        }
      : null,
    // The sum of the table below, in-page (R24); the source has no company, so the note names none.
    waiting: showWaiting
      ? {
          key: "waiting",
          label: t("waitingTitle"),
          value: formatCount(waiting.total),
          unit: t("unitItems"),
          href: "#dashboard-waiting",
          filterNote: t("noteWaiting"),
          foot: waiting.oldest ? t("oldestFoot", { days: formatCount(waiting.oldest.days) }) : undefined,
          attention: Boolean(waiting.oldest?.overdue),
        }
      : null,
    // The round page's own percent and behind rule (R21); the item list narrows to the chosen company (R13); the
    // other open rounds are never a number (R15).
    audit: canViewAudit
      ? {
          key: "audit",
          label: round ? t("auditRoundKpi", { code: round.code }) : t("auditRoundNone"),
          value: auditValue === null ? null : formatPercent(auditValue),
          href: round ? buildAuditRoundItemsHref(locale, round.id, { companyId: companyId ?? undefined }) : `/${locale}/audit/rounds${overview.audit.otherOpen > 0 ? "?view=open" : ""}`,
          filterNote: withCompany(t("noteAudit")),
          meter: round ? <PaceBar value={auditValue ?? 0} pace={overview.audit.pace} label={t("auditBarLabel", { percent: formatPercent(auditValue ?? 0), pace: formatPercent(overview.audit.pace ?? 0) })} behind={isBehindPace(overview.audit.processed, overview.audit.expected, overview.audit.pace)} /> : undefined,
          foot: round ? t("auditFoot", { processed: formatCount(overview.audit.processed), expected: formatCount(overview.audit.expected), pace: formatPercent(overview.audit.pace ?? 0) }) : t(overview.audit.otherOpen > 0 ? "noDueRound" : "noRound"),
        }
      : null,
  }
  const kpiItems = DASHBOARD_KPI_ORDER[profile].map((key) => kpiCells[key]).filter((item): item is StatStripItem => item !== null)

  const zeroLineClassName = waiting.rows.length > 0 ? "border-t border-border-soft" : undefined
  const waitingAge = (age: WaitingWorkAge) => {
    const described = describeWaitingAge(age, locale, now)
    return { text: t(described.key, described.values), overdue: described.overdue }
  }

  const sections: Partial<Record<DashboardSectionKey, ReactNode>> = {
    waiting: showWaiting ? (
      <ContentPanel
        divided
        flush
        title={t("waitingTitle")}
        description={companyId ? t("allCompanies") : undefined}
        actions={canOpenWorkCenter ? (
          <Link href={`/${locale}/work-center?panel=overview`} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("openWorkCenter")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : undefined}
      >
        {waiting.rows.length > 0 ? (
          <>
            <DataTable framed={false} className="hidden md:block" caption={t("waitingTitle")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("waitingColumnKind")}</DataTableHead>
                  <DataTableHead align="right">{t("columnCount")}</DataTableHead>
                  <DataTableHead>{t("waitingColumnAge")}</DataTableHead>
                  <DataTableHead hideLabel>{t("waitingColumnNext")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {waiting.rows.map((row) => {
                  const href = buildWaitingWorkHref(locale, row.key)
                  const age = row.age ? waitingAge(row.age) : null
                  return (
                    <DataTableRow key={row.key} data-waiting-key={row.key}>
                      <DataTableCell className="text-foreground">{tNotifications(row.key)}</DataTableCell>
                      <DataTableCell numeric>
                        <Link href={href} title={tNotifications(`${row.key}Detail`)} className={cn(linkVariants({ size: "inherit" }), "num font-semibold")}>
                          {formatCount(row.count)}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className={cn("whitespace-nowrap", age?.overdue ? "text-warning" : "text-muted-foreground")}>
                        {age ? (
                          <span className="inline-flex items-center gap-1">
                            {age.overdue ? <OverdueIcon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
                            {age.text}
                          </span>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <Link href={href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                          {t(`waitingNext.${row.key}`)}
                          <span className="sr-only"> {tNotifications(row.key)}</span>
                        </Link>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
            <ContentPanelRows className="md:hidden">
              {waiting.rows.map((row) => {
                const age = row.age ? waitingAge(row.age) : null
                return (
                  <li key={row.key}>
                    <Link
                      href={buildWaitingWorkHref(locale, row.key)}
                      data-waiting-key={row.key}
                      className="-mx-4 -my-3 flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="num min-w-12 text-xl font-semibold text-foreground">{formatCount(row.count)}</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground">{tNotifications(row.key)}</span>
                        {age && row.age ? (
                          <span className={cn("flex items-center gap-1 text-meta", age.overdue ? "text-warning" : "text-muted-foreground")}>
                            {age.overdue ? <OverdueIcon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
                            {row.age.kind === "age" ? t("waitingAgeRow", { age: age.text }) : age.text}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ContentPanelRows>
          </>
        ) : null}
        {waiting.zeroKeys.length > 0 ? (
          <EmptyNote tone="clear" padded className={zeroLineClassName}>{t("waitingZero", { kinds: waiting.zeroKeys.map((key) => tNotifications(key)).join(" · ") })}</EmptyNote>
        ) : null}
      </ContentPanel>
    ) : null,
    // The round page's percent per branch against the round's pace (R21); each name opens the round's items for that
    // branch and the chosen company (R13); the other rounds in progress are a link, never a number (R15).
    branches: canViewAudit ? (
      <ContentPanel
        divided
        flush
        title={t("branchesTitle")}
        description={round ? t("branchesRound", { code: round.code }) : undefined}
        actions={overview.audit.otherOpen > 0 ? (
          <Link href={`/${locale}/audit/rounds?view=open`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t("allOpenRounds")}
          </Link>
        ) : undefined}
      >
        {round && branchRows.rows.length > 0 ? (
          <>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-soft px-4 py-3 text-meta text-muted-foreground md:px-5">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("h-2 w-3 rounded-xs", statusFillVariants({ tone: "primary" }))} />
                {t("legendCounted")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-0.5 bg-foreground forced-color-adjust-none forced-colors:bg-[CanvasText]" />
                {t("legendPace")}
              </span>
            </p>
            <ContentPanelRows>
              {branchRows.rows.map((branch, index) => {
                const branchValue = auditPercent(branch.processed, branch.expected) / 100
                return (
                  <li
                    key={branch.branchId}
                    className={cn("md:grid md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] md:items-center md:gap-4", index >= DASHBOARD_BRANCH_ROW_LIMIT.phone && "max-md:hidden")}
                  >
                    <div className="flex items-center justify-between gap-3 md:contents">
                      <Link
                        href={buildAuditRoundItemsHref(locale, round.id, { branchId: branch.branchId, companyId: companyId ?? undefined })}
                        className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center text-sm md:min-h-0")}
                      >
                        <span className="truncate">{branch.name}</span>
                      </Link>
                      <span className="flex shrink-0 items-center gap-3 md:order-3">
                        <span className="num text-sm text-foreground">
                          {t("branchNumbers", { percent: formatPercent(branchValue), processed: formatCount(branch.processed), expected: formatCount(branch.expected) })}
                        </span>
                        {branch.behind ? (
                          <span className="inline-flex items-center gap-1 text-meta text-warning">
                            <OverdueIcon aria-hidden="true" className="size-3.5 shrink-0" />
                            {t("branchBehind")}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-2 md:order-2 md:mt-0">
                      <PaceBar
                        value={branchValue}
                        pace={overview.audit.pace}
                        label={t("branchBarLabel", { branch: branch.name, percent: formatPercent(branchValue), pace: formatPercent(overview.audit.pace ?? 0) })}
                        behind={branch.behind}
                      />
                    </div>
                  </li>
                )
              })}
            </ContentPanelRows>
            {branchRows.moreOnDesktop || branchRows.moreOnPhone ? (
              <p className={cn("border-t border-border-soft px-4 py-3 md:px-5", !branchRows.moreOnDesktop && "md:hidden")}>
                <Link href={buildAuditRoundItemsHref(locale, round.id, { companyId: companyId ?? undefined })} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                  {t("allBranches")}
                </Link>
              </p>
            ) : null}
          </>
        ) : round ? (
          // A round whose items carry no branch (or none of the chosen company's) says so, with no legend over nothing.
          <EmptyNote padded>{t("branchesEmpty")}</EmptyNote>
        ) : (
          <EmptyNote padded>{t(overview.audit.otherOpen > 0 ? "noDueRound" : "noRound")}</EmptyNote>
        )}
      </ContentPanel>
    ) : null,
    status: canViewAssets ? (
      <ContentPanel divided flush title={t("statusTitle")}>
        {statusRows.length > 0 ? (
          <>
            <div className="px-4 pt-4 md:px-5">
              <DistributionBar segments={statusRows.map((row) => ({ key: row.key, count: row.count, tone: row.tone, href: row.href, title: t("statusSegmentTitle", { status: row.name, count: formatCount(row.count), note: withCompany(t("noteStatus", { status: row.name })) }) }))} />
            </div>
            <DataTable framed={false} caption={t("statusTitle")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("statusColumn")}</DataTableHead>
                  <DataTableHead align="right">{t("columnCount")}</DataTableHead>
                  <DataTableHead align="right" className="hidden md:table-cell">{t("shareColumn")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {statusRows.map((row) => (
                  <DataTableRow key={row.key}>
                    <DataTableCell>
                      <Link href={row.href} title={withCompany(t("noteStatus", { status: row.name }))} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-2 md:min-h-0")}>
                        <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-xs", statusFillVariants({ tone: row.tone }))} />
                        {row.name}
                      </Link>
                    </DataTableCell>
                    <DataTableCell numeric className="align-middle">{formatCount(row.count)}</DataTableCell>
                    <DataTableCell numeric className="hidden align-middle text-muted-foreground md:table-cell">{formatPercent(row.share, 1)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </>
        ) : (
          <EmptyNote padded>{t("statusEmpty")}</EmptyNote>
        )}
        <p className="border-t border-border-soft px-4 py-3 md:px-5">
          <Link href={buildDashboardRegisterHref(locale, "crossScope", companyId)} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t("crossScopeLine", { count: formatCount(overview.crossScopeTotal) })}
          </Link>
        </p>
      </ContentPanel>
    ) : null,
    // Asset movements across every company (R26), each document linked only for those who may open its page.
    recent: canViewAssets ? (
      <ContentPanel divided flush title={t("recentTitle")} description={companyId ? t("allCompanies") : undefined}>
        {recentEvents.length > 0 ? (
          <ContentPanelRows>
            {recentEvents.map((event) => {
              const time = formatRecentTime(event.performedAt, now, locale)
              return (
                <li key={event.id} className="flex items-baseline gap-3">
                  <time dateTime={event.performedAt.toISOString()} className="num w-16 shrink-0 text-meta text-muted-foreground">
                    {time.kind === "yesterday" ? t("recentYesterday") : time.text}
                  </time>
                  <p className="min-w-0 text-sm text-foreground">
                    {tAll(assetMovementLabelKey(event.movementType))}{" "}
                    <Link href={`/${locale}/assets/${event.asset.id}`} className={rowLinkClassName}>{event.asset.assetTag}</Link>
                    {event.document && user && hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[event.document.kind].module, "view") ? (
                      <>
                        {" · "}
                        <Link href={buildAssetMovementDocumentHref(locale, event.document)} className={rowLinkClassName}>{event.document.code}</Link>
                      </>
                    ) : null}
                  </p>
                </li>
              )
            })}
          </ContentPanelRows>
        ) : (
          <EmptyNote padded>{t("recentEmpty")}</EmptyNote>
        )}
      </ContentPanel>
    ) : null,
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("asOf", { time: formatAsOf(now, locale) })} />

      {companies.length > DASHBOARD_COMPANY_TAB_LIMIT ? (
        <form role="search" action={`/${locale}/dashboard`} className="hidden items-end gap-2 md:flex">
          <FilterSelect
            label={t("scopeNavigation")}
            hideLabel
            fieldSize="md"
            name="companyId"
            defaultValue={companyId ?? ""}
            allLabel={t("allCompanies")}
            options={companies.map((company) => ({ value: company.id, label: company.nameTh }))}
            className="w-64"
          />
          <FilterFormActions submitLabel={t("showScope")} />
        </form>
      ) : (
        <TabNav
          aria-label={t("scopeNavigation")}
          current={companyId ?? "all"}
          items={[
            { key: "all", label: t("allCompanies"), href: buildDashboardHref(locale, null) },
            ...companies.map((company) => ({ key: company.id, label: company.nameTh, href: buildDashboardHref(locale, company.id) })),
          ]}
          className="hidden md:block"
        />
      )}
      {companyName ? (
        <FilterChipList
          label={t("scopeNavigation")}
          removeLabel={t("removeFilter")}
          chips={[{ key: "company", label: t("companyChip", { name: companyName }), href: buildDashboardHref(locale, null), mobileOnly: true }]}
        />
      ) : null}

      {kpiItems.length > 0 ? <StatStrip items={kpiItems} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {DASHBOARD_SECTION_ORDER[profile].filter((key) => sections[key]).map((key, index) => (
          <div key={key} id={`dashboard-${key}`} data-dashboard-section={key} className={cn("min-w-0", index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5", key === "recent" && "max-md:hidden")}>
            {sections[key]}
          </div>
        ))}
      </div>
    </div>
  )
}
