"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Camera, ChevronDown, ImagePlus, Loader2, X } from "lucide-react"
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
  type AuditCheckField,
  type AuditCheckMode,
  type AuditCheckValues,
  type AuditMasterValues,
  type AuditScanItemRow,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"
import {
  auditCheckCustodianOptions,
  auditCheckFoundOptions,
  auditCheckFoundValue,
  auditCheckMarkedFields,
  auditCheckShownFields,
  auditCheckUnchosenFields,
  auditCheckValueFromFound,
  chooseAuditCheckValue,
  pressAuditCheckMatch,
  pressAuditCheckMismatch,
  startAuditCheckRecord,
  type AuditCheckFieldMode,
  type AuditCheckRecord,
  type AuditCheckRecordContext,
} from "@/lib/audit-check-record-rules"
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

// The fields in visual order, keyed like the scan body's actual… ids, with the id of each row's "ที่พบ" picker, where
// focus moves (v-track M-R1). The location keeps its rule; any row marked ไม่ตรง must name what was found (spec §12).
const FIELD_IDS = {
  actualLocationId: "audit-check-location",
  actualCustodianId: "audit-check-custodian",
  actualDepartmentId: "audit-check-department",
  actualConditionId: "audit-check-condition",
} as const
type CheckField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckField[]
const FIELD_KEY: Record<AuditCheckField, CheckField> = {
  location: "actualLocationId",
  custodian: "actualCustodianId",
  department: "actualDepartmentId",
  condition: "actualConditionId",
}
// The code validate() gives a ไม่ตรง row with nothing chosen; the form shows auditScan.chooseFoundValue for it.
const CHOOSE_FOUND = "chooseFoundValue"

