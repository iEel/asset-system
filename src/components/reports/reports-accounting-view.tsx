import Link from "next/link"
import type React from "react"
import { ContentPanel } from "@/components/ui/content-panel"
import { MetricCard } from "@/components/ui/metric-card"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import { formatCurrency } from "@/lib/utils"

export type ReportsAccountingLabels = {
  costTitle: string
  costHelp: string
  totalRepair: string
  repairRatio: string
  missingPrice: string
  highValueAssets: string
  highRepairRisk: string
  asset: string
  repairCost: string
  purchasePrice: string
  ratio: string
  repairCount: string
  noRepairRisk: string
  accountingTitle: string
  accountingHelp: string
  acquisitionCost: string
  residualValue: string
  accumulatedDepreciation: string
  netBookValue: string
  fullyDepreciated: string
  missingInfo: string
  topBookValueAssets: string
  bookValue: string
  depreciationRatio: string
  usefulLife: string
  ageMonths: string
  noAssets: string
}

export type ReportsAccountingViewProps = {
  locale: string
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  filteredEmptyCopy: string
  costInsights: CostInsightSummary
  depreciationSummary: DepreciationSummary
  labels: ReportsAccountingLabels
}

export function ReportsAccountingView({
  locale,
  hasActiveFilters,
  hasMatchingAssets,
  filteredEmptyCopy,
  costInsights,
  depreciationSummary,
  labels,
}: ReportsAccountingViewProps) {
  return (
    <div className="space-y-5">
      <ContentPanel title={labels.costTitle} description={labels.costHelp}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={labels.totalRepair} value={formatCurrency(costInsights.totalRepairCost)} compact />
          <MetricCard label={labels.repairRatio} value={formatPercent(costInsights.repairToPurchaseRatio)} compact />
          <MetricCard label={labels.missingPrice} value={costInsights.missingPurchasePriceCount.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.highValueAssets} value={costInsights.highValueAssetCount.toLocaleString("th-TH")} compact />
        </div>
        <CostExposureTable
          title={labels.highRepairRisk}
          rows={costInsights.highRepairExposureAssets}
          locale={locale}
          labels={{
            asset: labels.asset,
            repairCost: labels.repairCost,
            purchasePrice: labels.purchasePrice,
            ratio: labels.ratio,
            repairCount: labels.repairCount,
            empty: selectReportEmptyCopy({
              hasActiveFilters,
              hasMatchingAssets,
              filtered: filteredEmptyCopy,
              dataset: labels.noRepairRisk,
            }),
          }}
        />
      </ContentPanel>

      <ContentPanel title={labels.accountingTitle} description={labels.accountingHelp}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={labels.acquisitionCost} value={formatCurrency(depreciationSummary.totalAcquisitionCost)} compact />
          <MetricCard label={labels.residualValue} value={formatCurrency(depreciationSummary.totalResidualValue)} compact />
          <MetricCard label={labels.accumulatedDepreciation} value={formatCurrency(depreciationSummary.totalAccumulatedDepreciation)} compact />
          <MetricCard label={labels.netBookValue} value={formatCurrency(depreciationSummary.totalNetBookValue)} compact />
          <MetricCard label={labels.fullyDepreciated} value={depreciationSummary.fullyDepreciatedCount.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.missingInfo} value={depreciationSummary.missingAccountingInfoCount.toLocaleString("th-TH")} compact />
        </div>
        <DepreciationTable
          title={labels.topBookValueAssets}
          rows={depreciationSummary.topNetBookValueAssets}
          locale={locale}
          labels={{
            asset: labels.asset,
            bookValue: labels.bookValue,
            accumulated: labels.accumulatedDepreciation,
            ratio: labels.depreciationRatio,
            usefulLife: labels.usefulLife,
            ageMonths: labels.ageMonths,
            empty: selectReportEmptyCopy({
              hasActiveFilters,
              hasMatchingAssets,
              filtered: filteredEmptyCopy,
              dataset: labels.noAssets,
            }),
          }}
        />
      </ContentPanel>
    </div>
  )
}

function CostExposureTable({
  title,
  rows,
  locale,
  labels,
}: {
  title: string
  rows: CostExposureAsset[]
  locale: string
  labels: {
    asset: string
    repairCost: string
    purchasePrice: string
    ratio: string
    repairCount: string
    empty: string
  }
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.repairCost}</PreviewHead>
                <PreviewHead>{labels.purchasePrice}</PreviewHead>
                <PreviewHead>{labels.ratio}</PreviewHead>
                <PreviewHead>{labels.repairCount}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                    <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                      {asset.label}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.repairCost)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.purchasePrice)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPercent(asset.repairToPurchaseRatio)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.repairCount.toLocaleString("th-TH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DepreciationTable({
  title,
  rows,
  locale,
  labels,
}: {
  title: string
  rows: DepreciableAsset[]
  locale: string
  labels: {
    asset: string
    bookValue: string
    accumulated: string
    ratio: string
    usefulLife: string
    ageMonths: string
    empty: string
  }
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.asset}</PreviewHead>
                <PreviewHead>{labels.bookValue}</PreviewHead>
                <PreviewHead>{labels.accumulated}</PreviewHead>
                <PreviewHead>{labels.ratio}</PreviewHead>
                <PreviewHead>{labels.usefulLife}</PreviewHead>
                <PreviewHead>{labels.ageMonths}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                    <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                      {asset.label}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.netBookValue)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.accumulatedDepreciation)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPercent(asset.depreciatedRatio)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.usefulLifeMonths.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.ageMonths.toLocaleString("th-TH")}</td>
                </tr>
              ))}
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

function formatPercent(value: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}
