"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  assetRegisterScrollMemoryKey,
  assetRegisterViewPreferenceKey,
  getPersistedAssetRegisterView,
  hasExplicitAssetRegisterView,
  readPersistedAssetRegisterView,
} from "@/lib/asset-register-view-memory"

export function AssetRegisterViewMemory({ locale, returnHref }: { locale: string; returnHref: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const restoredSavedViewRef = useRef(false)
  const restoredScrollRef = useRef(false)
  const search = searchParams.toString()

  useEffect(() => {
    const current = new URLSearchParams(search)

    if (hasExplicitAssetRegisterView(current)) {
      window.localStorage.setItem(assetRegisterViewPreferenceKey(locale), getPersistedAssetRegisterView(current).toString())
      return
    }

    // A non-empty URL may intentionally use only pagination. Never replace a shared link.
    if (current.size > 0 || restoredSavedViewRef.current) return

    const saved = readPersistedAssetRegisterView(window.localStorage.getItem(assetRegisterViewPreferenceKey(locale)))
    if (saved.size === 0) return

    restoredSavedViewRef.current = true
    router.replace(`${pathname}?${saved.toString()}`, { scroll: false })
  }, [locale, pathname, router, search])

  useEffect(() => {
    if (restoredScrollRef.current) return

    const key = assetRegisterScrollMemoryKey(returnHref)
    const rawPosition = window.sessionStorage.getItem(key)
    const position = Number(rawPosition)

    if (!Number.isFinite(position) || position < 0) return

    restoredScrollRef.current = true
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-dashboard-main]")?.scrollTo({ top: position, behavior: "auto" })
      window.sessionStorage.removeItem(key)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [returnHref])

  return null
}
