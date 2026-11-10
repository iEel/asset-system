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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { CONSUMABLE_ISSUE_MAX } from "@/lib/consumable-rules"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { maxLength, range, required, wholeNumber } from "@/lib/validation-rules"

// The fields, keyed like the route's fieldErrors (validations/consumables.ts consumableReceiveSchema).
const FIELD_IDS = {
  itemId: "consumable-receive-item",
  quantity: "consumable-receive-quantity",
  receivedDate: "consumable-receive-date",
  note: "consumable-receive-note",
} as const
type ReceiveField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as ReceiveField[]
const FIELD_PARAMS = { quantity: { min: 1, max: CONSUMABLE_ISSUE_MAX }, note: { max: 500 } }

// The schema's rules: 1–9999 whole, a day not after today in Bangkok (the server's own codes for a bad or later day).
function validate(values: { itemId: string; quantity: string; receivedDate: string; note: string }, today: string): Partial<Record<ReceiveField, string>> {
  const errors: Partial<Record<ReceiveField, string>> = {}
  const check = (key: ReceiveField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("itemId", required(values.itemId))
  check("quantity", required(values.quantity) ?? range(values.quantity, 1, CONSUMABLE_ISSUE_MAX) ?? wholeNumber(values.quantity))
  check(
    "receivedDate",
    required(values.receivedDate) ??
      (/^\d{4}-\d{2}-\d{2}$/.test(values.receivedDate) ? null : "consumableReceivedDateInvalid") ??
      (values.receivedDate > today ? "consumableReceivedDateInFuture" : null),
  )
  check("note", maxLength(values.note, 500))
  return errors
}

// ของใช้สิ้นเปลือง plan 2 task 3: รับเข้า. ชนิด (every active kind), จำนวน, วันที่รับเข้า (today in Bangkok, never after it)
// and หมายเหตุ. initialItemId preselects a row's kind. The owner mounts it with a new key per opening.
export function ConsumableReceiveDialog({
  open,
  items,
  initialItemId,
  returnFocusRef,
  onClose,
}: {
  open: boolean
  items: readonly ConsumableDialogItem[]
  initialItemId?: string
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const today = getBangkokDateKey(new Date())
  const [itemId, setItemId] = useState(() => (items.some((item) => item.id === initialItemId) ? initialItemId ?? "" : ""))
  const [quantity, setQuantity] = useState("1")
  const [receivedDate, setReceivedDate] = useState(today)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const fieldErrors = useFieldErrors<ReceiveField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  const selected = items.find((item) => item.id === itemId) ?? null
  const options = items.map((item) => ({ id: item.id, label: t("itemOption", { name: item.name, onHand: item.onHand }) }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError(null)
    fieldErrors.setErrors(validate({ itemId, quantity, receivedDate, note }, today))
    if (focusFirstError()) return
    submittingRef.current = true
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/consumables/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: Number(quantity), receivedDate, note: note.trim() || undefined }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        onClose()
        toast.success(t("receiveToast", { name: selected?.name ?? "" }))
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
    <AccessibleDialog open={open} title={t("receiveTitle")} busy={isSubmitting} returnFocusRef={returnFocusRef} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody>
          <div className="grid gap-4">
            <SearchableSelect
              id={FIELD_IDS.itemId}
              label={t("field_item")}
              value={itemId}
              options={options}
              required
              placeholder={t("itemPlaceholder")}
              searchPlaceholder={t("itemSearch")}
              emptyLabel={t("itemEmpty")}
              error={fieldErrors.message("itemId")}
              onChange={(next) => {
                setItemId(next)
                fieldErrors.clear("itemId")
              }}
            />
            <Field label={t("field_quantity")} required error={fieldErrors.message("quantity")}>
              <Input
                id={FIELD_IDS.quantity}
                type="number"
                inputMode="numeric"
                min={1}
                max={CONSUMABLE_ISSUE_MAX}
                step={1}
                value={quantity}
                className="max-w-40"
                onChange={(event) => {
                  setQuantity(event.target.value)
                  fieldErrors.clear("quantity")
                }}
              />
            </Field>
            <Field label={t("field_receivedDate")} required hint={t("receivedDateHint")} error={fieldErrors.message("receivedDate")}>
              <Input
                id={FIELD_IDS.receivedDate}
                type="date"
                max={today}
                value={receivedDate}
                className="max-w-48"
                onChange={(event) => {
                  setReceivedDate(event.target.value)
                  fieldErrors.clear("receivedDate")
                }}
              />
            </Field>
            <Field label={t("field_note")} error={fieldErrors.message("note")}>
              <Textarea
                id={FIELD_IDS.note}
                value={note}
                className="min-h-20"
                onChange={(event) => {
                  setNote(event.target.value)
                  fieldErrors.clear("note")
                }}
              />
            </Field>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{tCommon("cancel")}</AccessibleDialogCancel>
          <Button type="submit" busy={isSubmitting}>
            {t("receiveSubmit")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
