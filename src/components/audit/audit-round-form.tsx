"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Plus, Save, X } from "lucide-react"
import { toast } from "sonner"
import { foldTopCategories } from "@/lib/audit-round-counts-rules"
import { addMonthsToDateKey, auditRoundDailyLoad, auditRoundEndAfterStartChange, parseAuditSampleRate } from "@/lib/audit-round-preview-rules"
import { filterAuditStatusOptions } from "@/lib/audit-round-scope"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { displayYearRange, fromDisplayYear, toDisplayYear } from "@/lib/display-year"
import { toLocalDateInputValue } from "@/lib/local-date"
import { cn } from "@/lib/utils"
import { maxLength, notBefore, range, required, wholeNumber } from "@/lib/validation-rules"

type Option = { id: string; label: string; isClosed?: boolean }

type AuditRoundOptions = {
  companies: Option[]
  branches: Option[]
  departments: Option[]
  locations: Option[]
  categories: Option[]
  employees: Option[]
  statuses: Option[]
  conditions: Option[]
}

type AuditRoundPreview = {
  matchedAssets: number
  sampledAssets: number
  directSampled: number
  componentItems?: number
  sampleRate: number
  riskPreset: string
  categories: Array<{ id: string; count: number }>
  overlap: { count: number; rounds: Array<{ id: string; auditNo: string }> }
  previewAssets: Array<{
    id: string
    assetTag: string
    name: string
    includedVia?: "direct" | "component"
    parentAssetTag?: string | null
  }>
}

const riskPresetValues = ["all", "data_quality", "high_value", "stale_movement", "repair_history", "license_expiring"] as const

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The scope
// conditions are chips (SCOPE_FIELDS); the server never refuses them, so they stay out.
const FIELD_IDS = {
  name: "audit-round-name",
  auditYear: "audit-round-year",
  startDate: "audit-round-start-date",
  endDate: "audit-round-end-date",
  riskPreset: "audit-round-risk-preset",
  sampleRate: "audit-round-sample-rate",
} as const
type AuditRoundField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as AuditRoundField[]
// Section 3 is folded: an error there opens it before focus moves.
const ADVANCED_FIELDS: ReadonlySet<AuditRoundField> = new Set(["riskPreset", "sampleRate"])

// The eight scope conditions (group 2 spec §7): each a chip once chosen, offered in "+ เพิ่มเงื่อนไข" until then, with
// its picker's id. Labels keep their codes ("BN01 - บางนา", audit-options.ts).
const SCOPE_FIELDS = [
  { key: "scopeCompanyId", id: "audit-round-scope-company", label: "scopeCompany", options: "companies" },
  { key: "scopeBranchId", id: "audit-round-scope-branch", label: "scopeBranch", options: "branches" },
  { key: "scopeDepartmentId", id: "audit-round-scope-department", label: "scopeDepartment", options: "departments" },
  { key: "scopeLocationId", id: "audit-round-scope-location", label: "scopeLocation", options: "locations" },
  { key: "scopeCategoryId", id: "audit-round-scope-category", label: "scopeCategory", options: "categories" },
  { key: "scopeCustodianId", id: "audit-round-scope-custodian", label: "scopeCustodian", options: "employees" },
  { key: "scopeStatusId", id: "audit-round-scope-status", label: "scopeStatus", options: "statuses" },
  { key: "scopeConditionId", id: "audit-round-scope-condition", label: "scopeCondition", options: "conditions" },
] as const
type ScopeField = (typeof SCOPE_FIELDS)[number]

function initialValues(locale: string) {
  const startDate = toLocalDateInputValue()
  return {
    name: "",
    auditYear: String(toDisplayYear(new Date().getFullYear(), locale)),
    scopeCompanyId: "",
    scopeBranchId: "",
    scopeDepartmentId: "",
    scopeLocationId: "",
    scopeCategoryId: "",
    scopeCustodianId: "",
    scopeStatusId: "",
    scopeConditionId: "",
    includeClosedAssets: false,
    riskPreset: "all",
    sampleRate: "100",
    startDate,
    // Bug §13.7: the end is a month after the start, and the person can change it (group 2 spec §7).
    endDate: addMonthsToDateKey(startDate, 1),
  }
}
type AuditRoundValues = ReturnType<typeof initialValues>

