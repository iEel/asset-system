import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { getAssetImportBatchStatusTone } from "@/lib/asset-import-batch"
import { buildAssetImportHistory, type AssetImportHistoryItem } from "@/lib/asset-import-history"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn, formatDateTime } from "@/lib/utils"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetImportExportPage({ params }: AssetImportExportPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "asset", "view")
  // The import template and the import wizard need asset:create (their routes check it; the E2E suite's M2).
  const canImport = hasPermission(user, "asset", "create")
  const t = await getTranslations("asset")
  const tTools = await getTranslations("assetTools")
  const tCommon = await getTranslations("common")
  const importLogs = await prisma.systemLog.findMany({
    where: { module: "asset", action: "import_batch" },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  const importHistory = buildAssetImportHistory(importLogs)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={tTools("importExportTitle")} meta={tTools("importExportSubtitle")} />

      <section className="grid gap-3 md:grid-cols-3">
        {canImport ? (
          <ActionLink
            download
            href="/api/assets/import-template"
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title={t("downloadTemplate")}
            description={tTools("downloadTemplateDescription")}
          />
        ) : null}
        <ActionLink
          download
          href="/api/assets/export"
          icon={<FileDown className="h-5 w-5" />}
          title={t("exportFiltered")}
          description={tTools("exportAllDescription")}
        />
        <ActionLink
          href={`/${locale}/assets`}
          icon={<Download className="h-5 w-5" />}
          title={tTools("exportWithFilters")}
          description={tTools("exportWithFiltersDescription")}
        />
      </section>

      {canImport ? (
        <AssetImportPreviewPanel
          labels={{
            fields: t.raw("importField") as Record<string, string>,
            importPreview: t("importPreview"),
            chooseFile: t("chooseImportFile"),
            previewReady: t("previewReady"),
            previewErrors: t("previewErrors"),
            previewRows: t("previewRows"),
            row: t("row"),
            status: t("status"),
            errors: t("errors"),
            assetName: t("assetName"),
            assetTag: t("assetTag"),
            confirmImport: t("confirmImport"),
            fileRequired: t("fileRequired"),
            importSuccess: t("importSuccess"),
            wizardTitle: t("importWizardTitle"),
            wizardHelp: t("importWizardHelp"),
            wizardStepTemplate: t("importWizardStepTemplate"),
            wizardStepUpload: t("importWizardStepUpload"),
            wizardStepReview: t("importWizardStepReview"),
            wizardStepImport: t("importWizardStepImport"),
            wizardStepComplete: t("importWizardStepComplete"),
            selectedFile: t("selectedImportFile"),
            issueSummaryTitle: t("importIssueSummaryTitle"),
            issueSummaryHelp: t("importIssueSummaryHelp"),
            affectedRows: t("affectedRows"),
            mappingTitle: t("importMappingTitle"),
            mappingHelp: t("importMappingHelp"),
            mappingMatched: t("importMappingMatched"),
            mappingMissing: t("importMappingMissing"),
            sourceColumn: t("importSourceColumn"),
            importBatchTitle: t("importBatchTitle"),
            importBatchHelp: t("importBatchHelp"),
            importBatchId: t("importBatchId"),
            importBatchStatusReady: t("importBatchStatusReady"),
            importBatchStatusPartial: t("importBatchStatusPartial"),
            importBatchStatusBlocked: t("importBatchStatusBlocked"),
            importBatchStatusEmpty: t("importBatchStatusEmpty"),
            openImportWizard: t("openImportWizard"),
            collapseImportWizard: t("collapseImportWizard"),
          }}
        />
      ) : null}

      <ImportHistoryPanel
        history={importHistory}
        labels={{
          title: t("importHistoryTitle"),
          help: t("importHistoryHelp"),
          empty: t("importHistoryEmpty"),
          imported: t("importHistoryImported"),
          skipped: t("importHistorySkipped"),
          sourceFile: t("importHistorySourceFile"),
          approvedBy: t("importHistoryApprovedBy"),
          rollbackReady: t("importHistoryRollbackReady"),
          rollbackBlocked: t("importHistoryRollbackBlocked"),
          rollbackAssets: t("importHistoryRollbackAssets"),
          moreAssets: (count: string) => t("importHistoryMoreAssets", { count }),
          statusReady: t("importBatchStatusReady"),
          statusPartial: t("importBatchStatusPartial"),
          statusBlocked: t("importBatchStatusBlocked"),
          statusEmpty: t("importBatchStatusEmpty"),
        }}
      />

      <div>
        <Link href={`/${locale}/assets`} className={buttonVariants({ variant: "outline", size: "md" })}>
          {tCommon("back")}
        </Link>
      </div>
    </div>
  )
}

