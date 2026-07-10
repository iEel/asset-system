"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { MoreHorizontal, X } from "lucide-react"

export function AssetDetailActionMenu({
  label,
  closeLabel,
  children,
}: {
  label: string
  closeLabel: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-10 sm:w-10"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
          />
          <section
            id={panelId}
            aria-label={label}
            className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-xl md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-72"
          >
            <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
              <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              <button
                type="button"
                onClick={closeMenu}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={closeLabel}
                title={closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2">{children}</div>
          </section>
        </>
      ) : null}
    </div>
  )
}
