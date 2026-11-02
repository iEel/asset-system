import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowRight, ChevronDown, FileDown, ListFilter } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { buildAssetImportHistory, type AssetImportHistoryItem } from "@/lib/asset-import-history"
import { buildImportIssueParts, type AssetImportTranslate } from "@/lib/asset-import-wizard"
import { ASSET_EXPORT_MAX_ROWS, assetExportAllWhere, exportAllCountKey } from "@/lib/asset-export-limits"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn, formatDateTime } from "@/lib/utils"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
}

// Appendix A: the history holds the last 10 batches.
const IMPORT_HISTORY_LIMIT = 10
// P5-R7: a history row unfolds its first 3 skipped rows; the rest is a count.
const HISTORY_SKIPPED_ROWS_SHOWN = 3

export default async function AssetImportExportPage({ params }: AssetImportExportPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "asset", "view")
  // The import template and the import wizard need asset:create (their routes check it; the E2E suite's M2).
  const canImport = hasPermission(user, "asset", "create")
  const t = await getTranslations("asset")
  const tTools = await getTranslations("assetTools")
  const [importLogs, exportCount] = await Promise.all([
    prisma.systemLog.findMany({
      where: { module: "asset", action: "import_batch" },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: IMPORT_HISTORY_LIMIT,
    }),
    // P5-R10: the count the unfiltered export writes from, from the same where as the route.
    prisma.asset.count({ where: assetExportAllWhere() }),
  ])
  const importHistory = buildAssetImportHistory(importLogs)
  // The Thai field names the skipped rows' issue lines use, as the preview does.
  const fields = t.raw("importField") as Record<string, string>

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={tTools("importExportTitle")} meta={tTools("importExportPage.subtitle")} />

      {/* P5-R8: the import card on the left and a 350px column from lg. P5-R9: a viewer has no import card, so the
          export card and the history are the one column. */}
      <div className={cn("grid items-start gap-6", canImport && "lg:grid-cols-[minmax(0,1fr)_350px]")}>
        {canImport ? (
          <AssetImportPreviewPanel />
        ) : null}
        <div className="grid min-w-0 gap-6">
          <ContentPanel divided flush title={tTools("importExportPage.exportTitle")}>
            <div className="divide-y divide-border-soft">
              {/* A file from an /api route: a plain <a download> (spec 2D M31). */}
              <a href="/api/assets/export" download className={exportRowClasses}>
                <span aria-hidden="true" className={exportIconClasses}>
                  <FileDown className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">{tTools("importExportPage.exportAll")}</span>
                  <span className="block text-sm text-muted-foreground">{tTools("importExportPage.exportAllDescription")}</span>
                  <span className="num block text-meta text-muted-foreground">
                    {tTools(`importExportPage.${exportAllCountKey(exportCount)}`, { count: exportCount, max: ASSET_EXPORT_MAX_ROWS })}
                  </span>
                </span>
              </a>
              {/* The register's export menu shows from md only, so the way to it does too (recon export.md D6). */}
              <Link href={`/${locale}/assets`} className={cn(exportRowClasses, "hidden md:flex")}>
                <span aria-hidden="true" className={exportIconClasses}>
                  <ListFilter className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    {tTools("importExportPage.exportFiltered")}
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                  </span>
                  <span className="block text-sm text-muted-foreground">{tTools("importExportPage.exportFilteredDescription")}</span>
                </span>
              </Link>
            </div>
          </ContentPanel>

          <ContentPanel
            divided
            flush
            title={tTools("importExportPage.historyTitle")}
            actions={<span className="num text-meta text-muted-foreground">{tTools("importExportPage.historyRecent", { count: IMPORT_HISTORY_LIMIT })}</span>}
          >
            {importHistory.length === 0 ? (
              <EmptyNote padded>{tTools("importExportPage.historyEmpty")}</EmptyNote>
            ) : (
              <ContentPanelRows>
                {importHistory.map((batch) => (
                  <ImportHistoryRow key={batch.id} batch={batch} t={t} tTools={tTools} fields={fields} locale={locale} />
                ))}
              </ContentPanelRows>
            )}
          </ContentPanel>
        </div>
      </div>
    </div>
  )
}

