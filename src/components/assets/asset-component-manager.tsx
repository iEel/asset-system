"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"
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
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { Steps } from "@/components/ui/steps"
import { Textarea } from "@/components/ui/textarea"
import { getLinearStepStates } from "@/lib/step-states"
import { cn, formatDateTime } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"
import { COMPONENT_ROLE_VALUES, componentRoleLabelKey } from "@/lib/asset-component-roles"
import { componentCountAfterRemoval, componentFocusAfterRemoval } from "@/lib/asset-component-links"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import type { ComponentLinkRow, ComponentManagerRows } from "@/lib/asset-component-manager-data"
import type { RegisterHolderLine } from "@/lib/asset-register-row-rules"

type AssetOption = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
  /** When this component was last removed from this parent (P4-R5), from the candidates route. */
  lastRemovalHere?: { removedAt: string } | null
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
  back: string
  history: string
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
  installedState: string
  outstandingState: string
  serial: string
  loadMore: string
  scanner: ScannerLabels
  steps: { label: string; identify: string; details: string; review: string }
}

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
// The search box the header's ติดตั้งส่วนควบ moves focus to when the panel opens.
const INSTALL_SEARCH_ID = "component-install-search"

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

// The ⋯ of a row in the layout on screen: the table (md and up) and the phone list both mark their rows.
function visibleRowMenu(linkId: string): HTMLElement | null {
  const rows = document.querySelectorAll<HTMLElement>(`[data-component-link="${CSS.escape(linkId)}"]`)
  for (const row of rows) {
    const trigger = row.querySelector<HTMLElement>("button")
    if (trigger && trigger.getClientRects().length > 0) return trigger
  }
  return null
}

// The links panel's heading, made focusable only when focus has nowhere else to go.
function panelHeading(panel: HTMLElement | null): HTMLElement | null {
  const heading = panel?.querySelector<HTMLElement>("h2") ?? null
  if (heading) heading.tabIndex = -1
  return heading
}

function validateRemoval(reason: string): Partial<Record<"reason", string>> {
  const code = maxLength(reason, 500)
  return code ? { reason: code } : {}
}

