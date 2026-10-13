"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { SearchField } from "@/components/ui/search-field"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { assetRegisterSearchDebounceMs, shouldAutoSearch } from "@/lib/asset-register-filters"
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

  function clearSearch() {
    setDraft("")
    search("")
    inputRef.current?.focus()
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
      className={cn("min-w-0", className)}
    >
      {preservedParams.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SearchField
        ref={inputRef}
        name="search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        fieldSize="md"
        loading={isPending}
        aria-label={tCommon("search")}
        placeholder={t("searchPlaceholder")}
        value={draft}
        onClear={clearSearch}
        clearLabel={t("searchClear")}
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
      />
    </form>
  )
}
