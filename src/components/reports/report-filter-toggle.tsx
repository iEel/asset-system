"use client"

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

function detailsById(id: string): HTMLDetailsElement | null {
  const target = document.getElementById(id)
  return target instanceof HTMLDetailsElement ? target : null
}

// The phone's "ตัวกรอง (n)" button (board RP-Phone): it opens the filter bar's <details> and brings it into view. A
// plain fragment link cannot open a closed <details> in every browser, so this small client part does it. The phone
// copy is hidden while closed, so closing it from its summary would drop focus: on the details' toggle to closed, focus
// comes back here, and aria-expanded follows the details (group 10 plan 1 final review).
export function ReportFilterToggle({ id, targetId, label, className }: { id: string; targetId: string; label: string; className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const subscribe = useCallback(
    (onChange: () => void) => {
      const target = detailsById(targetId)
      if (!target) return () => {}
      target.addEventListener("toggle", onChange)
      return () => target.removeEventListener("toggle", onChange)
    },
    [targetId],
  )
  const expanded = useSyncExternalStore(
    subscribe,
    () => detailsById(targetId)?.open ?? false,
    () => false,
  )

  useEffect(() => {
    const target = detailsById(targetId)
    if (!target) return
    const onToggle = () => {
      const active = document.activeElement
      if (!target.open && (active === null || active === document.body || target.contains(active))) {
        buttonRef.current?.focus()
      }
    }
    target.addEventListener("toggle", onToggle)
    return () => target.removeEventListener("toggle", onToggle)
  }, [targetId])

  return (
    <Button
      ref={buttonRef}
      id={id}
      type="button"
      variant="outline"
      size="lg"
      className={className}
      aria-controls={targetId}
      aria-expanded={expanded}
      onClick={() => {
        const target = detailsById(targetId)
        if (!target) return
        target.open = true
        target.scrollIntoView({ block: "start" })
        target.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true })
      }}
    >
      <SlidersHorizontal aria-hidden="true" />
      {label}
    </Button>
  )
}
