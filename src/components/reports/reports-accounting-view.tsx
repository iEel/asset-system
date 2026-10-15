import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { StatStrip } from "@/components/ui/stat-strip"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { formatCount, formatMoney } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"

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
  // common.baht: the unit of the money tiles and of the money column heads.
  baht: string
}

// A money tile in the 28px metric size needs about 230px ("12,345,678.00 บาท"): one tile a row below sm and two a row
// from sm. Four in a row would leave about 130px a tile at 1024px, so these strips never take StatStrip's one-row lg.
const moneyStripClasses = "max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none"

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
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "totalRepair", label: labels.totalRepair, value: formatMoney(costInsights.totalRepairCost), unit: labels.baht },
            // No purchase value to compare with: the ratio has no value. A tile takes text, so the dash is written out.
            { key: "repairRatio", label: labels.repairRatio, value: formatPercent(costInsights.repairToPurchaseRatio) ?? "—" },
            { key: "missingPrice", label: labels.missingPrice, value: formatCount(costInsights.missingPurchasePriceCount) },
            { key: "highValueAssets", label: labels.highValueAssets, value: formatCount(costInsights.highValueAssetCount) },
          ]}
        />
        <CostExposureTable
          title={labels.highRepairRisk}
          rows={costInsights.highRepairExposureAssets}
          locale={locale}
          labels={{
            asset: labels.asset,
            repairCost: moneyHead(labels.repairCost, labels.baht),
            purchasePrice: moneyHead(labels.purchasePrice, labels.baht),
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
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "acquisitionCost", label: labels.acquisitionCost, value: formatMoney(depreciationSummary.totalAcquisitionCost), unit: labels.baht },
            { key: "residualValue", label: labels.residualValue, value: formatMoney(depreciationSummary.totalResidualValue), unit: labels.baht },
            { key: "accumulatedDepreciation", label: labels.accumulatedDepreciation, value: formatMoney(depreciationSummary.totalAccumulatedDepreciation), unit: labels.baht },
            { key: "netBookValue", label: labels.netBookValue, value: formatMoney(depreciationSummary.totalNetBookValue), unit: labels.baht },
            { key: "fullyDepreciated", label: labels.fullyDepreciated, value: formatCount(depreciationSummary.fullyDepreciatedCount) },
            { key: "missingInfo", label: labels.missingInfo, value: formatCount(depreciationSummary.missingAccountingInfoCount) },
          ]}
        />
        <DepreciationTable
          title={labels.topBookValueAssets}
          rows={depreciationSummary.topNetBookValueAssets}
          locale={locale}
          labels={{
            asset: labels.asset,
            bookValue: moneyHead(labels.bookValue, labels.baht),
            accumulated: moneyHead(labels.accumulatedDepreciation, labels.baht),
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
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "repairCost", label: labels.repairCost, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatMoney(asset.purchasePrice)) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatPercent(asset.repairToPurchaseRatio)) },
          { key: "repairCount", label: labels.repairCount, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.repairCount) },
        ]}
        caption={title}
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
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "bookValue", label: labels.bookValue, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
          { key: "usefulLife", label: labels.usefulLife, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.usefulLifeMonths) },
          { key: "ageMonths", label: labels.ageMonths, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.ageMonths) },
        ]}
        caption={title}
      />
    </div>
  )
}

// A share of the whole, in Thai digits like formatCount. null means there is nothing to compare with: no value.
function formatPercent(value: number | null): string | null {
  if (value == null) return null
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}

// A money column names its unit in the head, "ค่าซ่อม (บาท)", and its cells hold the number only (spec 2B §5.7).
function moneyHead(label: string, unit: string) {
  return `${label} (${unit})`
}
