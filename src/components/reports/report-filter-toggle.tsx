"use client"

import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

// The phone's "ตัวกรอง (n)" button (board RP-Phone): it opens the filter bar's <details> and brings it into view. A
// plain fragment link cannot open a closed <details> in every browser, so this small client part does it.
export function ReportFilterToggle({ targetId, label, className }: { targetId: string; label: string; className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className}
      aria-controls={targetId}
      onClick={() => {
        const target = document.getElementById(targetId)
        if (!(target instanceof HTMLDetailsElement)) return
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
