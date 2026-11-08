"use client"

import type React from "react"
import { Button } from "@/components/ui/button"

// A secondary button that goes one step back in the browser's history (the access-denied page's "กลับหน้าก่อน").
export function HistoryBackButton({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" size="md" onClick={() => window.history.back()}>
      {children}
    </Button>
  )
}
