"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { useValidationMessage } from "@/components/ui/use-field-errors"

// "เปลี่ยนรหัส" on the edit page (group 4 plan 2 Task 7, spec §7.1, P2-R6): a real change of the code, not a data
// correction. The dialog says what the printed labels keep, takes the new code and only sets the form's tag; the one
// PUT saves it with the rest (history "เปลี่ยนรหัสทรัพย์สิน"). No form element (it sits in the asset form's tree) and no
// polite region of its own: the form's duplicate check watches the tag and announces a duplicate under the field.
export function AssetFormTagDialog({
  currentTag,
  fieldLabel,
  describedBy,
  onConfirm,
}: {
  currentTag: string
  // The field's label (รหัสทรัพย์สิน): the Field's label points at the row, not at this button, so the button's name reads
  // the label and the current code before its own text (final review).
  fieldLabel: string
  // The tag field's error and hint, so the button reads them.
  describedBy?: string
  onConfirm: (next: string) => void
}) {
  const t = useTranslations("asset")
  const validationMessage = useValidationMessage()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(currentTag)
  const [error, setError] = useState<string | null>(null)

  function openDialog() {
    setDraft(currentTag)
    setError(null)
    setOpen(true)
  }

  function confirm() {
    const next = draft.trim()
    if (!next) {
      setError(validationMessage("required"))
      inputRef.current?.focus()
      return
    }
    if (next !== currentTag) onConfirm(next)
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" aria-label={`${fieldLabel} ${currentTag} ${t("changeTag")}`} aria-describedby={describedBy} onClick={openDialog}>
        {t("changeTag")}
      </Button>
      <AccessibleDialog
        open={open}
        title={t("changeTagTitle")}
        size="sm"
        initialFocusRef={inputRef}
        onClose={() => setOpen(false)}
      >
        <AccessibleDialogBody className="grid gap-4">
          <Notice tone="warning">{t("changeTagWarning")}</Notice>
          <Field label={t("changeTagNew")} id="asset-tag-new" required error={error ?? undefined}>
            <Input
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                confirm()
              }}
              maxLength={50}
              required
            />
          </Field>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button onClick={confirm}>{t("changeTagConfirm")}</Button>
        </AccessibleDialogFooter>
      </AccessibleDialog>
    </>
  )
}
