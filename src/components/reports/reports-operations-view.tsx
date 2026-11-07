import Link from "next/link"
import { Check, Download, Square } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
import { ASSET_EXPORT_MAX_ROWS, assetExportCapped } from "@/lib/asset-export-limits"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import {
  getReportIssueFix,
  OPERATIONS_QUEUE_ANCHOR,
  REPORT_ISSUE_KINDS,
  type OperationsQueueRow,
  type OperationsTopRow,
  type ReportIssueChoice,
  type ReportIssueKind,
  type ReportsOperationsQueue,
} from "@/lib/reports-operations-data"

export type ReportCrossScopeCard = {
  key: string
  label: string
  value: number
  href: string
}

type ReportInsightRow = OperationsTopRow
type Translate = Awaited<ReturnType<typeof getTranslations>>

export type ReportsOperationsLabels = {
  missingCustodian: string
  missingSerial: string
  missingPhoto: string
  warrantyExpiring: string
  crossScopeTitle: string
  crossScopeHelp: string
  exportCrossScopeAssets: string
  crossScopePreviewTitle: string
  crossScopeEmpty: string
  asset: string
  ownerBranch: string
  custodianBranch: string
  locationBranch: string
  flags: string
  custodianCompanyDifference: string
  custodianBranchDifference: string
  locationBranchDifference: string
  openDataQualityRules: string
  dataQualityEmpty: string
  fixData: string
  operationInsightsTitle: string
  operationInsightsHelp: string
  byCustodian: string
  byLocation: string
  frequentRepairAssets: string
  idleAssets: string
  idleAssetsHelp: string
  noActivity: string
}

export type ReportsOperationsViewProps = {
  locale: string
  // The operations scope (the report's filters without dataQuality and activity): the register links add to it.
  filters: ReturnType<typeof parseAssetListParams>
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  filteredEmptyCopy: string
  queue: ReportsOperationsQueue
  // The warranty cell's window, in days (the notification rules).
  warrantyDays: number
  // asset:view: the per-issue register export.
  canAssetExport: boolean
  // asset:edit: the fix button; without it the row opens the asset page.
  canEdit: boolean
  crossScope: {
    cards: ReportCrossScopeCard[]
    rows: AssetCrossScopeSummaryRow[]
    exportHref?: string
    // "ไม่รวมตัวกรองสถานะ" when a status filter is set: the cross-scope counts leave it out (spec §5).
    statusNote?: string
  }
  insights: {
    custodians: ReportInsightRow[]
    locations: ReportInsightRow[]
    repairs: ReportInsightRow[]
    idleAssetsCount: number
  }
  labels: ReportsOperationsLabels
}

