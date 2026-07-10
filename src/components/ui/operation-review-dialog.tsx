"use client"

import { useEffect, useId, useRef, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import type { OperationReviewItem } from "@/lib/asset-operation-review"

type OperationReviewDialogProps = {
  open: boolean
  title: string
  description: string
  items: OperationReviewItem[]
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function OperationReviewDialog({ open, ...props }: OperationReviewDialogProps) {
  if (!open) return null
  return <OperationReviewDialogContent {...props} />
}

function OperationReviewDialogContent({
  title,
  description,
  items,
  confirmLabel,
  cancelLabel,
  closeLabel,
  busy = false,
  onClose,
  onConfirm,
}: Omit<OperationReviewDialogProps, "open">) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [])

  function closeDialog() {
    if (!busy) onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }
    if (event.key !== "Tab") return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-border bg-surface shadow-xl sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        <dl className="divide-y divide-border px-4 py-2">
          {items.map((item) => (
            <div key={item.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="break-words text-right font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
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
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
