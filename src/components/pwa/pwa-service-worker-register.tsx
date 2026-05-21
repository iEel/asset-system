"use client"

import { useEffect } from "react"

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    let cancelled = false

    window.addEventListener("load", () => {
      if (cancelled) return
      navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    }, { once: true })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
