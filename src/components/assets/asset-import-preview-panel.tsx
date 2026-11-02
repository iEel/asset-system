"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Download } from "lucide-react"
import {
  ASSET_IMPORT_ROW_CAP,
  assetImportWizardSteps,
  buildImportIssueParts,
  defaultImportFilter,
  filterImportRows,
  getAssetImportWizardStep,
  importIssueFieldName,
  importIssueProblem,
  splitImportMapping,
  summarizeAssetImportPreviewIssues,
  type AssetImportFilter,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { formatCount } from "@/lib/display-format"
import { getLinearStepStates } from "@/lib/step-states"
import { formatFileSize, MAX_UPLOAD_BYTES } from "@/lib/uploads"
import { cn, formatDateTime } from "@/lib/utils"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { DistributionBar } from "@/components/ui/distribution-bar"
import { EmptyNote } from "@/components/ui/empty-note"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Steps } from "@/components/ui/steps"
import { getAssetImportBatchStatusTone, type AssetImportBatchStatus, type AssetImportBatchSummary } from "@/lib/asset-import-batch"
import type { AssetImportColumnMapping } from "@/lib/asset-import-mapping"
import type { AssetImportIssue } from "@/lib/asset-import-validate"
import { required } from "@/lib/validation-rules"

type PreviewRow = {
  rowNumber: number
  status: "ready" | "error"
  issues: AssetImportIssue[]
  values: Record<string, string | number | null>
}

type PreviewResult = {
  summary: {
    totalRows: number
    readyRows: number
    errorRows: number
  }
  rows: PreviewRow[]
  mapping?: AssetImportColumnMapping[]
  batch?: AssetImportBatchSummary
}

// What confirm answered (P5-R2), with the file it came from; it stays on screen until "นำเข้าไฟล์ใหม่" (P5-R8).
type ImportResult = {
  batchId: string
  imported: number
  skipped: number
  assets: Array<{ id: string; assetTag: string }>
  fileName: string
}

// The card's own words for a refusal it understands; any other server answer shows through ApiErrorText.
type NoticeCode = "fileRequired" | "tooManyRows" | "previewChanged" | "batchUsed" | "changedDuringImport"
const confirmRefusalCodes = ["batchUsed", "changedDuringImport"] as const

const importStepKeys: Record<AssetImportWizardStep, string> = {
  template: "importPage.stepTemplate",
  upload: "importPage.stepUpload",
  review: "importPage.stepReview",
  import: "importPage.stepImport",
  complete: "importPage.stepDone",
}

const batchStatusKeys: Record<AssetImportBatchStatus, string> = {
  ready: "importBatchStatusReady",
  partial: "importBatchStatusPartial",
  blocked: "importBatchStatusBlocked",
  empty: "importBatchStatusEmpty",
}

// The wizard has no field a person types (v-track plan 2 A-R6): its one rule before the upload is its prerequisite, a
// picked file (spec §4.4). The file's own rules (10 MB, .xlsx) stay the server's; that refusal comes under _form and
// shows in the card's error notice like every other refusal (S-R7, spec §4.1.3).
function validate(file: File | undefined): string | null {
  return required(file)
}

