import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"

export type ReportCountRow = {
  key: string
  label: string
  count: number
}

export type ReportAssetPreviewRow = {
  id: string
  assetTag: string
  name: string
  category: string
  branch: string
  department: string
  custodian: string
  ownership: string
  status: string
}

export type ReportsOverviewLabels = {
  previewTitle: string
  previewHelp: string
  previewCount: string
  assetTag: string
  assetName: string
  category: string
  branch: string
  department: string
  custodian: string
  ownership: string
  status: string
  byStatus: string
  byCategory: string
  byCompany: string
  byBranch: string
  byDepartment: string
  byOwnership: string
}

export type ReportsOverviewViewProps = {
  locale: string
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  emptyCopy: {
    filtered: string
    dataset: string
  }
  previewRows: ReportAssetPreviewRow[]
  breakdowns: {
    status: ReportCountRow[]
    category: ReportCountRow[]
    company: ReportCountRow[]
    branch: ReportCountRow[]
    department: ReportCountRow[]
    ownership: ReportCountRow[]
  }
  labels: ReportsOverviewLabels
}

export function ReportsOverviewView({
  locale,
  hasActiveFilters,
  hasMatchingAssets,
  emptyCopy,
  previewRows,
  breakdowns,
  labels,
}: ReportsOverviewViewProps) {
  const emptyLabel = selectReportEmptyCopy({ hasActiveFilters, hasMatchingAssets, ...emptyCopy })

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.previewTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.previewHelp}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{labels.previewCount}</span>
        </div>
        <ResponsiveReportList
          rows={previewRows}
          rowKey={(asset) => asset.id}
          emptyLabel={emptyLabel}
          columns={[
            {
              key: "assetTag",
              label: labels.assetTag,
              className: "whitespace-nowrap font-medium text-foreground",
              mobileClassName: "col-span-2",
              render: (asset) => (
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
                >
                  {asset.assetTag}
                </Link>
              ),
            },
            {
              key: "name",
              label: labels.assetName,
              className: "min-w-56 text-foreground",
              mobileClassName: "col-span-2",
              render: (asset) => asset.name,
            },
            { key: "category", label: labels.category, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.category },
            { key: "branch", label: labels.branch, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.branch },
            { key: "department", label: labels.department, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.department },
            { key: "custodian", label: labels.custodian, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.custodian },
            { key: "ownership", label: labels.ownership, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.ownership },
            { key: "status", label: labels.status, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.status },
          ]}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={labels.byStatus} rows={breakdowns.status} emptyLabel={emptyLabel} />
        <ReportTable title={labels.byCategory} rows={breakdowns.category} emptyLabel={emptyLabel} />
        <ReportTable title={labels.byCompany} rows={breakdowns.company} emptyLabel={emptyLabel} />
        <ReportTable title={labels.byBranch} rows={breakdowns.branch} emptyLabel={emptyLabel} />
        <ReportTable title={labels.byDepartment} rows={breakdowns.department} emptyLabel={emptyLabel} />
        <ReportTable title={labels.byOwnership} rows={breakdowns.ownership} emptyLabel={emptyLabel} />
      </div>
    </div>
  )
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
