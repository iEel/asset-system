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
  /** A star and aria-required; the caller's validate() checks it, since the form is noValidate (v-track §4.5). */
  required?: boolean
  /** The caller's error for the field, under it (useFieldErrors). */
  error?: ReactNode
  /** The textarea's id, for the caller's focusFirst. */
  inputId?: string
  /** Each change, so the caller clears its error. */
  onValueChange?: (value: string) => void
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
  required = false,
  error,
  inputId,
  onValueChange,
  busy,
  tone = "default",
  inputRef,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "required" | "error" | "inputId" | "onValueChange" | "tone" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const generatedId = useId()
  const fieldId = inputId ?? generatedId
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onConfirm(value.trim())
  }

  // noValidate like every V-track form (spec §4.5): the caller checks what it needs before it acts.
  return (
    <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
      <AccessibleDialogBody>
        <Field label={fieldLabel} required={required} error={error}>
          <Textarea
            ref={inputRef}
            id={fieldId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              onValueChange?.(event.target.value)
            }}
            disabled={busy}
            required={required}
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
