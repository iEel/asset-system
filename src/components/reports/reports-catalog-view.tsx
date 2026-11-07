import Link from "next/link"
import type React from "react"
import { Download } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import {
  catalogExportState,
  catalogLastExportLine,
  groupReportCatalog,
  type CatalogPermission,
  type CatalogReport,
  type CatalogSection,
} from "@/lib/report-catalog"
import type { ReportExportKey } from "@/lib/report-export-log"
import { cn } from "@/lib/utils"

export type ReportPermissionRow = {
  key: string
  label: string
  allowed: boolean
}

export type ReportsCatalogViewProps = {
  locale: string
  // The current report query: the presets save it.
  currentQuery: string
  hasActiveFilters: boolean
  // The chips as text ("บริษัท: … · สาขา: …"), for the scope badge of the reports that follow the filters.
  filterSummary: string
  // The assets the filters match (the scope legend).
  totalAssets: number
  emptyCopy: {
    filtered: string
    dataset: string
  }
  reports: CatalogReport[]
  lastExports: Partial<Record<ReportExportKey, Date>>
  // Whether this person holds the permission an export route requires.
  canExport: (permission: CatalogPermission) => boolean
  // "สิทธิ์รายงานของคุณ": the six exports with ใช้ได้ or ไม่มีสิทธิ์ (kept; the E2E reads it).
  permissions: ReportPermissionRow[]
}

type Translate = Awaited<ReturnType<typeof getTranslations>>

