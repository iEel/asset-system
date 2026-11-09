"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import type { AssetConfirmInspectionStatusName } from "@/lib/validations/asset-confirm-inspection"
import { maxLength, minLength, required } from "@/lib/validation-rules"

// ยืนยันผลตรวจ plan 5 task 2: one asset Under Inspection in no audit round, confirmed in one step (agreed 2026-10-28).
// The fields keyed like the server's fieldErrors (validations/asset-confirm-inspection.ts), with the id focus moves to.
const FIELD_IDS = {
  statusName: "asset-confirm-inspection-status",
  custodianId: "asset-confirm-inspection-holder",
  locationId: "asset-confirm-inspection-location",
  reason: "asset-confirm-inspection-reason",
} as const
type ConfirmField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as ConfirmField[]
const HANDOVER_LOCKED_ID = "asset-confirm-inspection-handover-locked"
// The schema's reason limits after trim (assetConfirmInspectionSchema).
const REASON_MIN = 3
const REASON_MAX = 500

type ConfirmValues = { statusName: AssetConfirmInspectionStatusName; custodianId: string; locationId: string; reason: string }

// The server's rules a person can fix here, checked before the request. In Use needs a holder only without a handover:
// with one the holder is locked and the server writes the rule's target.
function validate(values: ConfirmValues, handoverOpen: boolean): Partial<Record<ConfirmField, string>> {
  const errors: Partial<Record<ConfirmField, string>> = {}
  if (!handoverOpen) {
    if (values.statusName === "In Use" && !values.custodianId) errors.custodianId = "inUseNeedsHolder"
    const location = required(values.locationId)
    if (location) errors.locationId = location
  }
  const reason = required(values.reason) ?? minLength(values.reason, REASON_MIN) ?? maxLength(values.reason, REASON_MAX)
  if (reason) errors.reason = reason
  return errors
}

export type AssetConfirmInspectionLabels = {
  button: string
  title: string
  status: string
  holder: string
  holderPlaceholder: string
  location: string
  locationPlaceholder: string
  searchPlaceholder: string
  searchEmpty: string
  reason: string
  reasonPlaceholder: string
  handoverLocked: string
  handoverUnclear: string
  inUseNeedsHolder: string
  submit: string
  cancel: string
  success: string
  errorFallback: string
}

export type AssetConfirmInspectionDialogProps = {
  assetId: string
  labels: AssetConfirmInspectionLabels
  /** พร้อมใช้งาน and ใช้งานอยู่, with the Thai names the page read. */
  statusOptions: { value: AssetConfirmInspectionStatusName; label: string }[]
  /** The rule's target without a handover (inspectionTargetStatusName), else Ready. */
  defaultStatusName: AssetConfirmInspectionStatusName
  /** none: the fields are free; clear: holder, location and status locked; unclear: the reason why, and no submit. */
  handover: "none" | "clear" | "unclear"
  /** With a clear handover, the rule's target (ใช้งานอยู่ or ยืมใช้งาน), shown read-only. */
  lockedStatusLabel: string | null
  currentCustodian: { id: string; label: string } | null
  currentLocation: { id: string; label: string }
  employees: SearchableSelectOption[]
  locations: SearchableSelectOption[]
}

