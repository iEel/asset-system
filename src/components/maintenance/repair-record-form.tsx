"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AssetConditionChoice } from "@/components/asset-operations/condition-choice"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { RepairAssetCard } from "@/components/maintenance/repair-asset-card"
import { RepairCreateSummary, withNode, NODE } from "@/components/maintenance/repair-create-summary"
import { RepairHeldNotice } from "@/components/maintenance/repair-held-notice"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { repairConditionDefault } from "@/lib/asset-lifecycle-policy"
import { getAssetStateTone } from "@/lib/design-system"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import type { MaintenanceOption } from "@/lib/maintenance-options"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getBangkokDateKey, type MaintenancePlanFrequency } from "@/lib/preventive-maintenance"
import { getRepairCreateOutlook, type RepairAssetFacts } from "@/lib/repair-record-outlook"
import {
  buildRepairCreatePayload,
  repairFieldIds,
  repairFieldOrder,
  repairFooterAnswerKey,
  validateRepairForm,
  type RepairFormValues,
} from "@/lib/repair-record-form-rules"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
export type RepairFormPlan = {
  id: string
  label: string
  title: string
  vendor: Option | null
  /** The plan's due day, a Bangkok ISO day, and its rhythm: the summary's แผน PM row (G5P2-R6). */
  nextDueDate: string
  frequency: MaintenancePlanFrequency
  intervalDays: number | null
}

// The form's id: the frame's footer submit names it (group 3 spec §5).
const REPAIR_FORM_ID = "repair-record-form"

