"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRef, useState, type RefObject } from "react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { CONSUMABLE_ADJUST_MAX } from "@/lib/consumable-rules"
import { maxLength, range, required, wholeNumber } from "@/lib/validation-rules"

// The fields, keyed like the route's fieldErrors (validations/consumables.ts consumableItemSchema). A taken name comes
// back as fieldErrors.name = consumableNameExists (consumable-service), shown under ชื่อ.
const FIELD_IDS = {
  name: "consumable-kind-name",
  unit: "consumable-kind-unit",
  minQuantity: "consumable-kind-min",
} as const
type KindField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as KindField[]
const FIELD_PARAMS = { name: { max: 100 }, unit: { max: 20 }, minQuantity: { min: 0, max: CONSUMABLE_ADJUST_MAX } }

// The server's default unit (consumableItemSchema).
const DEFAULT_UNIT = "ชิ้น"

function validate(values: { name: string; unit: string; minQuantity: string }): Partial<Record<KindField, string>> {
  const errors: Partial<Record<KindField, string>> = {}
  const check = (key: KindField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("name", required(values.name) ?? maxLength(values.name.trim(), 100))
  check("unit", required(values.unit) ?? maxLength(values.unit.trim(), 20))
  check("minQuantity", required(values.minQuantity) ?? range(values.minQuantity, 0, CONSUMABLE_ADJUST_MAX) ?? wholeNumber(values.minQuantity))
  return errors
}

/** The kind being edited; null adds a new one. */
export type ConsumableKindDialogItem = { id: string; name: string; unit: string; minQuantity: number }

// ของใช้สิ้นเปลือง plan 2 task 3: เพิ่มชนิดของ (POST) and แก้ชื่อหรือขั้นต่ำ (PATCH with all three fields). ชื่อ 1–100,
// หน่วย 1–20 (ชิ้น by default), ขั้นต่ำ 0–99999. The owner mounts it with a new key per opening.
export function ConsumableKindDialog({
  open,
  item,
  returnFocusRef,
  onClose,
}: {
  open: boolean
  item: ConsumableKindDialogItem | null
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const [name, setName] = useState(item?.name ?? "")
  const [unit, setUnit] = useState(item?.unit ?? DEFAULT_UNIT)
  const [minQuantity, setMinQuantity] = useState(String(item?.minQuantity ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const fieldErrors = useFieldErrors<KindField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError(null)
    fieldErrors.setErrors(validate({ name, unit, minQuantity }))
    if (focusFirstError()) return
    submittingRef.current = true
    setIsSubmitting(true)

    const url = item ? `/api/consumables/${item.id}` : "/api/consumables"
    try {
      const response = await fetch(url, {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), unit: unit.trim(), minQuantity: Number(minQuantity) }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        onClose()
        toast.success(t(item ? "editToast" : "createToast", { name: name.trim() }))
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
    <AccessibleDialog open={open} title={item ? t("editTitle") : t("createTitle")} busy={isSubmitting} returnFocusRef={returnFocusRef} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody>
          <div className="grid gap-4">
            <Field label={t("field_name")} required error={fieldErrors.message("name")}>
              <Input
                id={FIELD_IDS.name}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  fieldErrors.clear("name")
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("field_unit")} required error={fieldErrors.message("unit")}>
                <Input
                  id={FIELD_IDS.unit}
                  value={unit}
                  onChange={(event) => {
                    setUnit(event.target.value)
                    fieldErrors.clear("unit")
                  }}
                />
              </Field>
              <Field label={t("field_min")} required hint={t("minHint")} error={fieldErrors.message("minQuantity")}>
                <Input
                  id={FIELD_IDS.minQuantity}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={CONSUMABLE_ADJUST_MAX}
                  step={1}
                  value={minQuantity}
                  onChange={(event) => {
                    setMinQuantity(event.target.value)
                    fieldErrors.clear("minQuantity")
                  }}
                />
              </Field>
            </div>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{tCommon("cancel")}</AccessibleDialogCancel>
          <Button type="submit" busy={isSubmitting}>
            {item ? t("editSubmit") : t("createSubmit")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
