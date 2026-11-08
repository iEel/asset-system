"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { canGoBack } from "@/lib/history-back"

// A secondary button that goes one step back in the browser's history (the access-denied page's "กลับหน้าก่อน"). With
// nothing of this app to go back to (a new tab, a bookmark, a link from another site) it opens fallbackHref instead.
export function HistoryBackButton({ children, fallbackHref }: { children: React.ReactNode; fallbackHref: string }) {
  const router = useRouter()
  const goBack = () => {
    if (canGoBack(window.history.length, document.referrer, window.location.origin)) window.history.back()
    else router.push(fallbackHref)
  }
  return (
    <Button type="button" variant="outline" size="md" onClick={goBack}>
      {children}
    </Button>
  )
}