// The operations tab (group 10 plan 2 Task 1, spec §5, board RP-Ops): the register data-fix queue first (the five
// cells filter it by `issue=`, the equation says how they add up, one page of 8 rows with each row's fix, paging by
// `qpage=`, and for one chosen issue the register list and its export), then the cross-scope counts with their preview,
// the idle-180-days count and the three top-5 lists, all as before. Server-safe.
export async function ReportsOperationsView({
  locale,
  filters,
  hasActiveFilters,
  hasMatchingAssets,
  filteredEmptyCopy,
  queue,
  warrantyDays,
  canAssetExport,
  canEdit,
  crossScope,
  insights,
  labels,
}: ReportsOperationsViewProps) {
  const t = await getTranslations("reportsPage")
  const tCommon = await getTranslations("common")
  const issueLabels: Record<ReportIssueKind, string> = {
    responsibility: labels.missingCustodian,
    serial: labels.missingSerial,
    photo: labels.missingPhoto,
    warranty: labels.warrantyExpiring,
  }
  const issueFoots: Record<ReportIssueKind, string> = {
    responsibility: t("opsFootResponsibility"),
    serial: t("opsFootSerial"),
    photo: t("opsFootPhoto"),
    warranty: t("opsFootWarranty", { days: warrantyDays }),
  }
  // Each issue's register list and export: the operations scope with that dataQuality value (the counts' own where).
  const registerQueries: Record<ReportIssueKind, string> = {
    responsibility: buildAssetQueryString(filters, { dataQuality: "responsibility", activity: "", page: 1 }),
    serial: buildAssetQueryString(filters, { dataQuality: "serial", activity: "", page: 1 }),
    photo: buildAssetQueryString(filters, { dataQuality: "photo", activity: "", page: 1 }),
    warranty: buildAssetQueryString(filters, { dataQuality: "warranty", activity: "", page: 1 }),
  }
  const queueCells = [
    { key: "all" as ReportIssueChoice, label: t("opsQueueAll"), value: queue.distinct, foot: undefined as string | undefined },
    ...REPORT_ISSUE_KINDS.map((kind) => ({ key: kind as ReportIssueChoice, label: issueLabels[kind], value: queue.counts[kind], foot: issueFoots[kind] })),
  ]
  const chosenLabel = queue.issue === "all" ? t("opsQueueAll") : issueLabels[queue.issue]
  const idleAssetsHref = `/${locale}/assets?${buildAssetQueryString(filters, {
    activity: "idle_180d",
    dataQuality: "",
    page: 1,
  })}`
  const dataQualityEmpty = selectReportEmptyCopy({
    hasActiveFilters,
    hasMatchingAssets,
    filtered: filteredEmptyCopy,
    dataset: labels.dataQualityEmpty,
  })
  const crossScopeEmpty = selectReportEmptyCopy({
    hasActiveFilters,
    hasMatchingAssets,
    filtered: filteredEmptyCopy,
    dataset: labels.crossScopeEmpty,
  })
  const insightsEmpty = selectReportEmptyCopy({
    hasActiveFilters,
    hasMatchingAssets,
    filtered: filteredEmptyCopy,
    dataset: labels.noActivity,
  })
  const crossScopeCount = (key: string) => crossScope.cards.find((card) => card.key === key)?.value ?? 0
  const crossScopeParts = {
    custodianCompany: crossScopeCount("custodian_company"),
    custodianBranch: crossScopeCount("custodian_branch"),
    locationBranch: crossScopeCount("location_branch"),
  }
  const fixPlace = (row: OperationsQueueRow) =>
    t(row.fix.place === "edit" ? "opsFixPlaceEdit" : "opsFixPlaceDetail", { field: t(`opsField_${row.fix.fieldKey}`) })

  return (
    <div className="space-y-5">
      <ContentPanel
        id={OPERATIONS_QUEUE_ANCHOR}
        className="scroll-mt-4"
        title={t("opsQueueTitle")}
        description={t("opsQueueHelp")}
        actions={
          <Link href={`/${locale}/admin/data-quality`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {labels.openDataQualityRules}
          </Link>
        }
      >
        {/* Five cells, each a filter of the queue (issue=); the current one is aria-current. Two a row below lg. */}
        <div data-report-ops-cells>
          <StatStrip
            items={queueCells.map((cell) => ({
              key: cell.key,
              label: cell.label,
              value: formatCount(cell.value),
              unit: t("opsUnit"),
              foot: cell.foot,
              href: queue.links.cells[cell.key],
              current: queue.issue === cell.key,
            }))}
          />
        </div>
        <p data-report-ops-equation className="mt-3 text-meta text-muted-foreground text-pretty">
          {t("opsQueueEquation", {
            distinct: queue.distinct,
            incomplete: queue.incompleteDistinct,
            warrantyOnly: queue.warrantyOnly,
            responsibility: queue.counts.responsibility,
            serial: queue.counts.serial,
            photo: queue.counts.photo,
            issueTotal: queue.issueTotal,
          })}
        </p>

        <div data-report-ops-queue-head className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{t("opsQueueHeader", { issue: chosenLabel, count: queue.total })}</h3>
            {/* Shows each row's other issues too (others=1); under ทั้งหมดในคิว every row shows all its issues already. */}
            {queue.issue !== "all" ? (
              <Link
                data-report-ops-others
                href={queue.links.toggleOthers}
                className={cn(linkVariants(), "mt-1 inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}
              >
                {queue.others ? <Check aria-hidden="true" className="size-4" /> : <Square aria-hidden="true" className="size-4" />}
                {queue.others ? t("opsHideOthers") : t("opsShowOthers")}
              </Link>
            ) : null}
          </div>
          {queue.issue !== "all" ? (
            <div className="flex min-w-0 flex-col gap-1.5 lg:items-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link data-report-ops-register href={`/${locale}/assets?${registerQueries[queue.issue]}`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  {t("opsOpenInRegister")}
                </Link>
                {canAssetExport && queue.exportIssue ? (
                  // An /api download is a plain <a> (M31).
                  <a data-report-ops-export href={"/api/assets/export?" + registerQueries[queue.exportIssue]} download className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("opsExport", { count: queue.total })}
                  </a>
                ) : null}
              </div>
              {canAssetExport && queue.exportIssue && assetExportCapped(queue.total) ? (
                <p data-report-ops-export-cap className="text-meta text-muted-foreground lg:text-right">{t("opsExportCapped", { count: queue.total, max: ASSET_EXPORT_MAX_ROWS })}</p>
              ) : null}
            </div>
          ) : (
            <p data-report-ops-export-pick className="text-meta text-muted-foreground">{t("opsExportPick")}</p>
          )}
        </div>

        <div className="mt-3">
          {queue.rows.length === 0 ? (
            <EmptyNote>{dataQualityEmpty}</EmptyNote>
          ) : (
            <>
              <DataTable data-report-ops-table caption={t("opsQueueTableCaption", { issue: chosenLabel })} className="hidden md:block">
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("opsColAsset")}</DataTableHead>
                    <DataTableHead>{t("opsColIssues")}</DataTableHead>
                    <DataTableHead>{t("opsColCategoryBranch")}</DataTableHead>
                    <DataTableHead>{t("opsColFix")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {queue.rows.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="min-w-56">
                        <QueueAssetName locale={locale} asset={asset} />
                      </DataTableCell>
                      <DataTableCell>
                        <QueueIssueBadges locale={locale} asset={asset} canEdit={canEdit} labels={issueLabels} t={t} />
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        <span className="block">{asset.categoryName}</span>
                        <span className="block text-meta text-faint-foreground">{asset.branchName}</span>
                      </DataTableCell>
                      <DataTableCell className="min-w-44">
                        <QueueFix locale={locale} asset={asset} canEdit={canEdit} fixLabel={labels.fixData} place={fixPlace(asset)} openLabel={t("opsOpenAssetPage")} noEditLabel={t("opsNoEditRight")} t={t} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
              {/* Phones: one card a row, the fix button full width (board RP-Phone). */}
              <ul data-report-ops-cards className="divide-y divide-border-soft rounded-md border border-border md:hidden">
                {queue.rows.map((asset) => (
                  <li key={asset.id} className="space-y-2 px-4 py-3">
                    <QueueAssetName locale={locale} asset={asset} />
                    <QueueIssueBadges locale={locale} asset={asset} canEdit={canEdit} labels={issueLabels} t={t} />
                    <p className="text-meta text-muted-foreground">{asset.categoryName} · {asset.branchName}</p>
                    <QueueFix locale={locale} asset={asset} canEdit={canEdit} fixLabel={labels.fixData} place={fixPlace(asset)} openLabel={t("opsOpenAssetPage")} noEditLabel={t("opsNoEditRight")} t={t} fullWidth />
                  </li>
                ))}
              </ul>
            </>
          )}
          {queue.total > 0 ? (
            <Pagination
              className="mt-3"
              page={queue.page}
              totalPages={queue.pageCount}
              previousHref={queue.links.previous}
              nextHref={queue.links.next}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: formatCount(queue.page), total: formatCount(queue.pageCount) }),
                range: t("opsQueueRange", { from: queue.from, to: queue.to, total: queue.total }),
              }}
            />
          ) : null}
        </div>
      </ContentPanel>

      <ContentPanel
        title={labels.crossScopeTitle}
        description={labels.crossScopeHelp}
        actions={
          crossScope.exportHref ? (
            // An /api download is a plain <a> (M31).
            <a href={crossScope.exportHref} download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {labels.exportCrossScopeAssets}
            </a>
          ) : undefined
        }
      >
        <StatStrip items={crossScope.cards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
        <p data-report-ops-cross-scope-equation className="mt-3 text-meta text-muted-foreground text-pretty">
          {t("opsCrossScopeEquation", {
            ...crossScopeParts,
            sum: crossScopeParts.custodianCompany + crossScopeParts.custodianBranch + crossScopeParts.locationBranch,
            all: crossScopeCount("all"),
          })}
        </p>
        {crossScope.statusNote ? (
          <p data-report-ops-cross-scope-status className="mt-1 text-meta text-muted-foreground text-pretty">{crossScope.statusNote}</p>
        ) : null}
        <CrossScopePreviewTable rows={crossScope.rows} locale={locale} emptyLabel={crossScopeEmpty} labels={labels} />
      </ContentPanel>

      <ContentPanel title={labels.idleAssets} description={labels.idleAssetsHelp}>
        <Link href={idleAssetsHref} data-report-ops-idle className="flex min-h-11 flex-wrap items-baseline justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="flex items-baseline gap-1">
            <span className="text-metric num text-foreground">{formatCount(insights.idleAssetsCount)}</span>
            <span className="text-base font-medium text-faint-foreground">{t("opsUnit")}</span>
          </span>
          <span className="text-sm font-medium text-primary">{t("opsOpenRegisterShort")}</span>
        </Link>
      </ContentPanel>

      <ContentPanel title={labels.operationInsightsTitle} description={labels.operationInsightsHelp}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ReportTable title={labels.frequentRepairAssets} rows={insights.repairs} emptyLabel={insightsEmpty} count={(count) => t("opsTopCountRepairs", { count })} foot={t("opsTopFootRepairs")} />
          <ReportTable title={labels.byCustodian} rows={insights.custodians} emptyLabel={insightsEmpty} count={(count) => t("opsTopCountAssets", { count })} foot={t("opsTopFootCustodians")} />
          <ReportTable title={labels.byLocation} rows={insights.locations} emptyLabel={insightsEmpty} count={(count) => t("opsTopCountAssets", { count })} foot={t("opsTopFootLocations")} />
        </div>
      </ContentPanel>
    </div>
  )
}

