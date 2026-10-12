"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { Steps } from "@/components/ui/steps"
import { Textarea } from "@/components/ui/textarea"
import { getLinearStepStates } from "@/lib/step-states"
import { formatDateTime } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

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

// The order the install steps run in, for the step rail (K17).
const installStepOrder: readonly InstallStep[] = ["identify", "details", "review"]

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
  steps: { label: string; identify: string; details: string; review: string }
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
  const apiError = useApiError()
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
  const installStepStates = getLinearStepStates(installStepOrder.length, installStepOrder.indexOf(installStep))
  const installSteps = installStepOrder.map((step, index) => ({ id: step, label: labels.steps[step], state: installStepStates[index] }))

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
        apiError.toast(error instanceof Error ? error : labels.error)
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [apiError, assetId, canSearchCandidates, componentSearch, labels.error])

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
      apiError.toast(error instanceof Error ? error : labels.error)
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
      apiError.toast(error instanceof Error ? error : labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={labels.title}
        meta={
          <>
            <span className="tag">{parentAsset.assetTag}</span>
            <span className="min-w-0 break-words">{parentAsset.name}</span>
          </>
        }
        className="mb-6"
        back={<PageBackLink href={returnToHref} label={labels.back} />}
      />

      {canEdit ? (
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <PackagePlus className="h-5 w-5 text-primary" />
              {labels.scanOrSearch}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.candidateHelp}</p>
          </div>

          <Steps className="mb-4" label={labels.steps.label} steps={installSteps} />

          {installStep === "identify" ? (
            <div className="space-y-3">
              {lastInstalledAssetTag ? (
                <div className="flex flex-col gap-3 rounded-md border border-success-border bg-success-soft p-3 text-sm text-success sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="break-words">{labels.installSuccess}: {lastInstalledAssetTag}</span>
                  </span>
                  <Button variant="outline" size="md" className="shrink-0" onClick={() => setLastInstalledAssetTag(null)}>
                    {labels.addAnother}
                  </Button>
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
                aria-label={labels.scanOrSearch}
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
                <Field label={labels.componentRole}>
                  <Input list="component-role-suggestions" value={componentRole} onChange={(event) => setComponentRole(event.target.value)} maxLength={100} />
                </Field>
                <datalist id="component-role-suggestions">
                  {componentRoles.map((role) => <option key={role} value={role} />)}
                </datalist>
                <Field label={labels.slot}>
                  <Input value={slotNo} onChange={(event) => setSlotNo(event.target.value)} maxLength={50} />
                </Field>
                <Field label={labels.installedAt}>
                  <Input type="datetime-local" value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} />
                </Field>
                <Field label={labels.reason} className="md:col-span-2">
                  <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
                </Field>
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
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={resetInstallFlow}>
                  {labels.cancel}
                </Button>
                <Button onClick={openReview}>
                  <CheckCircle2 aria-hidden="true" />
                  {labels.continueReview}
                </Button>
              </div>
            </div>
          ) : null}

          {installStep === "review" && selectedComponent ? (
            <div className="space-y-4">
              <div className="rounded-md border border-primary-border bg-primary-soft p-4">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={saving} onClick={() => setInstallStep("details")}>
                  {labels.back}
                </Button>
                <Button busy={saving} onClick={() => void installComponent()}>
                  <PackageCheck aria-hidden="true" />
                  {labels.confirmInstall}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
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

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">{labels.history}</h2>
        {componentHistory.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noHistory}</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {visibleHistory.map((component) => <ComponentRow key={component.id} locale={locale} component={component} labels={labels} />)}
          </div>
        )}
        {hasMoreHistory ? (
          <Button variant="outline" className="mt-3" onClick={() => setHistoryVisibleCount((current) => current + 10)}>
            {labels.loadMore}
          </Button>
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
    return <p className="flex items-center gap-2 rounded-md border border-border px-3 py-4 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{labels.searching}</p>
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
          aria-pressed={selectedId === candidate.id}
          className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-accent ${selectedId === candidate.id ? "bg-primary-soft" : ""}`}
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
    <div className="rounded-md border border-success-border bg-success-soft p-3">
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
        <Button variant="danger" size="md" className="shrink-0" onClick={onRemove}>
          <Trash2 aria-hidden="true" />
          {labels.remove}
        </Button>
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

  return (
    <AccessibleDialog
      open={component !== null}
      title={labels.removeTitle}
      description={
        component ? (
          <>
            <span className="tag">{component.componentAsset.assetTag}</span> · {component.componentAsset.name}
          </>
        ) : undefined
      }
      busy={busy}
      size="sm"
      initialFocusRef={reasonRef}
      onClose={onClose}
    >
      {component ? (
        <>
          <AccessibleDialogBody className="space-y-4">
            <Field label={labels.removeReason}>
              <Textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} rows={4} maxLength={500} />
            </Field>
            <FileDropzone file={removeEvidence} onFileChange={setRemoveEvidence} disabled={busy} accept="image/*" capture="environment" title={labels.removeEvidence} hint={labels.evidenceHint} browseLabel={labels.browseEvidence} />
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            <Button variant="destructive" busy={busy} onClick={() => onConfirm(reason.trim(), removeEvidence)}>
              <Trash2 aria-hidden="true" />
              {labels.confirmRemove}
            </Button>
          </AccessibleDialogFooter>
        </>
      ) : null}
    </AccessibleDialog>
  )
}

function toLocalDatetimeInputValue(value: Date) {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}
