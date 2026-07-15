import Link from "next/link"
import type React from "react"
import { Download } from "lucide-react"
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { MetricCard } from "@/components/ui/metric-card"

export type ReportRecurringExport = {
  key: string
  name: string
  cadence: string
  href: string
  owner: string
  allowed: boolean
}

export type ReportCatalogRow = {
  key: string
  label: string
  viewHref: string
  exportHref?: string
  exportLabel?: string
  exportAllowed?: boolean
}

export type ReportCatalogCategory = {
  key: string
  title: string
  description: string
  audience: string
  icon: React.ReactNode
  reports: ReportCatalogRow[]
}

export type ReportPermissionRow = {
  key: string
  label: string
  allowed: boolean
}

export type ReportsCatalogLabels = {
  catalogItems: string
  savedReportsTitle: string
  savedReportsHelp: string
  presetName: string
  saveCurrentPreset: string
  savedPresetsEmpty: string
  savedPresetsDeviceOnly: string
  deletePreset: string
  presetNameRequired: string
  runNow: string
  notAllowed: string
  reportCatalog: string
  reportCatalogHelp: string
  openReport: string
  permissionTitle: string
  permissionHelp: string
  allowed: string
}

export type ReportsCatalogViewProps = {
  locale: string
  currentQuery: string
  hasActiveFilters: boolean
  emptyCopy: {
    filtered: string
    dataset: string
  }
  reportCount: number
  recurringReports: ReportRecurringExport[]
  categories: ReportCatalogCategory[]
  permissions: ReportPermissionRow[]
  labels: ReportsCatalogLabels
}

export function ReportsCatalogView({
  locale,
  currentQuery,
  hasActiveFilters,
  emptyCopy,
  reportCount,
  recurringReports,
  categories,
  permissions,
  labels,
}: ReportsCatalogViewProps) {
  const emptyLabel = hasActiveFilters ? emptyCopy.filtered : emptyCopy.dataset

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label={labels.catalogItems} value={reportCount.toLocaleString("th-TH")} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{labels.savedReportsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.savedReportsHelp}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <ReportPresetControls
            locale={locale}
            currentQuery={currentQuery}
            labels={{
              presetName: labels.presetName,
              saveCurrentPreset: labels.saveCurrentPreset,
              savedPresetsEmpty: labels.savedPresetsEmpty,
              savedPresetsDeviceOnly: labels.savedPresetsDeviceOnly,
              deletePreset: labels.deletePreset,
              presetNameRequired: labels.presetNameRequired,
            }}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {recurringReports.map((report) => (
              <div key={report.key} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{report.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{report.owner}</div>
                  </div>
                  <span className="rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">{report.cadence}</span>
                </div>
                {report.allowed ? (
                  <Link href={report.href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0 sm:w-auto">
                    <Download aria-hidden="true" className="h-3.5 w-3.5" />
                    {labels.runNow}
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                    {labels.notAllowed}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">{labels.reportCatalog}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.reportCatalogHelp}</p>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {categories.map((category) => (
              <div key={category.key} className="rounded-md border border-border bg-background p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">{category.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs font-medium text-primary">{category.audience}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {category.reports.map((report) => (
                    <div key={report.key} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-foreground">{report.label}</span>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link href={report.viewHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                          {labels.openReport}
                        </Link>
                        {report.exportHref && report.exportAllowed ? (
                          <Link href={report.exportHref} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 sm:h-8 sm:min-h-0">
                            <Download aria-hidden="true" className="h-3.5 w-3.5" />
                            {report.exportLabel}
                          </Link>
                        ) : report.exportHref ? (
                          <span className="inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                            {labels.notAllowed}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <summary className="cursor-pointer text-base font-semibold text-foreground">{labels.permissionTitle}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.permissionHelp}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <PermissionPill
              key={permission.key}
              label={permission.label}
              allowed={permission.allowed}
              allowedLabel={labels.allowed}
              deniedLabel={labels.notAllowed}
            />
          ))}
        </div>
      </details>
    </div>
  )
}

function PermissionPill({
  label,
  allowed,
  allowedLabel,
  deniedLabel,
}: {
  label: string
  allowed: boolean
  allowedLabel: string
  deniedLabel: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${allowed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {label}: {allowed ? allowedLabel : deniedLabel}
    </span>
  )
}