// The components page (group 4 plan 4 Task 3, spec §12): the header with its install button, the relationship map the
// page drew, the install panel (closed on arrival), and one table of this parent's current and past links. Removal is
// on each current row's ⋯ (P4-R3), in a dialog that shows ตอนนี้ | หลังยืนยัน.
export function AssetComponentManager({
  locale,
  assetId,
  header,
  linkRows,
  relationshipMap,
  canEdit,
  returnToHref,
  labels,
}: {
  locale: string
  assetId: string
  header: { name: string; assetTag: string; holder: RegisterHolderLine; room: string | null }
  linkRows: ComponentManagerRows
  relationshipMap: ReactNode
  canEdit: boolean
  returnToHref: string
  labels: ManagerLabels
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const apiError = useApiError()
  const [installOpen, setInstallOpen] = useState(false)
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
  const [removeTarget, setRemoveTarget] = useState<ComponentLinkRow | null>(null)
  const [historyVisibleCount, setHistoryVisibleCount] = useState(10)
  const [lastInstalledAssetTag, setLastInstalledAssetTag] = useState<string | null>(null)
  const installButtonRef = useRef<HTMLButtonElement | null>(null)
  const installPanelRef = useRef<HTMLDivElement | null>(null)
  const focusInstallPendingRef = useRef(false)
  // RowActions points this at the ⋯ that opened the removal, so the dialog gives focus back to it.
  const removeOpenerRef = useRef<HTMLElement | null>(null)
  // A removal that succeeded: once the refreshed rows arrive its ⋯ is gone, so focus moves on (final review).
  const focusAfterRemovalRef = useRef<{ removedId: string; order: string[] } | null>(null)
  const historyPanelRef = useRef<HTMLDivElement | null>(null)
  const installErrors = useFieldErrors<InstallField>()
  // A server refusal at the review goes back to the details step that owns the field (spec §4.2).
  const focusInstallError = () =>
    installErrors.focusFirst(INSTALL_FIELD_ORDER, { idFor: (key) => INSTALL_FIELD_IDS[key], reveal: () => setInstallStep("details") })
  const canSearchCandidates = componentSearch.trim().length >= 2
  // Current links always show; past links keep the progressive reveal.
  const currentRows = linkRows.rows.filter((row) => row.state !== "removed")
  const componentHistory = linkRows.rows.filter((row) => row.state === "removed")
  const visibleHistory = componentHistory.slice(0, historyVisibleCount)
  const hasMoreHistory = historyVisibleCount < componentHistory.length
  const visibleRows = [...currentRows, ...visibleHistory]
  const installStepStates = getLinearStepStates(installStepOrder.length, installStepOrder.indexOf(installStep))
  const installSteps = installStepOrder.map((step, index) => ({ id: step, label: labels.steps[step], state: installStepStates[index] }))
  const holderText = header.holder.kind === "holder" ? `${t("custodian")} ${header.holder.name}` : header.holder.kind === "shared" ? t("holderShared") : t("noCustodian")
  // A stored role shows its Thai label; older free text shows as stored (P4-R4).
  const roleText = (stored: string) => {
    const key = componentRoleLabelKey(stored)
    return key ? t(key) : stored
  }
  const roleSlotText = (row: ComponentLinkRow) => (row.slotNo ? `${roleText(row.role)} · ${row.slotNo}` : roleText(row.role))
  const assetHref = (row: ComponentLinkRow) => `/${locale}/assets/${row.componentAsset.id}`
  // ⋯ only for an editor, only on a current row (installed or outstanding, P4-R3).
  const showMenu = (row: ComponentLinkRow) => canEdit && row.state !== "removed"

  // After a removal: the ⋯ of the next current row, else the install button, else the links heading. It waits for the
  // refreshed rows; until then the removed row is still current and the dialog has given focus back to its ⋯.
  useEffect(() => {
    const pending = focusAfterRemovalRef.current
    if (!pending) return
    const stillCurrent = new Set(linkRows.rows.filter((row) => row.state !== "removed").map((row) => row.id))
    if (stillCurrent.has(pending.removedId)) return
    focusAfterRemovalRef.current = null
    const order = pending.order.filter((id) => id === pending.removedId || stillCurrent.has(id))
    const targetId = componentFocusAfterRemoval(order, pending.removedId)
    const target = (targetId ? visibleRowMenu(targetId) : null) ?? installButtonRef.current ?? panelHeading(historyPanelRef.current)
    target?.focus()
  }, [linkRows])

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

  // The header button opens the panel, then focus moves into it: the search box, or the panel at a later step.
  useEffect(() => {
    if (!installOpen || !focusInstallPendingRef.current) return
    focusInstallPendingRef.current = false
    ;(document.getElementById(INSTALL_SEARCH_ID) ?? installPanelRef.current)?.focus()
  }, [installOpen])

  function openInstall() {
    if (installOpen) {
      ;(document.getElementById(INSTALL_SEARCH_ID) ?? installPanelRef.current)?.focus()
      return
    }
    focusInstallPendingRef.current = true
    setInstallOpen(true)
  }

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

  function closeInstall() {
    resetInstallFlow()
    setLastInstalledAssetTag(null)
    setInstallOpen(false)
    installButtonRef.current?.focus()
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

  async function removeComponent(component: ComponentLinkRow, removeReason: string, removeEvidence: File | null) {
    setSaving(true)

    try {
      const formData = new FormData()
      if (removeReason) formData.set("reason", removeReason)
      if (removeEvidence) formData.set("removeEvidence", removeEvidence)

      const response = await fetch(`/api/assets/${assetId}/components/${component.id}/remove`, { method: "POST", body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)

      toast.success(labels.removeSuccess)
      focusAfterRemovalRef.current = { removedId: component.id, order: currentRows.map((row) => row.id) }
      setRemoveTarget(null)
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : labels.error)
    } finally {
      setSaving(false)
    }
  }

  const renderRowActions = (row: ComponentLinkRow) => (
    <RowActions
      code={row.componentAsset.assetTag}
      name={row.componentAsset.name}
      menuLabel={tCommon("moreActionsFor", { code: row.componentAsset.assetTag })}
      openerRef={removeOpenerRef}
      groups={[
        {
          key: "row",
          items: [
            { kind: "link", key: "open", label: t("componentOpenAsset"), href: assetHref(row) },
            { kind: "action", key: "remove", label: labels.remove, destructive: true, onSelect: () => setRemoveTarget(row) },
          ],
        },
      ]}
    />
  )
  // ถอด: the removal date and who, ติดตั้งอยู่ on an installed row, the outstanding line (code-first holder, E2E-pinned).
  const renderRemoved = (row: ComponentLinkRow) => (
    <>
      {row.removedOn ? (
        <>
          <div className="num text-foreground">{row.removedOn}</div>
          <div className="text-meta text-muted-foreground">{row.removedBy ?? <Nil />}</div>
        </>
      ) : row.state === "installed" ? t("componentStillInstalled") : null}
      {row.outstandingLine ? <div className="mt-1 text-meta font-medium text-warning">{row.outstandingLine}</div> : null}
    </>
  )
  // เหตุผล: the reason and the document (only with that page's permission, R12; P4-R8 a removed outstanding link has no RT-).
  const renderReason = (row: ComponentLinkRow) => {
    if (!row.reason && !row.document) return <Nil />
    return (
      <>
        {row.reason ? <span className="break-words">{row.reason}</span> : null}
        {row.reason && row.document ? " " : null}
        {row.document ? (
          <Link href={row.document.href} className={linkVariants({ size: "inherit" })}>
            <span className="tag">{row.document.code}</span>
          </Link>
        ) : null}
      </>
    )
  }
  const renderEvidence = (row: ComponentLinkRow) => (row.evidenceCount > 0 ? t("componentPhotoCount", { count: row.evidenceCount }) : <Nil />)

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={labels.title}
        meta={
          <>
            <span className="min-w-0 break-words">{header.name}</span>
            <span className="tag">{header.assetTag}</span>
            <span>{holderText}</span>
            {header.room ? <span>{header.room}</span> : null}
          </>
        }
        className="mb-6"
        back={<PageBackLink href={returnToHref} label={labels.back} />}
        actions={
          canEdit ? (
            <Button ref={installButtonRef} size="md" aria-expanded={installOpen} aria-controls="component-install" onClick={openInstall}>
              <PackagePlus aria-hidden="true" />
              {t("componentInstallAction")}
            </Button>
          ) : undefined
        }
      />

      {relationshipMap}

      {canEdit && installOpen ? (
        <div id="component-install" ref={installPanelRef} tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none">
          <ContentPanel title={t("componentInstallPanelStep", { step: installStepOrder.indexOf(installStep) + 1, total: installStepOrder.length })} description={labels.candidateHelp}>
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
                  id={INSTALL_SEARCH_ID}
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
                    locale={locale}
                    labels={labels}
                    onSelect={selectComponent}
                  />
                ) : (
                  <EmptyNote>{labels.candidateHelp}</EmptyNote>
                )}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={closeInstall}>
                    {labels.cancel}
                  </Button>
                </div>
              </div>
            ) : null}

            {installStep === "details" && selectedComponent ? (
              <form onSubmit={openReview} noValidate className="space-y-4">
                <SelectedComponent component={selectedComponent} label={labels.selected} serialLabel={labels.serial} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={labels.componentRole} id="component-install-role" required error={installErrors.message("componentRole")}>
                    <NativeSelect
                      value={componentRole}
                      onChange={(event) => {
                        setComponentRole(event.target.value)
                        installErrors.clear("componentRole")
                      }}
                    >
                      <option value="">{t("componentRoleChoose")}</option>
                      {COMPONENT_ROLE_VALUES.map((role) => (
                        <option key={role} value={role}>
                          {roleText(role)}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">{t("componentCountAfterInstall", { from: linkRows.installedCount, to: linkRows.installedCount + 1 })}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={closeInstall}>
                      {labels.cancel}
                    </Button>
                    <Button type="submit">
                      <CheckCircle2 aria-hidden="true" />
                      {labels.continueReview}
                    </Button>
                  </div>
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
                      { key: "parent", label: labels.title, value: <><span className="tag">{header.assetTag}</span> - {header.name}</> },
                      { key: "component", label: labels.selected, value: <><span className="tag">{selectedComponent.assetTag}</span> - {selectedComponent.name}</> },
                      { key: "role", label: labels.componentRole, value: componentRole ? roleText(componentRole) : null },
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
        </div>
      ) : null}

      <div ref={historyPanelRef}>
        <ContentPanel divided flush title={labels.history} description={t("componentHistoryCount", { total: linkRows.rows.length, installed: linkRows.installedCount, removed: linkRows.removedCount })}>
          {linkRows.rows.length === 0 ? (
            <EmptyNote padded>{labels.noHistory}</EmptyNote>
          ) : (
            <>
              <DataTable framed={false} className="hidden md:block" caption={labels.history} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("componentColumnComponent")}</DataTableHead>
                    <DataTableHead>{t("componentColumnRoleSlot")}</DataTableHead>
                    <DataTableHead>{t("componentColumnInstalled")}</DataTableHead>
                    <DataTableHead>{t("componentColumnRemoved")}</DataTableHead>
                    <DataTableHead>{t("componentColumnReason")}</DataTableHead>
                    <DataTableHead>{t("componentColumnEvidence")}</DataTableHead>
                    {canEdit ? <DataTableHead hideLabel>{tCommon("actions")}</DataTableHead> : null}
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {visibleRows.map((row) => (
                    <DataTableRow key={row.id} data-component-link={row.id}>
                      <DataTableCell className="min-w-48">
                        <div className="break-words font-medium text-foreground">{row.componentAsset.name}</div>
                        <Link href={assetHref(row)} className={cn(linkVariants({ size: "inherit" }), "text-meta")}>
                          <span className="tag">{row.componentAsset.assetTag}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{roleSlotText(row)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="num text-foreground">{row.installedOn}</div>
                        <div className="text-meta text-muted-foreground">{row.installedBy ?? <Nil />}</div>
                      </DataTableCell>
                      <DataTableCell className="min-w-40">{renderRemoved(row)}</DataTableCell>
                      <DataTableCell className="min-w-48 text-muted-foreground">{renderReason(row)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{renderEvidence(row)}</DataTableCell>
                      {canEdit ? <DataTableCell>{showMenu(row) ? renderRowActions(row) : null}</DataTableCell> : null}
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
              <ContentPanelRows className="md:hidden">
                {visibleRows.map((row) => (
                  <li key={row.id} data-component-link={row.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1 text-sm">
                      <div className="break-words font-medium text-foreground">{row.componentAsset.name}</div>
                      <Link href={assetHref(row)} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
                        <span className="tag font-medium">{row.componentAsset.assetTag}</span>
                      </Link>
                      <div className="text-meta text-muted-foreground">{roleSlotText(row)}</div>
                      <div className="text-meta text-muted-foreground">
                        {t("componentColumnInstalled")} <span className="num">{row.installedOn}</span>
                        {row.installedBy ? ` · ${row.installedBy}` : null}
                      </div>
                      <div className="text-meta text-muted-foreground">
                        {row.removedOn ? (
                          <>
                            {t("componentColumnRemoved")} <span className="num">{row.removedOn}</span>
                            {row.removedBy ? ` · ${row.removedBy}` : null}
                          </>
                        ) : row.state === "installed" ? t("componentStillInstalled") : null}
                      </div>
                      {row.outstandingLine ? <div className="text-meta font-medium text-warning">{row.outstandingLine}</div> : null}
                      {row.reason || row.document ? <div className="text-meta text-muted-foreground">{renderReason(row)}</div> : null}
                      {row.evidenceCount > 0 ? <div className="text-meta text-muted-foreground">{renderEvidence(row)}</div> : null}
                    </div>
                    {showMenu(row) ? renderRowActions(row) : null}
                  </li>
                ))}
              </ContentPanelRows>
            </>
          )}
          {hasMoreHistory ? (
            <div className="border-t border-border-soft px-4 py-3 md:px-5">
              <Button variant="outline" onClick={() => setHistoryVisibleCount((current) => current + 10)}>
                {labels.loadMore}
              </Button>
            </div>
          ) : null}
        </ContentPanel>
      </div>

      <ComponentRemovalDialog
        key={removeTarget?.id ?? "closed"}
        component={removeTarget}
        installedCount={linkRows.installedCount}
        busy={saving}
        labels={labels}
        returnFocusRef={removeOpenerRef}
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
  locale,
  labels,
  onSelect,
}: {
  candidates: AssetOption[]
  searching: boolean
  selectedId: string | null
  locale: string
  labels: ManagerLabels
  onSelect: (candidate: AssetOption) => void
}) {
  const t = useTranslations("asset")
  // The searching line keeps its spinner (an I27 status line, FMG LOADER2); it is a line of the panel, not a box.
  if (searching) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{labels.searching}</p>
  }

  if (candidates.length === 0) {
    return <EmptyNote>{labels.noCandidates}</EmptyNote>
  }

  // The candidate rows stay raw buttons: a pressed list option with two lines, which Button cannot hold (plan 2D-3 R5).
  // Name first, then "<tag> · S/N <serial> · ยังไม่ได้ติดตั้ง", and the last removal from this parent (P4-R5).
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
            <span className="block text-sm font-medium text-foreground">{candidate.name}</span>
            <span className="mt-0.5 block text-meta text-muted-foreground">
              <span className="tag font-medium">{candidate.assetTag}</span>
              {candidate.serialNumber ? ` · S/N ${candidate.serialNumber}` : null} · {t("componentCandidateNotInstalled")}
            </span>
            {candidate.lastRemovalHere ? (
              <span className="mt-0.5 block text-meta text-muted-foreground">
                {t("componentCandidateRemovedHere", { date: formatAssetDetailDate(new Date(candidate.lastRemovalHere.removedAt), locale) })}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  )
}

function SelectedComponent({ component, label, serialLabel }: { component: AssetOption; label: string; serialLabel: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-meta font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{component.name}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        <span className="tag font-medium">{component.assetTag}</span>
      </div>
      {component.serialNumber ? <div className="mt-1 text-meta text-muted-foreground">{serialLabel}: {component.serialNumber}</div> : null}
    </div>
  )
}

function ComponentRemovalDialog({
  component,
  installedCount,
  busy,
  labels,
  returnFocusRef,
  onClose,
  onConfirm,
}: {
  component: ComponentLinkRow | null
  installedCount: number
  busy: boolean
  labels: ManagerLabels
  returnFocusRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  onConfirm: (reason: string, evidence: File | null) => void
}) {
  const t = useTranslations("asset")
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [reason, setReason] = useState("")
  const [removeEvidence, setRemoveEvidence] = useState<File | null>(null)
  // The removal's reason is optional and the server has no rule for it, so this form has no server step.
  const removeErrors = useFieldErrors<"reason">()
  // "ส่วนควบของเครื่องนี้" counts installed links only, so removing an outstanding one leaves it as it is.
  const countAfter = component && component.state !== "removed" ? componentCountAfterRemoval({ status: component.state }, installedCount) : installedCount

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
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {component ? (
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <DataTable caption={labels.removeTitle}>
              <DataTableHeader>
                <tr>
                  <DataTableHead hideLabel>{t("componentRemoveItem")}</DataTableHead>
                  <DataTableHead>{t("componentRemoveNow")}</DataTableHead>
                  <DataTableHead>{t("componentRemoveAfter")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                <DataTableRow>
                  <DataTableCell className="text-muted-foreground">{labels.status}</DataTableCell>
                  <DataTableCell className="text-foreground">{component.state === "installed" ? labels.installedState : labels.outstandingState}</DataTableCell>
                  <DataTableCell className="font-medium text-foreground">{t("componentStateRemoved")}</DataTableCell>
                </DataTableRow>
                <DataTableRow>
                  <DataTableCell className="text-muted-foreground">{t("componentCountHere")}</DataTableCell>
                  <DataTableCell className="num text-foreground">{t("componentCountValue", { count: installedCount })}</DataTableCell>
                  <DataTableCell className="num font-medium text-foreground">{t("componentCountValue", { count: countAfter })}</DataTableCell>
                </DataTableRow>
              </DataTableBody>
            </DataTable>
            <Field label={labels.reason} id="component-remove-reason" error={removeErrors.message("reason")}>
              <Textarea
                ref={reasonRef}
                placeholder={labels.removeReason}
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
