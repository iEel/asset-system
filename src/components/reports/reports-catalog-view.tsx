import Link from "next/link"
import type React from "react"
import { Download } from "lucide-react"
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

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
  assetPresetScopeTitle: string
  assetPresetScopeHelp: string
  moduleExportScopeTitle: string
  moduleExportScopeHelp: string
  presetName: string
  saveCurrentPreset: string
  savedPresetsEmpty: string
  savedPresetsDeviceOnly: string
  deletePreset: string
  presetNameRequired: string
  presetStorageFailed: string
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
      <StatStrip className="sm:max-w-sm" items={[{ key: "catalogItems", label: labels.catalogItems, value: formatCount(reportCount) }]} />

      <ContentPanel title={labels.assetPresetScopeTitle} description={labels.assetPresetScopeHelp}>
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
            presetStorageFailed: labels.presetStorageFailed,
          }}
        />
      </ContentPanel>

      <ContentPanel title={labels.moduleExportScopeTitle} description={labels.moduleExportScopeHelp}>
        <div className="grid gap-3 md:grid-cols-2">
          {recurringReports.map((report) => (
            <div key={report.key} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{report.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{report.owner}</div>
                </div>
                <Chip>{report.cadence}</Chip>
              </div>
              {/* An /api download is a plain <a> (M31): no prefetch and no client routing. */}
              {report.allowed ? (
                <a href={report.href} download className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full sm:w-auto")}>
                  <Download aria-hidden="true" />
                  {labels.runNow}
                </a>
              ) : (
                <StatusBadge label={labels.notAllowed} tone="muted" className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </ContentPanel>

      <ContentPanel title={labels.reportCatalog} description={labels.reportCatalogHelp}>
        {categories.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {categories.map((category) => (
              <div key={category.key} className="rounded-md border border-border bg-background p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div aria-hidden="true" className="text-muted-foreground">{category.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">{category.audience}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {category.reports.map((report) => (
                    <div key={report.key} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-foreground">{report.label}</span>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link href={report.viewHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          {labels.openReport}
                        </Link>
                        {report.exportHref && report.exportAllowed ? (
                          <a href={report.exportHref} download className={buttonVariants({ size: "sm" })}>
                            <Download aria-hidden="true" />
                            {report.exportLabel}
                          </a>
                        ) : report.exportHref ? (
                          <StatusBadge label={labels.notAllowed} tone="muted" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentPanel>

      <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <summary className="cursor-pointer text-base font-semibold text-foreground">{labels.permissionTitle}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.permissionHelp}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {permissions.map((permission) => (
            <StatusBadge
              key={permission.key}
              label={`${permission.label}: ${permission.allowed ? labels.allowed : labels.notAllowed}`}
              tone={permission.allowed ? "success" : "muted"}
            />
          ))}
        </div>
      </details>
    </div>
  )
}
