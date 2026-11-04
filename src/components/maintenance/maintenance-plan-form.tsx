"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard, type OperationSummaryRow } from "@/components/asset-operations/operation-summary-card"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { PmPlanAssetCard } from "@/components/maintenance/pm-plan-asset-card"
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FormChangedField, type FormFieldChange } from "@/components/ui/form-changed-field"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { formatCount } from "@/lib/display-format"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import type { MaintenanceOption } from "@/lib/maintenance-options"
import type { PmPlanTab } from "@/lib/pm-plan-list"
import {
  buildPmPlanImpact,
  buildPmPreview,
  pmPlanChangedFields,
  pmPlanFooterKey,
  validatePmPlanForm,
  type PmPlanChangedField,
  type PmPlanFormValues,
  type PmPreviewRound,
} from "@/lib/pm-plan-form-rules"
import { getPmDueBadge, maintenancePlanFrequencies, type PmDueBadge } from "@/lib/preventive-maintenance"
import type { RepairAssetFacts } from "@/lib/repair-record-outlook"
import { focusField } from "@/lib/field-focus"
import { cn, formatDate } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  assetId: "maintenance-plan-asset",
  title: "maintenance-plan-title",
  frequency: "maintenance-plan-frequency",
  intervalDays: "maintenance-plan-interval-days",
  nextDueDate: "maintenance-plan-next-due-date",
  vendorId: "maintenance-plan-vendor",
  notes: "maintenance-plan-notes",
} as const
type PlanField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as PlanField[]

// The form's id: the frame's footer submit names it (group 3 spec §5).
const PM_PLAN_FORM_ID = "maintenance-plan-form"