// A row of the export card: the whole row is the link, with the row hover and an inset focus ring (the panel's edge).
const exportRowClasses = "flex min-h-11 gap-3 px-4 py-3.5 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
const exportIconClasses = "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground"

type Translate = Awaited<ReturnType<typeof getTranslations>>

function ImportHistoryRow({
  batch,
  t,
  tTools,
  fields,
  locale,
}: {
  batch: AssetImportHistoryItem
  t: Translate
  tTools: Translate
  fields: Record<string, string>
  locale: string
}) {
  const shownRows = batch.skippedRows.slice(0, HISTORY_SKIPPED_ROWS_SHOWN)
  const moreRows = Math.max(0, batch.skipped - shownRows.length)

  // P5-R7: titled by the file name; the badge says what happened (every row imported, or some skipped), not the preview's
  // status. An old log with no skipped rows still reads from its counts.
  return (
    <li className="min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 break-words font-semibold text-foreground">{batch.fileName}</h3>
        <StatusBadge
          className="ms-auto shrink-0"
          label={tTools(batch.outcome === "complete" ? "importExportPage.outcomeComplete" : "importExportPage.outcomePartial")}
          tone={batch.outcome === "complete" ? "success" : "warning"}
        />
      </div>
      <p className="num text-muted-foreground">
        {tTools("importExportPage.historyCounts", { imported: batch.imported, total: batch.totalRows, skipped: batch.skipped })}
      </p>
      <p className="text-meta text-muted-foreground">
        {tTools("importExportPage.historyMeta", { name: batch.approvedByLabel, date: formatDateTime(batch.createdAt) })}
      </p>
      {shownRows.length > 0 ? (
        <details className="group/skipped mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-primary md:min-h-0">
            {tTools("importExportPage.skippedRowsToggle", { count: batch.skipped })}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 motion-safe:transition-transform group-open/skipped:rotate-180" />
          </summary>
          <ul className="mt-2 space-y-3 border-t border-border-soft pt-3">
            {shownRows.map((row) => (
              <li key={row.row} className="flex min-w-0 gap-2">
                <span className="num shrink-0 text-muted-foreground">{tTools("importExportPage.skippedRowLabel", { row: row.row })}</span>
                <div className="min-w-0">
                  <div className="break-words text-foreground">{orNil(row.name)}</div>
                  {row.assetTag ? (
                    <div className="tag break-words text-muted-foreground">{row.assetTag}</div>
                  ) : (
                    <div className="text-meta text-muted-foreground">{tTools("importExportPage.skippedRowNoTag")}</div>
                  )}
                  <SkippedRowIssues row={row} t={t} fields={fields} locale={locale} />
                </div>
              </li>
            ))}
            {moreRows > 0 ? (
              <li className="text-meta text-muted-foreground">{tTools("importExportPage.skippedRowsMore", { count: moreRows })}</li>
            ) : null}
          </ul>
        </details>
      ) : null}
    </li>
  )
}

// The same two lines the preview table shows (P5-R4), from the same pure helper, so the words cannot drift apart.
function SkippedRowIssues({
  row,
  t,
  fields,
  locale,
}: {
  row: AssetImportHistoryItem["skippedRows"][number]
  t: Translate
  fields: Record<string, string>
  locale: string
}) {
  if (row.issues.length === 0) return null
  return (
    <ul className="mt-1 space-y-1">
      {row.issues.map((issue, index) => {
        const parts = buildImportIssueParts(issue, t as AssetImportTranslate, { fields, locale })
        return (
          <li key={`${issue.field}:${issue.code}:${index}`}>
            <p className="text-danger">{parts.line}</p>
            {parts.value || parts.usedBy ? (
              <p className="break-words text-meta text-muted-foreground">
                {parts.value}
                {parts.usedBy ? (
                  <>
                    {parts.value ? parts.separator : null}
                    {parts.usedBy.before}
                    <Link href={parts.usedBy.href} className={cn(linkVariants({ size: "inherit" }), "tag")}>
                      {parts.usedBy.tag}
                    </Link>
                    {parts.usedBy.after}
                  </>
                ) : null}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