export function AssetConfirmInspectionDialog({
  assetId,
  labels,
  statusOptions,
  defaultStatusName,
  handover,
  lockedStatusLabel,
  currentCustodian,
  currentLocation,
  employees,
  locations,
}: AssetConfirmInspectionDialogProps) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // Where focus goes when the dialog closes: the trigger, or after a confirm the page heading. The refresh then drops the
  // notice and its trigger (the asset is no longer Under Inspection), so focus must not wait on it (final review).
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState(false)
  const initialValues = (): ConfirmValues => ({
    statusName: defaultStatusName,
    custodianId: currentCustodian?.id ?? "",
    locationId: currentLocation.id,
    reason: "",
  })
  const [values, setValues] = useState<ConfirmValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fieldErrors = useFieldErrors<ConfirmField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const handoverOpen = handover !== "none"
  const locked = handover === "clear"

  // The holder and location lists keep the asset's own, even when that employee or location is inactive now.
  const employeeOptions = currentCustodian && !employees.some((option) => option.id === currentCustodian.id) ? [currentCustodian, ...employees] : employees
  const locationOptions = locations.some((option) => option.id === currentLocation.id) ? locations : [currentLocation, ...locations]

  function setField<K extends keyof ConfirmValues>(key: K, value: ConfirmValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function openDialog() {
    returnFocusRef.current = triggerRef.current
    setValues(initialValues())
    setError(null)
    fieldErrors.setErrors({})
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setError(null)
    fieldErrors.setErrors({})
  }

  const errorText = (key: ConfirmField) => {
    const code = fieldErrors.errors[key]
    if (!code) return undefined
    if (code === "inUseNeedsHolder") return labels.inUseNeedsHolder
    return validationMessage(code, key === "reason" ? { min: REASON_MIN, max: REASON_MAX } : undefined)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (handover === "unclear") return
    setError(null)
    fieldErrors.setErrors(validate(values, handoverOpen))
    if (focusFirstError()) return
    setBusy(true)

    // With a clear handover the server writes the rule's target (In Use or Checked Out) and refuses Ready, a changed
    // holder or a changed location: the dialog sends In Use and both as they are (plan 5 task 1).
    const custody = handover === "clear"
      ? { statusName: "In Use", custodianId: currentCustodian?.id ?? null, locationId: currentLocation.id }
      : { statusName: values.statusName, custodianId: values.custodianId || null, locationId: values.locationId }

    try {
      const response = await fetch(`/api/assets/${assetId}/confirm-inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...custody, reason: values.reason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal of a field shows under it; any other keeps the error line.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        setError(payload?.error ?? labels.errorFallback)
        return
      }
      // The page's h1 stays through the refresh: focusable by script only (tabIndex -1), it takes focus on close.
      const heading = document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("h1")
      if (heading) {
        heading.tabIndex = -1
        returnFocusRef.current = heading
      }
      setOpen(false)
      toast.success(labels.success)
      router.refresh()
    } catch {
      setError(labels.errorFallback)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant="outline" size="md" onClick={openDialog}>
        {labels.button}
      </Button>
      <AccessibleDialog
        open={open}
        title={labels.title}
        busy={busy}
        initialFocusRef={reasonRef}
        returnFocusRef={returnFocusRef}
        fallbackFocusRef={triggerRef}
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            {handover === "unclear" ? (
              <Notice tone="warning">
                {labels.handoverUnclear}
              </Notice>
            ) : null}
            {locked ? (
              <>
                <Notice tone="info">
                  <span id={HANDOVER_LOCKED_ID}>{labels.handoverLocked}</span>
                </Notice>
                <Field label={labels.status} error={errorText("statusName")}>
                  <Input id={FIELD_IDS.statusName} readOnly value={lockedStatusLabel ?? ""} aria-describedby={HANDOVER_LOCKED_ID} />
                </Field>
                <Field label={labels.holder} error={errorText("custodianId")}>
                  <Input id={FIELD_IDS.custodianId} readOnly value={currentCustodian?.label ?? ""} aria-describedby={HANDOVER_LOCKED_ID} />
                </Field>
                <Field label={labels.location} error={errorText("locationId")}>
                  <Input id={FIELD_IDS.locationId} readOnly value={currentLocation.label} aria-describedby={HANDOVER_LOCKED_ID} />
                </Field>
              </>
            ) : handover === "none" ? (
              <>
                <Field label={labels.status} required error={errorText("statusName")}>
                  <NativeSelect
                    id={FIELD_IDS.statusName}
                    value={values.statusName}
                    onChange={(event) => {
                      setField("statusName", event.target.value as AssetConfirmInspectionStatusName)
                      fieldErrors.clear("statusName", "custodianId")
                    }}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <SearchableSelect
                  id={FIELD_IDS.custodianId}
                  label={labels.holder}
                  value={values.custodianId}
                  options={employeeOptions}
                  required={values.statusName === "In Use"}
                  placeholder={labels.holderPlaceholder}
                  searchPlaceholder={labels.searchPlaceholder}
                  emptyLabel={labels.searchEmpty}
                  error={errorText("custodianId")}
                  onChange={(value) => {
                    setField("custodianId", value)
                    fieldErrors.clear("custodianId")
                  }}
                />
                <SearchableSelect
                  id={FIELD_IDS.locationId}
                  label={labels.location}
                  value={values.locationId}
                  options={locationOptions}
                  required
                  placeholder={labels.locationPlaceholder}
                  searchPlaceholder={labels.searchPlaceholder}
                  emptyLabel={labels.searchEmpty}
                  error={errorText("locationId")}
                  onChange={(value) => {
                    setField("locationId", value)
                    fieldErrors.clear("locationId")
                  }}
                />
              </>
            ) : null}
            {handover === "unclear" ? null : (
              <Field label={labels.reason} required error={errorText("reason")}>
                <Textarea
                  ref={reasonRef}
                  id={FIELD_IDS.reason}
                  value={values.reason}
                  onChange={(event) => {
                    setField("reason", event.target.value)
                    fieldErrors.clear("reason")
                  }}
                  placeholder={labels.reasonPlaceholder}
                  className="min-h-24"
                />
              </Field>
            )}
            {error ? <p role="alert" className="text-sm text-danger"><ApiErrorText error={error} /></p> : null}
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            {handover === "unclear" ? null : (
              <Button type="submit" busy={busy}>
                {labels.submit}
              </Button>
            )}
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </>
  )
}
