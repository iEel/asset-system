import Link from "next/link"
import type React from "react"

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
  emptyCopy,
  previewRows,
  breakdowns,
  labels,
}: ReportsOverviewViewProps) {
  const emptyLabel = hasActiveFilters ? emptyCopy.filtered : emptyCopy.dataset

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
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <PreviewHead>{labels.assetTag}</PreviewHead>
                <PreviewHead>{labels.assetName}</PreviewHead>
                <PreviewHead>{labels.category}</PreviewHead>
                <PreviewHead>{labels.branch}</PreviewHead>
                <PreviewHead>{labels.department}</PreviewHead>
                <PreviewHead>{labels.custodian}</PreviewHead>
                <PreviewHead>{labels.ownership}</PreviewHead>
                <PreviewHead>{labels.status}</PreviewHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                previewRows.map((asset) => (
                  <tr key={asset.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{asset.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.branch}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.department}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.custodian}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.ownership}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
