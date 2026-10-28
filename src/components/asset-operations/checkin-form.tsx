"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import {
  buildAssetOperationSearchHref,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchRow,
} from "@/lib/asset-operation-search-rules"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { getCheckinChoice } from "@/lib/checkin-choice"
import { formatCount } from "@/lib/display-format"
import { waitForDialogToClose } from "@/lib/field-focus"
import { toLocalDateInputValue } from "@/lib/local-date"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string; disabled?: boolean }
type StatusOption = Option & { name?: string }
type QueuedPhoto = {
  id: string
  label: string
  file: File
}
type CheckinFormValues = {
  checkoutId: string
  returnDate: string
  returnBy: string
  receiveBy: string
  conditionAfter: string
  nextStatusId: string
  nextLocationId: string
  missingAccessories: string
  damageNote: string
  remark: string
  maintenanceProblem: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The two
// people are keyed by their names (returnBy, receiveBy), the fields the server requires; the selects hold their ids.
const FIELD_IDS = {
  checkoutId: "checkin-checkout",
  returnDate: "checkin-return-date",
  returnBy: "checkin-return-by",
  receiveBy: "checkin-receive-by",
  conditionAfter: "checkin-condition-after",
  nextStatusId: "checkin-next-status",
  nextLocationId: "checkin-next-location",
} as const
type CheckinField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckinField[]

// noValidate turns the browser's check off, so this restates the controls' required (the return date had the star and
// no check at all, spec §5) and the server's 100-character limit on the two names (v-track M-R2).
function validate(values: CheckinFormValues): Partial<Record<CheckinField, string>> {
  const errors: Partial<Record<CheckinField, string>> = {}
  const check = (key: CheckinField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("checkoutId", required(values.checkoutId))
  check("returnDate", required(values.returnDate))
  check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100))
  check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))
  check("conditionAfter", required(values.conditionAfter))
  check("nextStatusId", required(values.nextStatusId))
  check("nextLocationId", required(values.nextLocationId))
  return errors
}

