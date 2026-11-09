"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRef, useState, type RefObject } from "react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { CONSUMABLE_ISSUE_MAX } from "@/lib/consumable-rules"
import { readFieldErrors } from "@/lib/field-error-client"
import { maxLength, range, required, wholeNumber } from "@/lib/validation-rules"

/** A kind as the dialogs read it: ConsumableUsageRow and the history page's item both fit. */
export type ConsumableDialogItem = { id: string; name: string; unit: string; onHand: number }

// The fields, keyed like the route's fieldErrors (validations/consumables.ts consumableIssueSchema), with the id focus
// moves to. assetId names the picker's root, so focus reaches its search field.
const FIELD_IDS = {
  itemId: "consumable-issue-item",
  quantity: "consumable-issue-quantity",
  assetId: "consumable-issue-asset",
  note: "consumable-issue-note",
} as const
type IssueField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as IssueField[]
const FIELD_PARAMS = { quantity: { min: 1, max: CONSUMABLE_ISSUE_MAX }, note: { max: 500 } }

function validate(values: { itemId: string; quantity: string; assetId: string; note: string }): Partial<Record<IssueField, string>> {
  const errors: Partial<Record<IssueField, string>> = {}
  const check = (key: IssueField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("itemId", required(values.itemId))
  check("quantity", required(values.quantity) ?? range(values.quantity, 1, CONSUMABLE_ISSUE_MAX) ?? wholeNumber(values.quantity))
  check("assetId", required(values.assetId))
  check("note", maxLength(values.note, 500))
  return errors
}

// ของใช้สิ้นเปลือง plan 2 task 3: เบิกไปใช้. ชนิด (out-of-stock kinds disabled with ของหมด), จำนวน, ไปลงเครื่อง (the asset
// picker's consumable mode) and หมายเหตุ, with the preview "เหลือหลังเบิก". initialItemId preselects a row's kind;
// lockedAsset (plan 3, from a machine's page) replaces the picker with a read-only line. Only the server decides a shortage:
// the list's on-hand is a snapshot, so more than it is a hint (shortWithCount), never a block; a 409 CONSUMABLE_SHORT
// shows the current count left under จำนวน and reads the page again. The owner mounts it with a new key per opening.
export function ConsumableIssueDialog({
  open,
  items,
  initialItemId,
  lockedAsset,
  returnFocusRef,
  onClose,
}: {
  open: boolean
  items: readonly ConsumableDialogItem[]
  initialItemId?: string
  lockedAsset?: { id: string; label: string }
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const [itemId, setItemId] = useState(() => (items.some((item) => item.id === initialItemId && item.onHand > 0) ? initialItemId ?? "" : ""))
  const [quantity, setQuantity] = useState("1")
  const [asset, setAsset] = useState<AssetOperationSearchRow | null>(null)
  const [note, setNote] = useState("")
  // The count the server's 409 CONSUMABLE_SHORT says is left, shown under จำนวน as shortWithCount.
  const [short, setShort] = useState<{ onHand: number; unit: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // With the machine locked there is no picker to show its refusal under: the code of the server's assetId refusal.
  const [assetRefusal, setAssetRefusal] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const fieldErrors = useFieldErrors<IssueField>({ params: FIELD_PARAMS })
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  const selected = items.find((item) => item.id === itemId) ?? null
  const assetId = lockedAsset?.id ?? asset?.id ?? ""
  const quantityNumber = Number(quantity)
  const showPreview = selected !== null && quantity.trim() !== "" && Number.isInteger(quantityNumber) && quantityNumber >= 1
  const quantityError = short ? t("shortWithCount", { onHand: short.onHand, unit: short.unit }) : fieldErrors.message("quantity")
  // เหลือหลังเบิก only for 1 ≤ quantity ≤ on hand; above it, the snapshot's count as a hint. Hidden while the 409 line shows.
  const quantityHint = !showPreview || short
    ? undefined
    : quantityNumber <= selected.onHand
      ? t("afterIssue", { left: selected.onHand - quantityNumber })
      : t("shortWithCount", { onHand: selected.onHand, unit: selected.unit })

  const options = items.map((item) => ({
    id: item.id,
    label: t("itemOption", { name: item.name, onHand: item.onHand }),
    disabled: item.onHand === 0,
    description: item.onHand === 0 ? t("outReason") : null,
  }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError(null)
    setAssetRefusal(null)
    setShort(null)
    const errors = validate({ itemId, quantity, assetId, note })
    fieldErrors.setErrors(errors)
    if (focusFirstError()) return
    submittingRef.current = true
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/consumables/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: quantityNumber, assetId, note: note.trim() || undefined }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        onClose()
        toast.success(t("issueToast", { name: selected?.name ?? "" }))
        router.refresh()
        return
      }
      if (response.status === 409 && payload?.code === "CONSUMABLE_SHORT") {
        setShort({ onHand: Number(payload.onHand), unit: String(payload.unit) })
        fieldErrors.setErrors({ quantity: "consumableShort" })
        focusFirstError()
        router.refresh()
        return
      }
      // Locked to a machine whose status changed (or that is gone, 404) since the page loaded: the refusal is the dialog's
      // alert line, and the page reads again so the record button follows (plan 3 final review).
      const assetRefused = lockedAsset ? readFieldErrors(payload)?.assetId : undefined
      if (assetRefused) {
        setAssetRefusal(assetRefused)
        router.refresh()
        return
      }
      // A refused field shows under it; anything else is the dialog's error line.
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
    <AccessibleDialog open={open} title={t("issueTitle")} busy={isSubmitting} returnFocusRef={returnFocusRef} onClose={onClose}>
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
                setShort(null)
                fieldErrors.clear("itemId", "quantity")
              }}
            />
            <Field
              label={t("field_quantity")}
              required
              error={quantityError}
              hint={quantityHint}
            >
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
                  setShort(null)
                  fieldErrors.clear("quantity")
                }}
              />
            </Field>
            {lockedAsset ? (
              <div data-consumable-locked-asset className="grid gap-1.5">
                <span className={fieldLabelClasses}>{t("field_asset")}</span>
                <p className="text-sm text-foreground">{lockedAsset.label}</p>
                {fieldErrors.message("assetId") ? <FieldError>{fieldErrors.message("assetId")}</FieldError> : null}
              </div>
            ) : (
              <AssetOperationPicker
                id={FIELD_IDS.assetId}
                label={t("field_asset")}
                mode="consumable"
                value={asset}
                required
                error={fieldErrors.message("assetId")}
                onChange={(row) => {
                  setAsset(row)
                  fieldErrors.clear("assetId")
                }}
              />
            )}
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
          {assetRefusal || error ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {assetRefusal ? validationMessage(assetRefusal) : <ApiErrorText error={error} />}
            </p>
          ) : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{tCommon("cancel")}</AccessibleDialogCancel>
          <Button type="submit" busy={isSubmitting}>
            {t("issueSubmit")}
          </Button>
        </AccessibleDialogFooter>
      </form>
    </AccessibleDialog>
  )
}
