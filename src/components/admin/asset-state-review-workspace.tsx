"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, RefreshCw, ScanSearch, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionButton } from "@/components/ui/action-button"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"

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
  const numberLocale = locale === "th" ? "th-TH" : "en-US"

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">{labels.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Summary label={labels.critical} value={result.summary.bySeverity.critical ?? 0} tone="danger" />
            <Summary label={labels.warning} value={result.summary.bySeverity.warning ?? 0} tone="warning" />
            <Summary label={labels.info} value={result.summary.bySeverity.info ?? 0} tone="info" />
          </div>
        </div>
        {canEdit ? (
          <ActionButton variant="primary" onClick={() => void scan()} disabled={scanning}>
            {scanning ? <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ScanSearch className="h-4 w-4" />}
            {scanning ? labels.scanning : labels.scan}
          </ActionButton>
        ) : null}
      </div>

      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
        <Filter label={labels.reviewStatus} value={reviewStatus} onChange={(value) => { setReviewStatus(value); void load(1, { reviewStatus: value, severity, issueType }) }} options={[
          ["pending", labels.pending], ["resolved", labels.resolved], ["dismissed", labels.dismissed],
        ]} />
        <Filter label={labels.severity} value={severity} onChange={(value) => { setSeverity(value); void load(1, { reviewStatus, severity: value, issueType }) }} options={[
          ["", labels.all], ["critical", labels.critical], ["warning", labels.warning], ["info", labels.info],
        ]} />
        <Filter label={labels.issueType} value={issueType} onChange={(value) => { setIssueType(value); void load(1, { reviewStatus, severity, issueType: value }) }} options={[
          ["", labels.all], ...Object.entries(issueTypes),
        ]} />
      </div>

      {loading ? (
        <div className="space-y-3 p-4" aria-label={labels.loading}>
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : result.data.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <h3 className="mt-3 font-semibold text-foreground">{labels.emptyTitle}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{labels.emptyDescription}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted/60 text-xs font-medium text-muted-foreground">
                <tr><th className="px-4 py-3">{labels.asset}</th><th className="px-4 py-3">{labels.currentState}</th><th className="px-4 py-3">{labels.issue}</th><th className="px-4 py-3">{labels.lastDetected}</th><th className="px-4 py-3 text-right">{labels.actions}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">{result.data.map((row) => <ReviewTableRow key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">{result.data.map((row) => <ReviewMobileCard key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">{labels.total.replace("{count}", result.total.toLocaleString(numberLocale))}</span>
        <div className="flex gap-2">
          <ActionButton size="sm" disabled={loading || result.page <= 1} onClick={() => void load(result.page - 1)}>{labels.previous}</ActionButton>
          <span className="inline-flex min-h-11 items-center px-2 text-muted-foreground sm:min-h-0">{result.page}/{totalPages}</span>
          <ActionButton size="sm" disabled={loading || result.page >= totalPages} onClick={() => void load(result.page + 1)}>{labels.next}</ActionButton>
        </div>
      </div>

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
    </section>
  )
}

function ReviewTableRow({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <tr className="align-top hover:bg-muted/30"><td className="px-4 py-3"><AssetIdentity row={row} locale={locale} labels={labels} /></td><td className="px-4 py-3"><StateSummary row={row} locale={locale} labels={labels} /></td><td className="max-w-sm px-4 py-3"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(row.lastDetectedAt, locale)}</td><td className="px-4 py-3"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></td></tr>
}

function ReviewMobileCard({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <article className="rounded-md border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><AssetIdentity row={row} locale={locale} labels={labels} /><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} size="xs" /></div><div className="mt-3"><StateSummary row={row} locale={locale} labels={labels} /></div><div className="mt-3 border-t border-border pt-3"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></div><p className="mt-3 text-xs text-muted-foreground">{labels.lastDetected}: {formatDate(row.lastDetectedAt, locale)}</p><div className="mt-3"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></div></article>
}

type RowProps = { row: ReviewRow; locale: string; labels: Labels; issueTypes: Record<string, string>; canEdit: boolean; onAction: (mode: "resolve" | "dismiss") => void }

function AssetIdentity({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div><Link href={`/${locale}/assets/${row.asset.id}`} className="font-semibold text-primary hover:underline">{row.asset.assetTag}</Link><p className="mt-0.5 max-w-xs text-foreground">{row.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{labels.custodian}: {row.asset.custodian?.fullNameTh ?? labels.unassigned}</p></div>
}

function StateSummary({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div className="space-y-1"><p><span className="text-muted-foreground">{labels.status}:</span> {masterLabel(row.asset.status, locale)}</p><p><span className="text-muted-foreground">{labels.condition}:</span> {masterLabel(row.asset.condition, locale)}</p></div>
}

function IssueSummary({ row, labels, issueTypes }: Pick<RowProps, "row" | "labels" | "issueTypes">) {
  return <div className="flex items-start gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${row.severity === "critical" ? "text-danger" : row.severity === "warning" ? "text-warning" : "text-info"}`} /><div><p className="font-medium text-foreground">{issueTypes[row.issueType] ?? row.issueType}</p><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} size="xs" /></div></div>
}

function ReviewActions({ row, canEdit, labels, onAction }: Pick<RowProps, "row" | "canEdit" | "labels" | "onAction">) {
  if (!canEdit || row.reviewStatus !== "pending") return <span className="block text-right text-xs text-muted-foreground">{labels.readOnly}</span>
  const canResolve = row.allowedStatusTargets.length > 0 || row.allowedConditionTargets.length > 0
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <ActionButton size="sm" variant="primary" onClick={() => onAction("resolve")}>{labels.resolve}</ActionButton> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<ActionButton size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</ActionButton></div>
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium text-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">{options.map(([optionValue, optionLabel]) => <option key={optionValue || "all"} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-info"}`} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground">{value.toLocaleString()}</strong></span>
}

function masterLabel(target: ReviewTarget, locale: string) { return locale === "th" ? target.nameTh || target.name : target.name }
function severityLabel(value: string, labels: Labels) { return value === "critical" ? labels.critical : value === "warning" ? labels.warning : labels.info }
function severityTone(value: string) { return value === "critical" ? "danger" : value === "warning" ? "warning" : "info" }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
