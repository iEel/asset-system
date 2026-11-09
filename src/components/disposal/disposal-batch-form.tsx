"use client"

import { useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { DisposalAssetPicker, type DisposalAssetOption } from "@/components/disposal/disposal-asset-picker"
import { DisposalBatchMachineRow, type DisposalBatchQueuedFile } from "@/components/disposal/disposal-batch-machine-row"
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
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
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { getAssetStateTone } from "@/lib/design-system"
import {
  DISPOSAL_BATCH_MAX_ASSETS,
  DISPOSAL_BATCH_MIN_ASSETS,
  DISPOSAL_BATCH_REASON_MAX,
  DISPOSAL_BATCH_REASON_MIN,
  disposalBatchPhotoCount,
  planDisposalBatchUploads,
  runWithLimit,
  summarizeDisposalBatchUploads,
  validateDisposalBatchForm,
  type DisposalBatchFormField,
  type DisposalBatchUploadJob,
} from "@/lib/disposal-batch-form-rules"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { disposalEvidenceAccept, disposalPhotoMimeTypes } from "@/lib/disposal-photo"
import { getDisposalPhotoRequirementError, getDisposalQueuedFileError } from "@/lib/disposal-request-form-rules"
import { getDisposalRequestReasonError } from "@/lib/disposal-type-policy"

type Option = { id: string; label: string }

type DisposalBatchValues = {
  disposalType: string
  reason: string
  requestedById: string
  approverId: string
}

type CreatedBatch = { batch: { id: string }; requests: { id: string; assetId: string; disposalNo: string }[] }
type UploadFailure = { batchId: string; total: number; summary: ReturnType<typeof summarizeDisposalBatchUploads> }

// The methods in the board's order, as the single form (group 6 spec §8.3), with no default.
const METHODS = ["sell", "donate", "destroy", "lost", "dispose"] as const
const PENDING_DISPOSAL_STATUS = "Pending Disposal"
// PB-R4: the uploads after the create run 4 at a time.
const UPLOAD_POOL = 4

// The form's id: the frame's footer submit names it.
const DISPOSAL_BATCH_FORM_ID = "disposal-batch-form"

// The fields in visual order, keyed like validateDisposalBatchForm, with the id focus moves to (v-track M-R1). The
// approver has no rule and stays out; a machine's own photo is never required, so no row is here.
const FIELD_IDS = {
  assets: "disposal-batch-assets",
  lotFiles: "disposal-batch-lot-files",
  disposalType: "disposal-batch-type",
  reason: "disposal-batch-reason",
  requestedById: "disposal-batch-requested-by",
} as const
const FIELD_ORDER = Object.keys(FIELD_IDS) as DisposalBatchFormField[]

// noValidate turns the browser's check off, so this restates every send rule (validateDisposalBatchForm): 2+ machines,
// the lot photo (any file for สูญหาย), the method, the reason and the requester. A machine's own photo is never required.
function validate(values: DisposalBatchValues, assetCount: number, lotFiles: readonly DisposalBatchQueuedFile[]) {
  return validateDisposalBatchForm({ assetCount, lotFiles: lotFiles.map((item) => item.file), ...values })
}

const isPhoto = (file: File) => (disposalPhotoMimeTypes as readonly string[]).includes(file.type.toLowerCase())

function uploadUrl(job: DisposalBatchUploadJob) {
  return job.kind === "lot" ? `/api/disposal-batches/${job.batchId}/attachments` : `/api/disposal-requests/${job.requestId}/attachments`
}

// สร้างชุดคำขอตัดจำหน่าย (DP-Batch-New, request batches spec §4) on the operation frame: three numbered sections (the
// machines with their Serial and an optional photo each, the required lot photo, the method and request details), the
// summary "หลังส่งคำขอ" and the sticky footer; the old review step is gone (PB-R1). Send = create the batch, then each
// machine's files to its own request and the lot files to the batch, 4 at a time (PB-R4). All uploads fine: a toast and
// the batch page. Any failed: the form stays and names the machines and the lot's count (PB-R3); nothing is stored.
// Below md the form is not shown: the page's phone notice stands in (the form is for the computer, spec §4).
export function DisposalBatchForm({
  breadcrumbs,
  back,
  locale,
  cancelHref,
  employees,
  initialRequesterId,
  requesterNeedsChoice,
  pendingDisposalLabel,
}: {
  breadcrumbs: BreadcrumbItem[]
  back: ReactNode
  locale: string
  cancelHref: string
  /** "code - name · department", as the single form. */
  employees: Option[]
  /** defaultDisposalRequester: the signed-in user's employee, or "" with needsChoice. */
  initialRequesterId: string
  requesterNeedsChoice: boolean
  /** The Thai name of the status the machines move to (รอตัดจำหน่าย). */
  pendingDisposalLabel: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [machines, setMachines] = useState<DisposalAssetOption[]>([])
  const [machineFiles, setMachineFiles] = useState<Record<string, DisposalBatchQueuedFile[]>>({})
  const [lotFiles, setLotFiles] = useState<DisposalBatchQueuedFile[]>([])
  const nextFileId = useRef(0)
  const [lotRefused, setLotRefused] = useState(false)
  // After a send was tried, the lot error follows the files and the method live, as the single form's photo.
  const [lotTried, setLotTried] = useState(false)
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null)
  const [values, setValues] = useState<DisposalBatchValues>({ disposalType: "", reason: "", requestedById: initialRequesterId, approverId: "" })
  const fieldErrors = useFieldErrors<DisposalBatchFormField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  const lost = values.disposalType === "lost"
  // A lost batch has no photo slot per machine: the rows' files stay queued but are neither counted nor sent.
  const rows = machines.map((machine) => ({
    machine,
    assetTag: machine.assetTag ?? machine.label,
    files: lost ? [] : machineFiles[machine.id] ?? [],
  }))

  function setField(field: keyof DisposalBatchValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as DisposalBatchFormField)
  }

  function queue(files: File[]): DisposalBatchQueuedFile[] {
    return files.map((file) => ({ id: String(nextFileId.current++), file }))
  }

  function changeMachines(next: DisposalAssetOption[]) {
    setMachines(next)
    const kept = new Set(next.map((machine) => machine.id))
    setMachineFiles((current) => Object.fromEntries(Object.entries(current).filter(([id]) => kept.has(id))))
    if (next.length >= DISPOSAL_BATCH_MIN_ASSETS) fieldErrors.clear("assets")
  }

  // A HEIC/HEIF (or any image outside JPG, PNG, WEBP) is refused at once and never queued, as on the single form.
  function addLotFiles(next: File[]) {
    const accepted = next.filter((file) => getDisposalQueuedFileError(file) === null)
    setLotRefused(accepted.length < next.length)
    if (accepted.length === 0) return
    setLotFiles((current) => [...current, ...queue(accepted)])
    fieldErrors.clear("lotFiles")
  }

  async function upload(job: DisposalBatchUploadJob): Promise<{ job: DisposalBatchUploadJob; ok: boolean }> {
    const formData = new FormData()
    formData.append("file", job.file)
    const response = await fetch(uploadUrl(job), { method: "POST", body: formData }).catch(() => null)
    return { job, ok: Boolean(response?.ok) }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploadFailure) return
    setLotTried(true)
    fieldErrors.setErrors(validate(values, machines.length, lotFiles))
    if (focusFirstError()) return
    setSaving(true)

    try {
      const response = await fetch("/api/disposal-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: machines.map((machine) => machine.id),
          disposalType: values.disposalType,
          reason: values.reason,
          requestedById: values.requestedById,
          approverId: values.approverId || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }
      const created = payload as CreatedBatch
      const jobs = planDisposalBatchUploads(
        created,
        rows.map((row) => ({ assetId: row.machine.id, assetTag: row.assetTag, files: row.files.map((item) => item.file) })),
        lotFiles.map((item) => item.file),
      )
      const results = await runWithLimit(jobs.map((job) => () => upload(job)), UPLOAD_POOL)
      const summary = summarizeDisposalBatchUploads(results)
      const failed = results.filter((result) => !result.ok).length
      if (failed === 0) {
        toast.success(t("batchCreateSuccess", { count: machines.length }))
        router.push(`/${locale}/disposal/batches/${created.batch.id}`)
        return
      }
      // PB-R3: the batch exists; the form stays and says which files to attach again, and where.
      setUploadFailure({ batchId: created.batch.id, total: failed, summary })
      window.requestAnimationFrame(() => document.getElementById("disposal-batch-upload-failure")?.focus())
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const photoCount = disposalBatchPhotoCount(rows.map((row) => ({ files: row.files.map((item) => item.file) })))
  const lotPhotoCount = lotFiles.filter((item) => isPhoto(item.file)).length
  const liveLotError = getDisposalPhotoRequirementError(lotFiles.map((item) => item.file), values.disposalType)
  const lotError = lotTried && liveLotError ? t(liveLotError) : undefined
  const trimmedReasonLength = values.reason.trim().length
  const approverOptions = employees.filter((employee) => employee.id !== values.requestedById)
  const approverLabel = employees.find((employee) => employee.id === values.approverId)?.label ?? null
  const methodLabel = values.disposalType ? t(`types.${values.disposalType}`) : null
  const reasonOk = getDisposalRequestReasonError(values.reason) === null && values.reason.length <= DISPOSAL_BATCH_REASON_MAX
  const lotImages = lotFiles.filter((item) => isPhoto(item.file))
  const lotOthers = lotFiles.filter((item) => !isPhoto(item.file))
  const locked = saving || uploadFailure !== null

  const checklist = [
    { key: "assets", label: t("batchMinAssets"), done: machines.length >= DISPOSAL_BATCH_MIN_ASSETS },
    { key: "method", label: t("createForm.checkMethod"), done: values.disposalType !== "" },
    { key: "requesterReason", label: t("createForm.checkRequesterReason"), done: values.requestedById !== "" && reasonOk },
    {
      key: "photo",
      label: lost ? t("createForm.checkEvidence", { count: lotFiles.length }) : t("createForm.checkPhoto", { count: lotPhotoCount }),
      done: liveLotError === null,
    },
  ]

  const footerLine = machines.length > 0 ? (
    <>
      {t("batchForm.footer", { count: machines.length })}
      {methodLabel ? <> · {methodLabel}</> : null}
    </>
  ) : t("createForm.footerEmpty")

  return (
    <form onSubmit={handleSubmit} noValidate id={DISPOSAL_BATCH_FORM_ID} data-disposal-batch-desktop className="max-md:hidden">
      <OperationFormFrame
        title={t("batchCreateTitle")}
        description={t("batchCreateHelp")}
        breadcrumbs={breadcrumbs}
        back={back}
        summary={(
          <OperationSummaryCard
            title={t("createForm.summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={t("createForm.summaryNext")}
            assetLabel={machines.length > 0 ? t("batchForm.assetsSummary", { count: machines.length }) : undefined}
            rows={[
              {
                key: "assetStatus",
                label: t("createForm.rowAssetStatus"),
                now: "–",
                next: <StatusBadge wrap label={pendingDisposalLabel} tone={getAssetStateTone(PENDING_DISPOSAL_STATUS)} />,
                changed: true,
              },
              { key: "request", label: t("createForm.rowRequest"), now: t("createForm.requestNone"), next: t("statuses.pending"), changed: true },
              { key: "approver", label: t("createForm.rowApprover"), now: "–", next: approverLabel ?? t("anyApprover"), changed: false },
            ]}
            afterRows={<p data-disposal-summary-steps className="text-sm text-foreground">{t("createForm.steps")}</p>}
            checklist={checklist}
          />
        )}
        footer={{
          description: <span data-disposal-footer>{footerLine}</span>,
          cancelHref,
          cancelLabel: tCommon("cancel"),
          submitLabel: t("batchForm.submit", { count: machines.length }),
          busy: saving,
          formId: DISPOSAL_BATCH_FORM_ID,
          submitDisabled: uploadFailure !== null,
        }}
      >
        {uploadFailure ? (
          <Notice
            tone="warning"
            role="alert"
            id="disposal-batch-upload-failure"
            tabIndex={-1}
            data-disposal-batch-upload-failure=""
            title={t("batchForm.uploadFailedTitle", { count: uploadFailure.total })}
            action={(
              <Link href={`/${locale}/disposal/batches/${uploadFailure.batchId}`} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("batchForm.openBatch")}
              </Link>
            )}
          >
            <ul className="grid gap-1">
              {uploadFailure.summary.machines.map((machine) => (
                <li key={machine.requestId} data-disposal-batch-upload-failed-machine={machine.disposalNo}>
                  {t("batchForm.uploadFailedMachine", { disposalNo: machine.disposalNo, assetTag: machine.assetTag })} ·{" "}
                  <Link href={`/${locale}/disposal/${machine.requestId}#files`} className={linkVariants()}>
                    {t("batchForm.attachPhoto")}
                  </Link>
                </li>
              ))}
              {uploadFailure.summary.lotFailed > 0 ? (
                <li data-disposal-batch-upload-failed-lot="">{t("batchForm.uploadFailedLot", { count: uploadFailure.summary.lotFailed })}</li>
              ) : null}
            </ul>
          </Notice>
        ) : null}

        <FormSection number={1} title={t("batchForm.sectionAssets")}>
          <div className="grid gap-3">
            <DisposalAssetPicker
              id="disposal-batch-assets"
              label={t("asset")}
              selected={machines}
              onChange={changeMachines}
              max={DISPOSAL_BATCH_MAX_ASSETS}
              showSelectedList={false}
              searchPlaceholder={t("batchForm.search")}
              emptyLabel={tCommon("searchSelectNoResults")}
              error={fieldErrors.errors.assets ? t("batchMinAssets") : undefined}
              disposalType={values.disposalType}
            />
            {machines.length > 0 ? (
              <ul aria-label={t("batchForm.machines")} data-disposal-batch-machines className="divide-y divide-border-soft rounded-md border border-border">
                {rows.map((row) => (
                  <DisposalBatchMachineRow
                    key={row.machine.id}
                    machine={{
                      id: row.machine.id,
                      name: row.machine.name ?? row.machine.label,
                      assetTag: row.assetTag,
                      serialNumber: row.machine.serialNumber ?? null,
                    }}
                    files={row.files}
                    showPhoto={!lost}
                    disabled={locked}
                    onAddFiles={(files) => setMachineFiles((current) => ({ ...current, [row.machine.id]: [...(current[row.machine.id] ?? []), ...queue(files)] }))}
                    onRemoveFile={(fileId) => setMachineFiles((current) => ({ ...current, [row.machine.id]: (current[row.machine.id] ?? []).filter((item) => item.id !== fileId) }))}
                    onRemove={() => changeMachines(machines.filter((machine) => machine.id !== row.machine.id))}
                  />
                ))}
              </ul>
            ) : null}
            <p data-disposal-batch-count aria-live="polite" className="text-meta text-muted-foreground num">
              {t("batchForm.countLine", { count: photoCount.machines, withPhoto: photoCount.withOwnPhoto })}
            </p>
          </div>
        </FormSection>

        <FormSection number={2} title={t("batchForm.sectionLot")}>
          <div data-disposal-batch-lot className="grid gap-3">
            <Field label={t("batchForm.lotLabel")} id="disposal-batch-lot-files" required hint={t("batchForm.lotHelp")} error={lotError}>
              {(control) => (
                <FileDropzone
                  {...control}
                  file={null}
                  onFileChange={(file) => {
                    if (file) addLotFiles([file])
                  }}
                  onFilesChange={addLotFiles}
                  disabled={locked}
                  accept={disposalEvidenceAccept}
                  multiple
                  title={t("dropEvidenceTitle")}
                  description={lost ? t("createForm.dropDescriptionLost") : t("createForm.dropDescription")}
                  browseLabel={t("dropEvidenceHint")}
                />
              )}
            </Field>
            {lotRefused ? <FieldError data-disposal-photo-refused>{t("photoTypeRefused")}</FieldError> : null}
            {lotImages.length > 0 ? (
              <ul aria-label={tCommon("selectedFiles")} className="flex flex-wrap gap-2">
                {lotImages.map((item) => (
                  <li key={item.id} data-disposal-queued-photo className="relative">
                    <ChosenPhotoPreview file={item.file} alt={item.file.name} size={96} />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={locked}
                      aria-label={tCommon("removeFile", { name: item.file.name })}
                      onClick={() => setLotFiles((current) => current.filter((queued) => queued.id !== item.id))}
                      className="absolute right-1 top-1 bg-surface"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <FileQueueList
              items={lotOthers.map((item) => ({ id: item.id, name: item.file.name }))}
              disabled={locked}
              onRemove={(id) => setLotFiles((current) => current.filter((queued) => queued.id !== id))}
            />
          </div>
        </FormSection>

        <FormSection number={3} title={t("batchForm.sectionRequest")}>
          <div className="grid gap-5">
            <FieldGroup
              legend={t("createForm.method")}
              id="disposal-batch-type"
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
            <Field
              label={<>{t("reason")} <span className="font-normal text-muted-foreground">{t("reasonRule")}</span></>}
              id="disposal-batch-reason"
              required
              hint={(
                <span className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                  <span data-disposal-reason-line={trimmedReasonLength >= DISPOSAL_BATCH_REASON_MIN ? "ready" : "more"}>
                    {trimmedReasonLength >= DISPOSAL_BATCH_REASON_MIN ? t("reasonReady") : t("reasonMore", { count: DISPOSAL_BATCH_REASON_MIN - trimmedReasonLength })}
                  </span>
                  <span>{t("reasonCharacterCount", { count: trimmedReasonLength, max: DISPOSAL_BATCH_REASON_MAX })}</span>
                </span>
              )}
              error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: DISPOSAL_BATCH_REASON_MIN, max: DISPOSAL_BATCH_REASON_MAX }) : undefined}
            >
              <Textarea
                value={values.reason}
                required
                minLength={DISPOSAL_BATCH_REASON_MIN}
                rows={4}
                maxLength={DISPOSAL_BATCH_REASON_MAX}
                onChange={(event) => setField("reason", event.target.value)}
                className="min-h-28"
              />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <SearchableSelect
                id="disposal-batch-requested-by"
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
                id="disposal-batch-approver"
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
          </div>
        </FormSection>
      </OperationFormFrame>
    </form>
  )
}