export function CheckinForm({
  employees,
  locations,
  statuses,
  conditions,
  initialRow,
  initialQuery,
  legacyReturnCount,
  returnTo,
}: {
  employees: Option[]
  locations: Option[]
  statuses: StatusOption[]
  conditions: StatusOption[]
  /** ?checkoutId=: the open handover's row, chosen or chosen-but-blocked (spec 6.4). */
  initialRow: AssetOperationSearchRow | null
  /** ?assetId=: the asset's tag, the search starts filled (spec 6.4). */
  initialQuery: string
  legacyReturnCount: number
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const confirm = useConfirm()
  const t = useTranslations("checkin")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckinField>()
  const employeeIds = useMemo(() => new Set(employees.map((employee) => employee.id)), [employees])
  const initialChoice = getCheckinChoice(initialRow, employeeIds)
  const [chosen, setChosen] = useState<AssetOperationSearchRow | null>(initialRow)
  const [photoType, setPhotoType] = useState("overview")
  const [photosAfter, setPhotosAfter] = useState<QueuedPhoto[]>([])
  const [returnSignatureDataUrl, setReturnSignatureDataUrl] = useState<string | null>(null)
  const [receiveSignatureDataUrl, setReceiveSignatureDataUrl] = useState<string | null>(null)
  const [returnByEmployeeId, setReturnByEmployeeId] = useState(initialChoice.returnByEmployeeId ?? "")
  const [receiveByEmployeeId, setReceiveByEmployeeId] = useState("")
  const [values, setValues] = useState<CheckinFormValues>({
    checkoutId: initialChoice.checkoutId,
    returnDate: toLocalDateInputValue(),
    returnBy: employees.find((employee) => employee.id === initialChoice.returnByEmployeeId)?.label ?? "",
    receiveBy: "",
    conditionAfter: "",
    nextStatusId: "",
    nextLocationId: "",
    missingAccessories: "",
    damageNote: "",
    remark: "",
    maintenanceProblem: "",
  })

  // The chosen row: its open handover when it can come back, else its reason under the field (spec 6.3, 6.4).
  const choice = getCheckinChoice(chosen, employeeIds)
  const blockedReason = choice.reasonKey ? tAll(choice.reasonKey) : undefined
  const selectedCheckout = chosen?.eligible ? chosen.checkout ?? null : null
  const conditionLabelById = useMemo(() => new Map(conditions.map((condition) => [condition.id, condition.label])), [conditions])
  const selectedStatus = statuses.find((status) => status.id === values.nextStatusId)
  const selectedReturnBy = employees.find((employee) => employee.id === returnByEmployeeId)
  const selectedReceiver = employees.find((employee) => employee.id === receiveByEmployeeId)
  const selectedLocation = locations.find((location) => location.id === values.nextLocationId)
  const repairStatus = statuses.find((status) => status.name === "Under Maintenance")
  const sendsToRepair = selectedStatus?.name === "Under Maintenance"
  const photoTypes = [
    { id: "overview", label: t("photoTypeOverview") },
    { id: "assetTag", label: t("photoTypeAssetTag") },
    { id: "serial", label: t("photoTypeSerial") },
    { id: "accessories", label: t("photoTypeAccessories") },
    { id: "damage", label: t("photoTypeDamage") },
  ]
  const evidenceCount = photosAfter.length + Number(Boolean(returnSignatureDataUrl)) + Number(Boolean(receiveSignatureDataUrl))
  const reviewItems = buildOperationReviewSummary({
    assetLabel: selectedCheckout && chosen ? `${chosen.assetTag} - ${chosen.name}` : "",
    sourceLabel: selectedReturnBy?.label,
    destinationLabels: [selectedReceiver?.label],
    nextStatusLabel: selectedStatus?.label,
    details: selectedLocation ? [{ label: t("nextLocation"), value: selectedLocation.label }] : [],
    evidenceLabel: evidenceCount > 0 ? t("reviewEvidenceCount", { count: evidenceCount }) : t("reviewNoEvidence"),
    labels: {
      asset: t("asset"),
      source: t("returnBy"),
      destination: t("receiveBy"),
      nextStatus: t("nextStatus"),
      evidence: t("reviewEvidence"),
    },
  })

  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as CheckinField)
  }

  function setEmployeeField(field: "returnBy" | "receiveBy", employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId)
    if (field === "returnBy") setReturnByEmployeeId(employeeId)
    if (field === "receiveBy") setReceiveByEmployeeId(employeeId)
    setField(field, employee?.label ?? "")
  }

  function handleDamageNoteChange(value: string) {
    // A damage note picks the repair status when none is chosen yet, which settles that field's error too.
    if (value.trim() && !values.nextStatusId && repairStatus) fieldErrors.clear("nextStatusId")
    setValues((current) => ({
      ...current,
      damageNote: value,
      nextStatusId: value.trim() && !current.nextStatusId && repairStatus ? repairStatus.id : current.nextStatusId,
    }))
  }

  function addPhoto(file: File | null) {
    if (!file) return
    const selectedType = photoTypes.find((type) => type.id === photoType)
    setPhotosAfter((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: selectedType?.label ?? t("photoTypeOverview"),
        file,
      },
    ])
  }

  // A pick: the row's handover, and its holder as the return-by when the holder is an active employee. A return-by the
  // form filled in from the previous row goes when the new choice has none; one chosen by hand stays (spec 6.3).
  function applyChoice(row: AssetOperationSearchRow | null) {
    const next = getCheckinChoice(row, employeeIds)
    const prefilled = getCheckinChoice(chosen, employeeIds).returnByEmployeeId
    setChosen(row)
    setField("checkoutId", next.checkoutId)
    if (next.returnByEmployeeId) setEmployeeField("returnBy", next.returnByEmployeeId)
    else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")
  }

  // A ข้อมูลเก่า row is not taken as it is: it asks once, then the backfill makes its handover (spec 6.3, S-R26).
  function chooseRow(row: AssetOperationSearchRow | null) {
    if (row?.legacy) {
      void confirmLegacyReturn(row)
      return
    }
    applyChoice(row)
  }

  async function confirmLegacyReturn(row: AssetOperationSearchRow) {
    const accepted = await confirm({
      title: t("legacyReturnConfirmTitle"),
      description: t("legacyReturnConfirmDescription", { asset: `${row.assetTag} - ${row.name}`, holder: row.holderLabel ?? row.placeLabel }),
      confirmLabel: t("legacyReturnConfirm"),
    })
    if (accepted) await handleCreateLegacyCheckout(row)
  }

  async function handleCreateLegacyCheckout(row: AssetOperationSearchRow) {
    const assetId = row.id
    setSaving(true)
    try {
      const response = await fetch(`/api/assets/${assetId}/legacy-checkout`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? t("legacyReturnFailed"))

      toast.success(t("legacyReturnCreated"))
      // The handover exists now; the search answers it as a HO- row, which the form takes like any pick.
      const created = await fetchCheckinRow(assetId)
      if (!created?.checkout) throw new Error(tCommon("error"))
      applyChoice(created)
      setValues((current) => ({
        ...current,
        conditionAfter: current.conditionAfter || row.conditionId,
        nextLocationId: current.nextLocationId || row.currentLocationId,
      }))
      fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")
      const checkinHref = `/${locale}/asset-management/checkin?checkoutId=${payload.id}`
      router.replace(returnTo ? appendReturnTo(checkinHref, returnTo) : checkinHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : t("legacyReturnFailed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewOpen(true)
  }

  async function submitCheckin() {
    // The review opens only after validate() found the checkout, so this only narrows the type.
    const assetId = selectedCheckout ? chosen?.id : undefined
    if (!assetId) return
    setSaving(true)
    const body = new FormData()
    for (const [key, value] of Object.entries(values)) {
      body.set(key, value)
    }
    body.set("returnByEmployeeId", returnByEmployeeId)
    body.set("receiveByEmployeeId", receiveByEmployeeId)
    body.set("photoAfterLabels", JSON.stringify(photosAfter.map((photo) => photo.label)))
    for (const photo of photosAfter) {
      body.append("photoAfterFiles", photo.file)
    }
    if (returnSignatureDataUrl) body.set("returnSignatureFile", dataUrlToFile(returnSignatureDataUrl, `return-signature-${Date.now()}.png`))
    if (receiveSignatureDataUrl) body.set("receiveSignatureFile", dataUrlToFile(receiveSignatureDataUrl, `receive-signature-${Date.now()}.png`))

    try {
      const response = await fetch(`/api/assets/${assetId}/checkin`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        const message = payload?.code === "ASSET_HANDOVER_MODE_MISSING"
          ? t("handoverModeMissing")
          : payload?.code === "ASSET_HANDOVER_STATUS_MISMATCH"
            ? t("handoverStatusMismatch")
            : payload?.error ?? tCommon("error")
        throw new Error(message)
      }
      toast.success(t("success"))
      const documentHref = `/${locale}/asset-management/checkins/${payload.id}`
      router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} className="mb-6" />
      <ContentPanel>
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {initialRow?.eligible ? (
            <div className="md:col-span-2">
              <FormContextBanner label={t("asset")} value={`${initialRow.assetTag} - ${initialRow.name}`} />
            </div>
          ) : null}
          <div className="md:col-span-2 grid gap-1.5">
            <AssetOperationPicker
              id="checkin-checkout"
              label={t("asset")}
              mode="checkin"
              value={chosen}
              required
              initialQuery={initialQuery}
              error={blockedReason ?? fieldErrors.message("checkoutId")}
              onChange={chooseRow}
            />
            {legacyReturnCount > 0 ? (
              <p className="text-meta text-muted-foreground">{t("legacyReturnCount", { count: formatCount(legacyReturnCount) })}</p>
            ) : null}
          </div>

          <Field label={t("returnDate")} id="checkin-return-date" required error={fieldErrors.message("returnDate")}>
            <Input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} required />
          </Field>

          {selectedCheckout && chosen && (
            <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("currentCustody")}</div>
              {/* D19: the handover and the asset as two shared KeyValueLists; an empty value shows Nil. */}
              <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                <KeyValueList
                  items={[
                    { key: "documentNo", label: t("handoverDocumentNo"), value: selectedCheckout.documentNo ? <span className="tag">{selectedCheckout.documentNo}</span> : null },
                    {
                      key: "custodyType",
                      label: t("custodyType"),
                      value: selectedCheckout.handoverMode === "permanent_assignment"
                        ? t("permanentAssignmentShort")
                        : t("temporaryLoanShort"),
                    },
                    { key: "checkoutType", label: t("checkoutType"), value: selectedCheckout.checkoutType ? t(`type_${selectedCheckout.checkoutType}`) : null },
                    { key: "checkoutTo", label: t("checkoutTo"), value: selectedCheckout.destinationLabel },
                    { key: "checkoutDate", label: t("checkoutDate"), value: formatDate(selectedCheckout.checkoutDate) },
                    ...(selectedCheckout.handoverMode === "temporary_loan"
                      ? [{ key: "expectedReturnDate", label: t("expectedReturnDate"), value: formatDate(selectedCheckout.expectedReturnDate) }]
                      : []),
                    { key: "checkoutRemark", label: t("checkoutRemark"), value: selectedCheckout.remark },
                  ]}
                />
                <KeyValueList
                  items={[
                    { key: "assetTag", label: t("assetTag"), value: chosen.assetTag ? <span className="tag">{chosen.assetTag}</span> : null },
                    { key: "serialNumber", label: t("serialNumber"), value: chosen.serialNumber ? <span className="tag">{chosen.serialNumber}</span> : null },
                    { key: "assetName", label: t("assetName"), value: chosen.name },
                    { key: "currentAssetStatus", label: t("currentAssetStatus"), value: chosen.statusLabel },
                    {
                      key: "conditionBefore",
                      label: t("conditionBefore"),
                      value: selectedCheckout.conditionBefore ? conditionLabelById.get(selectedCheckout.conditionBefore) ?? selectedCheckout.conditionBefore : null,
                    },
                  ]}
                />
              </div>
            </div>
          )}

          <SearchableSelect
            id="checkin-return-by"
            label={t("returnBy")}
            value={returnByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReturnBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("returnBy")}
            onChange={(value) => setEmployeeField("returnBy", value)}
          />
          <SearchableSelect
            id="checkin-receive-by"
            label={t("receiveBy")}
            value={receiveByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReceiveBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("receiveBy")}
            onChange={(value) => setEmployeeField("receiveBy", value)}
          />
          <Select
            label={t("conditionAfter")}
            id="checkin-condition-after"
            value={values.conditionAfter}
            required
            error={fieldErrors.message("conditionAfter")}
            onChange={(value) => setField("conditionAfter", value)}
          >
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>{condition.label}</option>
            ))}
          </Select>
          <Select
            label={t("nextStatus")}
            id="checkin-next-status"
            value={values.nextStatusId}
            required
            error={fieldErrors.message("nextStatusId")}
            onChange={(value) => setField("nextStatusId", value)}
          >
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>{status.name === "Under Maintenance" ? t("sendToRepairOption") : status.label}</option>
            ))}
          </Select>
          <Select
            label={t("nextLocation")}
            id="checkin-next-location"
            value={values.nextLocationId}
            required
            error={fieldErrors.message("nextLocationId")}
            onChange={(value) => setField("nextLocationId", value)}
          >
            <option value="">{t("selectLocation")}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.label}</option>
            ))}
          </Select>
          <Field label={t("missingAccessories")}>
            <Input value={values.missingAccessories} onChange={(event) => setField("missingAccessories", event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("damageNote")}>
              <Textarea value={values.damageNote} onChange={(event) => handleDamageNoteChange(event.target.value)} rows={3} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={3} />
            </Field>
          </div>

          <div className="md:col-span-2">
            <div className="mb-3">
              <div className="text-sm font-semibold text-foreground">{t("returnPhotoChecklist")}</div>
              <div className="mt-1 text-meta text-muted-foreground">{t("returnPhotoChecklistHelp")}</div>
            </div>
            <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr]">
              <Select label={t("photoType")} value={photoType} onChange={setPhotoType}>
                {photoTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </Select>
              <FileDropzone
                file={null}
                onFileChange={addPhoto}
                disabled={saving}
                accept="image/*"
                capture="environment"
                title={t("photoAfterDropTitle")}
                description={t("photoAfterDescription")}
                browseLabel={t("photoAfterDropHint")}
              />
            </div>
            <FileQueueList
              items={photosAfter.map((photo) => ({ id: photo.id, name: photo.label, detail: photo.file.name }))}
              emptyLabel={t("noQueuedPhotos")}
              disabled={saving}
              onRemove={(id) => setPhotosAfter((current) => current.filter((item) => item.id !== id))}
            />
          </div>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <SignaturePad
              label={t("returnSignature")}
              helper={t("returnSignatureHelp")}
              clearLabel={t("clearSignature")}
              disabled={saving}
              onChange={setReturnSignatureDataUrl}
            />
            <SignaturePad
              label={t("receiveSignature")}
              helper={t("receiveSignatureHelp")}
              clearLabel={t("clearSignature")}
              disabled={saving}
              onChange={setReceiveSignatureDataUrl}
            />
          </div>

          {sendsToRepair ? (
            <div className="md:col-span-2 grid gap-3">
              <Notice tone="info" title={t("sendToRepairTitle")}>
                {t("sendToRepairHelp")}
              </Notice>
              <Field label={t("maintenanceProblem")}>
                <Textarea value={values.maintenanceProblem} onChange={(event) => setField("maintenanceProblem", event.target.value)} rows={3} placeholder={t("maintenanceProblemPlaceholder")} />
              </Field>
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" busy={saving} className="w-full sm:w-auto">
              <Save />
              {tCommon("save")}
            </Button>
          </div>
        </form>
        <OperationReviewDialog
          open={reviewOpen}
          title={t("reviewTitle")}
          description={t("reviewDescription")}
          items={reviewItems}
          confirmLabel={t("reviewConfirm")}
          cancelLabel={tCommon("cancel")}
          busy={saving}
          onClose={() => setReviewOpen(false)}
          onConfirm={() => void submitCheckin()}
        />
      </ContentPanel>
    </div>
  )
}

function Select({
  label,
  id,
  value,
  required,
  disabled,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  disabled?: boolean
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
      <NativeSelect value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}

function formatDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value))
}

// The new handover's row after the backfill, read by id as the page's preselect is (spec 6.4).
async function fetchCheckinRow(assetId: string): Promise<AssetOperationSearchRow | null> {
  const response = await fetch(buildAssetOperationSearchHref({ mode: "checkin", id: assetId }))
  if (!response.ok) return null
  const payload = (await response.json().catch(() => null)) as { data?: AssetOperationSearchAnswer } | null
  return payload?.data?.rows[0] ?? null
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [metadata, base64Data] = dataUrl.split(",")
  const mimeMatch = metadata.match(/data:(.*);base64/)
  const mimeType = mimeMatch?.[1] ?? "image/png"
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], fileName, { type: mimeType })
}