// The import card (group 4 plan 5, spec §13, P5-R8): open on arrival, the template, the dropzone, the file check with
// a row filter, an in-card footer and a done state. Only people with asset:create get it (the page decides).
export function AssetImportPreviewPanel() {
  const t = useTranslations("asset")
  const locale = useLocale()
  const router = useRouter()
  const fields = t.raw("importField") as Record<string, string>
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeCode | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [filter, setFilter] = useState<AssetImportFilter>("all")
  const [result, setResult] = useState<ImportResult | null>(null)
  const wizardStep = getAssetImportWizardStep({
    hasSelectedFile: Boolean(selectedFile),
    hasPreview: Boolean(preview),
    isLoading,
    isImporting,
    hasSuccess: Boolean(result),
  })
  // Steps before the current one are done; once the import succeeds every step is done (spec 2C section 7.2.4, S5).
  const importStates = getLinearStepStates(
    assetImportWizardSteps.length,
    assetImportWizardSteps.indexOf(wizardStep),
    wizardStep === "complete" ? "complete" : "in_progress",
  )
  const importSteps = assetImportWizardSteps.map((step, index) => ({ id: step, label: t(importStepKeys[step]), state: importStates[index] }))
  const issueSummary = preview ? summarizeAssetImportPreviewIssues(preview.rows) : []
  const shown = preview ? filterImportRows(preview.rows, filter) : null
  const mapping = preview?.mapping ? splitImportMapping(preview.mapping) : null
  // A prerequisite, not a field (spec §4.4): with no ready row the import waits, focusable, and the counts beside it say why.
  const noReadyRows = preview?.summary.readyRows === 0
  const fieldNames = (keys: string[]) => keys.map((key) => fields[key] ?? key).join(" · ")

  async function handleFile(file?: File) {
    if (validate(file) || !file) {
      setNotice("fileRequired")
      return
    }

    setIsLoading(true)
    setError(null)
    setNotice(null)

    try {
      // The bytes are read once, at pick (P5-R2): an edit to the file on disk after the check cannot change what
      // confirm sends.
      const snapshot = new File([await file.arrayBuffer()], file.name, { type: file.type })
      const formData = new FormData()
      formData.append("file", snapshot)
      const response = await fetch("/api/assets/import-preview", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        // Under 10 MB, _form outOfRange is the row cap (P5-R3).
        if (payload?.fieldErrors?._form === "outOfRange" && snapshot.size <= MAX_UPLOAD_BYTES) {
          setNotice("tooManyRows")
          return
        }
        throw new Error(payload.error ?? "Import preview failed")
      }
      // A new pick keeps the old result on screen until this one arrives (P5-R8).
      setSelectedFile(snapshot)
      setPreview(payload)
      setFilter(defaultImportFilter(payload.summary))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import preview failed")
    } finally {
      setIsLoading(false)
    }
  }

  async function confirmImport() {
    if (!selectedFile || !preview || preview.summary.readyRows === 0) return

    setIsImporting(true)
    setError(null)
    setNotice(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (preview.batch?.batchId) {
        formData.append("batchId", preview.batch.batchId)
      }
      formData.append("expectedReadyRows", String(preview.summary.readyRows))
      const response = await fetch("/api/assets/import-confirm", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()
      if (response.status === 409 && payload?.code === "previewChanged" && payload.preview) {
        // The file checks differently now (P5-R2): the fresh result replaces the shown one, with its new batch id.
        setPreview(payload.preview)
        setFilter(defaultImportFilter(payload.preview.summary))
        setNotice("previewChanged")
        return
      }
      if (response.status === 409 && (confirmRefusalCodes as readonly string[]).includes(payload?.code)) {
        setNotice(payload.code)
        return
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed")
      }
      setResult({ batchId: payload.batchId, imported: payload.imported, skipped: payload.skipped, assets: payload.assets ?? [], fileName: selectedFile.name })
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  function startOver() {
    setResult(null)
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    setNotice(null)
    setFilter("all")
  }

  function noticeText(code: NoticeCode) {
    if (code === "fileRequired") return t("fileRequired")
    if (code === "tooManyRows") return t("importPage.tooManyRows", { max: ASSET_IMPORT_ROW_CAP })
    return t(`importPage.${code}`)
  }

  function renderIssues(row: PreviewRow) {
    if (row.issues.length === 0) return <span className="text-success">{t("importPage.rowReady")}</span>
    return (
      <ul className="space-y-2">
        {row.issues.map((issue, index) => {
          const parts = buildImportIssueParts(issue, t, { fields, locale })
          return (
            <li key={`${issue.field}:${issue.code}:${index}`}>
              <p className="text-danger">{parts.line}</p>
              {parts.value || parts.usedBy ? (
                <p className="text-meta text-muted-foreground">
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

  function renderAsset(row: PreviewRow) {
    return (
      <>
        <div className="break-words text-foreground">{orNil(row.values.name)}</div>
        {row.values.assetTag ? <div className="tag text-muted-foreground">{row.values.assetTag}</div> : <div className="text-meta text-muted-foreground">{t("importPage.autoTag")}</div>}
      </>
    )
  }

  const batchBadge = preview?.batch && !result ? (
    <StatusBadge label={t(batchStatusKeys[preview.batch.status])} tone={getAssetImportBatchStatusTone(preview.batch.status)} />
  ) : null

  return (
    <ContentPanel divided flush title={t("importPage.title")} actions={batchBadge}>
      <div className="px-4 pt-4 md:px-5">
        <Steps label={t("importPage.steps")} steps={importSteps} />
      </div>

      {result ? (
        <div className="space-y-4 px-4 py-4 md:px-5">
          <Notice tone="success" role="status" title={t("importPage.doneSummary", { imported: result.imported, skipped: result.skipped })}>
            <span className="block break-words">{result.fileName}</span>
            <span className="block break-all">{t("importPage.batchLine", { batchId: result.batchId })}</span>
          </Notice>
          {result.assets.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("importPage.doneAssets")}</h3>
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {result.assets.slice(0, 5).map((asset) => (
                  <li key={asset.id}>
                    <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
                      <span className="tag font-medium">{asset.assetTag}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {result.assets.length > 5 ? <p className="mt-1 text-meta text-muted-foreground">{t("importPage.doneMoreAssets", { count: result.assets.length - 5 })}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={startOver}>{t("importPage.importAnother")}</Button>
            <Link href={`/${locale}/assets`} className={buttonVariants({ variant: "outline" })}>
              {t("importPage.openRegister")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{t("importPage.templateTitle")}</h3>
                <p className="mt-0.5 text-meta text-muted-foreground">{t("importPage.templateDescription")}</p>
              </div>
              <a href="/api/assets/import-template" download className={buttonVariants({ variant: "outline" })}>
                <Download aria-hidden="true" />
                {t("importPage.templateDownload")}
              </a>
            </div>

            <FileDropzone
              id="asset-import-file"
              file={selectedFile}
              onFileChange={(file) => void handleFile(file ?? undefined)}
              accept=".xlsx"
              optimizeImages={false}
              disabled={isLoading || isImporting}
              title={t("importPage.dropzoneTitle")}
              browseLabel={t("importPage.dropzoneBrowse")}
              hint={
                selectedFile && preview?.batch
                  ? t("importPage.dropzoneHint", { size: formatFileSize(selectedFile.size), count: preview.summary.totalRows, date: formatDateTime(preview.batch.createdAt) })
                  : undefined
              }
              description={selectedFile ? t("importPage.dropzoneDescription") : t("importPage.dropzoneEmptyDescription", { max: ASSET_IMPORT_ROW_CAP })}
            />
            {isLoading ? (
              <p role="status" className="text-meta text-muted-foreground">
                {t("importPage.checking")}
              </p>
            ) : null}

            {notice ? (
              <Notice tone={notice === "previewChanged" ? "warning" : "danger"} role="alert">
                {noticeText(notice)}
              </Notice>
            ) : null}

            {error ? (
              <Notice tone="danger" role="alert">
                <ApiErrorText error={error} />
              </Notice>
            ) : null}

            {preview ? (
              <section aria-labelledby="asset-import-result-title" className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 id="asset-import-result-title" className="text-sm font-semibold text-foreground">
                    {t("importPage.resultTitle")}
                  </h3>
                  {preview.batch ? <p className="break-all text-meta text-muted-foreground">{t("importPage.batchLine", { batchId: preview.batch.batchId })}</p> : null}
                </div>
                <DistributionBar
                  segments={[
                    { key: "ready", count: preview.summary.readyRows, tone: "success" },
                    { key: "error", count: preview.summary.errorRows, tone: "danger" },
                  ]}
                />
                <StatStrip
                  items={[
                    { key: "rows", label: t("importPage.statRows"), value: formatCount(preview.summary.totalRows) },
                    { key: "ready", label: t("importPage.statReady"), value: formatCount(preview.summary.readyRows) },
                    { key: "errors", label: t("importPage.statErrors"), value: formatCount(preview.summary.errorRows), attention: preview.summary.errorRows > 0 },
                  ]}
                />
                {mapping ? (
                  <p className="text-meta text-muted-foreground">
                    {t("importPage.mappingMatched", { matched: mapping.matched, total: mapping.total })}
                    {mapping.missingRequired.length > 0 ? ` · ${t("importPage.mappingMissingRequired", { count: mapping.missingRequired.length, columns: fieldNames(mapping.missingRequired) })}` : null}
                    {mapping.missingOptional.length > 0 ? ` · ${t("importPage.mappingMissingOptional", { count: mapping.missingOptional.length, columns: fieldNames(mapping.missingOptional) })}` : null}
                  </p>
                ) : null}
                {issueSummary.length > 0 ? (
                  <Notice tone="warning" title={t("importPage.issueSummaryTitle")}>
                    <p>{t("importPage.issueSummaryHint")}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {issueSummary.map((item) => (
                        <li key={`${item.field}:${item.code}`}>
                          {t("importPage.issueSummaryItem", { field: importIssueFieldName(item.field, t, fields), problem: importIssueProblem(item.sample, t, fields) })} ·{" "}
                          {t("importPage.issueSummaryRows", { count: item.count })}
                        </li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}
                <div className="overflow-x-auto overscroll-x-contain">
                  <Segmented
                    aria-label={t("importPage.filterLabel")}
                    value={filter}
                    onValueChange={setFilter}
                    options={[
                      { value: "error", label: <span data-import-filter="error">{t("importPage.filterErrors", { count: preview.summary.errorRows })}</span> },
                      { value: "ready", label: <span data-import-filter="ready">{t("importPage.filterReady", { count: preview.summary.readyRows })}</span> },
                      { value: "all", label: <span data-import-filter="all">{t("importPage.filterAll", { count: preview.summary.totalRows })}</span> },
                    ]}
                  />
                </div>
              </section>
            ) : null}
          </div>

          {preview && shown ? (
            <>
              {/* The table runs the card's full width at md and up; phones get one row per line (as the component history). */}
              <div className="border-t border-border">
                {shown.rows.length === 0 ? (
                  <EmptyNote padded role="status">
                    {t("importPage.noRows")}
                  </EmptyNote>
                ) : (
                  <>
                    <DataTable framed={false} caption={t("importPage.resultTitle")} className="hidden md:block">
                      <DataTableHeader>
                        <tr>
                          <DataTableHead>{t("importPage.columnRow")}</DataTableHead>
                          <DataTableHead>{t("importPage.columnAsset")}</DataTableHead>
                          <DataTableHead>{t("importPage.columnIssues")}</DataTableHead>
                        </tr>
                      </DataTableHeader>
                      <DataTableBody>
                        {shown.rows.map((row) => (
                          <DataTableRow key={row.rowNumber} data-import-row={row.rowNumber}>
                            <DataTableCell className="whitespace-nowrap num text-muted-foreground">{row.rowNumber}</DataTableCell>
                            <DataTableCell className="min-w-56">{renderAsset(row)}</DataTableCell>
                            <DataTableCell className="min-w-80">{renderIssues(row)}</DataTableCell>
                          </DataTableRow>
                        ))}
                      </DataTableBody>
                    </DataTable>
                    <ContentPanelRows className="md:hidden">
                      {shown.rows.map((row) => (
                        <li key={row.rowNumber} data-import-row={row.rowNumber} className="space-y-2 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="num text-muted-foreground">{t("importPage.columnRow")} {row.rowNumber}</span>
                            <div className="min-w-0 flex-1">{renderAsset(row)}</div>
                          </div>
                          {renderIssues(row)}
                        </li>
                      ))}
                    </ContentPanelRows>
                  </>
                )}
              </div>
              <div className="space-y-1 border-t border-border-soft px-4 py-3 text-meta text-muted-foreground md:px-5">
                {shown.hidden > 0 ? <p>{t("importPage.shownFirst", { shown: shown.rows.length, count: shown.total })}</p> : null}
                <p>
                  {preview.summary.readyRows === 0
                    ? t("importPage.tableHintNoneReady")
                    : preview.summary.errorRows === 0
                      ? t("importPage.tableHintAllReady")
                      : t("importPage.tableHint", { errors: preview.summary.errorRows, ready: preview.summary.readyRows })}
                </p>
              </div>
              {/* The footer stays in the card: sticky from lg, where no bottom navigation covers it, in flow below (K4).
                  It never leaves the card for the window (tests/form-migration-guards.test.ts GL1). */}
              <div className="flex flex-col gap-3 rounded-b-lg border-t border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 lg:sticky lg:bottom-0 lg:z-10">
                <p id="asset-import-ready-summary" className="text-sm text-muted-foreground">
                  {t("importPage.footerSummary", { ready: preview.summary.readyRows, skipped: preview.summary.errorRows })}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="asset-import-file" className={buttonVariants({ variant: "outline" })}>
                    {t("importPage.uploadFixed")}
                  </label>
                  <Button
                    busy={isImporting}
                    aria-disabled={noReadyRows || undefined}
                    aria-describedby={noReadyRows ? "asset-import-ready-summary" : undefined}
                    onClick={() => void confirmImport()}
                  >
                    {t("importPage.confirm", { count: preview.summary.readyRows })}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </ContentPanel>
  )
}
