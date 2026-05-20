"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, FileSpreadsheet, ListChecks, Upload } from "lucide-react"
import {
  assetImportWizardSteps,
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"

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
}

type AssetImportPreviewPanelProps = {
  labels: {
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
    importing: string
    wizardTitle: string
    wizardHelp: string
    wizardStepTemplate: string
    wizardStepUpload: string
    wizardStepReview: string
    wizardStepImport: string
    wizardStepComplete: string
    currentStep: string
    selectedFile: string
    issueSummaryTitle: string
    issueSummaryHelp: string
    affectedRows: string
  }
}

export function AssetImportPreviewPanel({ labels }: AssetImportPreviewPanelProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
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
  const issueSummary = preview ? summarizeAssetImportPreviewIssues(preview.rows) : []

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

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
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
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading || isImporting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isLoading ? `${labels.chooseFile}...` : labels.chooseFile}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {assetImportWizardSteps.map((step, index) => (
          <WizardStep
            key={step}
            step={step}
            currentStep={wizardStep}
            index={index}
            label={wizardStepLabel(step, labels)}
            currentLabel={labels.currentStep}
          />
        ))}
      </div>

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

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{success}</span>
        </div>
      )}

      {preview && (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-3 divide-x divide-border bg-muted/40 text-sm md:grid-cols-6">
            <SummaryItem label={labels.previewRows} value={preview.summary.totalRows} />
            <SummaryItem label={labels.previewReady} value={preview.summary.readyRows} tone="ready" />
            <SummaryItem label={labels.previewErrors} value={preview.summary.errorRows} tone="error" />
          </div>
          {issueSummary.length > 0 ? (
            <div className="border-t border-border bg-warning/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{labels.issueSummaryTitle}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{labels.issueSummaryHelp}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {issueSummary.map((issue) => (
                  <span key={issue.message} className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
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
                  <tr key={row.rowNumber} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={
                          row.status === "ready"
                            ? "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success"
                            : "inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger"
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
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={isImporting || preview.summary.readyRows === 0}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? labels.importing : labels.confirmImport}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function WizardStep({
  step,
  currentStep,
  index,
  label,
  currentLabel,
}: {
  step: AssetImportWizardStep
  currentStep: AssetImportWizardStep
  index: number
  label: string
  currentLabel: string
}) {
  const currentIndex = assetImportWizardSteps.indexOf(currentStep)
  const stepIndex = assetImportWizardSteps.indexOf(step)
  const isDone = stepIndex < currentIndex
  const isCurrent = step === currentStep

  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        isCurrent ? "border-primary bg-primary/5 text-primary" : isDone ? "border-success/30 bg-success/5 text-success" : "border-border bg-background text-muted-foreground",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
          {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      {isCurrent ? <div className="mt-1 text-xs">{currentLabel}</div> : null}
    </div>
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
