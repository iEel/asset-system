"use client"

import { useEffect, useEffectEvent, useId, useRef, type ReactNode, type RefObject } from "react"

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

export function AccessibleDialog({
  open,
  title,
  description,
  busy = false,
  initialFocusRef,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const closeOnEscape = useEffectEvent(() => {
    if (busy) return false
    onClose()
    return true
  })
  const resolveInitialFocus = useEffectEvent(() =>
    initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(focusableSelector)
  )

  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => {
      const target = resolveInitialFocus()
      target?.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape()) {
        event.preventDefault()
        return
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        if (focusable.length === 0) return
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
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown)
      restoreFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-lg bg-surface shadow-lg"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </section>
    </div>
  )
}
