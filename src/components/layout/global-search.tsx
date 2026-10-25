"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  ArchiveX,
  Building2,
  ClipboardCheck,
  Loader2,
  MapPinned,
  PackageSearch,
  Plus,
  ScanLine,
  Search,
  Store,
  UserRound,
  Wrench,
  X,
} from "lucide-react"

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Kbd } from "@/components/ui/kbd"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { globalSearchMinChars, type GlobalSearchResponse, type GlobalSearchResultType } from "@/lib/global-search"
import {
  buildGlobalSearchSections,
  flattenGlobalSearchOptions,
  getGlobalSearchPanelState,
  isGlobalSearchShortcut,
  type GlobalSearchOption,
  type GlobalSearchPanelState,
  type GlobalSearchSection,
} from "@/lib/global-search-panel"
import { addRecentSearch, readRecentSearches, writeRecentSearches, type RecentSearchItem } from "@/lib/global-search-recent"
import { splitSearchHighlight } from "@/lib/search-highlight"
import { cn } from "@/lib/utils"

type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  typeLabel: string
  title: string
  subtitle: string
  href: string
  badge: { label: string; colorCode: string | null }
  metadata: Array<{ label: string; value: string }>
}

type Option = GlobalSearchOption<GlobalSearchResult>

// One search for the whole app (spec §6.5): the top bar's field with its popover on a desktop, and the same field
// and panel inline in the phone's full-height sheet (MobileSearchSheet).
export function GlobalSearch({
  variant = "bar",
  canViewAssets,
  canCreateAssets,
  onNavigate,
}: {
  variant?: "bar" | "sheet"
  canViewAssets: boolean
  canCreateAssets: boolean
  onNavigate?: () => void
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("globalSearch")
  const panelId = useId()
  // The listbox is the combobox's popup: aria-controls names it, and it is the element that scrolls (axe scrollable-region-focusable).
  const listboxId = `${panelId}-listbox`
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [assetTotal, setAssetTotal] = useState<number | null>(null)
  const [settledQuery, setSettledQuery] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  // The sheet mounts only once opened, so its first render is on the client; the bar reads on focus instead.
  const [recent, setRecent] = useState<RecentSearchItem[]>(() =>
    variant === "sheet" ? readRecentSearches(() => window.localStorage, locale) : []
  )
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const trimmedQuery = query.trim()
  const canSearch = trimmedQuery.length >= globalSearchMinChars

  useEffect(() => {
    if (!canSearch) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as Partial<GlobalSearchResponse<GlobalSearchResult>> | null
        if (!response.ok) throw new Error("Search failed")
        const nextResults = payload?.results ?? []
        setResults(nextResults)
        setAssetTotal(payload?.assetTotal ?? null)
        setSettledQuery(trimmedQuery)
        setFailed(false)
        setSelectedIndex(nextResults.length ? 0 : -1)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        // A failed request says so; it never reads as "nothing found".
        setResults([])
        setAssetTotal(null)
        setSettledQuery(trimmedQuery)
        setFailed(true)
        setSelectedIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [canSearch, locale, trimmedQuery])

  // "/" focuses the bar's field from anywhere but a field or a dialog (Review Focus 3). It closes nothing.
  useEffect(() => {
    if (variant !== "bar") return
    function handleShortcut(event: KeyboardEvent) {
      if (!isGlobalSearchShortcut(event, event.target instanceof Element ? event.target : null)) return
      const input = inputRef.current
      if (!input || input.getClientRects().length === 0) return
      event.preventDefault()
      input.focus()
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [variant])

  const showPanel = variant === "sheet" || open
  const state = getGlobalSearchPanelState({ query, settledQuery, resultCount: results.length, failed })
  const sections = buildGlobalSearchSections({
    state,
    // N in "view all in the register (N)" was counted for the settled query, so its link searches that query.
    query: state === "results" && settledQuery ? settledQuery : trimmedQuery,
    locale,
    results,
    assetTotal,
    recent,
    canViewAssets,
    canCreateAssets,
  })
  const options = flattenGlobalSearchOptions(sections)
  const activeIndex = selectedIndex < options.length ? selectedIndex : -1

  function navigate(href: string) {
    router.push(href)
    if (variant === "sheet") {
      onNavigate?.()
      return
    }
    setOpen(false)
    setQuery("")
    setResults([])
    setAssetTotal(null)
    setSettledQuery(null)
    setFailed(false)
    setSelectedIndex(-1)
  }

  function remember(item: RecentSearchItem) {
    const next = addRecentSearch(readRecentSearches(() => window.localStorage, locale), item)
    writeRecentSearches(() => window.localStorage, locale, next)
    setRecent(next)
  }

  function choose(option: Option) {
    if (option.kind === "result") {
      remember({ type: option.result.type, title: option.result.title, href: option.result.href })
      navigate(option.result.href)
    } else if (option.kind === "recent") {
      remember(option.item)
      navigate(option.item.href)
    } else if (option.kind === "clearRecent") {
      writeRecentSearches(() => window.localStorage, locale, [])
      setRecent([])
      setSelectedIndex(-1)
    } else {
      navigate(option.href)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (value.trim().length < globalSearchMinChars) {
      setResults([])
      setAssetTotal(null)
      setSettledQuery(null)
      setFailed(false)
      setLoading(false)
      setSelectedIndex(-1)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      // The phone sheet closes on Escape through Radix.
      if (variant === "bar") setOpen(false)
      return
    }

    const n = options.length
    if (!showPanel || n === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((i) => (i + 1) % n)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((i) => (i <= 0 ? n - 1 : i - 1))
      return
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault()
      choose(options[activeIndex])
    }
  }

  const field = (
    <div ref={anchorRef} className={cn(variant === "bar" ? "relative hidden w-[min(28rem,36vw)] min-w-0 max-w-full lg:block" : "relative w-full")}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => {
          setOpen(true)
          if (variant === "bar") setRecent(readRecentSearches(() => window.localStorage, locale))
        }}
        onKeyDown={handleKeyDown}
        placeholder={t("placeholder")}
        className={cn("h-9 w-full min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring [&::-webkit-search-cancel-button]:appearance-none", variant === "sheet" && "h-11 text-base")}
        role="combobox"
        aria-label={t("label")}
        aria-expanded={showPanel}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={showPanel && activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined}
        aria-keyshortcuts="/"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setResults([])
              setAssetTotal(null)
              setSettledQuery(null)
              setFailed(false)
              setSelectedIndex(-1)
              if (variant === "bar") setOpen(false)
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t("clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : variant === "bar" ? (
          <Kbd aria-hidden="true">/</Kbd>
        ) : null}
      </div>
    </div>
  )

  const panel = (
    <GlobalSearchPanel
      panelId={panelId}
      listboxId={listboxId}
      variant={variant}
      state={state}
      query={trimmedQuery}
      sections={sections}
      options={options}
      activeIndex={activeIndex}
      onHover={setSelectedIndex}
      onChoose={choose}
    />
  )

  if (variant === "sheet") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {field}
        <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
      </div>
    )
  }

  return (
    <Popover
      open={showPanel}
      onOpenChange={(next) => {
        if (!next) setOpen(false)
      }}
    >
      <PopoverAnchor asChild>{field}</PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
        className="w-[min(36rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        {panel}
      </PopoverContent>
    </Popover>
  )
}

function GlobalSearchPanel({
  panelId,
  listboxId,
  variant,
  state,
  query,
  sections,
  options,
  activeIndex,
  onHover,
  onChoose,
}: {
  panelId: string
  listboxId: string
  variant: "bar" | "sheet"
  state: GlobalSearchPanelState
  query: string
  sections: GlobalSearchSection<GlobalSearchResult>[]
  options: Option[]
  activeIndex: number
  onHover: (index: number) => void
  onChoose: (option: Option) => void
}) {
  const t = useTranslations("globalSearch")
  const indexByKey = new Map(options.map((option, index) => [option.key, index]))

  return (
    <div id={panelId} className={cn(variant === "sheet" && "flex min-h-0 flex-1 flex-col")}>
      {state === "hint" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm text-muted-foreground">
          <span>{t("emptyHint")}</span>
          {variant === "bar" ? (
            <span className="inline-flex items-center gap-1.5 text-meta">
              <Kbd>/</Kbd> {t("keyboardFocus")}
            </span>
          ) : null}
        </div>
      ) : state === "minChars" ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">{t("minChars")}</div>
      ) : state === "loading" ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          {t("loading")}
        </div>
      ) : state === "error" ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">{t("failed")}</div>
      ) : state === "notFound" ? (
        <div className="px-4 py-3 text-sm">
          <p id={`${panelId}-group-notFound`} className="font-medium text-foreground">
            {t("notFound", { query })}
          </p>
          <p className="text-meta text-muted-foreground">{t("notFoundHint")}</p>
        </div>
      ) : null}
      {/* The listbox scrolls itself: capped in the bar, and in the phone sheet it takes the rest of the height. */}
      {sections.length > 0 ? (
        <ul
          role="listbox"
          id={listboxId}
          aria-label={t("label")}
          className={variant === "bar" ? "grid max-h-100 gap-px overflow-y-auto p-1.5" : "grid min-h-0 flex-1 content-start gap-px overflow-y-auto p-1.5"}
        >
          {sections.map((section) => (
            <li key={section.id} role="presentation">
              {section.id === "notFound" ? null : (
                <div id={`${panelId}-group-${section.id}`} className="px-2.5 pt-2 pb-1 text-meta font-medium text-faint-foreground">
                  {section.id === "recent" ? t("recentTitle") : t(`group_${section.id}`)}
                </div>
              )}
              <ul role="group" aria-labelledby={`${panelId}-group-${section.id}`} className="grid gap-px">
                {section.options.map((option) => {
                  const index = indexByKey.get(option.key) ?? -1
                  const selected = index === activeIndex
                  return (
                    <li
                      key={option.key}
                      id={`${panelId}-option-${index}`}
                      role="option"
                      aria-selected={selected}
                      aria-label={option.kind === "clearRecent" ? t("recentClearLabel") : undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => onHover(index)}
                      onClick={() => onChoose(option)}
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-control px-2.5 py-1.5 text-left",
                        selected && "bg-primary-soft",
                      )}
                    >
                      <GlobalSearchOptionContent option={option} query={query} />
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Keyboard hints only beside a keyboard: the phone sheet leaves them out. */}
      {variant === "bar" && options.length > 0 ? (
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
    </div>
  )
}

function GlobalSearchOptionContent({ option, query }: { option: Option; query: string }) {
  const t = useTranslations("globalSearch")

  if (option.kind === "result") {
    const result = option.result
    return (
      <>
        <span className="mt-[3px] flex size-4 shrink-0 text-muted-foreground">{getResultIcon(result.type)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate font-medium text-foreground">
              <Highlight value={result.title} term={query} />
            </span>
            {result.badge.label !== result.typeLabel ? <StatusBadge tone="neutral" label={result.badge.label} /> : null}
          </span>
          <span className="block truncate text-meta text-muted-foreground">
            <Highlight value={result.subtitle} term={query} />
          </span>
          <span className="flex flex-wrap gap-x-3 text-meta text-faint-foreground">
            {result.metadata.slice(0, 3).map((item) => (
              <span key={`${result.id}-${item.label}`} className="min-w-0 truncate">
                {item.label}: {item.value}
              </span>
            ))}
          </span>
        </span>
      </>
    )
  }

  if (option.kind === "registerAll") {
    return (
      <>
        <span className="mt-[3px] flex size-4 shrink-0 text-primary">
          <PackageSearch className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 font-medium text-primary">
          {t("viewAllInRegister", { count: formatCount(option.count) })}
        </span>
      </>
    )
  }

  if (option.kind === "recent") {
    return (
      <>
        <span className="mt-[3px] flex size-4 shrink-0 text-muted-foreground">{getResultIcon(option.item.type)}</span>
        <span className="min-w-0 flex-1 truncate text-foreground">{option.item.title}</span>
        <span className="shrink-0 text-meta text-faint-foreground">{t(`group_${option.item.type}`)}</span>
      </>
    )
  }

  if (option.kind === "clearRecent") {
    return <span className="ml-auto shrink-0 text-meta text-muted-foreground">{t("recentClear")}</span>
  }

  const action = {
    scan: { icon: <ScanLine className="h-4 w-4" />, label: t("actionScan") },
    registerFilters: { icon: <PackageSearch className="h-4 w-4" />, label: t("actionRegister") },
    createAsset: { icon: <Plus className="h-4 w-4" />, label: t("actionCreateAsset") },
  }[option.key]
  return (
    <>
      <span className="mt-[3px] flex size-4 shrink-0 text-muted-foreground">{action.icon}</span>
      <span className="min-w-0 flex-1 text-foreground">{action.label}</span>
    </>
  )
}

function Highlight({ value, term }: { value: string; term: string }) {
  const parts = splitSearchHighlight(value, term)
  if (!parts) return <>{value}</>
  return (
    <>
      {parts[0]}
      <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{parts[1]}</mark>
      {parts[2]}
    </>
  )
}

function getResultIcon(type: GlobalSearchResultType) {
  if (type === "employee") return <UserRound className="h-4 w-4" />
  if (type === "supplier") return <Store className="h-4 w-4" />
  if (type === "company" || type === "branch") return <Building2 className="h-4 w-4" />
  if (type === "location") return <MapPinned className="h-4 w-4" />
  if (type === "maintenance") return <Wrench className="h-4 w-4" />
  if (type === "audit") return <ClipboardCheck className="h-4 w-4" />
  if (type === "disposal") return <ArchiveX className="h-4 w-4" />
  return <PackageSearch className="h-4 w-4" />
}