// What the live count sends: the scope alone (group 2 spec §7, R10), so typing the name or a date never counts again.
function scopeBody(values: AuditRoundValues) {
  return {
    ...emptyToNull({
      scopeCompanyId: values.scopeCompanyId,
      scopeBranchId: values.scopeBranchId,
      scopeDepartmentId: values.scopeDepartmentId,
      scopeLocationId: values.scopeLocationId,
      scopeCategoryId: values.scopeCategoryId,
      scopeCustodianId: values.scopeCustodianId,
      scopeStatusId: values.scopeStatusId,
      scopeConditionId: values.scopeConditionId,
    }),
    includeClosedAssets: values.includeClosedAssets,
    riskPreset: values.riskPreset,
    sampleRate: values.sampleRate,
  }
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, max and step, and
// the end date not before the start date, the server's endBeforeStart (spec §7.4; v-track M-R2, U-R1).
function validate(
  values: { name: string; auditYear: string; startDate: string; endDate: string; sampleRate: string },
  yearRange: { min: number; max: number },
): Partial<Record<AuditRoundField, string>> {
  const errors: Partial<Record<AuditRoundField, string>> = {}
  const check = (key: AuditRoundField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))
  check("startDate", required(values.startDate))
  check("endDate", required(values.endDate) ?? notBefore(values.endDate, values.startDate))
  check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))
  return errors
}