// บันทึกซ่อม (MT-New, group 5 spec §7) on the operation frame: three numbered sections, the summary column and the sticky
// footer. The done question has no default answer (spec §5), except ซ่อมเสร็จแล้ว on the PM path (G5P2-R6). The asset's
// facts come from the page's read, or after a pick from the picker's by-id read (G5P2-R1); the status line, the early
// refusal and the summary all read them through the one outlook helper.
export function RepairRecordForm({
  breadcrumbs,
  back,
  locale,
  returnTo,
  initialAsset,
  initialFacts,
  plan,
  needsReporter,
  reporterName,
  canReturn,
  todayKey,
  statusLabels,
  conditionOptions,
  salvageLabel,
  initialConditionId,
}: {
  breadcrumbs: BreadcrumbItem[]
  back: ReactNode
  locale: string
  returnTo: string
  initialAsset?: Option & { conditionId?: string }
  initialFacts: RepairAssetFacts | null
  plan?: RepairFormPlan
  needsReporter: boolean
  reporterName: string
  /** asset:edit, the check-in page's permission: the held notice's รับคืน link (Review Focus 5). */
  canReturn: boolean
  /** Bangkok today (getBangkokDateKey): the date's default and its max. */
  todayKey: string
  /** Every active status, name → Thai name (G5P2-R7). */
  statusLabels: Record<string, string>
  // ดี and พอใช้ (getRepairConditionOptions), and initialAsset's own when offered (repairConditionDefault), else "".
  // An asset picked here gets the same default from the condition its option carries (final review M1).
  conditionOptions: Option[]
  initialConditionId: string
  salvageLabel: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [openRecordAssetId, setOpenRecordAssetId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [facts, setFacts] = useState<RepairAssetFacts | null>(initialFacts)
  // The by-id read's failure, for the asset it failed for, and a counter ลองอีกครั้ง bumps to run it again (final review 5).
  const [factsFailedFor, setFactsFailedFor] = useState<string | null>(null)
  const [factsAttempt, setFactsAttempt] = useState(0)
  // Set only by the picker's onChange: the card that replaces it takes focus. A page load with ?assetId= or ?planId=
  // renders the card with this off, so focus stays where the page puts it (final review 2).
  const focusCardAfterPick = useRef(false)
  const [values, setValues] = useState<RepairFormValues>({
    assetId: initialAsset?.id ?? "",
    reportedDate: todayKey,
    problem: plan?.title ?? "",
    done: plan ? true : null,
    outcome: null,
    conditionId: initialConditionId,
    reportedById: "",
    vendorId: plan?.vendor?.id ?? "",
    repairCost: "",
    invoiceNo: "",
    remark: "",
  })
  // Facts of another asset (the one before a change) are never shown: only the current asset's count (Review Focus 2).
  const currentFacts = facts?.id === values.assetId ? facts : null
  const outlook = currentFacts ? getRepairCreateOutlook(currentFacts, { done: values.done, outcome: values.outcome }) : null
  const fieldErrors = useFieldErrors<keyof typeof repairFieldIds>()
  const validationMessage = useValidationMessage()
  // Today is the later of the server's day and the browser's Bangkok day, so a form left open past Bangkok midnight
  // still takes the new day (final review 6). The check and the date's max both read it.
  const latestTodayKey = () => {
    const now = getBangkokDateKey(new Date())
    return now > todayKey ? now : todayKey
  }
  // The form checks itself with the rules file's checks (V2), and focus goes to the first wrong field on screen.
  const validate = () => validateRepairForm(values, { needsReporter, todayKey: latestTodayKey() })
  const focusFirstError = () => fieldErrors.focusFirst(repairFieldOrder(values, needsReporter), { idFor: (key) => repairFieldIds[key] })

  // After a pick, the by-id read brings the asset's facts once. A change aborts the read in flight, and an answer for
  // another asset is ignored, so a slow answer never overwrites the current asset (Review Focus 2).
  useEffect(() => {
    const assetId = values.assetId
    if (!assetId || facts?.id === assetId) return
    const controller = new AbortController()
    fetch(`/api/maintenance-options?type=asset&id=${encodeURIComponent(assetId)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() as Promise<{ data?: MaintenanceOption[] }> : null))
      .then((payload) => {
        if (controller.signal.aborted) return
        const option = payload?.data?.find((candidate) => candidate.id === assetId)
        if (option?.facts?.id !== assetId) return setFactsFailedFor(assetId)
        setFacts(option.facts)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFactsFailedFor(assetId)
      })
    return () => controller.abort()
  }, [facts?.id, values.assetId, factsAttempt])

  // After a pick, once the picked asset's card is on screen, focus moves into it (the picker's trigger is gone).
  useEffect(() => {
    if (!currentFacts || !focusCardAfterPick.current) return
    focusCardAfterPick.current = false
    window.requestAnimationFrame(() => document.getElementById(repairFieldIds.assetId)?.focus())
  }, [currentFacts])

  function retryFacts() {
    setFactsFailedFor(null)
    setFactsAttempt((attempt) => attempt + 1)
  }

  function setField<K extends keyof RepairFormValues>(field: K, value: RepairFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    fieldErrors.clear(field)
  }

  // "เปลี่ยน" (G5P2-R8): the asset and its condition default go, and the picker comes back with focus.
  function clearAsset() {
    setOpenRecordAssetId(null)
    setValues((current) => ({ ...current, assetId: "", conditionId: "" }))
    window.requestAnimationFrame(() => document.getElementById(repairFieldIds.assetId)?.focus())
  }

  // New picks append to the list; each file can be taken out before saving.
  function addFiles(next: File[]) {
    setFiles((current) => [...current, ...next])
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((_, index) => String(index) !== id))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate())
    if (focusFirstError()) return
    setSaving(true)
    setOpenRecordAssetId(null)
    try {
      // The save stays enabled through a refusal shown early: the server answers it (G5P2-R4).
      const response = await fetch("/api/maintenance-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRepairCreatePayload(values, { planId: plan?.id ?? null, needsReporter })),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // The cached facts go, so the by-id read runs again and the card's eligibility line names the open record.
        if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") {
          setOpenRecordAssetId(values.assetId)
          setFacts(null)
        }
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      }
      const failed = await uploadRepairFiles(payload.id, files, values.done ? "after_repair" : "before_repair")
      if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))
      else toast.success(t("saved"))
      router.push(appendOperationalReturnTo(`/${locale}/maintenance/${payload.id}`, returnTo))
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const badge = (name: string) => (
    <StatusBadge label={statusLabels[name] ?? (name === currentFacts?.statusName ? currentFacts.statusLabel : name)} tone={getAssetStateTone(name)} />
  )

  // The status line under the answers (spec §7.3), or the refusal that replaces it. An open record or a written-off asset
  // shows no line: the card's eligibility line already says it.
  function statusLine(): ReactNode {
    if (!currentFacts || !outlook) return null
    if (outlook.kind === "refused") {
      if (outlook.error === "MAINTENANCE_ASSET_ON_LOAN") {
        return outlook.held ? (
          <RepairHeldNotice held={outlook.held} assetId={currentFacts.id} locale={locale} canReturn={canReturn} hint={t("createForm.heldHint")} />
        ) : (
          <Notice tone="warning" data-repair-held>
            {tMaintenance("errors.MAINTENANCE_ASSET_ON_LOAN")}
            <span className="mt-1 block text-meta text-muted-foreground">{t("createForm.heldHint")}</span>
          </Notice>
        )
      }
      if (outlook.error === "MAINTENANCE_ASSET_INELIGIBLE") {
        return <Notice tone="warning" data-repair-ineligible>{t("createForm.statusIneligible", { status: currentFacts.statusLabel })}</Notice>
      }
      return null
    }
    if (outlook.kind !== "status") return null
    return (
      <p data-repair-status-line className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
        {outlook.changes ? (
          <>
            <span>{t("createForm.statusLine")}</span>
            {badge(currentFacts.statusName)}
            <span>→</span>
            {badge(outlook.nextStatusName)}
            {values.done === false ? <span>{t("createForm.untilDone")}</span> : null}
          </>
        ) : withNode(t("createForm.statusStays", { status: NODE }), badge(currentFacts.statusName))}
      </p>
    )
  }

  const answerKey = repairFooterAnswerKey(values)
  const answer = {
    unanswered: t("createForm.unanswered"),
    doneNo: t("doneNo"),
    doneUsable: `${t("doneYes")} · ${t("outcome.usable")}`,
    doneBeyond: `${t("doneYes")} · ${t("outcome.beyond_repair")}`,
    doneNoOutcome: t("doneYes"),
  }[answerKey]
  const footerLine = currentFacts ? (
    <>
      {withNode(t("createForm.footer", { name: NODE }), <strong className="font-semibold text-foreground">{currentFacts.name}</strong>)}{" "}
      <span className="tag">{currentFacts.assetTag}</span> · {answer}
    </>
  ) : answer

  return (
    <form onSubmit={handleSubmit} noValidate id={REPAIR_FORM_ID}>
      <OperationFormFrame
        title={t("createTitle")}
        description={plan ? t("pmCreateSubtitle") : t("createSubtitle")}
        breadcrumbs={breadcrumbs}
        back={back}
        summary={<RepairCreateSummary
          facts={currentFacts}
          values={values}
          plan={plan ?? null}
          statusLabels={statusLabels}
          conditionOptions={conditionOptions}
          salvageLabel={salvageLabel}
          footnote={needsReporter ? t("createForm.footnotePicked") : t("createForm.footnote", { name: reporterName })}
        />}
        footer={{
          description: <span data-repair-footer>{footerLine}</span>,
          cancelHref: returnTo,
          cancelLabel: tCommon("cancel"),
          submitLabel: t("save"),
          busy: saving,
          formId: REPAIR_FORM_ID,
        }}
      >
        <FormSection number={1} title={t("createForm.sectionAsset")}>
          <div className="grid gap-4">
            {plan ? <FormContextBanner label={t("planLabel")} value={plan.label} /> : null}
            {currentFacts ? (
              <RepairAssetCard facts={currentFacts} locale={locale} returnTo={returnTo} onChange={plan ? undefined : clearAsset} fieldId={repairFieldIds.assetId} />
            ) : (
              <MaintenanceOptionSelect
                id="repair-record-asset"
                type="asset"
                label={t("asset")}
                value={values.assetId}
                required
                disabled={Boolean(plan)}
                initialOption={initialAsset}
                placeholder={t("selectAsset")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                formatReason={(code) => getMaintenanceErrorMessage(code, tMaintenance, code)}
                error={fieldErrors.message("assetId")}
                onChange={(value, option) => {
                  focusCardAfterPick.current = value !== ""
                  setOpenRecordAssetId(null)
                  setField("assetId", value)
                  // The picked asset's own condition when it is ดี or พอใช้, else none (group 3 spec §19.4, final review M1).
                  setField("conditionId", repairConditionDefault(option?.conditionId ?? null, conditionOptions))
                }}
              />
            )}
            {values.assetId && !currentFacts && factsFailedFor === values.assetId ? (
              <Notice
                tone="warning"
                role="status"
                data-repair-facts-failed
                action={(
                  <Button type="button" variant="outline" size="md" onClick={retryFacts}>
                    {tCommon("tryAgain")}
                  </Button>
                )}
              >
                {t("createForm.factsFailed")}
              </Notice>
            ) : null}
            {openRecordAssetId && openRecordAssetId === values.assetId ? (
              <Notice tone="danger" role="alert">
                {tMaintenance("errors.MAINTENANCE_OPEN_RECORD_EXISTS")}{" "}
                <Link
                  href={`/${locale}/maintenance?assetId=${encodeURIComponent(openRecordAssetId)}&status=in_progress`}
                  className={cn(linkVariants({ size: "inherit" }), "decoration-current")}
                >
                  {t("openExistingRecord")}
                </Link>
              </Notice>
            ) : null}
          </div>
        </FormSection>
        <FormSection number={2} title={t("createForm.sectionProgress")}>
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr] lg:grid-cols-1 xl:grid-cols-[minmax(0,220px)_1fr]">
              <Field label={t("date")} id="repair-record-date" required error={fieldErrors.message("reportedDate")}>
                <Input type="date" required max={latestTodayKey()} value={values.reportedDate} onChange={(event) => setField("reportedDate", event.target.value)} />
              </Field>
              <Field label={t("problem")} id="repair-record-problem" required error={fieldErrors.message("problem")}>
                <Textarea
                  required
                  rows={3}
                  maxLength={4000}
                  value={values.problem}
                  placeholder={t("problemPlaceholder")}
                  onChange={(event) => setField("problem", event.target.value)}
                />
              </Field>
            </div>
            {needsReporter ? (
              <MaintenanceOptionSelect
                id="repair-record-reporter"
                type="employee"
                label={t("reporter")}
                value={values.reportedById}
                required
                placeholder={t("selectReporter")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                hint={t("reporterHelp")}
                error={fieldErrors.message("reportedById")}
                onChange={(value) => setField("reportedById", value)}
              />
            ) : null}
            <FieldGroup legend={t("doneQuestion")} id="repair-record-done" required hint={plan ? undefined : t("createForm.noDefault")} error={fieldErrors.message("done")}>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard type="radio" name="done" checked={values.done === true} label={t("doneYes")} description={t("doneYesHelp")} onChange={() => setField("done", true)} />
                <ChoiceCard type="radio" name="done" checked={values.done === false} label={t("doneNo")} description={t("doneNoHelp")} onChange={() => setField("done", false)} />
              </div>
            </FieldGroup>
            {values.done === true ? (
              // ซ่อมไม่ได้: the ซาก line is the group's hint, read with it by aria-describedby (final review M9).
              <FieldGroup legend={t("outcomeQuestion")} id="repair-record-outcome" required hint={values.outcome === "beyond_repair" ? t("conditionBecomesSalvage") : undefined} error={fieldErrors.message("outcome")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard type="radio" name="outcome" checked={values.outcome === "usable"} label={t("outcome.usable")} onChange={() => setField("outcome", "usable")} />
                  <ChoiceCard type="radio" name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onChange={() => setField("outcome", "beyond_repair")} />
                </div>
              </FieldGroup>
            ) : null}
            {values.done === true && values.outcome === "usable" ? (
              <AssetConditionChoice
                id="repair-create-condition"
                legend={t("conditionAfterRepair")}
                options={conditionOptions}
                value={values.conditionId}
                required
                error={fieldErrors.message("conditionId")}
                onChange={(value) => setField("conditionId", value)}
              />
            ) : null}
          </div>
          {/* Always mounted, so the status line, the held notice and the ineligible notice are announced when a radio
              brings them (final review 3); empty, it takes no room. */}
          <div role="status" aria-live="polite" data-repair-status-region className="mt-5 empty:mt-0">
            {statusLine()}
          </div>
        </FormSection>
        <FormSection number={3} title={<>{t("createForm.sectionDetails")} <span className="font-normal text-muted-foreground">{t("createForm.optional")}</span></>}>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MaintenanceOptionSelect
                id="repair-record-vendor"
                type="supplier"
                label={t("vendor")}
                value={values.vendorId}
                initialOption={plan?.vendor ?? undefined}
                placeholder={t("vendorPlaceholder")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                error={fieldErrors.message("vendorId")}
                onChange={(value) => setField("vendorId", value)}
              />
              <Field
                label={t("cost")}
                id="repair-record-cost"
                error={fieldErrors.errors.repairCost ? validationMessage(fieldErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder={t("createForm.costPlaceholder")} value={values.repairCost} onChange={(event) => setField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-record-invoice-no" error={fieldErrors.message("invoiceNo")}>
                <Input maxLength={100} placeholder={t("createForm.invoicePlaceholder")} value={values.invoiceNo} onChange={(event) => setField("invoiceNo", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("files")}>
                {(control) => (
                  <div className="grid gap-2">
                    <FileDropzone
                      {...control}
                      file={null}
                      onFileChange={(file) => {
                        if (file) addFiles([file])
                      }}
                      onFilesChange={addFiles}
                      disabled={saving}
                      accept="image/*,application/pdf"
                      multiple
                      title={t("dropFilesTitle")}
                      description={t(values.done === true ? "filesHelpDone" : "filesHelp")}
                      browseLabel={t("dropFilesHint")}
                    />
                    <FileQueueList items={files.map((file, index) => ({ id: String(index), name: file.name }))} disabled={saving} onRemove={removeFile} />
                  </div>
                )}
              </Field>
              <Field label={t("remark")} id="repair-record-remark" error={fieldErrors.message("remark")}>
                <Textarea rows={4} maxLength={4000} value={values.remark} onChange={(event) => setField("remark", event.target.value)} className="min-h-24" />
              </Field>
            </div>
          </div>
        </FormSection>
      </OperationFormFrame>
    </form>
  )
}