// The catalog (group 10 spec §6, board RP-Library): one section per audience with its reports as cards (scope, cadence,
// formats, last export, open and export), then the scope legend, the saved presets and the permission list beside them
// from lg (after them below lg). Server component.
export async function ReportsCatalogView({
  locale,
  currentQuery,
  hasActiveFilters,
  filterSummary,
  totalAssets,
  emptyCopy,
  reports,
  lastExports,
  canExport,
  permissions,
}: ReportsCatalogViewProps) {
  const t = await getTranslations("reportsPage")
  const tRoles = await getTranslations("adminRolesPage")
  const sections = groupReportCatalog(reports)
  const emptyLabel = hasActiveFilters ? emptyCopy.filtered : emptyCopy.dataset
  // The board pairs the one-report groups (maintenance and approvers) side by side from md.
  const rows: CatalogSection[][] = []
  for (const section of sections) {
    const previous = rows.at(-1)
    const single = section.reports.length === 1 && section.audience !== "admin"
    if (single && previous && previous.length === 1 && previous[0].reports.length === 1 && previous[0].audience !== "admin") {
      previous.push(section)
    } else {
      rows.push([section])
    }
  }
  const permissionWords = (permission: CatalogPermission) =>
    t("catalogNeedsPermission", { action: tRoles(`actions.${permission.action}`), module: tRoles(`modules.${permission.module}`) })
  const scopeText = (report: CatalogReport) =>
    report.scope === "system"
      ? t("catalogScopeSystem")
      : report.scope === "filtersNoStatus"
        ? t("catalogScopeFiltersNoStatus")
        : t("catalogScopeFilters", { filters: filterSummary })

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:items-start">
      <div data-report-catalog-sections className="flex min-w-0 flex-col gap-6">
        {sections.length === 0 ? <EmptyNote>{emptyLabel}</EmptyNote> : null}
        {rows.map((row) => (
          <div key={row.map((section) => section.audience).join("-")} className={cn("grid min-w-0 grid-cols-1 gap-6", row.length > 1 && "md:grid-cols-2 md:gap-3")}>
            {row.map((section) => (
              <CatalogSectionBlock
                key={section.audience}
                section={section}
                paired={row.length > 1}
                t={t}
                renderReport={(report) => (
                  <CatalogReportCard
                    key={report.key}
                    report={report}
                    variant={section.audience === "admin" ? "row" : "card"}
                    scope={scopeText(report)}
                    lastExports={lastExports}
                    locale={locale}
                    canExport={canExport}
                    permissionWords={permissionWords}
                    t={t}
                  />
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <section data-report-scope-legend aria-labelledby="report-scope-legend" className={cn(getPanelClasses(), "p-4")}>
          <h2 id="report-scope-legend" className="text-base font-semibold text-foreground">{t("catalogScopeLegendTitle")}</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div>
              <dt><StatusBadge label={t("catalogScopeFiltersLabel")} tone="info" /></dt>
              <dd className="mt-1 text-muted-foreground text-pretty">
                {hasActiveFilters
                  ? t("catalogScopeLegendFilters", { filters: filterSummary, count: totalAssets })
                  : t("catalogScopeLegendNoFilters", { count: totalAssets })}
              </dd>
            </div>
            <div>
              <dt><StatusBadge label={t("catalogScopeSystem")} tone="muted" /></dt>
              <dd className="mt-1 text-muted-foreground text-pretty">{t("catalogScopeLegendSystem")}</dd>
            </div>
          </dl>
        </section>

        <section data-report-presets aria-labelledby="report-presets" className={cn(getPanelClasses(), "p-4")}>
          <h2 id="report-presets" className="text-base font-semibold text-foreground">{t("assetPresetScopeTitle")}</h2>
          <p className="mt-1 text-meta text-muted-foreground text-pretty">{t("assetPresetScopeHelp")}</p>
          <div className="mt-3">
            <ReportPresetControls
              locale={locale}
              currentQuery={currentQuery}
              labels={{
                presetName: t("presetName"),
                saveCurrentPreset: t("saveCurrentPreset"),
                savedPresetsEmpty: t("savedPresetsEmpty"),
                savedPresetsDeviceOnly: t("savedPresetsDeviceOnly"),
                deletePreset: t("deletePreset"),
                presetNameRequired: t("presetNameRequired"),
                presetStorageFailed: t("presetStorageFailed"),
              }}
            />
          </div>
        </section>

        <details data-report-permissions className={cn(getPanelClasses(), "p-4")}>
          <summary className="cursor-pointer py-2.5 text-base font-semibold text-foreground md:py-0">{t("permissionTitle")}</summary>
          <p className="mt-1 text-meta text-muted-foreground text-pretty">{t("permissionHelp")}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {permissions.map((permission) => (
              <StatusBadge
                key={permission.key}
                label={`${permission.label}: ${permission.allowed ? t("allowed") : t("notAllowed")}`}
                tone={permission.allowed ? "success" : "muted"}
              />
            ))}
          </div>
        </details>
      </aside>
    </div>
  )
}

function CatalogSectionBlock({
  section,
  paired,
  t,
  renderReport,
}: {
  section: CatalogSection
  paired: boolean
  t: Translate
  renderReport: (report: CatalogReport) => React.ReactNode
}) {
  const headingId = `report-catalog-${section.audience}`
  const notes = section.reports.flatMap((report) => (report.note ? [report.note] : []))
  const isList = section.audience === "admin"

  return (
    <section data-report-catalog-section={section.audience} aria-labelledby={headingId} className="min-w-0">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-foreground text-pretty">{t(section.titleKey)}</h2>
          <p className="text-meta text-muted-foreground text-pretty">{t(section.forKey)}</p>
        </div>
        <span className="ms-auto shrink-0 text-meta text-muted-foreground tabular-nums">{t("catalogGroupCount", { count: section.reports.length })}</span>
      </div>
      {isList ? (
        <ul className={cn(getPanelClasses(), "divide-y divide-border")}>
          {section.reports.map((report) => (
            <li key={report.key}>{renderReport(report)}</li>
          ))}
        </ul>
      ) : (
        <div className={cn("grid grid-cols-1 gap-3", !paired && "md:grid-cols-2")}>
          {section.reports.map((report) => renderReport(report))}
        </div>
      )}
      {notes.map((note) => (
        <p key={note.textKey} className="mt-2.5 text-sm text-muted-foreground text-pretty">
          {t(note.textKey)} ·{" "}
          <Link href={note.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t(note.linkKey)}
          </Link>
        </p>
      ))}
    </section>
  )
}

function CatalogReportCard({
  report,
  variant,
  scope,
  lastExports,
  locale,
  canExport,
  permissionWords,
  t,
}: {
  report: CatalogReport
  variant: "card" | "row"
  scope: string
  lastExports: Partial<Record<ReportExportKey, Date>>
  locale: string
  canExport: (permission: CatalogPermission) => boolean
  permissionWords: (permission: CatalogPermission) => string
  t: Translate
}) {
  const title = t(report.titleKey)
  const description = t(report.descriptionKey, report.descriptionValues)
  const lastLine = catalogLastExportLine(report, lastExports, locale)
  const { allowed, missing } = catalogExportState(report, canExport)
  const formatBadges = report.formatHintKey
    ? [t(report.formatHintKey)]
    : report.formats.map((format) => (format === "pdf" ? t("catalogFormatPdf") : t("catalogFormatExcel")))

  const actions = (
    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ms-auto">
      {missing.map((permission) => (
        <span key={`${permission.module}:${permission.action}`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge label={t("catalogNoExportRight")} tone="muted" />
          <span className="text-meta text-muted-foreground">{permissionWords(permission)}</span>
        </span>
      ))}
      {report.openHref ? (
        <Link href={report.openHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
          {report.openLabelKey ? t(report.openLabelKey) : t("openReport")}
        </Link>
      ) : null}
      {/* An /api download is a plain <a> (M31): no prefetch and no client routing. */}
      {allowed.map((entry) => (
        <a
          key={entry.href}
          href={entry.href}
          download
          aria-label={t("catalogExportName", { label: t(entry.label), report: title })}
          className={buttonVariants({ variant: entry.format === "pdf" ? "outline" : "default", size: "sm" })}
        >
          {entry.format === "pdf" ? null : <Download aria-hidden="true" />}
          {t(entry.label)}
        </a>
      ))}
    </div>
  )
  const lastExport = lastLine ? (
    <p data-report-last-export className="text-meta text-muted-foreground tabular-nums">
      {lastLine.key === "catalogLastExport" ? (
        <>
          {t("catalogLastExport")}
          <br />
          {lastLine.at}
        </>
      ) : (
        t("catalogNeverExported")
      )}
    </p>
  ) : null

  if (variant === "row") {
    return (
      <div data-report-catalog-report={report.key} className="flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground text-pretty">{title}</h3>
          <p className="text-meta text-muted-foreground text-pretty">
            {[description, ...formatBadges].join(" · ")}
          </p>
          {lastExport}
        </div>
        {actions}
      </div>
    )
  }

  return (
    <article data-report-catalog-report={report.key} className={cn(getPanelClasses(), "flex min-w-0 flex-col gap-2.5 p-4")}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground text-pretty">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <StatusBadge label={scope} tone={report.scope === "system" ? "muted" : "info"} wrap />
        {report.cadenceKey ? <Chip>{t(report.cadenceKey)}</Chip> : null}
        {formatBadges.map((format) => (
          <Chip key={format}>{format}</Chip>
        ))}
      </div>
      <div className="mt-auto flex min-w-0 flex-col gap-2 border-t border-border pt-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {lastExport}
        {actions}
      </div>
    </article>
  )
}
