"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { assetRegisterSearchDebounceMs, shouldAutoSearch } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AssetRegisterSearchField({ locale, className }: { locale: string; className?: string }) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
  const [draft, setDraft] = useState(filters.search)
  const [focused, setFocused] = useState(false)
  const [syncedSearch, setSyncedSearch] = useState(filters.search)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const composingRef = useRef(false)

  // The URL wins only while nobody is typing, so a late response never overwrites the field.
  if (syncedSearch !== filters.search) {
    setSyncedSearch(filters.search)
    if (!focused) setDraft(filters.search)
  }

  useEffect(() => {
    const timer = timerRef
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  function cancelPendingSearch() {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function search(value: string) {
    cancelPendingSearch()
    const term = value.trim()
    if (term === filters.search) return
    navigate({ search: term })
  }

  function scheduleSearch(value: string) {
    cancelPendingSearch()
    if (!shouldAutoSearch(value, filters.search)) return
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      navigate({ search: value.trim() })
    }, assetRegisterSearchDebounceMs)
  }

  // Without JavaScript the form still submits as a GET that keeps every other filter.
  const preservedParams = Array.from(new URLSearchParams(buildAssetQueryString(filters, { search: "", page: 1 })))

  return (
    <form
      role="search"
      action={`/${locale}/assets`}
      onSubmit={(event) => {
        event.preventDefault()
        search(draft)
      }}
      className={cn("relative min-w-0", className)}
    >
      {preservedParams.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      </span>
      <input
        ref={inputRef}
        name="search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label={tCommon("search")}
        placeholder={t("searchPlaceholder")}
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onCompositionStart={() => {
          composingRef.current = true
          cancelPendingSearch()
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          scheduleSearch(event.currentTarget.value)
        }}
        onChange={(event) => {
          const value = event.target.value
          setDraft(value)
          if (composingRef.current || (event.nativeEvent as InputEvent).isComposing) return
          scheduleSearch(value)
        }}
        className={cn(getFieldControlClasses(), "pl-9", draft ? "pr-11" : "")}
      />
      {draft ? (
        <button
          type="button"
          aria-label={t("searchClear")}
          onClick={() => {
            setDraft("")
            search("")
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
}