// Names first, the tag under it as mono meta; the name opens the asset page.
function QueueAssetName({ locale, asset }: { locale: string; asset: OperationsQueueRow }) {
  return (
    <>
      <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center font-medium md:min-h-0")}>
        {asset.name}
      </Link>
      <span className="block text-meta text-faint-foreground">
        <span className="tag">{asset.assetTag}</span>
      </span>
    </>
  )
}

// Missing data is a warning; a warranty ending soon is information (a date coming, not a gap). Each badge is a link to
// its own issue's fix place, as the old page's per-issue links: the asset page's photos or purchase section, and the
// edit page (responsibility, serial) only with asset:edit; without it those badges stay plain.
function QueueIssueBadges({
  locale,
  asset,
  canEdit,
  labels,
  t,
}: {
  locale: string
  asset: OperationsQueueRow
  canEdit: boolean
  labels: Record<ReportIssueKind, string>
  t: Translate
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {asset.issues.map((issue) => {
        const badge = <StatusBadge label={labels[issue]} tone={issue === "warranty" ? "info" : "warning"} />
        const fix = getReportIssueFix(locale, asset.id, issue)
        return fix.place === "detail" || canEdit ? (
          <Link
            key={issue}
            data-report-ops-issue={issue}
            href={fix.href}
            // Named by its visible issue, then the asset name and tag, so rows with one issue sound apart (final review).
            aria-label={t("opsIssueLinkName", { issue: labels[issue], asset: asset.name, tag: asset.assetTag })}
            className="inline-flex min-h-11 items-center rounded-control transition-opacity hover:opacity-80 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
          >
            {badge}
          </Link>
        ) : (
          <span key={issue} data-report-ops-issue={issue} className="inline-flex min-h-11 items-center md:min-h-0">
            {badge}
          </span>
        )
      })}
    </div>
  )
}

