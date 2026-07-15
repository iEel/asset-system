import Link from "next/link"
import type React from "react"
import { Download } from "lucide-react"
import { MetricCard } from "@/components/ui/metric-card"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
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
    custodians: ReportCountRow[]
    locations: ReportCountRow[]
    repairs: ReportCountRow[]
    idleAssetsCount: number
    idleAssetsHref: string
  }
  labels: ReportsOperationsLabels
}

export function ReportsOperationsView({
  locale,
  hasActiveFilters,
  hasMatchingAssets,
  filteredEmptyCopy,
  dataQuality,
  crossScope,
  insights,
  labels,
}: ReportsOperationsViewProps) {
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
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">{labels.dataQuality}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <MetricCard label={labels.missingCustodian} value={dataQuality.missingCustodian.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.missingSerial} value={dataQuality.missingSerial.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.missingPhoto} value={dataQuality.missingPhoto.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.warrantyExpiring} value={dataQuality.warrantyExpiring.toLocaleString("th-TH")} compact />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.crossScopeTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.crossScopeHelp}</p>
          </div>
          {crossScope.exportHref ? (
            <Link
              href={crossScope.exportHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {labels.exportCrossScopeAssets}
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crossScope.cards.map((card) => (
            <Link key={card.key} href={card.href} className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</div>
            </Link>
          ))}
        </div>
        <CrossScopePreviewTable rows={crossScope.rows} locale={locale} emptyLabel={crossScopeEmpty} labels={labels} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.dataQualityActionTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.dataQualityActionHelp}</p>
          </div>
          <Link href={`/${locale}/admin/data-quality`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit">
            {labels.openDataQualityRules}
          </Link>
        </div>
        <div className="grid gap-3">
          {dataQuality.rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {dataQualityEmpty}
            </div>
          ) : (
            dataQuality.rows.map((asset) => (
              <div key={asset.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/${locale}/assets/${asset.id}`} className="font-semibold text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                      <span className="text-sm text-foreground">{asset.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{asset.context}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {asset.issues.map((issue) => (
                        <Link key={issue.key} href={issue.href} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20">
                          {issue.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                      {labels.openAsset}
                    </Link>
                    <Link href={asset.primaryFixHref} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 sm:h-8 sm:min-h-0">
                      {labels.fixData}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{labels.operationInsightsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.operationInsightsHelp}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportTable title={labels.byCustodian} rows={insights.custodians} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.byLocation} rows={insights.locations} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.frequentRepairAssets} rows={insights.repairs} emptyLabel={insightsEmpty} />
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">{labels.idleAssets}</h2>
            <Link href={insights.idleAssetsHref} className="block rounded-md border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10">
              <div className="text-sm text-muted-foreground">{labels.idleAssetsHelp}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{insights.idleAssetsCount.toLocaleString("th-TH")}</div>
            </Link>
          </section>
        </div>
      </section>
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
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.ownerBranch}</PreviewHead>
                <PreviewHead>{labels.custodianBranch}</PreviewHead>
                <PreviewHead>{labels.locationBranch}</PreviewHead>
                <PreviewHead>{labels.flags}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => {
                const flagLabels = getAssetCrossScopeFlagLabels(asset.flags, {
                  custodianCompany: labels.custodianCompanyDifference,
                  custodianBranch: labels.custodianBranchDifference,
                  locationBranch: labels.locationBranchDifference,
                })

                return (
                  <tr key={asset.id}>
                    <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                      <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                      <div className="mt-1 text-xs font-normal text-muted-foreground">{asset.name}</div>
                    </td>
                    <td className="min-w-48 px-4 py-3 text-muted-foreground">{asset.ownerBranch}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      <div>{asset.custodian}</div>
                      <div className="mt-1 text-xs">{asset.custodianBranch}</div>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      <div>{asset.currentLocation}</div>
                      <div className="mt-1 text-xs">{asset.currentLocationBranch}</div>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {flagLabels.map((label) => (
                          <span key={label} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PreviewHead({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportCountRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">{row.count.toLocaleString("th-TH")}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