function ImportHistoryPanel({
  history,
  labels,
}: {
  history: AssetImportHistoryItem[]
  labels: {
    title: string
    help: string
    empty: string
    imported: string
    skipped: string
    sourceFile: string
    approvedBy: string
    rollbackReady: string
    rollbackBlocked: string
    rollbackAssets: string
    moreAssets: (count: string) => string
    statusReady: string
    statusPartial: string
    statusBlocked: string
    statusEmpty: string
  }
}) {
  // Spec 2D D9: the history is a ContentPanel; each batch is a quiet grouping, and its state and rollback are StatusBadges.
  return (
    <ContentPanel title={labels.title} description={labels.help}>
      {history.length === 0 ? (
        <EmptyNote>{labels.empty}</EmptyNote>
      ) : (
        <div className="grid gap-3">
          {history.map((batch) => (
            <article key={batch.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The batch id is long and must wrap, so it keeps font-mono with break-all (2D-2 R3). */}
                    <h3 className="min-w-0 text-sm font-medium text-foreground">
                      <span className="break-all font-mono">{batch.batchId}</span>
                    </h3>
                    <StatusBadge label={formatImportBatchStatus(batch.status, labels)} tone={getAssetImportBatchStatusTone(batch.status)} />
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "sourceFile", label: labels.sourceFile, value: `${batch.fileName} (${formatFileSize(batch.fileSize)})` },
                      { key: "imported", label: labels.imported, value: `${formatCount(batch.imported)}/${formatCount(batch.totalRows)}` },
                      { key: "skipped", label: labels.skipped, value: formatCount(batch.skipped) },
                      { key: "approvedBy", label: labels.approvedBy, value: `${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}` },
                    ]}
                  />
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1">
                  <StatusBadge
                    label={batch.rollbackSummary.reversible ? labels.rollbackReady : labels.rollbackBlocked}
                    tone={batch.rollbackSummary.reversible ? "success" : "muted"}
                  />
                  <span className="text-meta text-muted-foreground">
                    {labels.rollbackAssets}: {formatCount(batch.rollbackSummary.assetCount)}
                  </span>
                </div>
              </div>

              {batch.rollbackSummary.previewAssets.length > 0 ? (
                <div className="mt-3 border-t border-border-soft pt-3">
                  <div className="text-meta font-medium text-muted-foreground">{labels.rollbackAssets}</div>
                  <ul className="mt-2 grid gap-1 text-sm text-foreground md:grid-cols-2">
                    {batch.rollbackSummary.previewAssets.map((asset) => (
                      <li key={`${batch.id}-${asset}`} className="truncate">
                        {asset}
                      </li>
                    ))}
                  </ul>
                  {batch.rollbackSummary.hiddenAssetCount > 0 ? (
                    <p className="mt-2 text-meta text-muted-foreground">{labels.moreAssets(formatCount(batch.rollbackSummary.hiddenAssetCount))}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </ContentPanel>
  )
}

// A status code from the audit log always goes through a label; an unknown code shows as it is (docs/19 glossary).
function formatImportBatchStatus(status: string, labels: { statusReady: string; statusPartial: string; statusBlocked: string; statusEmpty: string }) {
  if (status === "ready") return labels.statusReady
  if (status === "partial") return labels.statusPartial
  if (status === "blocked") return labels.statusBlocked
  if (status === "empty") return labels.statusEmpty
  return status
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// A link card in a page grid is not a ContentPanel, so it takes the panel frame (2D-2 R4) with the link-card hover.
const actionCardClasses = cn(getPanelClasses(), "block p-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5")

function ActionLink({
  href,
  icon,
  title,
  description,
  download = false,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  /** A file from an /api route: a plain <a download> (spec 2D M31); a page in the app is a Link. */
  download?: boolean
}) {
  const content = (
    <>
      <span aria-hidden="true" className="mb-3 flex text-muted-foreground">
        {icon}
      </span>
      <div className="font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </>
  )

  return download ? (
    <a href={href} download className={actionCardClasses}>
      {content}
    </a>
  ) : (
    <Link href={href} className={actionCardClasses}>
      {content}
    </Link>
  )
}