export function AuditRoundForm({ options }: { options: AuditRoundOptions }) {
  const locale = useLocale()
  const yearRange = displayYearRange(locale)
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [lastPreview, setLastPreview] = useState<AuditRoundPreview | null>(null)
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "failed">("loading")
  // The scopeRequest the last settled answer (ready or failed) was for.
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [pendingScope, setPendingScope] = useState<ScopeField["key"] | null>(null)
  const advancedRef = useRef<HTMLDetailsElement>(null)
  // "+ เพิ่มเงื่อนไข": focus returns here after a condition is chosen or a chip removed.
  const addConditionRef = useRef<HTMLButtonElement>(null)
  const focusPickerRef = useRef(false)
  const fieldErrors = useFieldErrors<AuditRoundField>()
  const validationMessage = useValidationMessage()
  const [values, setValues] = useState(() => initialValues(locale))
  // The end follows the start (a month later) until the person sets the end themselves (group 2 spec §7).
  const [endTouched, setEndTouched] = useState(false)
  // The folded advanced line shows the last rate that parses, never "สุ่มตรวจ %" while the field is half typed.
  const [lastSampleRate, setLastSampleRate] = useState(100)
  const shownSampleRate = parseAuditSampleRate(values.sampleRate) ?? lastSampleRate
  const scopeRequest = JSON.stringify(scopeBody(values))
  // Only the answer for the current scope counts: until it lands, the panel and the bar say it is counting.
  const settled = previewKey === scopeRequest
  const preview = settled && previewState === "ready" ? lastPreview : null
  const previewFailed = settled && previewState === "failed"
  const componentItems = preview?.componentItems ?? 0
  const categories = foldTopCategories(preview?.categories ?? [])
  const dailyLoad = preview ? auditRoundDailyLoad(preview.sampledAssets, values.startDate, values.endDate) : null
  const statusOptions = filterAuditStatusOptions(options.statuses, values.includeClosedAssets)
  const chosenScopes = SCOPE_FIELDS.filter((field) => values[field.key])
  const availableScopes = SCOPE_FIELDS.filter((field) => !values[field.key])
  const pendingField = SCOPE_FIELDS.find((field) => field.key === pendingScope)
  const counting = !preview && !previewFailed
  const footerStatus = preview
    ? preview.sampledAssets > 0
      ? t("willCreate", { count: formatCount(preview.sampledAssets) })
      : t("willCreateNone")
    : t(previewFailed ? "summaryUnavailable" : "counting")

  const focusFirstError = () =>
    fieldErrors.focusFirst(FIELD_ORDER, {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (ADVANCED_FIELDS.has(key) && advancedRef.current) advancedRef.current.open = true
      },
    })

  // The picker lists closed statuses only while "รวม…" is ticked; the chip reads the full list, so its name stays.
  function scopeOptions(field: ScopeField) {
    return field.key === "scopeStatusId" ? statusOptions : options[field.options]
  }

  function scopeLabel(field: ScopeField) {
    return options[field.options].find((option) => option.id === values[field.key])?.label ?? ""
  }

  // A category that is no longer active has no option: it reads as such, never as a raw id.
  function categoryLabel(id: string) {
    return options.categories.find((option) => option.id === id)?.label ?? t("summaryCategoryInactive")
  }

  // The live count (group 2 spec §7, R10): the scope alone, 450ms after the last change, the earlier request aborted.
  // A refusal (a sample rate out of range) never moves focus or shows under a field: the panel says it cannot count.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setPreviewState("loading")
      try {
        const response = await fetch("/api/audit-rounds/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: scopeRequest,
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("preview refused")
        setLastPreview((await response.json()) as AuditRoundPreview)
        setPreviewKey(scopeRequest)
        setPreviewState("ready")
      } catch {
        if (!controller.signal.aborted) {
          setPreviewKey(scopeRequest)
          setPreviewState("failed")
        }
      }
    }, 450)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [scopeRequest])

  // A condition picked from the menu: focus goes to its picker, closed, not back to "+ เพิ่มเงื่อนไข".
  useEffect(() => {
    if (!pendingField) return
    const frame = window.requestAnimationFrame(() => document.getElementById(pendingField.id)?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [pendingField])

  // The field shows the reader's calendar year; the API stores Gregorian.
  function requestBody() {
    return { ...emptyToNull(values), auditYear: fromDisplayYear(Number(values.auditYear), locale) }
  }

  function setField(field: string, value: string | boolean) {
    if (field === "startDate" && typeof value === "string") {
      setValues((current) => ({ ...current, startDate: value, endDate: auditRoundEndAfterStartChange(value, current.endDate, endTouched) }))
    } else {
      setValues((current) => ({ ...current, [field]: value }))
    }
    if (field === "endDate") setEndTouched(true)
    if (field === "sampleRate" && typeof value === "string") {
      const rate = parseAuditSampleRate(value)
      if (rate !== null) setLastSampleRate(rate)
    }
    // The date pair clears together: either date can fix "end before start" (spec §4.3).
    if (field === "startDate" || field === "endDate") fieldErrors.clear("startDate", "endDate")
    else if (field in FIELD_IDS) fieldErrors.clear(field as AuditRoundField)
  }

  function setIncludeClosedAssets(checked: boolean) {
    setValues((current) => ({
      ...current,
      includeClosedAssets: checked,
      scopeStatusId: checked || !isClosedStatusId(options.statuses, current.scopeStatusId) ? current.scopeStatusId : "",
    }))
  }

  function openScopePicker(key: ScopeField["key"]) {
    focusPickerRef.current = true
    setPendingScope(key)
  }

  function chooseCondition(key: ScopeField["key"], value: string) {
    setField(key, value)
    setPendingScope(null)
    focusAfterConditionChange(key)
  }

  function removeCondition(key: ScopeField["key"]) {
    setField(key, "")
    focusAfterConditionChange(key)
  }

  // The picker unmounts after a choice and a chip removes itself on click: focus goes to "+ เพิ่มเงื่อนไข", or to the
  // new chip when every condition is chosen and the button is disabled, never to <body>.
  function focusAfterConditionChange(key: ScopeField["key"]) {
    window.requestAnimationFrame(() => {
      const add = addConditionRef.current
      if (add && !add.disabled) add.focus()
      else document.getElementById(chipId(key))?.focus()
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, yearRange))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch("/api/audit-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody()),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(t("createSuccess", { count: formatCount(payload.generatedItems ?? 0) }))
      router.push(`/${locale}/audit/rounds/${payload.id}`)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("createTitle")}
        breadcrumbs={[{ label: t("title"), href: `/${locale}/audit/rounds` }, { label: t("createRound") }]}
        className="mb-6"
      />
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cn(getPanelClasses(), "grid min-w-0 content-start gap-8 p-4 sm:p-5")}>
          <FormSection number={1} title={t("sectionNameDates")}>
            <div className="grid grid-cols-1 gap-5">
              <Field label={t("name")} id="audit-round-name" required error={fieldErrors.message("name")}>
                <Input value={values.name} onChange={(event) => setField("name", event.target.value)} required maxLength={200} />
              </Field>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field
                  label={t("auditYear")}
                  id="audit-round-year"
                  required
                  error={fieldErrors.errors.auditYear ? validationMessage(fieldErrors.errors.auditYear, yearRange) : undefined}
                >
                  <Input type="number" value={values.auditYear} onChange={(event) => setField("auditYear", event.target.value)} required min={yearRange.min} max={yearRange.max} />
                </Field>
                {/* The start picks any day (the end follows it until set); the end's picker starts at the start (spec §7.4).
                    An end before the start is still refused by validate and the server. */}
                <Field label={t("startDate")} id="audit-round-start-date" required error={fieldErrors.message("startDate")}>
                  <Input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} required />
                </Field>
                <Field label={t("endDate")} id="audit-round-end-date" required hint={t("endDateHint")} error={fieldErrors.message("endDate")}>
                  <Input type="date" value={values.endDate} onChange={(event) => setField("endDate", event.target.value)} required min={values.startDate} />
                </Field>
              </div>
            </div>
          </FormSection>
          <FormSection number={2} title={t("sectionScope")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                {chosenScopes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noConditions")}</p>
                ) : (
                  chosenScopes.map((field) => {
                    const label = scopeLabel(field)
                    return (
                      <Button
                        key={field.key}
                        id={chipId(field.key)}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="max-w-full"
                        onClick={() => removeCondition(field.key)}
                        aria-label={t("removeCondition", { condition: `${t(field.label)}: ${label}` })}
                      >
                        <span className="min-w-0 truncate">
                          {t(field.label)}: {label}
                        </span>
                        <X aria-hidden="true" />
                      </Button>
                    )
                  })
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button ref={addConditionRef} type="button" variant="outline" size="sm" disabled={availableScopes.length === 0}>
                      <Plus aria-hidden="true" />
                      {t("addCondition")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    onCloseAutoFocus={(event) => {
                      if (focusPickerRef.current) {
                        focusPickerRef.current = false
                        event.preventDefault()
                      }
                    }}
                  >
                    {availableScopes.map((field) => (
                      <DropdownMenuItem key={field.key} onSelect={() => openScopePicker(field.key)}>
                        {t(field.label)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {pendingField ? (
                <div className="grid gap-2 md:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <SearchableSelect
                    id={pendingField.id}
                    label={t(pendingField.label)}
                    value=""
                    options={scopeOptions(pendingField)}
                    placeholder={t("conditionChoose", { condition: t(pendingField.label) })}
                    searchPlaceholder={tCommon("search")}
                    emptyLabel={tCommon("noData")}
                    onChange={(value) => chooseCondition(pendingField.key, value)}
                  />
                  <Button type="button" variant="ghost" onClick={() => setPendingScope(null)}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              ) : null}
              <ChoiceCard
                type="checkbox"
                className="md:col-span-2"
                label={t("includeClosedAssets")}
                description={t("includeClosedAssetsHelp")}
                checked={values.includeClosedAssets}
                onChange={(event) => setIncludeClosedAssets(event.target.checked)}
              />
            </div>
          </FormSection>
          <FormSection number={3} title={t("sectionAdvanced")}>
            <details ref={advancedRef}>
              <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>
                {t("advancedNow", { risk: t(`riskPreset_${values.riskPreset}`), rate: formatCount(shownSampleRate) })}
              </summary>
              <p className="mt-3 text-meta text-muted-foreground">{t("riskSamplingHelp")}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Select label={t("riskPreset")} id="audit-round-risk-preset" value={values.riskPreset} error={fieldErrors.message("riskPreset")} onChange={(value) => setField("riskPreset", value)}>
                  {riskPresetValues.map((preset) => (
                    <option key={preset} value={preset}>
                      {t(`riskPreset_${preset}`)}
                    </option>
                  ))}
                </Select>
                <Field
                  label={t("sampleRate")}
                  id="audit-round-sample-rate"
                  required
                  hint={t("sampleRateHelp")}
                  error={fieldErrors.errors.sampleRate ? validationMessage(fieldErrors.errors.sampleRate, { min: 1, max: 100 }) : undefined}
                >
                  <Input
                    type="number"
                    value={values.sampleRate}
                    onChange={(event) => setField("sampleRate", event.target.value)}
                    required
                    min={1}
                    max={100}
                  />
                </Field>
              </div>
            </details>
          </FormSection>
        </div>
        <div className={cn(getPanelClasses(), "grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start")}>
          <h2 className="text-base font-semibold text-foreground">{t("summaryTitle")}</h2>
          {!preview ? (
            <p className="text-sm text-muted-foreground">{t(previewFailed ? "summaryUnavailable" : "counting")}</p>
          ) : preview.sampledAssets === 0 ? (
            <EmptyNote className="mt-2">{t("previewEmpty")}</EmptyNote>
          ) : (
            <>
              <div>
                <p className="text-metric num text-foreground">{formatCount(preview.sampledAssets)}</p>
                <p className="text-meta text-muted-foreground">{t("summaryItems")}</p>
                <p className="text-meta text-muted-foreground">{t("summaryLiveHint")}</p>
                {preview.sampleRate < 100 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("summaryMatchedSampled", { matched: formatCount(preview.matchedAssets), sampled: formatCount(preview.directSampled) })}
                  </p>
                ) : null}
              </div>
              {componentItems > 0 ? <Notice tone="info">{t("previewComponentHelp", { count: formatCount(componentItems) })}</Notice> : null}
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("summaryByCategory")}</h3>
                <ul className="mt-2 grid gap-1.5">
                  {categories.top.map((row) => (
                    <li key={row.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words text-foreground">{categoryLabel(row.id)}</span>
                      <span className="num text-muted-foreground">{formatCount(row.count)}</span>
                    </li>
                  ))}
                  {categories.other.categories > 0 ? (
                    <li className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words text-foreground">
                        {t("summaryOtherCategories", { count: formatCount(categories.other.categories) })}
                      </span>
                      <span className="num text-muted-foreground">{formatCount(categories.other.count)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              {preview.overlap.count > 0 ? (
                <Notice tone="warning" title={t("overlapWarning", { count: formatCount(preview.overlap.count) })}>
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {preview.overlap.rounds.map((round) => (
                      <Link
                        key={round.id}
                        href={`/${locale}/audit/rounds/${round.id}`}
                        className={linkVariants({ size: "inherit" })}
                      >
                        <span className="tag">{round.auditNo}</span>
                      </Link>
                    ))}
                  </span>
                </Notice>
              ) : null}
              {dailyLoad !== null ? <p className="text-sm text-muted-foreground">{t("dailyLoad", { count: formatCount(dailyLoad) })}</p> : null}
              <details>
                <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{t("showSample")}</summary>
                <ul className="mt-2 grid gap-y-3">
                  {preview.previewAssets.map((asset) => (
                    <li key={asset.id} className="min-w-0">
                      <div className="text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
                      <div className="mt-0.5 truncate text-meta text-muted-foreground">{asset.name}</div>
                      {asset.includedVia === "component" && asset.parentAssetTag ? (
                        <div className="mt-1 text-meta text-muted-foreground">
                          {t("previewComponentFromParent", { assetTag: asset.parentAssetTag })}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
        {/* The live region carries settled answers only; "กำลังนับรายการ…" shows beside it, unannounced, on each change. */}
        <StickyFormFooter
          className="lg:col-span-2"
          status={
            <>
              {counting ? <span>{footerStatus}</span> : null}
              <span role="status">{counting ? null : footerStatus}</span>
            </>
          }
        >
          <Link href={`/${locale}/audit/rounds`} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {t("createRound")}
          </Button>
        </StickyFormFooter>
      </form>
    </div>
  )
}

function chipId(key: ScopeField["key"]) {
  return `${SCOPE_FIELDS.find((field) => field.key === key)?.id ?? key}-chip`
}

function isClosedStatusId(statuses: Option[], statusId: string) {
  return Boolean(statusId) && statuses.some((status) => status.id === statusId && status.isClosed)
}

function emptyToNull(values: Record<string, string | boolean>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value])
  )
}

function Select({
  label,
  id,
  value,
  required,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  error?: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
