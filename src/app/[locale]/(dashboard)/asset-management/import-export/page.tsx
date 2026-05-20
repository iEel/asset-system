import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { requirePagePermission } from "@/lib/page-auth"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AssetImportExportPage({ params }: AssetImportExportPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("asset")
  const tTools = await getTranslations("assetTools")
  const tCommon = await getTranslations("common")

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

      <Link href={`/${locale}/assets`} className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent">
        {tCommon("back")}
      </Link>
    </div>
  )
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
