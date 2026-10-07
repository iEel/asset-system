"use client"

import { useId, useRef, useState, type FormEvent, type RefObject } from "react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"

type ConfirmTextDialogTone = "default" | "danger" | "warning"

type ConfirmTextDialogProps = {
  open: boolean
  title: string
  description?: string
  fieldLabel: string
  placeholder?: string
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
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
      <ConfirmTextForm {...formProps} busy={busy} inputRef={inputRef} onClose={onClose} />
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
  onClose,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "tone" | "onClose" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const fieldId = useId()
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onConfirm(value.trim())
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-4 py-4">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{fieldLabel}</label>
        <textarea
          ref={inputRef}
          id={fieldId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
          rows={4}
          placeholder={placeholder}
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </div>
      <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button type="submit" variant={confirmVariantByTone[tone]} disabled={busy}>{confirmLabel}</Button>
      </div>
    </form>
  )
}
