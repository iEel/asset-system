"use client"

import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type ConfirmTextDialogTone = "default" | "danger" | "warning"

type ConfirmTextDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  fieldLabel: string
  placeholder?: string
  confirmLabel: string
  cancelLabel: string
  closeLabel?: string
  defaultValue?: string
  busy?: boolean
  tone?: ConfirmTextDialogTone
  onClose: () => void
  onConfirm: (value: string) => void
}

const confirmVariantByTone = { default: "default", danger: "destructive", warning: "warning" } as const

export function ConfirmTextDialog({ open, title, description, closeLabel, busy = false, onClose, ...formProps }: ConfirmTextDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      busy={busy}
      size="sm"
      closeLabel={closeLabel}
      initialFocusRef={inputRef}
      onClose={onClose}
    >
      <ConfirmTextForm {...formProps} busy={busy} inputRef={inputRef} />
    </AccessibleDialog>
  )
}

function ConfirmTextForm({
  fieldLabel,
  placeholder,
  confirmLabel,
  cancelLabel,
  defaultValue = "",
  busy,
  tone = "default",
  inputRef,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "tone" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const fieldId = useId()
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onConfirm(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
      <AccessibleDialogBody>
        <Field label={fieldLabel}>
          <Textarea
            ref={inputRef}
            id={fieldId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={busy}
            rows={4}
            placeholder={placeholder}
            className="min-h-28"
          />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel>{cancelLabel}</AccessibleDialogCancel>
        <Button type="submit" variant={confirmVariantByTone[tone]} busy={busy}>{confirmLabel}</Button>
      </AccessibleDialogFooter>
    </form>
  )
}
