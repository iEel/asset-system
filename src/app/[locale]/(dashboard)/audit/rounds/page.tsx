import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, ListFilter, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"

type AuditRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; view?: string }>
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

const auditRoundViewValues = ["all", "open", "pending", "review", "mismatch", "readyToClose"] as const
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
  hasMismatch: boolean
  readyToClose: boolean
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
  const { search = "", view = "all" } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const activeView: AuditRoundView = auditRoundViewValues.includes(view as AuditRoundView) ? (view as AuditRoundView) : "all"
  const currentYear = new Date().getFullYear()
  const [rounds, activeAssets, coveredItems, currentYearRoundCount, openItemStatusCounts, openFollowUpCount] = await Promise.all([
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
      orderBy: { createdAt: "desc" },
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
      where: { auditRound: { isActive: true, auditYear: currentYear } },
      distinct: ["assetId"],
      select: { assetId: true },
    }),
    prisma.auditRound.count({ where: { isActive: true, auditYear: currentYear } }),
    prisma.auditItem.groupBy({
      by: ["auditStatus"],
      where: { auditRound: { isActive: true, status: { not: "closed" } } },
      _count: { _all: true },
    }),
    prisma.auditFinding.count({
      where: {
        auditRound: { isActive: true, status: { not: "closed" } },
        OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
      },
    }),
  ])
  const roundIds = rounds.map((round) => round.id)
  const [statusCounts, findingWorkCounts] = roundIds.length
    ? await Promise.all([
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
      ])
    : [[], []]
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
  const insightsByRoundId = buildAuditRoundInsights(rounds, progressByRoundId, followUpsByRoundId)
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  const pendingRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.pending ?? 0) > 0 && round.status !== "closed")
  const reviewRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.followUps ?? 0) > 0)
  const readyRounds = rounds.filter((round) => insightsByRoundId.get(round.id)?.readyToClose)
  const viewLabels: Record<AuditRoundView, string> = {
    all: t("viewAll"),
    open: t("viewOpen"),
    pending: t("viewPending"),
    review: t("viewReview"),
    mismatch: t("viewMismatch"),
    readyToClose: t("viewReadyToClose"),
  }
  const quickFilters = auditRoundViewValues.map((value) => ({
    value,
    label: viewLabels[value],
    count: filterRoundsByView(rounds, insightsByRoundId, value).length,
    href: buildAuditRoundsHref(locale, value, searchText),
  }))
  const actionItems: ActionPanelItem[] = [
    {
      label: t("actionContinueScan"),
      help: t("actionContinueScanHelp"),
      count: pendingRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.pending ?? 0), 0),
      href: pendingRounds[0] ? `/${locale}/audit/rounds/${pendingRounds[0].id}/scan` : buildAuditRoundsHref(locale, "pending", searchText),
      icon: <ScanLine className="h-5 w-5" />,
      tone: "primary",
    },
    {
      label: t("actionReviewFindings"),
      help: t("actionReviewFindingsHelp"),
      count: reviewRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.followUps ?? 0), 0),
      href: `/${locale}/audit/findings?status=pending`,
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "warning",
    },
    {
      label: t("actionCloseReadyRounds"),
      help: t("actionCloseReadyRoundsHelp"),
      count: readyRounds.length,
      href: readyRounds[0] ? `/${locale}/audit/rounds/${readyRounds[0].id}` : buildAuditRoundsHref(locale, "readyToClose", searchText),
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
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds/new`}
        createLabel={t("createTitle")}
      />

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: currentYear })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("coverageHelp")}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="font-semibold text-foreground">{currentYearRoundCount}</span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageMetric label={t("coverageActiveAssets")} value={activeAssets.length} />
          <CoverageMetric label={t("coverageCoveredThisYear")} value={coveredAssetCount} />
          <CoverageMetric label={t("coverageUncoveredThisYear")} value={uncoveredAssetCount} tone="warning" />
          <CoverageMetric label={t("coverageOpenPending")} value={openPendingItems + openFollowUpCount} tone="danger" />
        </div>

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
        hiddenInputs={activeView === "all" ? undefined : { view: activeView }}
      />

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {filteredRounds.length === 0 ? (
            <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon("noData")}
            </div>
          ) : (
            filteredRounds.map((round) => {
              const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
              const insight = insightsByRoundId.get(round.id) ?? {
                pending: progress.pending,
                processed: progress.processed,
                followUps: 0,
                hasMismatch: round._count.findings > 0,
                readyToClose: false,
              }

              return (
                <article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/${locale}/audit/rounds/${round.id}`} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                        {round.auditNo}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AuditStatusBadge status={round.status} />
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
                    <MobileAuditField label={t("items")} value={String(round._count.items)} />
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
                  <Link
                    href={`/${locale}/audit/rounds/${round.id}`}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Eye className="h-4 w-4" />
                    {tCommon("view")}
                  </Link>
                </article>
              )
            })
          )}
        </div>
        <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("auditNo")}</ColumnHeader>
                <ColumnHeader>{t("name")}</ColumnHeader>
                <ColumnHeader>{t("scope")}</ColumnHeader>
                <ColumnHeader>{t("dateRange")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader align="right">{t("items")}</ColumnHeader>
                <ColumnHeader>{t("progress")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRounds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                filteredRounds.map((round) => {
                  const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
                  const insight = insightsByRoundId.get(round.id) ?? {
                    pending: progress.pending,
                    processed: progress.processed,
                    followUps: 0,
                    hasMismatch: round._count.findings > 0,
                    readyToClose: false,
                  }

                  return (
                    <ClickableTableRow
                      key={round.id}
                      href={`/${locale}/audit/rounds/${round.id}`}
                      label={`${tCommon("view")}: ${round.auditNo}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{round.auditNo}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">{round.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">{formatScope(round)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(round.startDate)} - {formatDate(round.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <AuditStatusBadge status={round.status} />
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
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{round._count.items}</td>
                      <td className="min-w-52 px-4 py-3">
                        <AuditProgressBar
                          compact
                          total={round._count.items}
                          processed={progress.processed}
                          pending={progress.pending}
                          label={t("progress")}
                          processedLabel={t("scanned")}
                          pendingLabel={t("pending")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/${locale}/audit/rounds/${round.id}`}
                          title={tCommon("view")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ActionPanel({ title, help, actions }: { title: string; help: string; actions: ActionPanelItem[] }) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
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
              ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
              : action.tone === "warning"
                ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex min-h-24 items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${toneClass}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background/80">{action.icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{action.label}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.help}</p>
                </div>
              </div>
              <div className="shrink-0 text-2xl font-bold tabular-nums text-foreground">{action.count}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

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
    <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListFilter className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === activeView

          return (
            <Link
              key={filter.value}
              href={filter.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span>{filter.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                {filter.count}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
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
  if (status === "closed") return null
  if (insight.readyToClose) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {labels.ready}
      </span>
    )
  }
  if (insight.pending > 0) {
    return <span className="inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">{labels.pending}</span>
  }
  if (insight.followUps > 0) {
    return <span className="inline-flex rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">{labels.review}</span>
  }

  return null
}

function CoverageMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/10 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-border bg-background text-foreground"

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function MobileAuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
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
  labels: { group: string; missing: string; total: string; rate: string }
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
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
                <MobileAuditField label={labels.missing} value={String(row.missing)} />
                <MobileAuditField label={labels.total} value={String(row.total)} />
                <MobileAuditField label={labels.rate} value={`${row.percent}%`} />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">{labels.group}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.missing}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.total}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.rate}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="min-w-44 px-2 py-2 font-medium text-foreground">
                    {row.href ? (
                      <Link href={row.href} className="text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-warning">{row.missing}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.total}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}

function AuditStatusBadge({ status }: { status: string }) {
  const className =
    status === "open"
      ? "bg-info/10 text-info"
      : status === "closed"
        ? "bg-muted text-muted-foreground"
        : "bg-warning/10 text-warning"

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{status}</span>
}

function buildAuditRoundInsights(
  rounds: AuditRoundListItem[],
  progressByRoundId: Map<string, { pending: number; processed: number }>,
  followUpsByRoundId: Map<string, number>,
) {
  const insights = new Map<string, AuditRoundInsight>()

  for (const round of rounds) {
    const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
    const followUps = followUpsByRoundId.get(round.id) ?? 0
    const hasMismatch = round._count.findings > 0
    insights.set(round.id, {
      pending: progress.pending,
      processed: progress.processed,
      followUps,
      hasMismatch,
      readyToClose: round.status !== "closed" && progress.pending === 0 && followUps === 0,
    })
  }

  return insights
}

function filterRoundsByView<T extends AuditRoundListItem>(
  rounds: T[],
  insightsByRoundId: Map<string, AuditRoundInsight>,
  activeView: AuditRoundView,
) {
  return rounds.filter((round) => {
    const insight = insightsByRoundId.get(round.id)
    if (activeView === "all") return true
    if (activeView === "open") return round.status !== "closed"
    if (activeView === "pending") return (insight?.pending ?? 0) > 0
    if (activeView === "review") return (insight?.followUps ?? 0) > 0
    if (activeView === "mismatch") return insight?.hasMismatch ?? (round._count.findings > 0)
    if (activeView === "readyToClose") return insight?.readyToClose ?? false

    return true
  })
}

function buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string) {
  const params = new URLSearchParams()
  if (searchText) params.set("search", searchText)
  if (view !== "all") params.set("view", view)
  const query = params.toString()
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
