"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, FileSpreadsheet, Upload } from "lucide-react"
import {
  assetImportWizardSteps,
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { formatCount } from "@/lib/display-format"
import { getLinearStepStates } from "@/lib/step-states"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Steps } from "@/components/ui/steps"
import { getAssetImportBatchStatusTone, type AssetImportBatchStatus, type AssetImportBatchSummary } from "@/lib/asset-import-batch"
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
            {formatCount(preview.summary.totalRows)} {labels.previewRows} · {formatCount(preview.summary.readyRows)} {labels.previewReady} ·{" "}
            {formatCount(preview.summary.errorRows)} {labels.previewErrors}
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

  // Spec 2D D9: the wizard is a ContentPanel; its own head row holds the third line and the open/close button.
  if (!isOpen) {
    return <ContentPanel className="mb-4">{header}</ContentPanel>
  }

  return (
    <ContentPanel className="mb-4">
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
          <FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-faint-foreground" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">{labels.selectedFile}</div>
            <div className="truncate text-muted-foreground">
              {selectedFile.name} · {formatFileSize(selectedFile.size)}
            </div>
          </div>
        </div>
      ) : null}

      {/* The mapping and the batch are quiet groupings of the panel (no tint); mapped columns are name Chips. */}
      {preview?.mapping ? (
        <div className="mt-4 rounded-md border border-border bg-background px-3 py-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.mappingTitle}</div>
              <div className="mt-0.5 text-meta text-muted-foreground">{labels.mappingHelp}</div>
            </div>
            <div className="shrink-0 text-meta text-muted-foreground">
              {formatCount(mappedColumns.length)} {labels.mappingMatched} · {formatCount(missingColumns.length)} {labels.mappingMissing}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mappedColumns.slice(0, 12).map((column) => (
              <Chip
                key={column.key}
                title={`${labels.fields[column.key] ?? column.label}: ${column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}`}
              >
                {labels.fields[column.key] ?? column.label}
                {" -> "}
                {column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {preview?.batch ? (
        <div className="mt-4 rounded-md border border-border bg-background px-3 py-3 text-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.importBatchTitle}</div>
              <div className="mt-0.5 text-meta text-muted-foreground">{labels.importBatchHelp}</div>
            </div>
            <StatusBadge label={formatBatchStatus(preview.batch.status, labels)} tone={getAssetImportBatchStatusTone(preview.batch.status)} />
          </div>
          {/* The batch id is long and must wrap, so it keeps font-mono with break-all (2D-2 R3). */}
          <KeyValueList
            className="mt-3"
            items={[
              { key: "batchId", label: labels.importBatchId, value: <span className="break-all font-mono">{preview.batch.batchId}</span> },
              { key: "ready", label: labels.previewReady, value: formatCount(preview.batch.readyRows) },
              { key: "errors", label: labels.previewErrors, value: formatCount(preview.batch.errorRows) },
              { key: "mapped", label: labels.mappingMatched, value: formatCount(preview.batch.mappedColumns) },
            ]}
          />
        </div>
      ) : null}

      {error && (
        <Notice tone="danger" role="alert" className="mt-4">
          <ApiErrorText error={error} />
        </Notice>
      )}

      {success && (
        <Notice tone="success" role="status" className="mt-4">
          {success}
        </Notice>
      )}

      {preview && (
        <>
          <StatStrip
            className="mt-4"
            items={[
              { key: "rows", label: labels.previewRows, value: formatCount(preview.summary.totalRows) },
              { key: "ready", label: labels.previewReady, value: formatCount(preview.summary.readyRows) },
              { key: "errors", label: labels.previewErrors, value: formatCount(preview.summary.errorRows) },
            ]}
          />
          {issueSummary.length > 0 ? (
            <Notice tone="warning" title={labels.issueSummaryTitle} className="mt-4">
              <p>{labels.issueSummaryHelp}</p>
              <ul className="mt-1 list-disc pl-5">
                {issueSummary.map((issue) => (
                  <li key={issue.message}>
                    {issue.message} · {formatCount(issue.count)} {labels.affectedRows}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {/* The shared table without a frame of its own; it keeps its 320px height and scrolls down inside. */}
          <DataTable framed={false} caption={labels.importPreview} className="mt-4 max-h-80 overflow-y-auto">
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.row}</DataTableHead>
                <DataTableHead>{labels.status}</DataTableHead>
                <DataTableHead>{labels.assetTag}</DataTableHead>
                <DataTableHead>{labels.assetName}</DataTableHead>
                <DataTableHead>{labels.errors}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {preview.rows.slice(0, 100).map((row) => (
                <DataTableRow key={row.rowNumber}>
                  <DataTableCell className="whitespace-nowrap num text-muted-foreground">{row.rowNumber}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={row.status === "ready" ? labels.previewReady : labels.previewErrors} tone={row.status === "ready" ? "success" : "danger"} />
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-foreground">
                    {row.values.assetTag ? <span className="tag">{row.values.assetTag}</span> : <Nil />}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{orNil(row.values.name)}</DataTableCell>
                  <DataTableCell className="min-w-80 text-muted-foreground">
                    {row.errors.length === 0 ? <Nil /> : row.errors.join(", ")}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {formatCount(preview.summary.readyRows)} {labels.previewReady} · {formatCount(preview.summary.errorRows)} {labels.previewErrors}
            </p>
            <Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>
              {labels.confirmImport}
            </Button>
          </div>
        </>
      )}
    </ContentPanel>
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
  if (size < 1024 * 1024) return `${formatCount(Math.max(1, Math.round(size / 1024)))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatBatchStatus(status: AssetImportBatchStatus, labels: AssetImportPreviewPanelProps["labels"]) {
  if (status === "ready") return labels.importBatchStatusReady
  if (status === "partial") return labels.importBatchStatusPartial
  if (status === "blocked") return labels.importBatchStatusBlocked
  return labels.importBatchStatusEmpty
}
