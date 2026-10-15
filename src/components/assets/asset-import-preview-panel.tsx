"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, ListChecks, Upload } from "lucide-react"
import {
  assetImportWizardSteps,
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { getLinearStepStates } from "@/lib/step-states"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Steps } from "@/components/ui/steps"
import type { AssetImportBatchStatus, AssetImportBatchSummary } from "@/lib/asset-import-batch"
import type { AssetImportColumnMapping } from "@/lib/asset-import-mapping"

type PreviewRow = {
  rowNumber: number
  status: "ready" | "error"
  errors: string[]
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

type AssetImportPreviewPanelProps = {
  labels: {
    fields: Record<string, string>
    importPreview: string
    chooseFile: string
    previewReady: string
    previewErrors: string
    previewRows: string
    row: string
    status: string
    errors: string
    assetName: string
    assetTag: string
    confirmImport: string
    fileRequired: string
    importSuccess: string
    wizardTitle: string
    wizardHelp: string
    wizardStepTemplate: string
    wizardStepUpload: string
    wizardStepReview: string
    wizardStepImport: string
    wizardStepComplete: string
    selectedFile: string
    issueSummaryTitle: string
    issueSummaryHelp: string
    affectedRows: string
    mappingTitle: string
    mappingHelp: string
    mappingMatched: string
    mappingMissing: string
    sourceColumn: string
    importBatchTitle: string
    importBatchHelp: string
    importBatchId: string
    importBatchStatusReady: string
    importBatchStatusPartial: string
    importBatchStatusBlocked: string
    importBatchStatusEmpty: string
    openImportWizard: string
    collapseImportWizard: string
  }
}

export function AssetImportPreviewPanel({ labels }: AssetImportPreviewPanelProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const wizardStep = getAssetImportWizardStep({
    hasSelectedFile: Boolean(selectedFile),
    hasPreview: Boolean(preview),
    isLoading,
    isImporting,
    hasSuccess: Boolean(success),
  })
  // Steps before the current one are done; once the import succeeds every step is done (spec 2C section 7.2.4, S5).
  const importStates = getLinearStepStates(
    assetImportWizardSteps.length,
    assetImportWizardSteps.indexOf(wizardStep),
    wizardStep === "complete" ? "complete" : "in_progress",
  )
  const importSteps = assetImportWizardSteps.map((step, index) => ({ id: step, label: wizardStepLabel(step, labels), state: importStates[index] }))
  const issueSummary = preview ? summarizeAssetImportPreviewIssues(preview.rows) : []
  const mappedColumns = preview?.mapping?.filter((column) => column.sourceColumn != null) ?? []
  const missingColumns = preview?.mapping?.filter((column) => column.sourceColumn == null) ?? []
  const header = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">{labels.wizardTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{labels.wizardHelp}</p>
        {preview && (
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.summary.totalRows} {labels.previewRows} · {preview.summary.readyRows} {labels.previewReady} ·{" "}
            {preview.summary.errorRows} {labels.previewErrors}
          </p>
        )}
      </div>
      <Button variant="outline" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen}>
        {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        {isOpen ? labels.collapseImportWizard : labels.openImportWizard}
      </Button>
    </div>
  )

  async function handleFile(file?: File) {
    if (!file) {
      setError(labels.fileRequired)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setSelectedFile(null)
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/assets/import-preview", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Import preview failed")
      }
      setSelectedFile(file)
      setPreview(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import preview failed")
    } finally {
      setIsLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function confirmImport() {
    if (!selectedFile || !preview || preview.summary.readyRows === 0) return

    setIsImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (preview.batch?.batchId) {
        formData.append("batchId", preview.batch.batchId)
      }
      const response = await fetch("/api/assets/import-confirm", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed")
      }
      setSuccess(`${labels.importSuccess}: ${payload.imported}`)
      setPreview(null)
      setSelectedFile(null)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) {
    return (
      <section className="mb-4 rounded-lg border border-border bg-surface p-4">
        {header}
      </section>
    )
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      {header}

      <div className="mt-4 flex justify-end">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button variant="outline" busy={isLoading} disabled={isImporting} onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden="true" />
          {labels.chooseFile}
        </Button>
      </div>

      <Steps className="mt-4" label={labels.wizardTitle} steps={importSteps} />

      {selectedFile ? (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">{labels.selectedFile}</div>
            <div className="truncate text-muted-foreground">
              {selectedFile.name} · {formatFileSize(selectedFile.size)}
            </div>
          </div>
        </div>
      ) : null}

      {preview?.mapping ? (
        <div className="mt-4 rounded-md border border-primary-border bg-primary-soft px-3 py-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.mappingTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{labels.mappingHelp}</div>
            </div>
            <div className="shrink-0 text-xs font-medium text-primary">
              {mappedColumns.length} {labels.mappingMatched} · {missingColumns.length} {labels.mappingMissing}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mappedColumns.slice(0, 12).map((column) => (
              <span
                key={column.key}
                className="rounded-full border border-primary-border bg-surface px-2.5 py-1 text-xs text-foreground"
                title={`${labels.fields[column.key] ?? column.label}: ${column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}`}
              >
                {labels.fields[column.key] ?? column.label}
                {" -> "}
                {column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview?.batch ? (
        <div className="mt-4 rounded-md border border-info-border bg-info-soft px-3 py-3 text-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.importBatchTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{labels.importBatchHelp}</div>
            </div>
            <span
              className={[
                "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                getBatchStatusClass(preview.batch.status),
              ].join(" ")}
            >
              {formatBatchStatus(preview.batch.status, labels)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <SummaryPill label={labels.importBatchId} value={preview.batch.batchId} />
            <SummaryPill label={labels.previewReady} value={preview.batch.readyRows.toLocaleString()} />
            <SummaryPill label={labels.previewErrors} value={preview.batch.errorRows.toLocaleString()} />
            <SummaryPill label={labels.mappingMatched} value={preview.batch.mappedColumns.toLocaleString()} />
          </div>
        </div>
      ) : null}

      {error && (
        <Notice tone="danger" role="alert" className="mt-4">
          <ApiErrorText error={error} />
        </Notice>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{success}</span>
        </div>
      )}

      {preview && (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-3 divide-x divide-border bg-background text-sm md:grid-cols-6">
            <SummaryItem label={labels.previewRows} value={preview.summary.totalRows} />
            <SummaryItem label={labels.previewReady} value={preview.summary.readyRows} tone="ready" />
            <SummaryItem label={labels.previewErrors} value={preview.summary.errorRows} tone="error" />
          </div>
          {issueSummary.length > 0 ? (
            <div className="border-t border-border bg-warning-soft px-4 py-3">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{labels.issueSummaryTitle}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{labels.issueSummaryHelp}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {issueSummary.map((issue) => (
                  <span key={issue.message} className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                    {issue.message} · {issue.count} {labels.affectedRows}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.row}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.assetTag}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.assetName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.errors}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.slice(0, 100).map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={
                          row.status === "ready"
                            ? "inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                            : "inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-1 text-xs font-medium text-danger"
                        }
                      >
                        {row.status === "ready" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {row.status === "ready" ? labels.previewReady : labels.previewErrors}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.values.assetTag || "-"}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{row.values.name || "-"}</td>
                    <td className="min-w-80 px-4 py-3 text-muted-foreground">
                      {row.errors.length === 0 ? "-" : row.errors.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {preview.summary.readyRows} {labels.previewReady} · {preview.summary.errorRows} {labels.previewErrors}
            </p>
            <Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>
              {labels.confirmImport}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function wizardStepLabel(step: AssetImportWizardStep, labels: AssetImportPreviewPanelProps["labels"]) {
  if (step === "template") return labels.wizardStepTemplate
  if (step === "upload") return labels.wizardStepUpload
  if (step === "review") return labels.wizardStepReview
  if (step === "import") return labels.wizardStepImport
  return labels.wizardStepComplete
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024)).toLocaleString()} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function SummaryItem({ label, value, tone }: { label: string; value: number; tone?: "ready" | "error" }) {
  const toneClass = tone === "ready" ? "text-success" : tone === "error" ? "text-danger" : "text-foreground"
  return (
    <div className="px-4 py-3">
      <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground" title={value}>
        {value}
      </div>
    </div>
  )
}

function getBatchStatusClass(status: AssetImportBatchStatus) {
  if (status === "ready") return "bg-success-soft text-success"
  if (status === "partial") return "bg-warning-soft text-warning"
  if (status === "blocked") return "bg-danger-soft text-danger"
  return "bg-muted text-muted-foreground"
}

function formatBatchStatus(status: AssetImportBatchStatus, labels: AssetImportPreviewPanelProps["labels"]) {
  if (status === "ready") return labels.importBatchStatusReady
  if (status === "partial") return labels.importBatchStatusPartial
  if (status === "blocked") return labels.importBatchStatusBlocked
  return labels.importBatchStatusEmpty
}
