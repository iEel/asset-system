import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Download, FileDown, FileSpreadsheet, History, RotateCcw } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildAssetImportHistory, type AssetImportHistoryItem } from "@/lib/asset-import-history"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { formatDateTime } from "@/lib/utils"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetImportExportPage({ params }: AssetImportExportPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "view")
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
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tTools("importExportTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tTools("importExportSubtitle")}</p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <ActionLink
          href="/api/assets/import-template"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title={t("downloadTemplate")}
          description={tTools("downloadTemplateDescription")}
        />
        <ActionLink
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

      <AssetImportPreviewPanel
        labels={{
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
          importing: t("importing"),
          wizardTitle: t("importWizardTitle"),
          wizardHelp: t("importWizardHelp"),
          wizardStepTemplate: t("importWizardStepTemplate"),
          wizardStepUpload: t("importWizardStepUpload"),
          wizardStepReview: t("importWizardStepReview"),
          wizardStepImport: t("importWizardStepImport"),
          wizardStepComplete: t("importWizardStepComplete"),
          currentStep: t("importWizardCurrentStep"),
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
        }}
      />

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
          moreAssets: t("importHistoryMoreAssets"),
          status: t("status"),
        }}
      />

      <Link href={`/${locale}/assets`} className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent">
        {tCommon("back")}
      </Link>
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
    moreAssets: string
    status: string
  }
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">{labels.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.help}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="mt-4 grid gap-3">
          {history.map((batch) => (
            <article key={batch.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{batch.batchId}</h3>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {labels.status}: {batch.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <Info label={labels.sourceFile} value={`${batch.fileName} (${formatFileSize(batch.fileSize)})`} />
                    <Info label={labels.imported} value={`${batch.imported}/${batch.totalRows}`} />
                    <Info label={labels.skipped} value={`${batch.skipped}`} />
                    <Info label={labels.approvedBy} value={`${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}`} />
                  </dl>
                </div>

                <div className={batch.rollbackSummary.reversible ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900" : "rounded-lg border border-border bg-surface p-3 text-muted-foreground"}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {batch.rollbackSummary.reversible ? labels.rollbackReady : labels.rollbackBlocked}
                  </div>
                  <p className="mt-1 text-xs">
                    {labels.rollbackAssets}: {batch.rollbackSummary.assetCount.toLocaleString("th-TH")}
                  </p>
                </div>
              </div>

              {batch.rollbackSummary.previewAssets.length > 0 ? (
                <div className="mt-3 rounded-md border border-border bg-surface p-3">
                  <div className="text-xs font-medium text-muted-foreground">{labels.rollbackAssets}</div>
                  <ul className="mt-2 grid gap-1 text-sm text-foreground md:grid-cols-2">
                    {batch.rollbackSummary.previewAssets.map((asset) => (
                      <li key={`${batch.id}-${asset}`} className="truncate">
                        {asset}
                      </li>
                    ))}
                  </ul>
                  {batch.rollbackSummary.hiddenAssetCount > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">{labels.moreAssets.replace("{count}", batch.rollbackSummary.hiddenAssetCount.toLocaleString("th-TH"))}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <a href={href} className="rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </a>
  )
}
