"use client"

import { CircleHelp } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

type AssetStateHelpPopoverProps = {
  title: string
  description: string
  items: string[]
  srLabel?: string
}

export function AssetStateHelpPopover({ title, description, items, srLabel }: AssetStateHelpPopoverProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const popoverId = useId()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const button = buttonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const popoverWidth = Math.min(320, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - popoverWidth / 2), window.innerWidth - popoverWidth - 12)
      const top = rect.bottom + 8
      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  function openHelp() {
    setOpen(true)
  }

  function closeHelp() {
    setOpen(false)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={openHelp}
      onMouseLeave={closeHelp}
      onFocus={openHelp}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeHelp()
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={srLabel ?? title}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={popoverId}
          role="status"
          aria-live="polite"
          className="fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-border bg-surface p-3 text-left shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
          <span className="mt-2 block space-y-1">
            {items.map((item) => (
              <span key={item} className="block text-xs leading-relaxed text-foreground">
                {item}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </span>
  )
}
