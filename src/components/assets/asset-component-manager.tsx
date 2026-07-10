"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { formatDateTime } from "@/lib/utils"

type AssetOption = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
}

type ComponentRecord = {
  id: string
  componentRole: string
  slotNo?: string | null
  installedAt: string
  removedAt?: string | null
  status: string
  reason?: string | null
  installedByLabel?: string | null
  removedByLabel?: string | null
  evidenceCount: number
  componentAsset: AssetOption
}

type InstallStep = "identify" | "details" | "review"

type ScannerLabels = {
  start: string
  stop: string
  title: string
  help: string
  cameraUnsupported: string
  cameraNotFound: string
  cameraError: string
  cameraDevice: string
  cameraDeviceFallback: string
  cameraRear: string
  scanning: string
  scanned: string
  cameraOpening: string
  torchOn: string
  torchOff: string
  torchUnsupported: string
  zoomCamera: string
  zoomUnsupported: string
}

type ManagerLabels = {
  title: string
  subtitle: string
  back: string
  current: string
  history: string
  noCurrent: string
  noHistory: string
  scanOrSearch: string
  candidateHelp: string
  searching: string
  noCandidates: string
  selected: string
  componentRole: string
  slot: string
  installedAt: string
  reason: string
  installEvidence: string
  evidenceHint: string
  browseEvidence: string
  continueReview: string
  reviewTitle: string
  reviewHelp: string
  confirmInstall: string
  installing: string
  installSuccess: string
  addAnother: string
  remove: string
  removeTitle: string
  removeEvidence: string
  removeReason: string
  confirmRemove: string
  removing: string
  removeSuccess: string
  cancel: string
  close: string
  error: string
  status: string
  serial: string
  evidence: string
  loadMore: string
  scanner: ScannerLabels
}

const componentRoles = ["RAM", "SSD", "HDD", "Power Supply", "Network Card", "Monitor", "Adapter", "Other"]

