"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRef, useState, type RefObject } from "react"
import { toast } from "sonner"
import type { ConsumableDialogItem } from "@/components/consumables/consumable-issue-dialog"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { CONSUMABLE_ADJUST_MAX } from "@/lib/consumable-rules"
import { formatCount } from "@/lib/display-format"
import { maxLength, minLength, range, required, wholeNumber } from "@/lib/validation-rules"

// The fields, keyed like the route's fieldErrors (validations/consumables.ts consumableAdjustSchema).
const FIELD_IDS = {
  counted: "consumable-adjust-counted",
  reason: "consumable-adjust-reason",
} as const
type AdjustField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as AdjustField[]
const FIELD_PARAMS = { counted: { min: 0, max: CONSUMABLE_ADJUST_MAX }, reason: { min: 3, max: 500 } }

function validate(values: { counted: string; reason: string }): Partial<Record<AdjustField, string>> {
  const errors: Partial<Record<AdjustField, string>> = {}
  const check = (key: AdjustField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("counted", required(values.counted) ?? range(values.counted, 0, CONSUMABLE_ADJUST_MAX) ?? wholeNumber(values.counted))
  check("reason", required(values.reason) ?? minLength(values.reason, 3) ?? maxLength(values.reason.trim(), 500))
  return errors
}

// "+2" or "−1" (U+2212, the minus sign), grouped like the counts beside it.
function signedDiff(diff: number): string {
  return diff > 0 ? `+${formatCount(diff)}` : `−${formatCount(-diff)}`
}

// ของใช้สิ้นเปลือง plan 2 task 3: ปรับยอดตามที่นับได้. จำนวนที่นับได้ starts at the kind's on-hand; the live line reads
// "เดิม → ใหม่ (ต่าง ±n)", and submit stays disabled with noChange while the count equals on-hand. เหตุผล 3–500.
export function ConsumableAdjustDialog({
  open,
  item,
  returnFocusRef,
  onClose,
}: {
  open: boolean
  item: ConsumableDialogItem
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const [counted, setCounted] = useState(() => String(item.onHand))
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const fieldErrors = useFieldErrors<AdjustField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  // An empty field is no count (Number("") would read 0).
  const countedNumber = counted.trim() === "" ? Number.NaN : Number(counted)
  const countedValid = Number.isInteger(countedNumber) && countedNumber >= 0 && countedNumber <= CONSUMABLE_ADJUST_MAX
  const unchanged = countedNumber === item.onHand

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    // Enter in a field submits too: an unchanged count has nothing to save.
    if (unchanged) return
    setError(null)
    fieldErrors.setErrors(validate({ counted, reason }))
    if (focusFirstError()) return
    submittingRef.current = true
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/consumables/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, counted: countedNumber, reason: reason.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        onClose()
        toast.success(t("adjustToast", { name: item.name }))
        router.refresh()
        return
      }
      if (fieldErrors.applyServer(payload) && focusFirstError()) return
      setError(payload?.error ?? t("errorFallback"))
    } catch {
      setError(t("errorFallback"))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <AccessibleDialog open={open} title={t("adjustTitle", { name: item.name })} busy={isSubmitting} returnFocusRef={returnFocusRef} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody>
          <div className="grid gap-4">
            <Field
              label={t("field_counted")}
              required
              error={fieldErrors.message("counted")}
              hint={unchanged ? t("noChange") : countedValid ? t("adjustLine", { from: item.onHand, to: countedNumber, diff: signedDiff(countedNumber - item.onHand) }) : undefined}
            >
              <Input
                id={FIELD_IDS.counted}
                type="number"
                inputMode="numeric"
                min={0}
                max={CONSUMABLE_ADJUST_MAX}
                step={1}
                value={counted}
                className="max-w-40"
                onChange={(event) => {
                  setCounted(event.target.value)
                  fieldErrors.clear("counted")
                }}
              />
            </Field>
            <Field label={t("field_reason")} required error={fieldErrors.message("reason")}>
              <Textarea
                id={FIELD_IDS.reason}
                value={reason}
                className="min-h-20"
                onChange={(event) => {
                  setReason(event.target.value)
                  fieldErrors.clear("reason")
                }}
              />
            </Field>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{tCommon("cancel")}</AccessibleDialogCancel>
          <Button type="submit" busy={isSubmitting} disabled={unchanged} aria-describedby={unchanged ? `${FIELD_IDS.counted}-hint` : undefined}>
            {t("adjustSubmit")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
