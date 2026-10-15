"use client"

import Link from "next/link"
import { ScanSearch } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { FilterSelect } from "@/components/ui/filter-select"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type ReviewRow = {
  id: string
  issueType: string
  reviewStatus: string
  severity: string
  lastDetectedAt: string
  suggestedStatusId: string | null
  suggestedConditionId: string | null
  allowedStatusTargets: ReviewTarget[]
  allowedConditionTargets: ReviewTarget[]
  asset: {
    id: string
    assetTag: string
    name: string
    ownershipType: string
    custodian: { code: string; fullNameTh: string } | null
    status: ReviewTarget
    condition: ReviewTarget
  }
}

export type AssetStateReviewResponse = {
  data: ReviewRow[]
  total: number
  page: number
  pageSize: number
  summary: { bySeverity: Record<string, number>; byIssueType: Record<string, number> }
}

type Labels = Record<string, string>

export function AssetStateReviewWorkspace({
  locale,
  canEdit,
  initialData,
  labels,
  issueTypes,
}: {
  locale: string
  canEdit: boolean
  initialData: AssetStateReviewResponse
  labels: Labels
  issueTypes: Record<string, string>
}) {
  const apiError = useApiError()
  const [result, setResult] = useState(initialData)
  const [reviewStatus, setReviewStatus] = useState("pending")
  const [severity, setSeverity] = useState("")
  const [issueType, setIssueType] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [dialog, setDialog] = useState<{ mode: "resolve" | "dismiss"; row: ReviewRow } | null>(null)
  const [saving, setSaving] = useState(false)

  async function load(page = 1, next = { reviewStatus, severity, issueType }) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(result.pageSize), reviewStatus: next.reviewStatus })
      if (next.severity) params.set("severity", next.severity)
      if (next.issueType) params.set("issueType", next.issueType)
      const response = await fetch(`/api/admin/asset-state-reviews?${params}`)
      if (!response.ok) throw new Error(await response.text())
      setResult(await response.json() as AssetStateReviewResponse)
    } catch {
      toast.error(labels.loadError)
    } finally {
      setLoading(false)
    }
  }

  async function scan() {
    setScanning(true)
    try {
      const response = await fetch("/api/admin/asset-state-reviews/scan", { method: "POST" })
      if (!response.ok) throw new Error(await response.text())
      const summary = await response.json() as { scannedAssets: number; created: number }
      toast.success(labels.scanSuccess.replace("{scanned}", String(summary.scannedAssets)).replace("{created}", String(summary.created)))
      await load(1)
    } catch {
      toast.error(labels.scanError)
    } finally {
      setScanning(false)
    }
  }

  async function submitDialog(input: { statusId?: string; conditionId?: string; reason: string }) {
    if (!dialog) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/asset-state-reviews/${dialog.row.id}/${dialog.mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dialog.mode === "dismiss" ? { reason: input.reason } : input),
      })
      const body = await response.json().catch(() => ({})) as { error?: string; code?: string }
      if (!response.ok) {
        if (body.code === "ASSET_STATE_REVIEW_STALE") toast.error(labels.staleError)
        else apiError.toast(body.error ?? labels.saveError)
        return
      }
      toast.success(dialog.mode === "resolve" ? labels.resolveSuccess : labels.dismissSuccess)
      setDialog(null)
      await load(result.page)
    } catch {
      toast.error(labels.saveError)
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  // D9: the shared divided panel; the head holds the title, the description and the scan button (md, R3 hand-on),
  // and the per-severity counts open the body.
  return (
    <ContentPanel
      divided
      flush
      className="overflow-hidden"
      title={labels.title}
      description={labels.description}
      actions={
        canEdit ? (
          <Button size="md" busy={scanning} onClick={() => void scan()}>
            <ScanSearch aria-hidden="true" />
            {labels.scan}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border px-4 py-3 text-sm md:px-5">
        <Summary label={labels.critical} value={result.summary.bySeverity.critical ?? 0} tone="danger" />
        <Summary label={labels.warning} value={result.summary.bySeverity.warning ?? 0} tone="warning" />
        <Summary label={labels.info} value={result.summary.bySeverity.info ?? 0} tone="info" />
      </div>

      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
        <FilterSelect
          label={labels.reviewStatus}
          value={reviewStatus}
          onChange={(event) => { const value = event.target.value; setReviewStatus(value); void load(1, { reviewStatus: value, severity, issueType }) }}
          options={[{ value: "pending", label: labels.pending }, { value: "resolved", label: labels.resolved }, { value: "dismissed", label: labels.dismissed }]}
        />
        <FilterSelect
          label={labels.severity}
          value={severity}
          onChange={(event) => { const value = event.target.value; setSeverity(value); void load(1, { reviewStatus, severity: value, issueType }) }}
          allLabel={labels.all}
          options={[{ value: "critical", label: labels.critical }, { value: "warning", label: labels.warning }, { value: "info", label: labels.info }]}
        />
        <FilterSelect
          label={labels.issueType}
          value={issueType}
          onChange={(event) => { const value = event.target.value; setIssueType(value); void load(1, { reviewStatus, severity, issueType: value }) }}
          allLabel={labels.all}
          options={Object.entries(issueTypes).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {loading ? (
        <div className="space-y-3 p-4" role="status" aria-label={labels.loading}>
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : result.data.length === 0 ? (
        <ActionEmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
      ) : (
        <>
          <DataTable framed={false} caption={labels.title} minWidth={980} scrollHint={labels.tableScrollHint} className="hidden md:block">
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.asset}</DataTableHead>
                <DataTableHead>{labels.currentState}</DataTableHead>
                <DataTableHead>{labels.issue}</DataTableHead>
                <DataTableHead>{labels.lastDetected}</DataTableHead>
                <DataTableHead align="right" sticky="right">{labels.actions}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>{result.data.map((row) => <ReviewTableRow key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</DataTableBody>
          </DataTable>
          <div className="grid gap-3 p-4 md:hidden">{result.data.map((row) => <ReviewMobileCard key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</div>
        </>
      )}

      {result.total > 0 ? (
        <DataTableFoot>
          <nav aria-label={labels.pagination} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p aria-live="polite" className="text-meta text-muted-foreground num">
              {labels.total.replace("{count}", formatCount(result.total))}
              <span aria-hidden="true"> · </span>
              {labels.pageOf.replace("{page}", formatCount(result.page)).replace("{total}", formatCount(totalPages))}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={loading || result.page <= 1} onClick={() => void load(result.page - 1)}>{labels.previous}</Button>
              <Button variant="outline" size="sm" disabled={loading || result.page >= totalPages} onClick={() => void load(result.page + 1)}>{labels.next}</Button>
            </div>
          </nav>
        </DataTableFoot>
      ) : null}

      {dialog ? <AssetStateReviewDialog
        key={`${dialog.row.id}:${dialog.mode}`}
        open={Boolean(dialog)}
        mode={dialog?.mode ?? "resolve"}
        statusTargets={dialog?.row.allowedStatusTargets ?? []}
        conditionTargets={dialog?.row.allowedConditionTargets ?? []}
        suggestedStatusId={dialog?.row.suggestedStatusId}
        suggestedConditionId={dialog?.row.suggestedConditionId}
        labels={labels}
        busy={saving}
        onClose={() => setDialog(null)}
        onSubmit={submitDialog}
      /> : null}
    </ContentPanel>
  )
}

function ReviewTableRow({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <DataTableRow><DataTableCell><AssetIdentity row={row} locale={locale} labels={labels} /></DataTableCell><DataTableCell><StateSummary row={row} locale={locale} labels={labels} /></DataTableCell><DataTableCell className="max-w-sm"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></DataTableCell><DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.lastDetectedAt, locale)}</DataTableCell><DataTableCell align="right" sticky="right"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></DataTableCell></DataTableRow>
}

function ReviewMobileCard({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <article className="rounded-md border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><AssetIdentity row={row} locale={locale} labels={labels} /><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} /></div><div className="mt-3"><StateSummary row={row} locale={locale} labels={labels} /></div><div className="mt-3 border-t border-border pt-3"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></div><p className="mt-3 text-xs text-muted-foreground">{labels.lastDetected}: {formatDate(row.lastDetectedAt, locale)}</p><div className="mt-3"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></div></article>
}

type RowProps = { row: ReviewRow; locale: string; labels: Labels; issueTypes: Record<string, string>; canEdit: boolean; onAction: (mode: "resolve" | "dismiss") => void }

function AssetIdentity({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div><Link href={`/${locale}/assets/${row.asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}><span className="tag font-medium">{row.asset.assetTag}</span></Link><p className="mt-0.5 max-w-xs text-foreground">{row.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{labels.custodian}: {row.asset.custodian?.fullNameTh ?? labels.unassigned}</p></div>
}

function StateSummary({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div className="space-y-1"><p><span className="text-muted-foreground">{labels.status}:</span> {masterLabel(row.asset.status, locale)}</p><p><span className="text-muted-foreground">{labels.condition}:</span> {masterLabel(row.asset.condition, locale)}</p></div>
}

function IssueSummary({ row, labels, issueTypes }: Pick<RowProps, "row" | "labels" | "issueTypes">) {
  // The severity is the badge; the colored icon beside it said the same thing in color only, so it is gone.
  return <div><p className="font-medium text-foreground">{issueTypes[row.issueType] ?? row.issueType}</p><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} /></div>
}

function ReviewActions({ row, canEdit, labels, onAction }: Pick<RowProps, "row" | "canEdit" | "labels" | "onAction">) {
  if (!canEdit || row.reviewStatus !== "pending") return <span className="block text-right text-xs text-muted-foreground">{labels.readOnly}</span>
  const canResolve = row.allowedStatusTargets.length > 0 || row.allowedConditionTargets.length > 0
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <Button size="sm" onClick={() => onAction("resolve")}>{labels.resolve}</Button> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<Button variant="outline" size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</Button></div>
}

// The status marker of StatusBadge carries the severity by shape (diamond, triangle, ring), not by color alone.
function Summary({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "info" }) {
  return <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={statusMarkerVariants({ tone })} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground num">{formatCount(value)}</strong></span>
}

function masterLabel(target: ReviewTarget, locale: string) { return locale === "th" ? target.nameTh || target.name : target.name }
function severityLabel(value: string, labels: Labels) { return value === "critical" ? labels.critical : value === "warning" ? labels.warning : labels.info }
function severityTone(value: string) { return value === "critical" ? "danger" : value === "warning" ? "warning" : "info" }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
