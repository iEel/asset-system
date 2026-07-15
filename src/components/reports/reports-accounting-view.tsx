import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
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
      <ResponsiveReportList
        rows={rows}
        rowKey={(asset) => asset.id}
        emptyLabel={labels.empty}
        columns={[
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "repairCost", label: labels.repairCost, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.purchasePrice) },
          { key: "ratio", label: labels.ratio, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatPercent(asset.repairToPurchaseRatio) },
          { key: "repairCount", label: labels.repairCount, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.repairCount.toLocaleString("th-TH") },
        ]}
      />
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
      <ResponsiveReportList
        rows={rows}
        rowKey={(asset) => asset.id}
        emptyLabel={labels.empty}
        columns={[
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "bookValue", label: labels.bookValue, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
          { key: "usefulLife", label: labels.usefulLife, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.usefulLifeMonths.toLocaleString("th-TH") },
          { key: "ageMonths", label: labels.ageMonths, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.ageMonths.toLocaleString("th-TH") },
        ]}
      />
    </div>
  )
}

function formatPercent(value: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}
