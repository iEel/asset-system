"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  ArchiveX,
  Building2,
  ClipboardCheck,
  Loader2,
  MapPinned,
  PackageSearch,
  Search,
  Store,
  UserRound,
  Wrench,
  X,
} from "lucide-react"

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Kbd } from "@/components/ui/kbd"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

type GlobalSearchResult = {
  id: string
  type: "asset" | "employee" | "supplier" | "company" | "branch" | "location" | "maintenance" | "audit" | "disposal"
  typeLabel: string
  title: string
  subtitle: string
  href: string
  badge: { label: string; colorCode: string | null }
  metadata: Array<{ label: string; value: string }>
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
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const trimmedQuery = query.trim()
  const canSearch = trimmedQuery.length >= 2

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
    <Popover
      open={showPanel}
      onOpenChange={(next) => {
        if (!next) setOpen(false)
      }}
    >
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative hidden min-w-0 max-w-full lg:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-9 w-[min(28rem,36vw)] min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            role="combobox"
            aria-label={t("label")}
            aria-expanded={showPanel}
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={showPanel && selectedResult ? `global-search-option-${selectedIndex}` : undefined}
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
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="global-search-results"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
        className="w-[min(36rem,calc(100vw-2rem))] overflow-hidden p-0"
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
          <ul role="listbox" aria-label={t("label")} className="grid max-h-100 gap-px overflow-y-auto p-1.5">
            {results.map((result, index) => {
              const selected = index === selectedIndex

              return (
                <li
                  key={`${result.type}-${result.id}`}
                  id={`global-search-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openResult(result)}
                  className={cn(
                    "flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-control px-2.5 py-1.5 text-left",
                    selected && "bg-primary-soft",
                  )}
                >
                  <span className="mt-[3px] flex size-4 shrink-0 text-muted-foreground">
                    {getResultIcon(result.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-medium text-foreground">{result.title}</span>
                      {result.badge.label !== result.typeLabel ? (
                        <StatusBadge size="xs" tone="neutral" label={result.badge.label} />
                      ) : null}
                      <span className="ml-auto shrink-0 text-meta text-faint-foreground">{result.typeLabel}</span>
                    </span>
                    <span className="block truncate text-meta text-muted-foreground">{result.subtitle}</span>
                    <span className="flex flex-wrap gap-x-3 text-meta text-faint-foreground">
                      {result.metadata.slice(0, 3).map((item) => (
                        <span key={`${result.id}-${item.label}`} className="min-w-0 truncate">
                          {item.label}: {item.value}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {results.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border bg-background px-3.5 py-2 text-meta text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑↓</Kbd>
              {t("keyboardSelect")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Enter</Kbd>
              {t("keyboardOpen")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Esc</Kbd>
              {t("keyboardClose")}
            </span>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function getResultIcon(type: GlobalSearchResult["type"]) {
  if (type === "employee") return <UserRound className="h-4 w-4" />
  if (type === "supplier") return <Store className="h-4 w-4" />
  if (type === "company" || type === "branch") return <Building2 className="h-4 w-4" />
  if (type === "location") return <MapPinned className="h-4 w-4" />
  if (type === "maintenance") return <Wrench className="h-4 w-4" />
  if (type === "audit") return <ClipboardCheck className="h-4 w-4" />
  if (type === "disposal") return <ArchiveX className="h-4 w-4" />
  return <PackageSearch className="h-4 w-4" />
}