// The check is not a form element (it is a panel of rows, photos and component actions), so nothing checks it but this:
// the location keeps its rule (v-track M-R2, U-R11), and a row marked ไม่ตรง needs its "ที่พบ" (spec §12).
function validate(values: AuditCheckValues, unchosen: readonly AuditCheckField[]): Partial<Record<CheckField, string>> {
  const errors: Partial<Record<CheckField, string>> = {}
  const check = (key: CheckField, code: string | null) => {
    if (code) errors[key] = code
  }
  const chosen = (field: AuditCheckField) => (unchosen.includes(field) ? CHOOSE_FOUND : null)
  check("actualLocationId", required(values.location) ?? chosen("location"))
  check("actualCustodianId", chosen("custodian"))
  check("actualDepartmentId", chosen("department"))
  check("actualConditionId", chosen("condition"))
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
  const recordContext: AuditCheckRecordContext = { expected, ownershipType, employees: options.employees }
  // One record: the values the save sends, and beside them each row's ตรง / ไม่ตรง and whether "ที่พบ" is chosen (P3-R8).
  // An edit, or a recorded out-of-scope find, starts from the saved result: a saved difference opens ไม่ตรง with
  // that value chosen, the rest ตรง (P3-R21).
  const [record, setRecord] = useState<AuditCheckRecord>(() =>
    startAuditCheckRecord(
      target.kind === "item"
        ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
        : target.recorded
          ? buildCheckDefaults({ mode: "edit", item: target.recorded, room })
          : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
      recordContext,
    ),
  )
  const values = record.values
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
  // "เลือกค่าที่พบ" is the record sheet's own sentence (auditScan), not a common.validation code.
  const fieldError = (key: CheckField) => (fieldErrors.errors[key] === CHOOSE_FOUND ? t("chooseFoundValue") : fieldErrors.message(key))
  const shown = auditCheckShownFields(ownershipType)
  const diff = diffCheckValues(values, expected, ownershipType)
  // A recorded find (P3-R18): a photo only for a field that differs from the snapshot and that this save changes from
  // what was recorded, the scan route's own rule, so a remark-only edit needs none. A first record and an own item keep
  // their rules (any differing field out of scope; N-AU1 in scope).
  const recordedValues = target.kind === "out_of_scope" && target.recorded ? buildCheckDefaults({ mode: "edit", item: target.recorded, room }) : null
  const photoDiff = recordedValues ? auditOutOfScopeRescanEvidenceFields(diff, values, recordedValues) : diff
  const photoRequired = requiresCheckPhoto(mode, photoDiff)
  const marked = auditCheckMarkedFields(record, ownershipType)
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
    return (id: string) => (id ? labels[field].get(id) ?? t("valueNotInList") : t("none"))
  }

  // "ที่พบ" lists: ไม่มี / ไม่ระบุ first except for the location (P3-R9, P3-R20); a custodian reads "code - name · department" (P3-R10).
  const foundOptions = useMemo(() => ({
    location: auditCheckFoundOptions("location", options.locations, t("none")),
    custodian: auditCheckFoundOptions("custodian", auditCheckCustodianOptions(options.employees, options.departments), t("none")),
    department: auditCheckFoundOptions("department", options.departments, t("none")),
    condition: auditCheckFoundOptions("condition", options.conditions, t("none")),
  }), [options, t])

  // ตรง resets the value (and a department that followed a found custodian); ไม่ตรง opens "ที่พบ" with nothing chosen.
  function changeMode(field: AuditCheckField, mode: AuditCheckFieldMode) {
    setRecord((current) => (mode === "match" ? pressAuditCheckMatch(current, field, recordContext) : pressAuditCheckMismatch(current, field)))
    fieldErrors.clear(FIELD_KEY[field])
  }

  // Choosing the expected value turns the row back to ตรง; a new custodian brings that person's department (N-AU1)
  // unless the person set the department (spec §12, P3-R11).
  function chooseFound(field: AuditCheckField, id: string) {
    setRecord((current) => chooseAuditCheckValue(current, field, auditCheckValueFromFound(id), recordContext))
    fieldErrors.clear(FIELD_KEY[field])
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
    fieldErrors.setErrors(validate(values, auditCheckUnchosenFields(record, ownershipType)))
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
      return target.item.auditResult === "not_found" ? t("sheetStatusNotFound") : t("sheetHintFirstScan")
    }
    const time = target.item.lastScanAt
      ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(target.item.lastScanAt))
      : "-"
    return t("sheetStatusEdit", { time, name: target.item.scannedByName ?? "-" })
  })()

  // The rows marked ไม่ตรง, in field order: the diff, plus a row still waiting for its "ที่พบ" (P3-R8).
  const fields = marked.map((field) => t(fieldLabelKey[field])).join(", ")
  const saveLabel = mode === "out_of_scope"
    ? t("saveOutOfScope")
    : mode === "edit"
      ? marked.length === 0 ? t("saveEditAllMatch") : t("saveEditMismatch", { count: marked.length, fields })
      : marked.length === 0 ? t("saveAllMatch") : t("saveMismatch", { count: marked.length, fields })

  return (
    // A flex column inside the sheet or the wide panel: the fields scroll, the action bar under them never does (D1).
    <div data-audit-check-form className="flex min-h-0 flex-1 flex-col">
      <div ref={bodyRef} data-audit-check-body className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3">
        <p className="text-sm text-muted-foreground">{statusLine}</p>

        {/* Only the fields the server compares for this asset (bug 22, P3-R11); a hidden one sends the expected value. */}
        <div className="space-y-3">
          {shown.map((field) => (
            <AuditScanCheckField
              key={field}
              id={FIELD_IDS[FIELD_KEY[field]]}
              field={field}
              label={t(fieldLabelKey[field])}
              state={record.fields[field]}
              value={auditCheckFoundValue(record, field)}
              options={foundOptions[field]}
              expectedValue={expected[field]}
              latestValue={field === "condition" ? undefined : notes[field]}
              followsCustodian={field === "department" && record.departmentFollowsCustodian}
              disabled={saving || disabled}
              labelFor={labelFor(field)}
              error={fieldError(FIELD_KEY[field])}
              onModeChange={(next) => changeMode(field, next)}
              onChange={(id) => chooseFound(field, id)}
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
            <span className="inline-flex items-center gap-1.5">
              <Camera aria-hidden="true" />
              {t("addNotePhoto")}
            </span>
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
            variant={marked.length === 0 ? "default" : "warning"}
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
