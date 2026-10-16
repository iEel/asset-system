"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { PackageCheck, Save } from "lucide-react"
import { toast } from "sonner"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
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
import { SearchField } from "@/components/ui/search-field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { SignaturePad } from "@/components/asset-operations/signature-pad"
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { formatCount } from "@/lib/display-format"
import { toLocalDateInputValue } from "@/lib/local-date"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean }
type StatusOption = Option & { name?: string }
type CheckoutOption = Option & {
  documentNo?: string | null
  assetId?: string
  assetTag?: string
  assetName?: string
  serialNumber?: string | null
  checkoutType?: string
  handoverMode?: string | null
  statusName?: string
  statusLabel?: string
  checkoutDate?: string
  expectedReturnDate?: string | null
  conditionBefore?: string | null
  destinationLabel?: string
  remark?: string | null
}
type LegacyReturnCandidate = Option & {
  assetTag: string
  assetName: string
  custodianLabel: string
  custodianId: string
  currentLocationId: string
  currentLocationLabel: string
  conditionId: string
}
type QueuedPhoto = {
  id: string
  label: string
  file: File
}

export function CheckinForm({
  activeCheckouts,
  legacyReturnCandidates,
  employees,
  locations,
  statuses,
  conditions,
  initialCheckoutId,
  initialLegacyAssetId,
  returnTo,
}: {
  activeCheckouts: CheckoutOption[]
  legacyReturnCandidates: LegacyReturnCandidate[]
  employees: Option[]
  locations: Option[]
  statuses: StatusOption[]
  conditions: StatusOption[]
  initialCheckoutId?: string
  initialLegacyAssetId?: string
  returnTo?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("checkin")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [legacyBackfillSavingId, setLegacyBackfillSavingId] = useState<string | null>(null)
  const initialLegacyCandidate = legacyReturnCandidates.find((asset) => asset.id === initialLegacyAssetId)
  const [legacyReturnSearch, setLegacyReturnSearch] = useState(initialLegacyCandidate?.assetTag ?? "")
  const [photoType, setPhotoType] = useState("overview")
  const [photosAfter, setPhotosAfter] = useState<QueuedPhoto[]>([])
  const [returnSignatureDataUrl, setReturnSignatureDataUrl] = useState<string | null>(null)
  const [receiveSignatureDataUrl, setReceiveSignatureDataUrl] = useState<string | null>(null)
  const [returnByEmployeeId, setReturnByEmployeeId] = useState("")
  const [receiveByEmployeeId, setReceiveByEmployeeId] = useState("")
  const initialCheckout = activeCheckouts.find((checkout) => checkout.id === initialCheckoutId && !checkout.disabled)
  const [values, setValues] = useState({
    checkoutId: initialCheckout?.id ?? "",
    returnDate: toLocalDateInputValue(),
    returnBy: "",
    receiveBy: "",
    conditionAfter: "",
    nextStatusId: "",
    nextLocationId: "",
    missingAccessories: "",
    damageNote: "",
    remark: "",
    maintenanceProblem: "",
  })

  const selectedCheckout = useMemo(
    () => activeCheckouts.find((checkout) => checkout.id === values.checkoutId),
    [activeCheckouts, values.checkoutId]
  )
  const conditionLabelById = useMemo(() => new Map(conditions.map((condition) => [condition.id, condition.label])), [conditions])
  const selectedStatus = statuses.find((status) => status.id === values.nextStatusId)
  const selectedReturnBy = employees.find((employee) => employee.id === returnByEmployeeId)
  const selectedReceiver = employees.find((employee) => employee.id === receiveByEmployeeId)
  const selectedLocation = locations.find((location) => location.id === values.nextLocationId)
  const repairStatus = statuses.find((status) => status.name === "Under Maintenance")
  const sendsToRepair = selectedStatus?.name === "Under Maintenance"
  const hasActiveCheckoutRecords = activeCheckouts.length > 0
  const hasActiveCheckouts = activeCheckouts.some((checkout) => !checkout.disabled)
  const activeCheckoutOptions = activeCheckouts.map((checkout) => ({
    ...checkout,
    label: checkout.disabled ? `${checkout.label} — ${t("handoverModeMissing")}` : checkout.label,
  }))
  const hasLegacyReturnCandidates = legacyReturnCandidates.length > 0
  const filteredLegacyReturnCandidates = useMemo(() => {
    const query = normalizeText(legacyReturnSearch)
    if (!query) return legacyReturnCandidates

    return legacyReturnCandidates.filter((asset) =>
      [
        asset.assetTag,
        asset.assetName,
        asset.custodianLabel,
        asset.currentLocationLabel,
      ].some((value) => normalizeText(value).includes(query))
    )
  }, [legacyReturnCandidates, legacyReturnSearch])
  const photoTypes = [
    { id: "overview", label: t("photoTypeOverview") },
    { id: "assetTag", label: t("photoTypeAssetTag") },
    { id: "serial", label: t("photoTypeSerial") },
    { id: "accessories", label: t("photoTypeAccessories") },
    { id: "damage", label: t("photoTypeDamage") },
  ]
  const evidenceCount = photosAfter.length + Number(Boolean(returnSignatureDataUrl)) + Number(Boolean(receiveSignatureDataUrl))
  const reviewItems = buildOperationReviewSummary({
    assetLabel: selectedCheckout ? `${selectedCheckout.assetTag ?? ""} - ${selectedCheckout.assetName ?? selectedCheckout.label}`.trim() : "",
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

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function setEmployeeField(field: "returnBy" | "receiveBy", employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId)
    if (field === "returnBy") setReturnByEmployeeId(employeeId)
    if (field === "receiveBy") setReceiveByEmployeeId(employeeId)
    setField(field, employee?.label ?? "")
  }

  function handleDamageNoteChange(value: string) {
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

  async function handleCreateLegacyCheckout(assetId: string) {
    const candidate = legacyReturnCandidates.find((asset) => asset.id === assetId)
    setLegacyBackfillSavingId(assetId)
    try {
      const response = await fetch(`/api/assets/${assetId}/legacy-checkout`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? t("legacyReturnFailed"))

      toast.success(t("legacyReturnCreated"))
      if (candidate) {
        setReturnByEmployeeId(candidate.custodianId)
        setValues((current) => ({
          ...current,
          checkoutId: payload.id,
          returnBy: candidate.custodianLabel,
          conditionAfter: current.conditionAfter || candidate.conditionId,
          nextLocationId: current.nextLocationId || candidate.currentLocationId,
        }))
      }
      const checkinHref = `/${locale}/asset-management/checkin?checkoutId=${payload.id}`
      router.replace(returnTo ? appendReturnTo(checkinHref, returnTo) : checkinHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : t("legacyReturnFailed"))
    } finally {
      setLegacyBackfillSavingId(null)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCheckout?.assetId) {
      toast.error(t("selectCheckoutRequired"))
      return
    }
    if (!returnByEmployeeId || !receiveByEmployeeId) {
      toast.error(t("selectReturnAndReceiver"))
      return
    }
    if (!values.conditionAfter || !values.nextStatusId || !values.nextLocationId) {
      toast.error(t("completeRequiredFields"))
      return
    }
    setReviewOpen(true)
  }

  async function submitCheckin() {
    const assetId = selectedCheckout?.assetId
    if (!assetId) {
      setReviewOpen(false)
      toast.error(t("selectCheckoutRequired"))
      return
    }
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
          {initialCheckout ? (
            <div className="md:col-span-2">
              <FormContextBanner label={t("asset")} value={initialCheckout.label} />
            </div>
          ) : null}
          <SearchableSelect
            label={t("asset")}
            value={values.checkoutId}
            required
            disabled={!hasActiveCheckoutRecords}
            options={activeCheckoutOptions}
            placeholder={hasActiveCheckoutRecords ? t("selectCheckout") : t("noActiveCheckoutsOption")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setField("checkoutId", value)}
          />

          {!hasActiveCheckoutRecords && (
            <div className="md:col-span-2">
              <ActionEmptyState
                icon={<PackageCheck />}
                title={t("noActiveCheckoutsTitle")}
                description={t("noActiveCheckoutsDescription")}
                actionHref={`/${locale}/asset-management/checkout`}
                actionLabel={t("goToCheckout")}
                actionVariant="secondary"
              />
            </div>
          )}

          {hasActiveCheckoutRecords && !hasActiveCheckouts ? (
            <Notice tone="warning" title={t("handoverReviewRequired")} className="md:col-span-2">
              {t("handoverModeMissing")}
            </Notice>
          ) : null}

          {hasLegacyReturnCandidates && (
            <div className="md:col-span-2 grid gap-3">
              <Notice tone="warning" title={t("legacyReturnTitle")}>
                {t("legacyReturnDescription")}
              </Notice>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-meta text-muted-foreground">
                  {t("legacyReturnFilteredCount", {
                    shown: formatCount(filteredLegacyReturnCandidates.length),
                    total: formatCount(legacyReturnCandidates.length),
                  })}
                </span>
                <SearchField
                  aria-label={t("legacyReturnSearch")}
                  placeholder={t("legacyReturnSearch")}
                  className="w-full lg:max-w-sm"
                  value={legacyReturnSearch}
                  onChange={(event) => setLegacyReturnSearch(event.target.value)}
                />
              </div>
              <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-background">
                {filteredLegacyReturnCandidates.length === 0 ? (
                  <EmptyNote padded role="status">{t("legacyReturnNoResults")}</EmptyNote>
                ) : (
                  <ul className="divide-y divide-border-soft">
                    {filteredLegacyReturnCandidates.map((asset) => (
                      <li key={asset.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="tag font-medium text-foreground">{asset.assetTag}</span>
                            <Chip>{t("legacyReturnBadge")}</Chip>
                          </div>
                          <div className="mt-1 truncate text-sm text-muted-foreground" title={asset.assetName}>{asset.assetName}</div>
                          <div className="mt-2 grid gap-1 text-meta text-muted-foreground md:grid-cols-2">
                            <span className="truncate" title={asset.custodianLabel}>{t("legacyReturnCurrentHolder")}: {asset.custodianLabel}</span>
                            <span className="truncate" title={asset.currentLocationLabel}>{t("legacyReturnCurrentLocation")}: {asset.currentLocationLabel}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          busy={legacyBackfillSavingId === asset.id}
                          disabled={saving}
                          onClick={() => handleCreateLegacyCheckout(asset.id)}
                          className="w-full shrink-0 lg:w-auto"
                        >
                          <PackageCheck />
                          {t("legacyReturnAction")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {hasActiveCheckouts && (
            <>
          <Field label={t("returnDate")} required>
            <Input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} />
          </Field>

          {selectedCheckout && (
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
                    { key: "assetTag", label: t("assetTag"), value: selectedCheckout.assetTag ? <span className="tag">{selectedCheckout.assetTag}</span> : null },
                    { key: "serialNumber", label: t("serialNumber"), value: selectedCheckout.serialNumber ? <span className="tag">{selectedCheckout.serialNumber}</span> : null },
                    { key: "assetName", label: t("assetName"), value: selectedCheckout.assetName },
                    { key: "currentAssetStatus", label: t("currentAssetStatus"), value: selectedCheckout.statusLabel ?? selectedCheckout.statusName },
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
            label={t("returnBy")}
            value={returnByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReturnBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setEmployeeField("returnBy", value)}
          />
          <SearchableSelect
            label={t("receiveBy")}
            value={receiveByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReceiveBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setEmployeeField("receiveBy", value)}
          />
          <Select label={t("conditionAfter")} value={values.conditionAfter} required onChange={(value) => setField("conditionAfter", value)}>
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>{condition.label}</option>
            ))}
          </Select>
          <Select label={t("nextStatus")} value={values.nextStatusId} required onChange={(value) => setField("nextStatusId", value)}>
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>{status.name === "Under Maintenance" ? t("sendToRepairOption") : status.label}</option>
            ))}
          </Select>
          <Select label={t("nextLocation")} value={values.nextLocationId} required onChange={(value) => setField("nextLocationId", value)}>
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
            </>
          )}
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

function Select({ label, value, required, disabled, onChange, children }: { label: string; value: string; required?: boolean; disabled?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
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

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("th-TH")
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