// An ISO day of the form (the due dates) in the app's date format, Buddhist year in Thai. Noon UTC keeps the day the
// same in every browser zone.
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/
function isRealDay(value: string) {
  const match = ISO_DAY.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
const formatDay = (value: string) => (isRealDay(value) ? formatDate(`${value}T12:00:00Z`) : value || "–")

// The PM form (MT-PM-Form, group 5 spec §10; plan 4 Task 4) on the operation frame: three numbered sections, the summary
// column and the sticky footer. Edit keeps the asset locked (the card and its hint); create picks it with the pmAsset
// picker, whose by-id read brings the card's facts (G5P4-R9). The checks, the changed fields, the four-round preview,
// the impact on the PM page and the footer's words come from the pure rules file (pm-plan-form-rules.ts). A refused
// save (a 409 MAINTENANCE_PLAN_CONFLICT included) toasts its message and leaves every value as typed (Review Focus 3).
export function MaintenancePlanForm({
  breadcrumbs,
  back,
  title,
  description,
  locale,
  initialFacts,
  planId,
  planNo,
  planState,
  inScope = true,
  editBlocked = false,
  initialValues,
  initialVendor,
  dueCounts,
  todayKey,
  returnHref = `/${locale}/maintenance/pm`,
  expectedUpdatedAt,
}: {
  breadcrumbs: BreadcrumbItem[]
  back: ReactNode
  title: string
  /** The header's meta: the create subtitle, or the edit page's planNo, state badge, rhythm and the ⋯ note (spec §10). */
  description: ReactNode
  locale: string
  /** The plan's asset (edit) or the ?assetId= asset (create), from loadRepairAssetFacts. */
  initialFacts: RepairAssetFacts | null
  planId?: string
  planNo?: string
  /** Edit: the plan's state (an ended plan has no edit page) and whether its asset is in the due counts' scope. */
  planState?: Exclude<PmPlanTab, "ended">
  inScope?: boolean
  /** Edit: the plan's asset is inactive, so the server refuses every save: the form says so and keeps its save off. */
  editBlocked?: boolean
  initialValues?: Partial<PmPlanFormValues>
  /** The plan's provider as "code - name", so the changed field and the summary name it without a read. */
  initialVendor?: Option
  /** The PM page's three active counts (readPmDueCounts), which the summary moves this plan through (G5P4-R10). */
  dueCounts: { overdue: number; soon: number; later: number }
  /** Bangkok today (getBangkokDateKey): the default due date, the badges and the impact. */
  todayKey: string
  // Where a save goes: the edit page passes the PM list page it was opened from (its returnTo, spec 2B B4).
  returnHref?: string
  // The plan's updatedAt as the edit page read it: a save after the plan changed is refused (G5P1-R12).
  expectedUpdatedAt?: string
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("maintenancePage")
  const tRecord = useTranslations("repairRecord")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tRoot = useTranslations()
  const isEdit = Boolean(planId)
  const [saving, setSaving] = useState(false)
  const [initial] = useState<PmPlanFormValues>(() => ({
    assetId: initialFacts?.id ?? "",
    title: initialValues?.title ?? "",
    frequency: initialValues?.frequency ?? "monthly",
    intervalDays: initialValues?.intervalDays ?? "30",
    nextDueDate: initialValues?.nextDueDate ?? todayKey,
    vendorId: initialValues?.vendorId ?? "",
    notes: initialValues?.notes ?? "",
  }))
  const [values, setValues] = useState<PmPlanFormValues>(initial)
  const [vendorLabel, setVendorLabel] = useState(initialVendor?.label ?? "")
  const [facts, setFacts] = useState<RepairAssetFacts | null>(initialFacts)
  // The by-id read's failure, for the asset it failed for, and a counter ลองอีกครั้ง bumps to run it again.
  const [factsFailedFor, setFactsFailedFor] = useState<string | null>(null)
  const [factsAttempt, setFactsAttempt] = useState(0)
  // Set only by the picker's onChange: the card that replaces it takes focus, so focus does not fall to the page.
  const focusCardAfterPick = useRef(false)
  const assetCardRef = useRef<HTMLDivElement>(null)
  // Facts of another asset (the one before a change) are never shown.
  const currentFacts = facts?.id === values.assetId ? facts : null
  // Bangkok noon of the server's today: the same day on the server render and in every browser zone.
  const [now] = useState(() => new Date(`${todayKey}T12:00:00+07:00`))

  const fieldErrors = useFieldErrors<PlanField>()
  const validationMessage = useValidationMessage()
  const validate = () => validatePmPlanForm(values, isEdit)
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // After a pick, the PM asset by-id read brings the card's facts once (G5P4-R9). A change aborts the read in flight,
  // and an answer for another asset is ignored, so a slow answer never overwrites the current asset.
  useEffect(() => {
    const assetId = values.assetId
    if (!assetId || facts?.id === assetId) return
    const controller = new AbortController()
    fetch(`/api/maintenance-options?type=pmAsset&id=${encodeURIComponent(assetId)}`, { signal: controller.signal })
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

  // After a pick, once the picked asset's card is on screen, focus moves to it (the picker's trigger is gone).
  useEffect(() => {
    if (!currentFacts || !focusCardAfterPick.current) return
    focusCardAfterPick.current = false
    window.requestAnimationFrame(() => assetCardRef.current?.focus())
  }, [currentFacts])

  function retryFacts() {
    setFactsFailedFor(null)
    setFactsAttempt((attempt) => attempt + 1)
  }

  function setField<K extends PlanField>(field: K, value: PmPlanFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // The days show only for a custom frequency, so a frequency change clears their error too.
    if (field === "frequency") fieldErrors.clear("frequency", "intervalDays")
    else fieldErrors.clear(field)
  }

  // "เปลี่ยน" (create only): the asset goes, and the picker comes back with focus.
  function clearAsset() {
    setField("assetId", "")
    window.requestAnimationFrame(() => document.getElementById(FIELD_IDS.assetId)?.focus())
  }

  // คืนค่าเดิม: the stored value back. The frequency brings its days with it; the provider its label.
  function restore(field: PmPlanChangedField) {
    if (field === "frequency" || field === "intervalDays") {
      setValues((current) => ({ ...current, frequency: initial.frequency, intervalDays: initial.intervalDays }))
      fieldErrors.clear("frequency", "intervalDays")
      focusRestored(field)
      return
    }
    if (field === "vendorId") setVendorLabel(initialVendor?.label ?? "")
    setField(field, initial[field])
    focusRestored(field)
  }

  // คืนค่าเดิม leaves with the change, so focus goes to the field's control once the restored value has rendered (as
  // the asset form does): the frequency's pressed button (the days come back with it), the provider's trigger, else
  // the input (group 5 plan 4 final review).
  function focusRestored(field: PmPlanChangedField) {
    window.requestAnimationFrame(() => {
      const element = field === "frequency" || field === "intervalDays"
        ? document.querySelector<HTMLElement>(`#${FIELD_IDS.frequency} [aria-pressed="true"]`)
        : document.getElementById(FIELD_IDS[field])
      if (element) focusField(element)
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // An inactive asset's plan cannot be saved (the save is off; Enter in a field lands here too).
    if (editBlocked) return
    fieldErrors.setErrors(validate())
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch(planId ? `/api/maintenance-plans/${planId}` : "/api/maintenance-plans", {
        method: planId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(planId ? { action: "update", expectedUpdatedAt } : { assetId: values.assetId }),
          title: values.title,
          frequency: values.frequency,
          intervalDays: values.frequency === "custom" ? values.intervalDays : null,
          nextDueDate: values.nextDueDate,
          vendorId: values.vendorId || null,
          notes: values.notes || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      }
      toast.success(t(planId ? "pmUpdateSuccess" : "pmCreateSuccess"))
      router.push(returnHref)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  // ---- What the form shows from the values.
  const changed = isEdit ? pmPlanChangedFields(initial, values) : []
  const isChanged = (field: PmPlanChangedField) => changed.includes(field)
  const frequencyLabel = (source: PmPlanFormValues) => {
    const name = t(`pmFrequencies.${source.frequency}`)
    const days = Number(source.intervalDays)
    return source.frequency === "custom" && Number.isInteger(days) && days > 0 ? `${name} · ${t("pmFormFrequencyCustomDays", { days })}` : name
  }
  const vendorText = (id: string, label: string) => (id ? label || "–" : t("pmNoExternalProvider"))
  const wasLabel: Record<PmPlanChangedField, string> = {
    title: initial.title,
    frequency: frequencyLabel(initial),
    intervalDays: frequencyLabel(initial),
    nextDueDate: formatDay(initial.nextDueDate),
    vendorId: vendorText(initial.vendorId, initialVendor?.label ?? ""),
    notes: initial.notes || "–",
  }
  function changeOf(field: PmPlanChangedField): FormFieldChange | null {
    return isChanged(field) ? { was: wasLabel[field], onRestore: () => restore(field) } : null
  }

  // The preview needs a real day and, for a custom frequency, days the checks accept.
  const intervalError = validate().intervalDays
  const preview = intervalError
    ? []
    : buildPmPreview(values.nextDueDate, values.frequency, values.frequency === "custom" ? Number(values.intervalDays) : null, now)
  const dueBadge = (badge: PmDueBadge | undefined) => (badge ? <StatusBadge wrap label={t(`pmDue.${badge.key}`, { days: badge.days })} tone={badge.tone} /> : null)
  const stepLabel = (round: PmPreviewRound) => {
    if (round.step === "month1") return t("pmFormStepMonths", { n: 1 })
    if (round.step === "month3") return t("pmFormStepMonths", { n: 3 })
    if (round.step === "year1") return t("pmFormStepYear")
    return t("pmFormStepDays", { n: round.days ?? 0 })
  }

  // The summary (spec §10): edit ก่อนแก้ → หลังแก้ with "ไม่เปลี่ยน" for an unchanged row; create the new plan's rows.
  const noChange = tRecord("createForm.noChange")
  const afterBadge = isRealDay(values.nextDueDate) ? getPmDueBadge(values.nextDueDate, now) : undefined
  const rows: OperationSummaryRow[] = isEdit
    ? [
        { key: "title", label: t("pmPlanTitle"), now: initial.title, next: isChanged("title") ? values.title : noChange, changed: isChanged("title") },
        { key: "nextDueDate", label: t("pmFormRowNextDue"), now: formatDay(initial.nextDueDate), next: isChanged("nextDueDate") ? formatDay(values.nextDueDate) : noChange, changed: isChanged("nextDueDate") },
        {
          key: "dueState",
          label: t("pmFormDueState"),
          now: dueBadge(getPmDueBadge(initial.nextDueDate, now)),
          next: isChanged("nextDueDate") ? dueBadge(afterBadge) ?? "–" : noChange,
          changed: isChanged("nextDueDate"),
        },
        {
          key: "frequency",
          label: t("pmFrequencyLabel"),
          now: frequencyLabel(initial),
          next: isChanged("frequency") || isChanged("intervalDays") ? frequencyLabel(values) : noChange,
          changed: isChanged("frequency") || isChanged("intervalDays"),
        },
        { key: "vendorId", label: t("pmFormRowVendor"), now: wasLabel.vendorId, next: isChanged("vendorId") ? vendorText(values.vendorId, vendorLabel) : noChange, changed: isChanged("vendorId") },
      ]
    : [
        {
          key: "asset",
          label: t("asset"),
          now: "–",
          next: currentFacts ? <>{currentFacts.name} <span className="tag">{currentFacts.assetTag}</span></> : "–",
          changed: Boolean(currentFacts),
        },
        { key: "frequency", label: t("pmFrequencyLabel"), now: "–", next: frequencyLabel(values), changed: true },
        {
          key: "nextDueDate",
          label: t("pmFormRowNextDue"),
          now: "–",
          next: <span className="grid justify-items-start gap-1">{formatDay(values.nextDueDate)}{dueBadge(afterBadge)}</span>,
          changed: true,
        },
      ]

  // "ผลต่อหน้าแผน PM" (G5P4-R10): the server's three counts with this plan moved; a paused plan is not on them.
  const before = isEdit && planState ? { nextDueDate: initial.nextDueDate, planState, inScope } : null
  const impact = isRealDay(values.nextDueDate) || (before && before.planState !== "active")
    ? buildPmPlanImpact({ counts: dueCounts, before, after: { nextDueDate: values.nextDueDate }, now })
    : null
  const impactRows = [
    { key: "overdue", label: t("pmDueState.overdue") },
    { key: "soon", label: t("pmDueState.due_soon") },
    { key: "later", label: t("pmDueState.upcoming") },
  ] as const
  const impactBlock = impact ? (
    <div data-pm-impact className="grid gap-2 border-t border-border-soft pt-4 text-sm">
      {impact.kind === "paused" ? (
        <p className="text-muted-foreground">{t("pmFormPaused")}</p>
      ) : (
        <>
          <p className="font-medium text-foreground">{t("pmFormImpactTitle", { count: impact.total })}</p>
          <dl className="grid gap-1">
            {impactRows.map((row) => {
              const [was, next] = impact[row.key]
              return (
                <div key={row.key} data-pm-impact-row={row.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="num text-foreground">
                    {formatCount(was)} → <span className={cn(was !== next && "font-semibold")}>{formatCount(next)}</span>
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="text-meta text-muted-foreground">{t(impact.inWeek ? "pmFormInWeek" : "pmFormNotInWeek")}</p>
        </>
      )}
    </div>
  ) : undefined

  const footerKeys = pmPlanFooterKey(isEdit)
  const footerLine = isEdit
    ? tRoot(footerKeys.line, { title: values.title.trim() || initial.title, planNo: planNo ?? "", count: changed.length })
    : tRoot(footerKeys.line, { title: values.title.trim() || "–", asset: currentFacts?.name ?? "–" })

  return (
    <form onSubmit={handleSubmit} noValidate id={PM_PLAN_FORM_ID}>
      <OperationFormFrame
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        back={back}
        summary={(
          <OperationSummaryCard
            title={isEdit ? `${tOperation("summaryTitle")} · ${t("pmFormChangeCount", { count: changed.length })}` : tOperation("summaryTitle")}
            nowLabel={isEdit ? t("pmFormBefore") : tOperation("summaryNow")}
            nextLabel={isEdit ? t("pmFormAfter") : tOperation("summaryNext")}
            rows={rows}
            afterRows={impactBlock}
          />
        )}
        footer={{
          description: <span data-pm-plan-footer>{footerLine}</span>,
          cancelHref: returnHref,
          cancelLabel: tRoot(footerKeys.cancel),
          submitLabel: tRoot(footerKeys.submit),
          busy: saving,
          formId: PM_PLAN_FORM_ID,
          submitDisabled: editBlocked,
        }}
      >
        <FormSection number={1} title={t("pmFormSectionAsset")}>
          <div className="grid gap-3">
            {editBlocked ? (
              <Notice tone="warning" data-pm-edit-blocked>{t("pmFormEditBlocked")}</Notice>
            ) : null}
            {currentFacts ? (
              <div ref={assetCardRef} tabIndex={-1} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <PmPlanAssetCard facts={currentFacts} locked={isEdit} onChange={isEdit ? undefined : clearAsset} />
              </div>
            ) : isEdit ? null : (
              <MaintenanceOptionSelect
                id="maintenance-plan-asset"
                type="pmAsset"
                label={t("asset")}
                value={values.assetId}
                required
                placeholder={t("selectAsset")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                formatReason={(code) => getMaintenanceErrorMessage(code, t, code)}
                error={fieldErrors.message("assetId")}
                onChange={(value) => {
                  focusCardAfterPick.current = value !== ""
                  setFactsFailedFor(null)
                  setField("assetId", value)
                }}
              />
            )}
            {values.assetId && !currentFacts && factsFailedFor === values.assetId ? (
              <Notice
                tone="warning"
                role="status"
                data-pm-facts-failed
                action={(
                  <Button type="button" variant="outline" size="md" onClick={retryFacts}>
                    {tCommon("tryAgain")}
                  </Button>
                )}
              >
                {tRecord("createForm.factsFailed")}
              </Notice>
            ) : null}
            {isEdit ? <p className="text-meta text-muted-foreground">{t("pmFormAssetHint")}</p> : null}
          </div>
        </FormSection>
        <FormSection number={2} title={t("pmFormSectionDetails")}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <FormChangedField change={changeOf("title")}>
              <Field label={t("pmPlanTitle")} id="maintenance-plan-title" required error={fieldErrors.message("title")}>
                <Input
                  value={values.title}
                  required
                  maxLength={200}
                  onChange={(event) => setField("title", event.target.value)}
                />
              </Field>
            </FormChangedField>
            <FormChangedField change={changeOf("vendorId")}>
              <MaintenanceOptionSelect
                id="maintenance-plan-vendor"
                type="supplier"
                label={t("pmExternalProvider")}
                value={values.vendorId}
                initialOption={initialVendor}
                placeholder={t("pmNoExternalProvider")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                error={fieldErrors.message("vendorId")}
                onChange={(value, option) => {
                  setVendorLabel(option?.label ?? "")
                  setField("vendorId", value)
                }}
              />
            </FormChangedField>
            <div className="md:col-span-2 lg:col-span-1 xl:col-span-2">
              <FormChangedField change={changeOf("notes")}>
                <Field label={t("pmNotes")} id="maintenance-plan-notes" error={fieldErrors.message("notes")}>
                  <Textarea
                    value={values.notes}
                    rows={3}
                    maxLength={4000}
                    onChange={(event) => setField("notes", event.target.value)}
                    className="min-h-20"
                  />
                </Field>
              </FormChangedField>
            </div>
          </div>
        </FormSection>
        <FormSection number={3} title={t("pmFormSectionSchedule")}>
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
              <div className="grid min-w-0 content-start gap-4">
                <FormChangedField change={changeOf("frequency")}>
                  <FieldGroup legend={t("pmFrequencyLabel")} id="maintenance-plan-frequency" required error={fieldErrors.message("frequency")}>
                    <Segmented
                      labelledBy="maintenance-plan-frequency-legend"
                      showCheck
                      value={values.frequency}
                      options={maintenancePlanFrequencies.map((frequency) => ({ value: frequency, label: t(`pmFrequencies.${frequency}`) }))}
                      onValueChange={(frequency) => setField("frequency", frequency)}
                      className="max-w-full flex-wrap"
                    />
                  </FieldGroup>
                </FormChangedField>
                {values.frequency === "custom" ? (
                  <FormChangedField change={changeOf("intervalDays")}>
                    <Field
                      label={t("pmIntervalDays")}
                      id="maintenance-plan-interval-days"
                      required
                      hint={t("pmFormIntervalHint")}
                      error={fieldErrors.errors.intervalDays ? validationMessage(fieldErrors.errors.intervalDays, { min: 1, max: 3650 }) : undefined}
                    >
                      <Input
                        type="number"
                        min="1"
                        max="3650"
                        value={values.intervalDays}
                        required
                        onChange={(event) => setField("intervalDays", event.target.value)}
                        className="max-w-40"
                      />
                    </Field>
                  </FormChangedField>
                ) : null}
              </div>
              <FormChangedField change={changeOf("nextDueDate")}>
                <Field label={t("pmNextDueDate")} id="maintenance-plan-next-due-date" required error={fieldErrors.message("nextDueDate")}>
                  <Input
                    type="date"
                    value={values.nextDueDate}
                    required
                    onChange={(event) => setField("nextDueDate", event.target.value)}
                  />
                </Field>
              </FormChangedField>
            </div>
            <div data-pm-preview className="grid gap-3 rounded-md border border-border p-3 sm:p-4">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-foreground">{t("pmFormPreviewTitle")}</span>
                <span className="text-meta text-muted-foreground">{t("pmFormPreviewHint")}</span>
              </p>
              {preview.length > 0 ? (
                <ol className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  {preview.map((round, index) => (
                    <li
                      key={round.date}
                      data-pm-preview-round={round.step}
                      className="grid min-w-0 content-start gap-1 rounded-md border border-border p-3"
                    >
                      <span className="text-meta text-muted-foreground">{index === 0 ? t("pmFormPreviewFirst") : t("pmFormPreviewRound", { n: index + 1 })}</span>
                      <span className="font-semibold text-foreground num">{formatDay(round.date)}</span>
                      {index === 0 ? <span>{dueBadge(round.badge)}</span> : <span className="text-meta text-muted-foreground">{stepLabel(round)}</span>}
                    </li>
                  ))}
                </ol>
              ) : null}
              <p className="text-meta text-muted-foreground">{t("pmFormPreviewNote")}</p>
            </div>
          </div>
        </FormSection>
      </OperationFormFrame>
    </form>
  )
}
