"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { AuditComponentPanel } from "@/components/audit/audit-scan-panels"
import { AuditScanCheckField } from "@/components/audit/audit-scan-check-field"
import { isAuditComponentChecked, isAuditComponentPending, revealFocusInScrollArea } from "@/components/audit/audit-scan-helpers"
import type { AuditInstalledInParent, AuditLookupAsset, AuditScanComponent, QueuedAuditPhoto } from "@/components/audit/audit-scan-types"
import {
  buildCheckDefaults,
  checkPhotoReasonKey,
  diffCheckValues,
  expectedCheckValues,
  getLatestValueNotes,
  isAuditItemChecked,
  masterCheckValues,
  requiresCheckPhoto,
  suggestDepartmentForCustodian,
  type AuditCheckField,
  type AuditCheckMode,
  type AuditCheckValues,
  type AuditMasterValues,
  type AuditScanItemRow,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"
import { auditOutOfScopeRescanEvidenceFields } from "@/lib/audit-out-of-scope-rescan"
import { required } from "@/lib/validation-rules"

export type AuditCheckTarget =
  | { kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" }
  // recorded: the find's own row when it was already recorded out of scope (P3-R3). The form then compares against the
  // first scan's snapshot (its expected values) and starts from what was recorded; null for a first record.
  | { kind: "out_of_scope"; asset: AuditLookupAsset; recorded: AuditScanItemRow | null }

export type AuditCheckSubmission = {
  values: AuditCheckValues
  remark: string
  photos: QueuedAuditPhoto[]
  applyCorrections: boolean
  diff: AuditCheckField[]
  mode: AuditCheckMode
}

export type AuditCheckComponentsState = {
  status: "idle" | "loading" | "ready"
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}

const fieldLabelKey = {
  location: "expectedLocation",
  custodian: "expectedCustodian",
  department: "expectedDepartment",
  condition: "expectedCondition",
} as const

// The fields in visual order, keyed like the scan body's actual… ids, with the id focus moves to (v-track M-R1). Only
// the location has a rule; the other three are optional and the server never refuses them.
const FIELD_IDS = {
  actualLocationId: "audit-check-location",
} as const
type CheckField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckField[]

// The check is not a form element (it is a panel of rows, photos and component actions), so nothing checks it but this:
// the location keeps its star and its rule (v-track M-R2, U-R11).
function validate(values: AuditCheckValues): Partial<Record<CheckField, string>> {
  const errors: Partial<Record<CheckField, string>> = {}
  const check = (key: CheckField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("actualLocationId", required(values.location))
  return errors
}

function lookupMasterValues(asset: AuditLookupAsset): AuditMasterValues {
  return {
    locationId: asset.currentLocationId,
    custodianId: asset.custodianId,
    departmentId: asset.departmentId,
    conditionId: asset.conditionId,
  }
}

export function AuditScanCheckForm({
  target,
  liveItem,
  room,
  options,
  photoChecklist,
  canApplyCorrections,
  saving,
  disabled,
  components,
  onSubmit,
  onDismiss,
  onConfirmComponent,
  onMarkComponentMissing,
  onScanComponent,
}: {
  target: AuditCheckTarget
  liveItem: AuditScanItemRow | null
  room: AuditScanRoom
  options: AuditScanOptions
  photoChecklist: string[]
  canApplyCorrections: boolean
  saving: boolean
  disabled: boolean
  components: AuditCheckComponentsState
  onSubmit: (submission: AuditCheckSubmission) => void
  onDismiss: () => void
  /** Resolves false when the confirmation failed (its toast is already shown), so "พบครบทุกชิ้น" stops there (D3). */
  onConfirmComponent: (component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }) => Promise<boolean>
  onMarkComponentMissing: (component: AuditScanComponent) => void
  onScanComponent: (component: AuditScanComponent) => void
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const confirm = useConfirm()
  const mode: AuditCheckMode = target.kind === "out_of_scope" ? "out_of_scope" : target.openedMode
  const expected = target.kind === "item"
    ? expectedCheckValues(target.item)
    : target.recorded ? expectedCheckValues(target.recorded) : masterCheckValues(lookupMasterValues(target.asset))
  const ownershipType = target.kind === "item" ? target.item.ownershipType : target.asset.ownershipType ?? null
  const [values, setValues] = useState<AuditCheckValues>(() =>
    target.kind === "item"
      ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
      : target.recorded
        ? buildCheckDefaults({ mode: "edit", item: target.recorded, room })
        : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
  )
  const [departmentTouched, setDepartmentTouched] = useState(false)
  const [remark, setRemark] = useState("")
  const [photos, setPhotos] = useState<QueuedAuditPhoto[]>([])
  const [photoLabel, setPhotoLabel] = useState("")
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(target.kind === "out_of_scope")
  const [confirmingAll, setConfirmingAll] = useState(false)
  const photosRef = useRef(photos)
  const mountedRef = useRef(true)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const extrasId = useId()
  const fieldErrors = useFieldErrors<CheckField>()
  // On a phone the check is a sheet: it stays open and focus moves inside it (spec §4.2). The field is first brought into
  // the check's own scroll area, which the dashboard's scroll does not reach.
  const focusFirstError = () =>
    fieldErrors.focusFirst(FIELD_ORDER, {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => revealFocusInScrollArea(bodyRef.current, document.getElementById(FIELD_IDS[key])),
    })
  const diff = diffCheckValues(values, expected, ownershipType)
  // A recorded find (P3-R18): a photo only for a field that differs from the snapshot and that this save changes from
  // what was recorded, the scan route's own rule, so a remark-only edit needs none. A first record and an own item keep
  // their rules (any differing field out of scope; N-AU1 in scope).
  const recordedValues = target.kind === "out_of_scope" && target.recorded ? buildCheckDefaults({ mode: "edit", item: target.recorded, room }) : null
  const photoDiff = recordedValues ? auditOutOfScopeRescanEvidenceFields(diff, values, recordedValues) : diff
  const photoRequired = requiresCheckPhoto(mode, photoDiff)
  const missingPhoto = photoRequired && photos.length === 0
  const notes = target.kind === "item" ? getLatestValueNotes(target.item) : {}
  const pendingComponents = target.kind === "item" ? components.components.filter(isAuditComponentPending) : []
  const checkedComponents = components.components.filter(isAuditComponentChecked).length

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      })
    }
  }, [])

  // The phone keyboard opens after a field takes focus and shrinks the screen;
  // bring the focused field back above the pinned bar.
  useEffect(() => {
    const viewport: EventTarget = window.visualViewport ?? window
    const reveal = () => revealFocusInScrollArea(bodyRef.current, document.activeElement)
    viewport.addEventListener("resize", reveal)
    return () => viewport.removeEventListener("resize", reveal)
  }, [])

  const labels = useMemo(() => ({
    location: new Map(options.locations.map((option) => [option.id, option.label])),
    custodian: new Map(options.employees.map((option) => [option.id, option.label])),
    department: new Map(options.departments.map((option) => [option.id, option.label])),
    condition: new Map(options.conditions.map((option) => [option.id, option.label])),
  }), [options])

  function labelFor(field: AuditCheckField) {
    return (id: string) => (id ? labels[field].get(id) ?? id : t("none"))
  }

  function changeCustodian(next: string) {
    setValues((current) => {
      const suggested = departmentTouched ? null : suggestDepartmentForCustodian(options.employees, next)
      return { ...current, custodian: next, department: suggested ?? current.department }
    })
  }

  function changeDepartment(next: string) {
    setDepartmentTouched(true)
    setValues((current) => ({ ...current, department: next }))
  }

  function addPhotos(files: File[]) {
    if (files.length === 0) return
    const label = photoLabel || t("generalAuditPhotoLabel")
    setPhotos((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${Date.now()}-${current.length + index}`,
        label,
        file,
        previewUrl: typeof URL !== "undefined" ? URL.createObjectURL(file) : null,
      })),
    ])
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((photo) => photo.id !== id)
    })
  }

  // "พบครบทุกชิ้น": the per-row confirmation for each pending component, one after another, with the values and remark
  // of the moment it was pressed. The first failure stops it and leaves the rest pending (D3).
  async function confirmAllComponents() {
    const pending = components.components.filter(isAuditComponentPending)
    if (pending.length === 0) return
    const context = { values, remark }
    setConfirmingAll(true)
    try {
      for (const component of pending) {
        if (!mountedRef.current) break
        if (!(await onConfirmComponent(component, context))) break
      }
    } finally {
      setConfirmingAll(false)
    }
  }

  // A missing photo is a prerequisite: save stays focusable, opens the note-and-photo section that holds the picker and
  // returns here (spec §4.4). Then the fields, then saving the parent while components are still pending asks first;
  // cancelling sends nothing (D4).
  async function save() {
    if (missingPhoto) {
      setExtrasOpen(true)
      return
    }
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    if (pendingComponents.length > 0) {
      const proceed = await confirm({
        title: t("componentsPendingSaveTitle", { count: pendingComponents.length }),
        description: t("componentsPendingSaveDescription"),
        confirmLabel: t("componentsPendingSaveAction"),
      })
      if (!proceed) return
    }
    onSubmit({ values, remark, photos, applyCorrections, diff, mode })
  }

  const statusLine = (() => {
    if (target.kind === "out_of_scope") return target.recorded ? t("sheetStatusOutOfScopeRecorded") : t("sheetStatusOutOfScope")
    if (target.openedMode === "scan" && liveItem && isAuditItemChecked(liveItem) && liveItem.auditResult !== "not_found") {
      return t("sheetStatusJustChecked", { name: liveItem.scannedByName ?? "-" })
    }
    if (target.openedMode === "scan") {
      return target.item.auditResult === "not_found" ? t("sheetStatusNotFound") : t("sheetStatusPending")
    }
    const time = target.item.lastScanAt
      ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(target.item.lastScanAt))
      : "-"
    return t("sheetStatusEdit", { time, name: target.item.scannedByName ?? "-" })
  })()

  const fields = diff.map((field) => t(fieldLabelKey[field])).join(", ")
  const saveLabel = mode === "out_of_scope"
    ? t("saveOutOfScope")
    : mode === "edit"
      ? diff.length === 0 ? t("saveEditAllMatch") : t("saveEditMismatch", { count: diff.length, fields })
      : diff.length === 0 ? t("saveAllMatch") : t("saveMismatch", { count: diff.length, fields })

  const fieldConfig: Array<{ field: AuditCheckField; key?: CheckField; required?: boolean; options: Array<{ id: string; label: string }>; onChange: (value: string) => void }> = [
    {
      field: "location",
      key: "actualLocationId",
      required: true,
      options: options.locations,
      onChange: (value) => {
        setValues((current) => ({ ...current, location: value }))
        fieldErrors.clear("actualLocationId")
      },
    },
    { field: "custodian", options: options.employees, onChange: changeCustodian },
    { field: "department", options: options.departments, onChange: changeDepartment },
    { field: "condition", options: options.conditions, onChange: (value) => setValues((current) => ({ ...current, condition: value })) },
  ]

  return (
    // A flex column inside the sheet or the wide panel: the fields scroll, the action bar under them never does (D1).
    <div data-audit-check-form className="flex min-h-0 flex-1 flex-col">
      <div ref={bodyRef} data-audit-check-body className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3">
        <p className="text-sm text-muted-foreground">{statusLine}</p>

        <div className="space-y-3">
          {fieldConfig.map((config) => (
            <AuditScanCheckField
              key={config.field}
              id={config.key ? FIELD_IDS[config.key] : undefined}
              label={t(fieldLabelKey[config.field])}
              value={values[config.field]}
              options={config.options}
              required={config.required}
              expectedValue={expected[config.field]}
              latestValue={config.field === "condition" ? undefined : notes[config.field]}
              mismatch={diff.includes(config.field)}
              disabled={saving || disabled}
              labelFor={labelFor(config.field)}
              error={config.key ? fieldErrors.message(config.key) : undefined}
              onChange={config.onChange}
            />
          ))}
        </div>

        {target.kind === "item" && components.installedIn.length > 0 ? (
          <Notice tone="info">
            {components.installedIn.map((parent) => (
              <p key={parent.parentAssetId}>{t("installedInParentNotice", { assetTag: parent.assetTag, role: parent.componentRole })}</p>
            ))}
          </Notice>
        ) : null}

        {target.kind === "item" && components.status === "loading" && components.components.length === 0 ? (
          <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {t("componentsLoading")}
          </p>
        ) : null}

        {/* Shown open: every component is one compact row (D2). */}
        {target.kind === "item" && components.components.length > 0 ? (
          <AuditComponentPanel
            components={components.components}
            saving={saving}
            componentActionsDisabled={disabled}
            confirmingAll={confirmingAll}
            onScanComponent={onScanComponent}
            onConfirmWithParent={(component) => onConfirmComponent(component, { values, remark })}
            onConfirmAll={() => void confirmAllComponents()}
            onMarkMissing={onMarkComponentMissing}
            t={t}
          />
        ) : null}

        <div className="space-y-2">
          <Button
            variant="outline"
            aria-expanded={extrasOpen}
            aria-controls={extrasOpen ? extrasId : undefined}
            onClick={() => setExtrasOpen((current) => !current)}
            className="w-full justify-between"
          >
            {t("addNotePhoto")}
            <ChevronDown aria-hidden="true" />
          </Button>
          {extrasOpen ? (
            // A quiet grouping inside the sheet, never a frame in a frame (spec 2D D9).
            <div id={extrasId} className="space-y-3 rounded-md border border-border bg-background p-3">
              <Field label={t("remark")}>
                <Textarea
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  rows={2}
                  disabled={saving || disabled}
                  className="min-h-16"
                />
              </Field>
              {photoChecklist.length > 0 ? (
                <Field label={t("photoType")}>
                  <NativeSelect value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)}>
                    <option value="">{t("generalAuditPhotoLabel")}</option>
                    {photoChecklist.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
              <FileDropzone
                file={null}
                onFileChange={(file) => addPhotos(file ? [file] : [])}
                onFilesChange={addPhotos}
                disabled={saving || disabled}
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                capture="environment"
                multiple
                title={t("dropAuditPhotoTitle")}
                description={t("dropAuditPhotoDescription")}
                browseLabel={t("dropAuditPhotoHint")}
              />
              {photos.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2" aria-label={t("queuedPhotos", { count: photos.length })}>
                  {photos.map((photo) => (
                    <li key={photo.id} className="relative overflow-hidden rounded-md border border-border">
                      {photo.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                        <img src={photo.previewUrl} alt={t("queuedPhotoPreviewAlt", { name: photo.file.name })} className="aspect-square w-full object-cover bg-image-stage" />
                      ) : (
                        <span className="flex aspect-square items-center justify-center"><ImagePlus className="size-5" aria-hidden="true" /></span>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={t("removeQueuedPhoto")}
                        className="absolute right-1 top-1 shadow-sm"
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div data-audit-check-actions className="shrink-0 space-y-2 border-t border-border px-4 py-3">
        {/* Why save waits: a condition before acting, one inline line that does not grow the bar (spec 2D D7), tied to
            the save button, which stays focusable (spec §4.4). */}
        {missingPhoto ? (
          <Notice id="audit-check-photo-reason" tone="neutral">
            {t(checkPhotoReasonKey(mode, diff))}
          </Notice>
        ) : null}
        {pendingComponents.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t("componentsSaveHint", { checked: checkedComponents, total: components.components.length })}</p>
        ) : null}
        {/* One row keeps the bar short on a phone; save comes first in the Tab order and wraps a long label. The shared
            Button blocks the pointer while aria-disabled; this one takes a tap, so a waiting save opens the
            note-and-photo section as Enter does (e2e decision DX5). */}
        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant={diff.length === 0 ? "default" : "warning"}
            className="min-h-12 min-w-0 flex-1 whitespace-normal py-2 text-base md:h-auto md:min-h-10 aria-disabled:pointer-events-auto"
            busy={saving}
            aria-disabled={missingPhoto || undefined}
            aria-describedby={missingPhoto ? "audit-check-photo-reason" : undefined}
            disabled={disabled}
            onClick={() => void save()}
          >
            {saveLabel}
          </Button>
          <Button type="button" variant="ghost" className="min-h-12 md:h-auto md:min-h-10" onClick={onDismiss} disabled={saving}>
            {t("notThisOne")}
          </Button>
        </div>
        {canApplyCorrections && mode !== "out_of_scope" && diff.some((field) => field === "location" || field === "custodian") ? (
          <ChoiceCard
            type="checkbox"
            checked={applyCorrections}
            onChange={(event) => setApplyCorrections(event.target.checked)}
            label={t("applyAuditCorrections")}
            description={t("applyAuditCorrectionsHelp")}
          />
        ) : null}
      </div>
    </div>
  )
}
