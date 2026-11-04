"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { DisposalAssetCard, type DisposalAssetCardData } from "@/components/disposal/disposal-asset-card"
import { DisposalAssetPicker, type DisposalAssetOption } from "@/components/disposal/disposal-asset-picker"
import { withNode, NODE } from "@/components/maintenance/repair-create-summary"
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { ChosenPhotoPreview } from "@/components/ui/chosen-photo-preview"
import { Field, FieldError } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormSection } from "@/components/ui/form-section"
import { Notice } from "@/components/ui/notice"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getAssetStateTone } from "@/lib/design-system"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { disposalEvidenceAccept, disposalPhotoMimeTypes } from "@/lib/disposal-photo"
import {
  buildDisposalRequestSummary,
  getDisposalPhotoRequirementError,
  getDisposalQueuedFileError,
} from "@/lib/disposal-request-form-rules"
import { getDisposalRequestReasonError } from "@/lib/disposal-type-policy"
import { summarizeDisposalEvidenceUploads } from "@/lib/disposal-upload-outcome"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type QueuedFile = { id: string; file: File }

type DisposalRequestValues = {
  assetId: string
  disposalType: string
  reason: string
  requestedById: string
  approverId: string
}

// The methods in the board's order (spec §8.3): ขาย · บริจาค · ทำลาย · สูญหาย · จำหน่าย, with no default.
const METHODS = ["sell", "donate", "destroy", "lost", "dispose"] as const
const PENDING_DISPOSAL_STATUS = "Pending Disposal"
const REASON_MIN = 12
const REASON_MAX = 4000

// The form's id: the frame's footer submit names it.
const DISPOSAL_REQUEST_FORM_ID = "disposal-request-form"

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The
// approver has no rule and stays out; photos is the client's photo rule, focused on the dropzone's file input. The
// estimated values are gone (the user, 2026-11-04: the request asks for no price).
const FIELD_IDS = {
  assetId: "disposal-request-asset",
  disposalType: "disposal-request-type",
  requestedById: "disposal-request-requested-by",
  reason: "disposal-request-reason",
  photos: "disposal-request-photos",
} as const
type DisposalRequestField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DisposalRequestField[]

// noValidate turns the browser's check off, so this restates the asset, the method, the requester, the reason's rules
// and the photo rule (a client gate: the server POST is unchanged, spec §8.6).
function validate(values: DisposalRequestValues, files: readonly QueuedFile[]): Partial<Record<DisposalRequestField, string>> {
  const errors: Partial<Record<DisposalRequestField, string>> = {}
  const check = (key: DisposalRequestField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("disposalType", required(values.disposalType))
  check("requestedById", required(values.requestedById))
  // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
  const reasonTooShort = getDisposalRequestReasonError(values.reason)
  check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, REASON_MAX))
  check("photos", getDisposalPhotoRequirementError(files.map((item) => item.file), values.disposalType))
  return errors
}

const isPhoto = (file: File) => (disposalPhotoMimeTypes as readonly string[]).includes(file.type.toLowerCase())

type DisposalAssetRead = Omit<DisposalAssetCardData, "eligible" | "blockers" | "outstandingComponentTags">
type DisposalAssetReadRow = Pick<DisposalAssetCardData, "id" | "eligible" | "blockers" | "outstandingComponentTags"> & { card?: Omit<DisposalAssetRead, "id"> }

