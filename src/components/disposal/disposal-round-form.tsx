"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getAssetStateTone } from "@/lib/design-system"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import {
  disposalRoundApprovedTabHref,
  disposalRoundSelectionStorageKey,
  parseStoredRoundSelection,
  type StoredRoundSelection,
} from "@/lib/disposal-round-selection"
import { getDisposalRoundFieldErrors, requiresDisposalExecutionRecipient, requiresDisposalExecutionRemark, type DisposalType } from "@/lib/disposal-type-policy"
import { cn } from "@/lib/utils"
import { decimals, maxLength, range, required } from "@/lib/validation-rules"

type Option = { id: string; label: string }

// The preview's answer per machine (Task 2, DisposalRoundItem).
type RoundItem = {
  requestId: string
  disposalNo: string | null
  assetTag: string | null
  assetName: string | null
  fromDisposalType: string | null
  approverName: string | null
  outcome: "eligible" | "blocked"
  code: string | null
}

type RoundValues = {
  disposalType: string
  executionDate: string
  executedById: string
  recipientName: string
  documentNo: string
  saleValue: string
  remark: string
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason: string
}

// The methods in the board's order (spec §11.2, decision 11): ขาย · บริจาค · ทำลาย · สูญหาย · ตัดจำหน่าย.
const METHODS = ["sell", "donate", "destroy", "lost", "dispose"] as const
const PENDING_DISPOSAL_STATUS = "Pending Disposal"
const DISPOSED_STATUS = "Disposed"
const RECIPIENT_MAX = 200
const DOCUMENT_MAX = 100
const REMARK_MAX = 4000
const EXCEPTION_MIN = 20
const EXCEPTION_MAX = 2000

const DISPOSAL_ROUND_FORM_ID = "disposal-round-form"

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to.
const FIELD_IDS = {
  disposalType: "disposal-round-type",
  executionDate: "disposal-round-date",
  executedById: "disposal-round-executed-by",
  recipientName: "disposal-round-recipient",
  documentNo: "disposal-round-document",
  saleValue: "disposal-round-sale-value",
  remark: "disposal-round-remark",
  evidenceExceptionReason: "disposal-round-exception-reason",
} as const
type RoundField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as RoundField[]

