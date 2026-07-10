"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { X } from "lucide-react"

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

const confirmClassByTone: Record<ConfirmTextDialogTone, string> = {
  default: "bg-primary hover:bg-primary/90",
  danger: "bg-danger hover:bg-danger/90",
  warning: "bg-warning hover:bg-warning/90",
}

export function ConfirmTextDialog({ open, ...props }: ConfirmTextDialogProps) {
  if (!open) return null
  return <ConfirmTextDialogContent {...props} />
}

function ConfirmTextDialogContent({
  title,
  description,
  fieldLabel,
  placeholder,
  confirmLabel,
  cancelLabel,
  closeLabel,
  defaultValue = "",
  busy = false,
  tone = "default",
  onClose,
  onConfirm,
}: Omit<ConfirmTextDialogProps, "open">) {
  const titleId = useId()
  const descriptionId = useId()
  const fieldId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [])

  function closeDialog() {
    if (!busy) onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onConfirm(value.trim())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }
    if (event.key !== "Tab") return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-lg border border-border bg-surface shadow-xl sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={busy}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 sm:h-10 sm:w-10"
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
          <button
            type="button"
            onClick={closeDialog}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmClassByTone[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