// ยื่นคำขอตัดจำหน่าย (DP-New, group 6 spec §8) on the operation frame: three numbered sections, the summary "หลังส่งคำขอ"
// and the sticky footer. The chosen asset shows as a card read from GET /api/disposal-assets?id=; the method has no
// default; the requester starts as the page's preset; the photo is required (any file for สูญหาย). Create-then-upload
// stays: POST JSON, one upload per file, then the request page with ?uploadErrors=<n> when any upload failed.
export function DisposalRequestForm({
  breadcrumbs,
  back,
  locale,
  cancelHref,
  employees,
  initialAsset,
  initialBlocked,
  initialReason,
  initialSourceType,
  initialSourceId,
  initialRequesterId,
  requesterNeedsChoice,
  statusLabels,
}: {
  breadcrumbs: BreadcrumbItem[]
  back: ReactNode
  locale: string
  cancelHref: string
  /** "code - name · department" (spec §8.3). */
  employees: Option[]
  initialAsset?: DisposalAssetOption
  /** A ?assetId= that is not ready: named with its blockers over the picker (review focus 5). */
  initialBlocked?: { label: string; reasons: string }
  initialReason?: string
  initialSourceType?: string
  initialSourceId?: string
  /** defaultDisposalRequester: the signed-in user's employee, or "" with needsChoice. */
  initialRequesterId: string
  requesterNeedsChoice: boolean
  /** Every active status, name → Thai name: the summary's รอตัดจำหน่าย and the footnote. */
  statusLabels: Record<string, string>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<QueuedFile[]>([])
  const nextFileId = useRef(0)
  const [fileRefused, setFileRefused] = useState(false)
  // After a send was tried, the photo error follows the files and the method live (review focus 1).
  const [photoTried, setPhotoTried] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<DisposalAssetOption[]>(initialAsset ? [initialAsset] : [])
  const [card, setCard] = useState<DisposalAssetCardData | null>(null)
  const [cardFailedFor, setCardFailedFor] = useState<string | null>(null)
  const [cardAttempt, setCardAttempt] = useState(0)
  // Set only by the picker's onChange: the card that replaces it takes focus. A ?assetId= load leaves focus alone.
  const focusCardAfterPick = useRef(false)
  const [values, setValues] = useState<DisposalRequestValues>({
    assetId: initialAsset?.id ?? "",
    disposalType: "",
    reason: initialReason ?? "",
    requestedById: initialRequesterId,
    approverId: "",
  })
  const fieldErrors = useFieldErrors<DisposalRequestField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const currentCard = card?.id === values.assetId ? card : null

  // The chosen asset's card, read once per asset. A change aborts the read in flight, and an answer for another asset
  // is ignored, so a slow answer never shows the wrong asset.
  useEffect(() => {
    const assetId = values.assetId
    if (!assetId || card?.id === assetId) return
    const controller = new AbortController()
    fetch(`/api/disposal-assets?id=${encodeURIComponent(assetId)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ data?: DisposalAssetReadRow[] }>) : null))
      .then((payload) => {
        if (controller.signal.aborted) return
        const row = payload?.data?.find((candidate) => candidate.id === assetId)
        if (!row?.card) return setCardFailedFor(assetId)
        setCard({ id: row.id, ...row.card, eligible: row.eligible, blockers: row.blockers, outstandingComponentTags: row.outstandingComponentTags ?? [] })
      })
      .catch(() => {
        if (!controller.signal.aborted) setCardFailedFor(assetId)
      })
    return () => controller.abort()
  }, [card?.id, values.assetId, cardAttempt])

  useEffect(() => {
    if (!currentCard || !focusCardAfterPick.current) return
    focusCardAfterPick.current = false
    window.requestAnimationFrame(() => document.getElementById(FIELD_IDS.assetId)?.focus())
  }, [currentCard])

  function setField(field: keyof DisposalRequestValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as DisposalRequestField)
  }

  // "เปลี่ยน": the asset goes and the picker comes back with focus.
  function clearAsset() {
    setSelectedAssets([])
    setField("assetId", "")
    window.requestAnimationFrame(() => document.getElementById(FIELD_IDS.assetId)?.focus())
  }

  function retryCard() {
    setCardFailedFor(null)
    setCardAttempt((attempt) => attempt + 1)
  }

  // A HEIC/HEIF (or any image outside JPG, PNG, WEBP) is refused at once and never queued (spec §8.4).
  function addFiles(next: File[]) {
    const accepted = next.filter((file) => getDisposalQueuedFileError(file) === null)
    setFileRefused(accepted.length < next.length)
    if (accepted.length === 0) return
    setFiles((current) => [...current, ...accepted.map((file) => ({ id: String(nextFileId.current++), file }))])
    fieldErrors.clear("photos")
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhotoTried(true)
    fieldErrors.setErrors(validate(values, files))
    if (focusFirstError()) return
    setSaving(true)

    try {
      const response = await fetch("/api/disposal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          disposalType: values.disposalType,
          reason: values.reason,
          requestedById: values.requestedById,
          approverId: values.approverId || null,
          sourceType: initialSourceType || null,
          sourceId: initialSourceId || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }
      const uploadResults: Array<{ fileName: string; ok: boolean }> = []
      for (const { file } of files) {
        const formData = new FormData()
        formData.append("file", file)
        const uploadResponse = await fetch(`/api/disposal-requests/${payload.id}/attachments`, {
          method: "POST",
          body: formData,
        }).catch(() => null)
        uploadResults.push({ fileName: file.name, ok: Boolean(uploadResponse?.ok) })
      }
      const outcome = summarizeDisposalEvidenceUploads(payload.id, uploadResults)
      const failed = outcome.failedFileNames.length
      if (failed > 0) toast.warning(t("createSuccessWithUploadErrors", { count: failed }))
      else toast.success(t("createSuccess"))
      // The request page reads the count (plan 3 Task 3) beside its derived "has a photo" state.
      const uploadQuery = failed > 0 ? `?uploadErrors=${failed}` : ""
      router.push(`/${locale}/disposal/${payload.id}${uploadQuery}`)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const lost = values.disposalType === "lost"
  const photoCount = files.filter((item) => isPhoto(item.file)).length
  const livePhotoError = getDisposalPhotoRequirementError(files.map((item) => item.file), values.disposalType)
  const photoError = photoTried && livePhotoError ? t(livePhotoError) : undefined
  const trimmedReasonLength = values.reason.trim().length
  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)
  const approverLabel = employees.find((employee) => employee.id === values.approverId)?.label ?? null
  const methodLabel = values.disposalType ? t(`types.${values.disposalType}`) : null
  const pendingDisposalLabel = statusLabels[PENDING_DISPOSAL_STATUS] ?? PENDING_DISPOSAL_STATUS
  const imageFiles = files.filter((item) => isPhoto(item.file))
  const otherFiles = files.filter((item) => !isPhoto(item.file))

  const summary = buildDisposalRequestSummary({
    assetStatusName: currentCard?.statusName ?? null,
    disposalType: values.disposalType,
    approverLabel,
    photoCount,
    fileCount: files.length,
    requesterChosen: values.requestedById !== "",
    reasonOk: getDisposalRequestReasonError(values.reason) === null && values.reason.length <= REASON_MAX,
  })
  const rowLabels = {
    assetStatus: t("createForm.rowAssetStatus"),
    request: t("createForm.rowRequest"),
    approver: t("createForm.rowApprover"),
  }
  const rowValue = (key: "assetStatus" | "request" | "approver", side: "now" | "next", value: string | null): ReactNode => {
    if (key === "assetStatus") {
      if (side === "now") return currentCard ? <StatusBadge wrap label={currentCard.statusNameTh} tone={getAssetStateTone(currentCard.statusName)} /> : "–"
      return <StatusBadge wrap label={pendingDisposalLabel} tone={getAssetStateTone(PENDING_DISPOSAL_STATUS)} />
    }
    if (key === "request") return side === "now" ? t("createForm.requestNone") : t("statuses.pending")
    if (side === "now") return "–"
    return value === "anyApprover" ? t("anyApprover") : value
  }
  const checkLabels = {
    asset: t("asset"),
    method: t("createForm.checkMethod"),
    requesterReason: t("createForm.checkRequesterReason"),
    photo: lost ? t("createForm.checkEvidence", { count: files.length }) : t("createForm.checkPhoto", { count: photoCount }),
  }

  const footerLine = currentCard ? (
    <>
      {withNode(t("createForm.footer", { name: NODE }), <strong className="font-semibold text-foreground">{currentCard.name}</strong>)}{" "}
      <span className="tag">{currentCard.assetTag}</span>
      {methodLabel ? <> · {methodLabel}</> : null}
    </>
  ) : t("createForm.footerEmpty")

  return (
    <form onSubmit={handleSubmit} noValidate id={DISPOSAL_REQUEST_FORM_ID}>
      <OperationFormFrame
        title={t("createTitle")}
        description={t("createSubtitle")}
        breadcrumbs={breadcrumbs}
        back={back}
        summaryOnPhone
        summary={(
          <OperationSummaryCard
            title={t("createForm.summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={t("createForm.summaryNext")}
            photo={currentCard ? (
              <AssetThumbnail
                photo={currentCard.photoAttachmentId ? { id: currentCard.photoAttachmentId, alt: currentCard.name, fileType: "image/jpeg" } : null}
                assetTag={currentCard.assetTag}
                assetName={currentCard.name}
                size={64}
              />
            ) : undefined}
            assetLabel={currentCard ? <>{currentCard.name} <span className="tag">{currentCard.assetTag}</span></> : undefined}
            rows={summary.rows.map((row) => ({
              key: row.key,
              label: rowLabels[row.key],
              now: rowValue(row.key, "now", row.now),
              next: rowValue(row.key, "next", row.next),
              changed: row.key !== "approver",
            }))}
            afterRows={<p data-disposal-summary-steps className="text-sm text-foreground">{t("createForm.steps")}</p>}
            checklist={summary.checks.map((check) => ({ key: check.key, label: checkLabels[check.key], done: check.done }))}
            footnote={currentCard ? t("createForm.footnote", { status: currentCard.statusNameTh }) : undefined}
          />
        )}
        footer={{
          description: <span data-disposal-footer>{footerLine}</span>,
          cancelHref,
          cancelLabel: tCommon("cancel"),
          submitLabel: t("submitRequest"),
          busy: saving,
          formId: DISPOSAL_REQUEST_FORM_ID,
        }}
      >
        <FormSection number={1} title={t("createForm.sectionAsset")}>
          <div className="grid gap-4">
            {initialBlocked && !values.assetId ? (
              <Notice tone="warning" title={initialBlocked.label} data-disposal-initial-blocked="">
                {t("errors.DISPOSAL_ASSET_BLOCKED")} · {initialBlocked.reasons}
              </Notice>
            ) : null}
            {currentCard ? (
              <DisposalAssetCard asset={currentCard} onChange={clearAsset} fieldId={FIELD_IDS.assetId} />
            ) : (
              <DisposalAssetPicker
                id="disposal-request-asset"
                label={t("asset")}
                selected={selectedAssets}
                onChange={(assets) => {
                  focusCardAfterPick.current = assets.length > 0
                  setSelectedAssets(assets)
                  setField("assetId", assets[0]?.id ?? "")
                }}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                error={fieldErrors.message("assetId")}
              />
            )}
            {values.assetId && !currentCard && cardFailedFor === values.assetId ? (
              <Notice
                tone="warning"
                role="status"
                data-disposal-card-failed
                action={(
                  <Button type="button" variant="outline" size="md" onClick={retryCard}>
                    {tCommon("tryAgain")}
                  </Button>
                )}
              >
                {t("createForm.cardFailed")}
              </Notice>
            ) : null}
          </div>
        </FormSection>

        <FormSection number={2} title={t("createForm.sectionMethod")}>
          <div className="grid gap-5">
            <FieldGroup
              legend={t("createForm.method")}
              id="disposal-request-type"
              required
              hint={t("methodHint")}
              error={fieldErrors.errors.disposalType ? t("methodRequired") : undefined}
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {METHODS.map((method) => (
                  <ChoiceCard
                    key={method}
                    type="radio"
                    name="disposalType"
                    required
                    value={method}
                    data-disposal-method={method}
                    checked={values.disposalType === method}
                    label={t(`types.${method}`)}
                    description={values.disposalType === method ? t(`methodNeeds.${method}`) : undefined}
                    onChange={() => setField("disposalType", method)}
                  />
                ))}
              </div>
            </FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <SearchableSelect
                id="disposal-request-requested-by"
                label={t("requestedBy")}
                value={values.requestedById}
                required
                options={employees}
                placeholder={t("selectEmployee")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={requesterNeedsChoice ? t("requesterNoEmployeeHint") : t("requesterPresetHint")}
                error={fieldErrors.message("requestedById")}
                onChange={(value) => {
                  setValues((current) => ({
                    ...current,
                    requestedById: value,
                    approverId: current.approverId === value ? "" : current.approverId,
                  }))
                  fieldErrors.clear("requestedById")
                }}
              />
              <SearchableSelect
                id="disposal-request-approver"
                label={`${t("createForm.approver")} ${t("createForm.optional")}`}
                value={values.approverId}
                options={approverOptions}
                placeholder={t("anyApprover")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={t("approverHint")}
                onChange={(value) => setField("approverId", value)}
              />
            </div>
            <Field
              label={<>{t("reason")} <span className="font-normal text-muted-foreground">{t("reasonRule")}</span></>}
              id="disposal-request-reason"
              required
              hint={(
                <span className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                  <span data-disposal-reason-line={trimmedReasonLength >= REASON_MIN ? "ready" : "more"}>
                    {trimmedReasonLength >= REASON_MIN ? t("reasonReady") : t("reasonMore", { count: REASON_MIN - trimmedReasonLength })}
                  </span>
                  <span>{t("reasonCharacterCount", { count: trimmedReasonLength, max: REASON_MAX })}</span>
                </span>
              )}
              error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: REASON_MIN, max: REASON_MAX }) : undefined}
            >
              <Textarea
                value={values.reason}
                required
                minLength={REASON_MIN}
                rows={4}
                maxLength={REASON_MAX}
                onChange={(event) => setField("reason", event.target.value)}
                className="min-h-28"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection number={3} title={t("createForm.sectionPhotos")}>
          <div data-disposal-photos className="grid gap-3">
            <Field
              label={<>{lost ? t("createForm.evidenceLabel") : t("createForm.photosLabel")} <span className="font-normal text-muted-foreground">{lost ? t("createForm.evidenceRule") : t("createForm.photosRule")}</span></>}
              id="disposal-request-photos"
              required
              error={photoError}
            >
              {(control) => (
                <FileDropzone
                  {...control}
                  file={null}
                  onFileChange={(file) => {
                    if (file) addFiles([file])
                  }}
                  onFilesChange={addFiles}
                  disabled={saving}
                  accept={disposalEvidenceAccept}
                  capture="environment"
                  multiple
                  title={t("dropEvidenceTitle")}
                  description={lost ? t("createForm.dropDescriptionLost") : t("createForm.dropDescription")}
                  browseLabel={t("dropEvidenceHint")}
                />
              )}
            </Field>
            {fileRefused ? <FieldError data-disposal-photo-refused>{t("photoTypeRefused")}</FieldError> : null}
            {imageFiles.length > 0 ? (
              <ul aria-label={tCommon("selectedFiles")} className="flex flex-wrap gap-2">
                {imageFiles.map((item) => (
                  <li key={item.id} data-disposal-queued-photo className="relative">
                    <ChosenPhotoPreview file={item.file} alt={item.file.name} size={96} />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={saving}
                      aria-label={tCommon("removeFile", { name: item.file.name })}
                      onClick={() => removeFile(item.id)}
                      className="absolute right-1 top-1 bg-surface"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <FileQueueList
              items={otherFiles.map((item) => ({ id: item.id, name: item.file.name }))}
              disabled={saving}
              onRemove={removeFile}
            />
          </div>
        </FormSection>
      </OperationFormFrame>
    </form>
  )
}