function QueueFix({
  locale,
  asset,
  canEdit,
  fixLabel,
  place,
  openLabel,
  noEditLabel,
  fullWidth = false,
  t,
}: {
  locale: string
  asset: OperationsQueueRow
  canEdit: boolean
  fixLabel: string
  place: string
  openLabel: string
  noEditLabel: string
  fullWidth?: boolean
  t: Translate
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {canEdit ? (
        <Link href={asset.fix.href} aria-label={t("opsFixLinkName", { label: fixLabel, asset: asset.name, tag: asset.assetTag })} className={cn(buttonVariants({ size: "sm" }), fullWidth && "w-full")}>
          {fixLabel}
        </Link>
      ) : (
        <Link href={`/${locale}/assets/${asset.id}`} aria-label={t("opsFixLinkName", { label: openLabel, asset: asset.name, tag: asset.assetTag })} className={cn(buttonVariants({ variant: "outline", size: "sm" }), fullWidth && "w-full")}>
          {openLabel}
        </Link>
      )}
      <span className="text-meta text-faint-foreground">{canEdit ? place : noEditLabel}</span>
    </div>
  )
}

function CrossScopePreviewTable({
  rows,
  locale,
  emptyLabel,
  labels,
}: {
  rows: AssetCrossScopeSummaryRow[]
  locale: string
  emptyLabel: string
  labels: ReportsOperationsLabels
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{labels.crossScopePreviewTitle}</div>
      <ResponsiveReportList
        rows={rows}
        rowKey={(asset) => asset.id}
        emptyLabel={emptyLabel}
        caption={labels.crossScopePreviewTitle}
        columns={[
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            mobileClassName: "col-span-2",
            render: (asset) => (
              <>
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 w-full items-center md:inline-flex md:min-h-0 md:w-auto")}
                >
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
                <div className="text-xs font-normal text-muted-foreground md:mt-1">{asset.name}</div>
              </>
            ),
          },
          { key: "ownerBranch", label: labels.ownerBranch, className: "min-w-48 text-muted-foreground", render: (asset) => asset.ownerBranch },
          {
            key: "custodianBranch",
            label: labels.custodianBranch,
            className: "min-w-56 text-muted-foreground",
            render: (asset) => (
              <>
                <div>{asset.custodian}</div>
                <div className="mt-1 text-xs">{asset.custodianBranch}</div>
              </>
            ),
          },
          {
            key: "locationBranch",
            label: labels.locationBranch,
            className: "min-w-56 text-muted-foreground",
            render: (asset) => (
              <>
                <div>{asset.currentLocation}</div>
                <div className="mt-1 text-xs">{asset.currentLocationBranch}</div>
              </>
            ),
          },
          {
            key: "flags",
            label: labels.flags,
            className: "min-w-56",
            render: (asset) => (
              <div className="flex flex-wrap gap-1.5">
                {getCrossScopeFlagLabels(asset, labels).map((label) => (
                  <StatusBadge key={label} label={label} tone="warning" />
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

function getCrossScopeFlagLabels(asset: AssetCrossScopeSummaryRow, labels: ReportsOperationsLabels) {
  return getAssetCrossScopeFlagLabels(asset.flags, {
    custodianCompany: labels.custodianCompanyDifference,
    custodianBranch: labels.custodianBranchDifference,
    locationBranch: labels.locationBranchDifference,
  })
}

// One top-5 list inside the insights panel: a quiet grouping with an h3, not a panel in the panel (D9). Names first,
// the code as mono meta under it, the count with its unit, and a foot line saying what the list is.
function ReportTable({
  title,
  rows,
  emptyLabel,
  count,
  foot,
}: {
  title: string
  rows: ReportInsightRow[]
  emptyLabel: string
  count: (value: number) => string
  foot: string
}) {
  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
        ) : (
          rows.map((row) => {
            const content = (
              <>
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{row.name}</span>
                  {row.code ? (
                    <span className="block truncate text-meta text-faint-foreground">
                      <span className="tag">{row.code}</span>
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold text-foreground num">{count(row.count)}</span>
              </>
            )

            return row.href ? (
              <Link
                key={row.key}
                href={row.href}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0 md:py-1"
              >
                {content}
              </Link>
            ) : (
              <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                {content}
              </div>
            )
          })
        )}
      </div>
      <p className="mt-3 text-meta text-faint-foreground">{foot}</p>
    </section>
  )
}
