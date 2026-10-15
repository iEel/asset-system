import Link from "next/link"
import { Download } from "lucide-react"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import type { ReportCountRow } from "@/components/reports/reports-overview-view"

export type ReportDataQualityRow = {
  id: string
  assetTag: string
  name: string
  context: string
  issues: Array<{ key: string; label: string; href: string }>
  primaryFixHref: string
}

export type ReportCrossScopeCard = {
  key: string
  label: string
  value: number
  href: string
}

type ReportInsightRow = ReportCountRow & {
  href?: string
}

export type ReportsOperationsLabels = {
  dataQuality: string
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
  dataQualityActionTitle: string
  dataQualityActionHelp: string
  openDataQualityRules: string
  dataQualityEmpty: string
  openAsset: string
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
  filters: ReturnType<typeof parseAssetListParams>
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  filteredEmptyCopy: string
  dataQuality: {
    missingCustodian: number
    missingSerial: number
    missingPhoto: number
    warrantyExpiring: number
    rows: ReportDataQualityRow[]
  }
  crossScope: {
    cards: ReportCrossScopeCard[]
    rows: AssetCrossScopeSummaryRow[]
    exportHref?: string
  }
  insights: {
    custodians: ReportInsightRow[]
    locations: ReportInsightRow[]
    repairs: ReportInsightRow[]
    idleAssetsCount: number
  }
  labels: ReportsOperationsLabels
}

export function ReportsOperationsView({
  locale,
  filters,
  hasActiveFilters,
  hasMatchingAssets,
  filteredEmptyCopy,
  dataQuality,
  crossScope,
  insights,
  labels,
}: ReportsOperationsViewProps) {
  const dataQualityCards = [
    { key: "responsibility", dataQuality: "responsibility" as const, label: labels.missingCustodian, value: dataQuality.missingCustodian },
    { key: "serial", dataQuality: "serial" as const, label: labels.missingSerial, value: dataQuality.missingSerial },
    { key: "photo", dataQuality: "photo" as const, label: labels.missingPhoto, value: dataQuality.missingPhoto },
    { key: "warranty", dataQuality: "warranty" as const, label: labels.warrantyExpiring, value: dataQuality.warrantyExpiring },
  ].map((card) => ({
    ...card,
    href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: card.dataQuality, activity: "", page: 1 })}`,
  }))
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

  return (
    <div className="space-y-5">
      <ContentPanel title={labels.dataQuality}>
        <StatStrip items={dataQualityCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
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
        <CrossScopePreviewTable rows={crossScope.rows} locale={locale} emptyLabel={crossScopeEmpty} labels={labels} />
      </ContentPanel>

      <ContentPanel
        title={labels.dataQualityActionTitle}
        description={labels.dataQualityActionHelp}
        actions={
          <Link href={`/${locale}/admin/data-quality`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {labels.openDataQualityRules}
          </Link>
        }
      >
        <div className="grid gap-3">
          {dataQuality.rows.length === 0 ? (
            <EmptyNote>{dataQualityEmpty}</EmptyNote>
          ) : (
            dataQuality.rows.map((asset) => (
              <div key={asset.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                        <span className="tag font-medium">{asset.assetTag}</span>
                      </Link>
                      <span className="text-sm text-foreground">{asset.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{asset.context}</div>
                    {/* Each issue opens its fix: a text link (no orange pill; color lives in badges). */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {asset.issues.map((issue) => (
                        <Link key={issue.key} href={issue.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                          {issue.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link href={`/${locale}/assets/${asset.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {labels.openAsset}
                    </Link>
                    <Link href={asset.primaryFixHref} className={buttonVariants({ size: "sm" })}>
                      {labels.fixData}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ContentPanel>

      <ContentPanel title={labels.operationInsightsTitle} description={labels.operationInsightsHelp}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportTable title={labels.byCustodian} rows={insights.custodians} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.byLocation} rows={insights.locations} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.frequentRepairAssets} rows={insights.repairs} emptyLabel={insightsEmpty} />
          <section className="rounded-md border border-border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{labels.idleAssets}</h3>
            <Link href={idleAssetsHref} className="block min-h-11 rounded-md border border-border bg-surface p-4 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="text-sm text-muted-foreground">{labels.idleAssetsHelp}</div>
              <div className="mt-2 text-metric num text-foreground">{formatCount(insights.idleAssetsCount)}</div>
            </Link>
          </section>
        </div>
      </ContentPanel>
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

// One breakdown inside the insights panel: a quiet grouping with an h3, not a panel in the panel (D9).
function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportInsightRow[]; emptyLabel: string }) {
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
                <span className="truncate text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground num">{formatCount(row.count)}</span>
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
    </section>
  )
}
