"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, PackageCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { Steps } from "@/components/ui/steps"
import { Textarea } from "@/components/ui/textarea"
import { getLinearStepStates } from "@/lib/step-states"
import { cn, formatDateTime } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"

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
  installSuccess: string
  addAnother: string
  remove: string
  removeTitle: string
  removeEvidence: string
  removeReason: string
  confirmRemove: string
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

// The install's details in visual order, keyed like the server's fieldErrors (validations/asset-operations.ts), with the
// id focus moves to (v-track M-R1). The component itself is chosen in the step before: a prerequisite, not a field.
const INSTALL_FIELD_IDS = {
  componentRole: "component-install-role",
  slotNo: "component-install-slot",
  installedAt: "component-install-installed-at",
  reason: "component-install-reason",
} as const
type InstallField = keyof typeof INSTALL_FIELD_IDS
const INSTALL_FIELD_ORDER = Object.keys(INSTALL_FIELD_IDS) as InstallField[]

// noValidate turns the browser's check off, so this restates the controls' maxLength and the server's required role
// (v-track M-R2). The removal's reason is optional; its rule is its maxLength (validateRemoval).
function validate(values: { componentRole: string; slotNo: string; reason: string }): Partial<Record<InstallField, string>> {
  const errors: Partial<Record<InstallField, string>> = {}
  const check = (key: InstallField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("componentRole", required(values.componentRole) ?? maxLength(values.componentRole, 100))
  check("slotNo", maxLength(values.slotNo, 50))
  check("reason", maxLength(values.reason, 500))
  return errors
}

function validateRemoval(reason: string): Partial<Record<"reason", string>> {
  const code = maxLength(reason, 500)
  return code ? { reason: code } : {}
}

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
  const installErrors = useFieldErrors<InstallField>()
  // A server refusal at the review goes back to the details step that owns the field (spec §4.2).
  const focusInstallError = () =>
    installErrors.focusFirst(INSTALL_FIELD_ORDER, { idFor: (key) => INSTALL_FIELD_IDS[key], reveal: () => setInstallStep("details") })
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
    installErrors.setErrors({})
  }

  function openReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    installErrors.setErrors(validate({ componentRole, slotNo, reason }))
    if (focusInstallError()) return
    setInstallStep("review")
  }

  async function installComponent() {
    // The review shows only for a chosen component whose details passed validate().
    if (!selectedComponent) return
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
      if (!response.ok) {
        // A refusal that names a detail goes back to its step and field; any other keeps the toast (spec §4.1, §4.2).
        if (installErrors.applyServer(payload) && focusInstallError()) return
        throw new Error(payload?.error ?? labels.error)
      }

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
        <ContentPanel title={labels.scanOrSearch} description={labels.candidateHelp}>
          <Steps className="mb-4" label={labels.steps.label} steps={installSteps} />

          {installStep === "identify" ? (
            <div className="space-y-3">
              {/* Spec 2D D7: a finished install is an inline success Notice; the toast already announced it, so no live role. */}
              {lastInstalledAssetTag ? (
                <Notice
                  tone="success"
                  action={
                    <Button variant="outline" size="md" onClick={() => setLastInstalledAssetTag(null)}>
                      {labels.addAnother}
                    </Button>
                  }
                >
                  {labels.installSuccess}: <span className="tag">{lastInstalledAssetTag}</span>
                </Notice>
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
                <EmptyNote>{labels.candidateHelp}</EmptyNote>
              )}
            </div>
          ) : null}

          {installStep === "details" && selectedComponent ? (
            <form onSubmit={openReview} noValidate className="space-y-4">
              <SelectedComponent component={selectedComponent} label={labels.selected} serialLabel={labels.serial} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={labels.componentRole} id="component-install-role" required error={installErrors.message("componentRole")}>
                  <Input
                    list="component-role-suggestions"
                    value={componentRole}
                    onChange={(event) => {
                      setComponentRole(event.target.value)
                      installErrors.clear("componentRole")
                    }}
                    maxLength={100}
                  />
                </Field>
                <datalist id="component-role-suggestions">
                  {componentRoles.map((role) => <option key={role} value={role} />)}
                </datalist>
                <Field label={labels.slot} id="component-install-slot" error={installErrors.message("slotNo")}>
                  <Input
                    value={slotNo}
                    onChange={(event) => {
                      setSlotNo(event.target.value)
                      installErrors.clear("slotNo")
                    }}
                    maxLength={50}
                  />
                </Field>
                <Field label={labels.installedAt} id="component-install-installed-at" error={installErrors.message("installedAt")}>
                  <Input
                    type="datetime-local"
                    value={installedAt}
                    onChange={(event) => {
                      setInstalledAt(event.target.value)
                      installErrors.clear("installedAt")
                    }}
                  />
                </Field>
                <Field label={labels.reason} id="component-install-reason" className="md:col-span-2" error={installErrors.message("reason")}>
                  <Textarea
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value)
                      installErrors.clear("reason")
                    }}
                    maxLength={500}
                    rows={3}
                  />
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
                <Button type="submit">
                  <CheckCircle2 aria-hidden="true" />
                  {labels.continueReview}
                </Button>
              </div>
            </form>
          ) : null}

          {installStep === "review" && selectedComponent ? (
            <div className="space-y-4">
              {/* A quiet grouping with the shared label and value list (spec 2D D19): no tint, empty values are Nil. */}
              <div className="rounded-md border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{labels.reviewTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{labels.reviewHelp}</p>
                <KeyValueList
                  className="mt-4"
                  items={[
                    { key: "parent", label: labels.title, value: <><span className="tag">{parentAsset.assetTag}</span> - {parentAsset.name}</> },
                    { key: "component", label: labels.selected, value: <><span className="tag">{selectedComponent.assetTag}</span> - {selectedComponent.name}</> },
                    { key: "role", label: labels.componentRole, value: componentRole },
                    { key: "slot", label: labels.slot, value: slotNo },
                    { key: "installedAt", label: labels.installedAt, value: installedAt ? formatDateTime(installedAt) : null },
                    { key: "reason", label: labels.reason, value: reason },
                  ]}
                />
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
        </ContentPanel>
      ) : null}

      <ContentPanel title={labels.current}>
        {currentComponents.length === 0 ? (
          <EmptyNote>{labels.noCurrent}</EmptyNote>
        ) : (
          <div className="divide-y divide-border-soft rounded-md border border-border">
            {currentComponents.map((component) => (
              <ComponentRow key={component.id} locale={locale} component={component} labels={labels} onRemove={canEdit ? () => setRemoveTarget(component) : undefined} />
            ))}
          </div>
        )}
      </ContentPanel>

      <ContentPanel title={labels.history}>
        {componentHistory.length === 0 ? (
          <EmptyNote>{labels.noHistory}</EmptyNote>
        ) : (
          <div className="divide-y divide-border-soft rounded-md border border-border">
            {visibleHistory.map((component) => <ComponentRow key={component.id} locale={locale} component={component} labels={labels} />)}
          </div>
        )}
        {hasMoreHistory ? (
          <Button variant="outline" className="mt-3" onClick={() => setHistoryVisibleCount((current) => current + 10)}>
            {labels.loadMore}
          </Button>
        ) : null}
      </ContentPanel>

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
  // The searching line keeps its spinner (an I27 status line, FMG LOADER2); it is a line of the panel, not a box.
  if (searching) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{labels.searching}</p>
  }

  if (candidates.length === 0) {
    return <EmptyNote>{labels.noCandidates}</EmptyNote>
  }

  // The candidate rows stay raw buttons: a pressed list option with two lines, which Button cannot hold (plan 2D-3 R5).
  return (
    <div className="divide-y divide-border-soft rounded-md border border-border">
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          onClick={() => onSelect(candidate)}
          aria-pressed={selectedId === candidate.id}
          className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-row-hover ${selectedId === candidate.id ? "bg-primary-soft" : ""}`}
        >
          <span className="min-w-0">
            <span className="block text-sm text-foreground">
              <span className="tag font-medium">{candidate.assetTag}</span>
            </span>
            <span className="mt-0.5 block truncate text-meta text-muted-foreground">{candidate.name}</span>
          </span>
          {candidate.serialNumber ? <span className="shrink-0 text-meta text-muted-foreground">SN: {candidate.serialNumber}</span> : null}
        </button>
      ))}
    </div>
  )
}

function SelectedComponent({ component, label, serialLabel }: { component: AssetOption; label: string; serialLabel: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-meta font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">
        <span className="tag font-medium">{component.assetTag}</span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{component.name}</div>
      {component.serialNumber ? <div className="mt-1 text-meta text-muted-foreground">{serialLabel}: {component.serialNumber}</div> : null}
    </div>
  )
}

function ComponentRow({ locale, component, labels, onRemove }: { locale: string; component: ComponentRecord; labels: ManagerLabels; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/${locale}/assets/${component.componentAsset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
          <span className="tag font-medium">{component.componentAsset.assetTag}</span>
        </Link>
        <div className="mt-1 text-sm text-foreground">{component.componentAsset.name}</div>
        <div className="mt-1 text-meta text-muted-foreground">
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
  // The removal's reason is optional and the server has no rule for it, so this form has no server step.
  const removeErrors = useFieldErrors<"reason">()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    removeErrors.setErrors(validateRemoval(reason))
    if (removeErrors.focusFirst(["reason"], { idFor: () => "component-remove-reason" })) return
    onConfirm(reason.trim(), removeEvidence)
  }

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
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <Field label={labels.removeReason} id="component-remove-reason" error={removeErrors.message("reason")}>
              <Textarea
                ref={reasonRef}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  removeErrors.clear("reason")
                }}
                disabled={busy}
                rows={4}
                maxLength={500}
              />
            </Field>
            <FileDropzone file={removeEvidence} onFileChange={setRemoveEvidence} disabled={busy} accept="image/*" capture="environment" title={labels.removeEvidence} hint={labels.evidenceHint} browseLabel={labels.browseEvidence} />
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            <Button type="submit" variant="destructive" busy={busy}>
              <Trash2 aria-hidden="true" />
              {labels.confirmRemove}
            </Button>
          </AccessibleDialogFooter>
        </form>
      ) : null}
    </AccessibleDialog>
  )
}

function toLocalDatetimeInputValue(value: Date) {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}