export function AssetComponentManager({
  locale,
  assetId,
  parentAsset,
  currentComponents,
  componentHistory,
  canEdit,
  returnToHref,
  labels,
}: {
  locale: string
  assetId: string
  parentAsset: AssetOption
  currentComponents: ComponentRecord[]
  componentHistory: ComponentRecord[]
  canEdit: boolean
  returnToHref: string
  labels: ManagerLabels
}) {
  const router = useRouter()
  const [installStep, setInstallStep] = useState<InstallStep>("identify")
  const [componentSearch, setComponentSearch] = useState("")
  const [candidates, setCandidates] = useState<AssetOption[]>([])
  const [selectedComponent, setSelectedComponent] = useState<AssetOption | null>(null)
  const [componentRole, setComponentRole] = useState("")
  const [slotNo, setSlotNo] = useState("")
  const [installedAt, setInstalledAt] = useState(() => toLocalDatetimeInputValue(new Date()))
  const [reason, setReason] = useState("")
  const [installEvidence, setInstallEvidence] = useState<File | null>(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ComponentRecord | null>(null)
  const [historyVisibleCount, setHistoryVisibleCount] = useState(10)
  const [lastInstalledAssetTag, setLastInstalledAssetTag] = useState<string | null>(null)
  const canSearchCandidates = componentSearch.trim().length >= 2
  const visibleHistory = componentHistory.slice(0, historyVisibleCount)
  const hasMoreHistory = historyVisibleCount < componentHistory.length

  useEffect(() => {
    if (!canSearchCandidates) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ parentAssetId: assetId, search: componentSearch.trim() })
        const response = await fetch(`/api/assets/component-candidates?${params.toString()}`, { signal: controller.signal })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? labels.error)
        setCandidates(payload?.data ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        toast.error(error instanceof Error ? error.message : labels.error)
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [assetId, canSearchCandidates, componentSearch, labels.error])

  function selectComponent(component: AssetOption) {
    setSelectedComponent(component)
    setComponentSearch(component.assetTag)
    setCandidates([])
    setInstallStep("details")
  }

  function resetInstallFlow() {
    setInstallStep("identify")
    setComponentSearch("")
    setCandidates([])
    setSelectedComponent(null)
    setComponentRole("")
    setSlotNo("")
    setInstalledAt(toLocalDatetimeInputValue(new Date()))
    setReason("")
    setInstallEvidence(null)
  }

  function openReview() {
    if (!selectedComponent || !componentRole.trim()) {
      toast.error(labels.error)
      return
    }
    setInstallStep("review")
  }

  async function installComponent() {
    if (!selectedComponent || !componentRole.trim()) return
    setSaving(true)

    try {
      const formData = new FormData()
      formData.set("componentAssetId", selectedComponent.id)
      formData.set("componentRole", componentRole.trim())
      if (slotNo.trim()) formData.set("slotNo", slotNo.trim())
      if (installedAt) formData.set("installedAt", installedAt)
      if (reason.trim()) formData.set("reason", reason.trim())
      if (installEvidence) formData.set("installEvidence", installEvidence)

      const response = await fetch(`/api/assets/${assetId}/components`, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)

      toast.success(labels.installSuccess)
      setLastInstalledAssetTag(selectedComponent.assetTag)
      resetInstallFlow()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : labels.error)
    } finally {
      setSaving(false)
    }
  }

  async function removeComponent(component: ComponentRecord, removeReason: string, removeEvidence: File | null) {
    setSaving(true)

    try {
      const formData = new FormData()
      if (removeReason) formData.set("reason", removeReason)
      if (removeEvidence) formData.set("removeEvidence", removeEvidence)

      const response = await fetch(`/api/assets/${assetId}/components/${component.id}`, { method: "DELETE", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)

      toast.success(labels.removeSuccess)
      setRemoveTarget(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="sticky top-0 z-20 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{labels.title}</p>
            <h1 className="mt-1 break-words text-xl font-bold text-foreground">{parentAsset.assetTag}</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">{parentAsset.name}</p>
          </div>
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-10 sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {labels.back}
          </Link>
        </div>
      </section>

      {canEdit ? (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <PackagePlus className="h-5 w-5 text-primary" />
              {labels.scanOrSearch}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.candidateHelp}</p>
          </div>

          {installStep === "identify" ? (
            <div className="space-y-3">
              {lastInstalledAssetTag ? (
                <div className="flex flex-col gap-3 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="break-words">{labels.installSuccess}: {lastInstalledAssetTag}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLastInstalledAssetTag(null)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-success/30 bg-surface px-3 text-sm font-medium text-foreground hover:bg-success/10 sm:h-9 sm:min-h-0"
                  >
                    {labels.addAnother}
                  </button>
                </div>
              ) : null}
              <ScannerTextInput
                value={componentSearch}
                onChange={(value) => {
                  setComponentSearch(value)
                  setSelectedComponent(null)
                  setLastInstalledAssetTag(null)
                }}
                onScanSuccess={(value) => setComponentSearch(value)}
                scanMode="asset-qr"
                placeholder={labels.scanOrSearch}
                labels={labels.scanner}
              />
              {canSearchCandidates ? (
                <CandidateList
                  candidates={candidates}
                  searching={canSearchCandidates && searching}
                  selectedId={selectedComponent?.id ?? null}
                  labels={labels}
                  onSelect={selectComponent}
                />
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.candidateHelp}</p>
              )}
            </div>
          ) : null}

          {installStep === "details" && selectedComponent ? (
            <div className="space-y-4">
              <SelectedComponent component={selectedComponent} label={labels.selected} serialLabel={labels.serial} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.componentRole}</span>
                  <input
                    list="component-role-suggestions"
                    value={componentRole}
                    onChange={(event) => setComponentRole(event.target.value)}
                    maxLength={100}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <datalist id="component-role-suggestions">
                    {componentRoles.map((role) => <option key={role} value={role} />)}
                  </datalist>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.slot}</span>
                  <input
                    value={slotNo}
                    onChange={(event) => setSlotNo(event.target.value)}
                    maxLength={50}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.installedAt}</span>
                  <input
                    type="datetime-local"
                    value={installedAt}
                    onChange={(event) => setInstalledAt(event.target.value)}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.reason}</span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>
              <FileDropzone
                file={installEvidence}
                onFileChange={setInstallEvidence}
                accept="image/*"
                capture="environment"
                title={labels.installEvidence}
                hint={labels.evidenceHint}
                browseLabel={labels.browseEvidence}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={resetInstallFlow} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-accent">
                  {labels.cancel}
                </button>
                <button type="button" onClick={openReview} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90">
                  <CheckCircle2 className="h-4 w-4" />
                  {labels.continueReview}
                </button>
              </div>
            </div>
          ) : null}

          {installStep === "review" && selectedComponent ? (
            <div className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">{labels.reviewTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{labels.reviewHelp}</p>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <ReviewItem label={labels.title} value={`${parentAsset.assetTag} - ${parentAsset.name}`} />
                  <ReviewItem label={labels.selected} value={`${selectedComponent.assetTag} - ${selectedComponent.name}`} />
                  <ReviewItem label={labels.componentRole} value={componentRole} />
                  <ReviewItem label={labels.slot} value={slotNo || "-"} />
                  <ReviewItem label={labels.installedAt} value={installedAt || "-"} />
                  <ReviewItem label={labels.reason} value={reason || "-"} />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={() => setInstallStep("details")} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                  {labels.cancel}
                </button>
                <button type="button" disabled={saving} onClick={() => void installComponent()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  {saving ? labels.installing : labels.confirmInstall}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{labels.current}</h2>
        {currentComponents.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCurrent}</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {currentComponents.map((component) => (
              <ComponentRow key={component.id} locale={locale} component={component} labels={labels} onRemove={canEdit ? () => setRemoveTarget(component) : undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{labels.history}</h2>
        {componentHistory.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noHistory}</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {visibleHistory.map((component) => <ComponentRow key={component.id} locale={locale} component={component} labels={labels} />)}
          </div>
        )}
        {hasMoreHistory ? (
          <button
            type="button"
            onClick={() => setHistoryVisibleCount((current) => current + 10)}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-accent sm:h-10 sm:min-h-0"
          >
            {labels.loadMore}
          </button>
        ) : null}
      </section>

      <ComponentRemovalDialog
        key={removeTarget?.id ?? "closed"}
        component={removeTarget}
        busy={saving}
        labels={labels}
        onClose={() => setRemoveTarget(null)}
        onConfirm={(removeReason, removeEvidence) => {
          if (removeTarget) void removeComponent(removeTarget, removeReason, removeEvidence)
        }}
      />
    </div>
  )
}

function CandidateList({
  candidates,
  searching,
  selectedId,
  labels,
  onSelect,
}: {
  candidates: AssetOption[]
  searching: boolean
  selectedId: string | null
  labels: ManagerLabels
  onSelect: (candidate: AssetOption) => void
}) {
  if (searching) {
    return <p className="flex items-center gap-2 rounded-md border border-border px-3 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{labels.searching}</p>
  }

  if (candidates.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCandidates}</p>
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          onClick={() => onSelect(candidate)}
          className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-accent ${selectedId === candidate.id ? "bg-primary/5" : ""}`}
        >
          <span className="min-w-0">
            <span className="block break-words font-mono text-sm font-semibold text-foreground">{candidate.assetTag}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{candidate.name}</span>
          </span>
          {candidate.serialNumber ? <span className="shrink-0 text-xs text-muted-foreground">SN: {candidate.serialNumber}</span> : null}
        </button>
      ))}
    </div>
  )
}

function SelectedComponent({ component, label, serialLabel }: { component: AssetOption; label: string; serialLabel: string }) {
  return (
    <div className="rounded-md border border-success/30 bg-success/10 p-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-success">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{component.assetTag}</div>
      <div className="mt-1 text-sm text-muted-foreground">{component.name}</div>
      {component.serialNumber ? <div className="mt-1 text-xs text-muted-foreground">{serialLabel}: {component.serialNumber}</div> : null}
    </div>
  )
}

function ComponentRow({ locale, component, labels, onRemove }: { locale: string; component: ComponentRecord; labels: ManagerLabels; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/${locale}/assets/${component.componentAsset.id}`} className="break-words font-mono text-sm font-semibold text-primary hover:underline">
          {component.componentAsset.assetTag}
        </Link>
        <div className="mt-1 text-sm text-foreground">{component.componentAsset.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {component.componentRole}{component.slotNo ? ` · ${component.slotNo}` : ""} · {formatDateTime(component.installedAt)}
          {component.evidenceCount > 0 ? ` · ${labels.evidence}: ${component.evidenceCount}` : ""}
        </div>
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-danger/30 px-3 text-sm font-medium text-danger hover:bg-danger/10 sm:min-h-0 sm:h-9">
          <Trash2 className="h-4 w-4" />
          {labels.remove}
        </button>
      ) : null}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium text-foreground">{value}</div></div>
}

function ComponentRemovalDialog({
  component,
  busy,
  labels,
  onClose,
  onConfirm,
}: {
  component: ComponentRecord | null
  busy: boolean
  labels: ManagerLabels
  onClose: () => void
  onConfirm: (reason: string, evidence: File | null) => void
}) {
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [reason, setReason] = useState("")
  const [removeEvidence, setRemoveEvidence] = useState<File | null>(null)

  useEffect(() => {
    if (!component) return
    const frame = window.requestAnimationFrame(() => reasonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [component])

  if (!component) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section role="dialog" aria-modal="true" aria-label={labels.removeTitle} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-border bg-surface shadow-xl sm:rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{labels.removeTitle}</h2>
            <p className="mt-1 break-words text-sm text-muted-foreground">{component.componentAsset.assetTag} - {component.componentAsset.name}</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent" aria-label={labels.close} title={labels.close}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">{labels.removeReason}</span>
            <textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} rows={4} maxLength={500} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50" />
          </label>
          <FileDropzone file={removeEvidence} onFileChange={setRemoveEvidence} disabled={busy} accept="image/*" capture="environment" title={labels.removeEvidence} hint={labels.evidenceHint} browseLabel={labels.browseEvidence} />
        </div>
        <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">{labels.cancel}</button>
          <button type="button" disabled={busy} onClick={() => onConfirm(reason.trim(), removeEvidence)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {busy ? labels.removing : labels.confirmRemove}
          </button>
        </div>
      </section>
    </div>
  )
}

function toLocalDatetimeInputValue(value: Date) {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}