// noValidate turns the browser's check off, so this restates the round's rules (getDisposalRoundFieldErrors, the
// server's own) plus the method, the date, the executor and the exception's reason.
function validate(values: RoundValues, todayKey: string): Partial<Record<RoundField, string>> {
  const errors: Partial<Record<RoundField, string>> = {}
  const check = (key: RoundField, code: string | null) => {
    if (code && !errors[key]) errors[key] = code
  }
  check("disposalType", required(values.disposalType))
  check("executionDate", required(values.executionDate))
  check("executedById", required(values.executedById))
  check("recipientName", maxLength(values.recipientName, RECIPIENT_MAX))
  check("documentNo", maxLength(values.documentNo, DOCUMENT_MAX))
  check("remark", maxLength(values.remark, REMARK_MAX))
  // The lump price: baht, at least 0, 2 decimal places (the one money rule); empty is left to the round rule below.
  if (values.disposalType === "sell") check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  if (values.disposalType) {
    const saleValue = values.saleValue.trim() === "" ? null : Number(values.saleValue)
    const date = values.executionDate ? new Date(`${values.executionDate}T00:00:00+07:00`) : null
    const now = new Date(`${todayKey}T12:00:00+07:00`)
    for (const error of getDisposalRoundFieldErrors({
      disposalType: values.disposalType as DisposalType,
      executionDate: date,
      recipientName: values.recipientName,
      documentNo: values.documentNo,
      saleValue: values.disposalType === "sell" ? saleValue : null,
      remark: values.remark,
    }, now)) {
      check(error.field as RoundField, getApiErrorKey(error.message) ?? error.message)
    }
  }
  if (values.useHistoricalEvidenceException) {
    const length = values.evidenceExceptionReason.trim().length
    if (length < EXCEPTION_MIN || length > EXCEPTION_MAX) check("evidenceExceptionReason", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED")
  }
  return errors
}

function readSelection(): StoredRoundSelection | null {
  try {
    return parseStoredRoundSelection(window.sessionStorage.getItem(disposalRoundSelectionStorageKey))
  } catch {
    return null
  }
}

function writeSelection(selection: StoredRoundSelection | null) {
  try {
    if (selection && selection.ids.length > 0) window.sessionStorage.setItem(disposalRoundSelectionStorageKey, JSON.stringify(selection))
    else window.sessionStorage.removeItem(disposalRoundSelectionStorageKey)
  } catch {
    // Storage may be off (private mode); the page still works for this visit.
  }
}

// สร้างรอบตัดจำหน่าย (DP-Batch-New look, group 6 spec §11.2) on the operation frame. The approved tab's selection comes
// from sessionStorage (P4-R2); the page posts the ids to the preview to list the machines, name the blocked ones and
// get the executors. "ตรวจสอบรอบ" previews the round as entered; once nothing is blocked the primary becomes
// "บันทึกรอบตัดจำหน่าย {n} รายการ", which commits all or nothing.
export function DisposalRoundForm({
  breadcrumbs,
  back,
  locale,
  todayKey,
  initialExecutorId,
  canUseEvidenceException,
  statusLabels,
}: {
  breadcrumbs: BreadcrumbItem[]
  back: ReactNode
  locale: string
  /** Bangkok today (getBangkokDateKey): the date's default and its max. */
  todayKey: string
  /** The signed-in user's employee, the executor's preset (kept only when the preview offers it). */
  initialExecutorId: string
  /** A system admin may record machines without evidence (spec §11.2). */
  canUseEvidenceException: boolean
  /** Every active status, name → Thai name: the summary's รอตัดจำหน่าย and ตัดจำหน่ายแล้ว. */
  statusLabels: Record<string, string>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("disposalPage")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const fieldErrors = useFieldErrors<RoundField>()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // undefined: not read yet (the first render matches the server's); null: no selection in storage.
  const [selection, setSelection] = useState<StoredRoundSelection | null | undefined>(undefined)
  const [items, setItems] = useState<Map<string, RoundItem>>(new Map())
  const [executorOptions, setExecutorOptions] = useState<Option[]>([])
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading")
  const [loadAttempt, setLoadAttempt] = useState(0)
  // True after "ตรวจสอบรอบ" passed for the round as entered; the executor and the exception reset it.
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<RoundValues>({
    disposalType: "",
    executionDate: todayKey,
    executedById: initialExecutorId,
    recipientName: "",
    documentNo: "",
    saleValue: "",
    remark: "",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: "",
  })

  const ids = useMemo(() => selection?.ids ?? [], [selection])
  const scope = selection?.scope ?? null
  const addMoreHref = disposalRoundApprovedTabHref(locale, scope)

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is read after mount: the server render has none. */
  useEffect(() => {
    setSelection(readSelection())
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const postPreview = useCallback(async (requestIds: string[], extra: Record<string, unknown>) => {
    const response = await fetch("/api/disposal-rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "preview", requestIds, ...extra }),
    })
    const payload = await response.json().catch(() => null)
    return { response, payload }
  }, [])

  // The machines and the executors, read once the selection is known (and again on "ลองอีกครั้ง", or when the admin
  // exception changes, since it decides whether a machine without evidence is blocked). A removal alone reads nothing
  // again: the machines left were already checked.
  const idsRef = useRef<string[]>([])
  useEffect(() => {
    idsRef.current = ids
  }, [ids])
  const hasSelection = ids.length > 0
  const exceptionOn = values.useHistoricalEvidenceException
  useEffect(() => {
    if (!hasSelection) return
    let cancelled = false
    postPreview(idsRef.current.length > 0 ? idsRef.current : ids, { useHistoricalEvidenceException: exceptionOn })
      .then(({ response, payload }) => {
        if (cancelled) return
        if (!response.ok || !payload) {
          setLoadState("failed")
          return
        }
        const preview = payload as { items: RoundItem[]; executorOptions: Option[] }
        setItems(new Map(preview.items.map((item) => [item.requestId, item])))
        setExecutorOptions(preview.executorOptions)
        // The method is pre-chosen only when every machine was asked under one method (decision 11), and never over
        // the user's own choice.
        const asked = [...new Set(preview.items.map((item) => item.fromDisposalType).filter((type): type is string => Boolean(type)))]
        const preset = asked.length === 1 && (METHODS as readonly string[]).includes(asked[0]) ? asked[0] : ""
        setValues((current) => ({
          ...current,
          disposalType: current.disposalType || preset,
          executedById: preview.executorOptions.some((option) => option.id === current.executedById) ? current.executedById : "",
        }))
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setLoadState("failed")
      })
    return () => {
      cancelled = true
    }
    // ids is read through idsRef: a removal must not read the machines again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection, loadAttempt, exceptionOn, postPreview])

  function setField<K extends keyof RoundValues>(field: K, value: RoundValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as RoundField)
    if (field === "executedById" || field === "useHistoricalEvidenceException") setReviewed(false)
  }

  function removeIds(removed: readonly string[]) {
    if (!selection) return
    const gone = new Set(removed)
    const next = { ids: selection.ids.filter((id) => !gone.has(id)), scope: selection.scope }
    writeSelection(next)
    setSelection(next.ids.length > 0 ? next : null)
  }

  const blockedIds = ids.filter((id) => items.get(id)?.outcome === "blocked")
  const count = ids.length
  const canSave = reviewed && blockedIds.length === 0 && count > 0 && loadState === "ready"
  const methodLabel = values.disposalType ? t(`types.${values.disposalType}`) : null
  const changingCount = values.disposalType ? ids.filter((id) => {
    const from = items.get(id)?.fromDisposalType
    return from != null && from !== values.disposalType
  }).length : 0

  function roundFields() {
    return {
      requestIds: ids,
      disposalType: values.disposalType,
      executionDate: values.executionDate,
      executedById: values.executedById,
      recipientName: values.recipientName,
      documentNo: values.documentNo,
      // The round's one price, only for a sale (spec §11.2); other methods send none.
      saleValue: values.disposalType === "sell" ? values.saleValue : null,
      remark: values.remark,
      useHistoricalEvidenceException: values.useHistoricalEvidenceException,
      evidenceExceptionReason: values.useHistoricalEvidenceException ? values.evidenceExceptionReason : null,
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (count === 0 || blockedIds.length > 0) return
    fieldErrors.setErrors(validate(values, todayKey))
    if (focusFirstError()) return
    setBusy(true)
    try {
      const response = await fetch("/api/disposal-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "ตรวจสอบรอบ" previews the round as entered; once it passed, the same fields commit.
        body: JSON.stringify(canSave ? { mode: "commit", ...roundFields() } : { mode: "preview", ...roundFields() }),
      })
      const payload = await response.json().catch(() => null)
      if (payload && Array.isArray(payload.items)) {
        // The preview's answer, or a 409 that names the machines refused since: every machine's latest outcome.
        setItems((current) => {
          const next = new Map(current)
          for (const item of payload.items as RoundItem[]) next.set(item.requestId, item)
          return next
        })
      }
      if (!response.ok) {
        setReviewed(false)
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))
      }
      if (!canSave) {
        // "ตรวจสอบรอบ" passed when the preview names nothing blocked.
        setReviewed(!(payload?.items as RoundItem[] | undefined)?.some((item) => item.outcome === "blocked"))
        return
      }
      try {
        window.sessionStorage.removeItem(disposalRoundSelectionStorageKey)
      } catch {
        // Storage may be off; nothing to clear.
      }
      toast.success(t("rounds.form.saved", { roundNo: payload.roundNo }))
      router.push(`/${locale}/disposal/rounds/${payload.id}`)
    } catch (error) {
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  const pendingLabel = statusLabels[PENDING_DISPOSAL_STATUS] ?? PENDING_DISPOSAL_STATUS
  const disposedLabel = statusLabels[DISPOSED_STATUS] ?? DISPOSED_STATUS
  const blockedReason = (code: string | null) => {
    if (code === "DISPOSAL_EVIDENCE_REQUIRED" && canUseEvidenceException) return t("rounds.form.blocked.evidenceAdmin")
    if (code && t.has(`rounds.form.blocked.${code}`)) return t(`rounds.form.blocked.${code}`)
    return code ? t(`errors.${code}`) : ""
  }

  const footerLine = blockedIds.length > 0
    ? t("rounds.form.footerBlocked", { count: blockedIds.length })
    : canSave
      ? t("rounds.form.footerReviewed", { count })
      : methodLabel
        ? t("rounds.form.footer", { count, method: methodLabel })
        : t("rounds.form.footerNoMethod", { count })

  const recipientRequired = values.disposalType !== "" && requiresDisposalExecutionRecipient(values.disposalType as DisposalType)
  const remarkRequired = values.disposalType !== "" && requiresDisposalExecutionRemark(values.disposalType as DisposalType)
  const optional = <span className="font-normal text-muted-foreground">{t("rounds.form.optional")}</span>

  const noSelection = selection === null || (selection !== undefined && selection.ids.length === 0)

  return (
    <form onSubmit={handleSubmit} noValidate id={DISPOSAL_ROUND_FORM_ID}>
      <OperationFormFrame
        title={t("rounds.createTitle")}
        description={t("rounds.createHelp")}
        breadcrumbs={breadcrumbs}
        back={back}
        summaryOnPhone
        summary={(
          <OperationSummaryCard
            title={t("rounds.form.summaryTitle")}
            nowLabel={tOperation("summaryNow")}
            nextLabel={t("rounds.form.summaryTitle")}
            rows={[
              {
                key: "requests",
                label: t("rounds.form.rowRequests", { count }),
                now: <StatusBadge wrap label={t("statuses.approved")} status="approved" />,
                next: <StatusBadge wrap label={t("statuses.disposed")} status="disposed" />,
                changed: true,
              },
              {
                key: "assets",
                label: t("rounds.form.rowAssets", { count }),
                now: <StatusBadge wrap label={pendingLabel} tone={getAssetStateTone(PENDING_DISPOSAL_STATUS)} />,
                next: <StatusBadge wrap label={disposedLabel} tone={getAssetStateTone(DISPOSED_STATUS)} />,
                changed: true,
              },
              { key: "pm", label: t("rounds.form.rowPm"), now: t("rounds.form.pmNow"), next: t("rounds.form.pmEnded"), changed: true },
            ]}
            footnote={<span data-disposal-round-final>{t("rounds.form.final")}</span>}
          />
        )}
        footer={{
          description: <span data-disposal-round-footer>{footerLine}</span>,
          cancelHref: addMoreHref,
          cancelLabel: tCommon("cancel"),
          submitLabel: canSave ? t("rounds.form.save", { count }) : t("rounds.form.review"),
          busy,
          formId: DISPOSAL_ROUND_FORM_ID,
          submitDisabled: count === 0 || loadState !== "ready" || blockedIds.length > 0,
        }}
      >
        <FormSection number={1} title={t("rounds.form.sectionMachines")}>
          <div className="grid gap-3">
            {noSelection ? (
              <Notice
                tone="info"
                data-disposal-round-no-selection=""
                action={<Link href={addMoreHref} className={buttonVariants({ variant: "outline", size: "md" })}>{t("rounds.form.noSelectionAction")}</Link>}
              >
                {t("rounds.form.noSelection")}
              </Notice>
            ) : loadState === "failed" ? (
              <Notice
                tone="warning"
                role="status"
                action={<Button type="button" variant="outline" size="md" onClick={() => {
                  setLoadState("loading")
                  setLoadAttempt((attempt) => attempt + 1)
                }}>{tCommon("tryAgain")}</Button>}
              >
                {t("rounds.form.loadFailed")}
              </Notice>
            ) : selection === undefined || loadState === "loading" ? (
              <p role="status" className="text-sm text-muted-foreground">{t("rounds.form.loading")}</p>
            ) : (
              <>
                <p className="text-meta text-muted-foreground">{t("rounds.form.machinesMeta", { count })}</p>
                {blockedIds.length > 0 ? (
                  <Notice
                    tone="danger"
                    role="alert"
                    title={t("rounds.form.blockedTitle", { count: blockedIds.length })}
                    data-disposal-round-blocked=""
                    action={<Button type="button" variant="outline" size="md" onClick={() => removeIds(blockedIds)}>{t("rounds.form.removeBlocked")}</Button>}
                  >
                    {t("rounds.form.blockedHelp")}
                  </Notice>
                ) : null}
                <ul className="divide-y divide-border-soft rounded-md border border-border" aria-label={t("rounds.form.sectionMachines")}>
                  {ids.map((id) => {
                    const item = items.get(id)
                    const name = item?.assetName ?? item?.disposalNo ?? id
                    const blocked = item?.outcome === "blocked"
                    return (
                      <li key={id} data-disposal-round-machine={blocked ? "blocked" : "eligible"} className={cn("flex items-start gap-3 px-3 py-2.5", blocked && "bg-danger-soft")}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground [overflow-wrap:anywhere]">
                            <span className="font-medium">{name}</span>
                            {item?.assetTag ? <> <span className="tag text-muted-foreground">{item.assetTag}</span></> : null}
                          </div>
                          <div className="mt-0.5 text-meta text-muted-foreground">
                            {item?.disposalNo ? <Link href={`/${locale}/disposal/${id}`} className={linkVariants({ size: "inherit" })}><span className="tag">{item.disposalNo}</span></Link> : null}
                            {item?.fromDisposalType ? <> · {t("rounds.form.askedAs", { method: t(`types.${item.fromDisposalType}`) })}</> : null}
                            {item?.approverName ? <> · {t("rounds.form.approvedBy", { name: item.approverName })}</> : null}
                          </div>
                          {blocked ? <div className="mt-0.5 text-meta font-medium text-danger">{blockedReason(item?.code ?? null)}</div> : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          aria-label={t("rounds.form.remove", { name })}
                          onClick={() => removeIds([id])}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            {noSelection ? null : (
              <div>
                <Link href={addMoreHref} className={linkVariants({ size: "inherit" })} data-disposal-round-add-more="">
                  {t("rounds.form.addMore")}
                </Link>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection number={2} title={t("rounds.form.sectionDetail")}>
          <div className="grid gap-5">
            <FieldGroup
              legend={t("rounds.form.method")}
              id={FIELD_IDS.disposalType}
              required
              hint={changingCount > 0 && methodLabel ? (
                <span data-disposal-round-method-change="">{t("rounds.form.methodChange", { count: changingCount, method: methodLabel })}</span>
              ) : t("rounds.form.methodHint")}
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
                    onChange={() => setField("disposalType", method)}
                  />
                ))}
              </div>
            </FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t("rounds.form.executionDate")} id={FIELD_IDS.executionDate} required error={fieldErrors.message("executionDate")}>
                <Input type="date" required max={todayKey} value={values.executionDate} onChange={(event) => setField("executionDate", event.target.value)} />
              </Field>
              <SearchableSelect
                id={FIELD_IDS.executedById}
                label={t("rounds.form.executedBy")}
                value={values.executedById}
                required
                options={executorOptions}
                placeholder={t("selectEmployee")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                hint={t("rounds.form.executedByHint")}
                error={fieldErrors.message("executedById")}
                onChange={(value) => setField("executedById", value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label={recipientRequired ? t("rounds.form.recipient") : <>{t("rounds.form.recipient")} {optional}</>}
                id={FIELD_IDS.recipientName}
                required={recipientRequired}
                error={fieldErrors.message("recipientName")}
              >
                <Input required={recipientRequired} maxLength={RECIPIENT_MAX} value={values.recipientName} onChange={(event) => setField("recipientName", event.target.value)} />
              </Field>
              <Field label={t("rounds.form.documentNo")} id={FIELD_IDS.documentNo} required error={fieldErrors.message("documentNo")}>
                <Input required maxLength={DOCUMENT_MAX} value={values.documentNo} onChange={(event) => setField("documentNo", event.target.value)} />
              </Field>
            </div>
            {values.disposalType === "sell" ? (
              <Field
                label={t("rounds.form.saleValue")}
                id={FIELD_IDS.saleValue}
                required
                hint={t("rounds.form.saleValueHint", { count })}
                error={fieldErrors.message("saleValue")}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  required
                  min={0}
                  step="0.01"
                  value={values.saleValue}
                  onChange={(event) => setField("saleValue", event.target.value)}
                  className="md:max-w-xs"
                />
              </Field>
            ) : null}
            <Field
              label={remarkRequired ? t("rounds.form.remark") : <>{t("rounds.form.remark")} {optional}</>}
              id={FIELD_IDS.remark}
              required={remarkRequired}
              error={fieldErrors.message("remark")}
            >
              <Textarea required={remarkRequired} rows={3} maxLength={REMARK_MAX} value={values.remark} onChange={(event) => setField("remark", event.target.value)} />
            </Field>
            {canUseEvidenceException ? (
              <div className="grid gap-3" data-disposal-round-exception="">
                <ChoiceCard
                  type="checkbox"
                  name="useHistoricalEvidenceException"
                  checked={values.useHistoricalEvidenceException}
                  label={t("rounds.form.exception")}
                  description={t("rounds.form.exceptionHint")}
                  onChange={(event) => setField("useHistoricalEvidenceException", event.target.checked)}
                />
                {values.useHistoricalEvidenceException ? (
                  <Field
                    label={t("rounds.form.exceptionReason")}
                    id={FIELD_IDS.evidenceExceptionReason}
                    required
                    hint={t("rounds.form.exceptionReasonHint")}
                    error={fieldErrors.message("evidenceExceptionReason")}
                  >
                    <Textarea
                      required
                      minLength={EXCEPTION_MIN}
                      maxLength={EXCEPTION_MAX}
                      rows={3}
                      value={values.evidenceExceptionReason}
                      onChange={(event) => setField("evidenceExceptionReason", event.target.value)}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
          </div>
        </FormSection>
      </OperationFormFrame>
    </form>
  )
}
