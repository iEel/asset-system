"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AuditComponentPanel } from "@/components/audit/audit-scan-panels"
import { AuditScanCheckField } from "@/components/audit/audit-scan-check-field"
import type { AuditInstalledInParent, AuditLookupAsset, AuditScanComponent, QueuedAuditPhoto } from "@/components/audit/audit-scan-types"
import {
  buildCheckDefaults,
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

export type AuditCheckTarget =
  | { kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" }
  | { kind: "out_of_scope"; asset: AuditLookupAsset }

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
const mismatchShortKey = {
  location: "wrongLocation",
  custodian: "wrongCustodian",
  department: "wrongDepartment",
  condition: "wrongCondition",
} as const

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
  onConfirmComponent: (component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }) => void
  onMarkComponentMissing: (component: AuditScanComponent) => void
  onScanComponent: (component: AuditScanComponent) => void
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const mode: AuditCheckMode = target.kind === "out_of_scope" ? "out_of_scope" : target.openedMode
  const expected = target.kind === "item" ? expectedCheckValues(target.item) : masterCheckValues(lookupMasterValues(target.asset))
  const ownershipType = target.kind === "item" ? target.item.ownershipType : target.asset.ownershipType ?? null
  const [values, setValues] = useState<AuditCheckValues>(() =>
    target.kind === "item"
      ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
      : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
  )
  const [departmentTouched, setDepartmentTouched] = useState(false)
  const [remark, setRemark] = useState("")
  const [photos, setPhotos] = useState<QueuedAuditPhoto[]>([])
  const [photoLabel, setPhotoLabel] = useState("")
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(target.kind === "out_of_scope")
  const [componentsOpen, setComponentsOpen] = useState(false)
  const photosRef = useRef(photos)
  const diff = diffCheckValues(values, expected, ownershipType)
  const photoRequired = requiresCheckPhoto(mode, diff)
  const missingPhoto = photoRequired && photos.length === 0
  const notes = target.kind === "item" ? getLatestValueNotes(target.item) : {}

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      })
    }
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

  const statusLine = (() => {
    if (target.kind === "out_of_scope") return t("sheetStatusOutOfScope")
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

  const fields = diff.map((field) => t(mismatchShortKey[field])).join(", ")
  const saveLabel = mode === "out_of_scope"
    ? t("saveOutOfScope")
    : mode === "edit"
      ? diff.length === 0 ? t("saveEditAllMatch") : t("saveEditMismatch", { count: diff.length, fields })
      : diff.length === 0 ? t("saveAllMatch") : t("saveMismatch", { count: diff.length, fields })

  const fieldConfig: Array<{ field: AuditCheckField; required?: boolean; options: Array<{ id: string; label: string }>; onChange: (value: string) => void }> = [
    { field: "location", required: true, options: options.locations, onChange: (value) => setValues((current) => ({ ...current, location: value })) },
    { field: "custodian", options: options.employees, onChange: changeCustodian },
    { field: "department", options: options.departments, onChange: changeDepartment },
    { field: "condition", options: options.conditions, onChange: (value) => setValues((current) => ({ ...current, condition: value })) },
  ]

  return (
    <div data-audit-check-form className="space-y-3">
      <p className="text-sm text-muted-foreground">{statusLine}</p>

      <div className="space-y-2">
        {fieldConfig.map((config) => (
          <AuditScanCheckField
            key={config.field}
            label={t(fieldLabelKey[config.field])}
            value={values[config.field]}
            options={config.options}
            required={config.required}
            expectedValue={expected[config.field]}
            latestValue={config.field === "condition" ? undefined : notes[config.field]}
            mismatch={diff.includes(config.field)}
            disabled={saving || disabled}
            labelFor={labelFor(config.field)}
            onChange={config.onChange}
          />
        ))}
      </div>

      {target.kind === "item" && components.installedIn.length > 0 ? (
        <div className="rounded-md border border-info-border bg-info-soft p-2.5 text-xs text-info">
          {components.installedIn.map((parent) => (
            <p key={parent.parentAssetId}>{t("installedInParentNotice", { assetTag: parent.assetTag, role: parent.componentRole })}</p>
          ))}
        </div>
      ) : null}

      {target.kind === "item" && (components.components.length > 0 || components.status === "loading") ? (
        <div className="rounded-md border border-border">
          <button
            type="button"
            aria-expanded={componentsOpen}
            onClick={() => setComponentsOpen((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium"
          >
            {t("componentsSection", { count: components.components.length })}
            {components.status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
          </button>
          {componentsOpen && components.components.length > 0 ? (
            <div className="border-t border-border px-2 pb-2">
              <AuditComponentPanel
                components={components.components}
                saving={saving}
                componentActionsDisabled={disabled}
                onScanComponent={onScanComponent}
                onConfirmWithParent={(component) => onConfirmComponent(component, { values, remark })}
                onMarkMissing={onMarkComponentMissing}
                t={t}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-border">
        <button
          type="button"
          aria-expanded={extrasOpen}
          onClick={() => setExtrasOpen((current) => !current)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium text-primary"
        >
          {t("addNotePhoto")}
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
        {extrasOpen ? (
          <div className="space-y-3 border-t border-border p-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("remark")}</span>
              <textarea
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                rows={2}
                disabled={saving || disabled}
                className="min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            {photoChecklist.length > 0 ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("photoType")}</span>
                <select
                  value={photoLabel}
                  onChange={(event) => setPhotoLabel(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm sm:h-10 sm:min-h-0"
                >
                  <option value="">{t("generalAuditPhotoLabel")}</option>
                  {photoChecklist.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
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
              hint={t("dropAuditPhotoSelected")}
              browseLabel={t("dropAuditPhotoHint")}
            />
            {photos.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2" aria-label={t("queuedPhotos", { count: photos.length })}>
                {photos.map((photo) => (
                  <li key={photo.id} className="relative overflow-hidden rounded-md border border-border">
                    {photo.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                      <img src={photo.previewUrl} alt={t("queuedPhotoPreviewAlt", { name: photo.file.name })} className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="flex aspect-square items-center justify-center"><ImagePlus className="size-5" aria-hidden="true" /></span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={t("removeQueuedPhoto")}
                      className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md bg-surface text-foreground shadow-sm"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {missingPhoto ? (
        <p className="text-sm font-medium text-warning">
          {mode === "out_of_scope" ? t("auditPhotoRequiredForMismatch") : t("photoRequiredCondition")}
        </p>
      ) : null}

      <div className="grid gap-2 pt-1">
        <Button
          type="button"
          variant={diff.length === 0 ? "default" : "warning"}
          className="min-h-12 w-full text-base"
          disabled={saving || disabled || missingPhoto}
          onClick={() => onSubmit({ values, remark, photos, applyCorrections, diff, mode })}
        >
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {saveLabel}
        </Button>
        {canApplyCorrections && mode !== "out_of_scope" && diff.some((field) => field === "location" || field === "custodian") ? (
          <label className="flex min-h-11 items-start gap-2 rounded-md border border-border p-2.5 text-sm">
            <input type="checkbox" checked={applyCorrections} onChange={(event) => setApplyCorrections(event.target.checked)} className="mt-0.5 size-5" />
            <span>
              <span className="block font-medium">{t("applyAuditCorrections")}</span>
              <span className="block text-xs text-muted-foreground">{t("applyAuditCorrectionsHelp")}</span>
            </span>
          </label>
        ) : null}
        <Button type="button" variant="ghost" className="w-full" onClick={onDismiss} disabled={saving}>
          {t("notThisOne")}
        </Button>
      </div>
    </div>
  )
}
