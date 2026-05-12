"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, PackageSearch, Search, UserRound, X } from "lucide-react"

type GlobalSearchResult = {
  id: string
  type: "asset"
  title: string
  subtitle: string
  href: string
  assetTag: string
  serialNumber: string | null
  status: {
    label: string
    colorCode: string | null
  }
  meta: {
    custodian: string | null
    location: string
    category: string
  }
}

export function GlobalSearch() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("globalSearch")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trimmedQuery = query.trim()
  const canSearch = trimmedQuery.length >= 2

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  useEffect(() => {
    if (!canSearch) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as { results?: GlobalSearchResult[] } | null
        if (!response.ok) throw new Error("Search failed")
        setResults(payload?.results ?? [])
        setSelectedIndex(0)
        setOpen(true)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [canSearch, locale, trimmedQuery])

  const showPanel = open && (canSearch || results.length > 0)
  const selectedResult = useMemo(() => results[selectedIndex], [results, selectedIndex])

  function openResult(result: GlobalSearchResult) {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(result.href)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }

    if (!showPanel || results.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((current) => (current + 1) % results.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((current) => (current - 1 + results.length) % results.length)
      return
    }

    if (event.key === "Enter" && selectedResult) {
      event.preventDefault()
      openResult(selectedResult)
    }
  }

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t("placeholder")}
        className="h-9 w-[min(28rem,36vw)] rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        role="combobox"
        aria-label={t("label")}
        aria-expanded={showPanel}
        aria-autocomplete="list"
        aria-controls="global-search-results"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setResults([])
              setOpen(false)
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t("clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          id="global-search-results"
          className="absolute left-0 top-full z-50 mt-2 w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {!canSearch ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t("minChars")}</div>
          ) : loading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t("noResults")}</div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto py-1">
              {results.map((result, index) => {
                const selected = index === selectedIndex

                return (
                  <button
                    key={result.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => openResult(result)}
                    className={[
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors",
                      selected ? "bg-accent" : "hover:bg-accent/60",
                    ].join(" ")}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <PackageSearch className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">{result.title}</span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={
                            result.status.colorCode
                              ? { backgroundColor: `${result.status.colorCode}1A`, color: result.status.colorCode }
                              : undefined
                          }
                        >
                          {result.status.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-foreground">{result.subtitle}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {result.serialNumber ? <span>{t("serial")}: {result.serialNumber}</span> : null}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {result.meta.location}
                        </span>
                        {result.meta.custodian ? (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {result.meta.custodian}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {results.length > 0 ? (
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{t("keyboardHint")}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
