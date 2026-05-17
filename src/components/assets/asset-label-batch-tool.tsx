"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MapPin, Plus, Printer, Search, X } from "lucide-react"

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  serialNumber: string | null
  status: { label: string; colorCode: string | null }
  meta: { custodian: string | null; location: string; category: string }
}

type AssetLabelBatchToolProps = {
  locale: string
  labels: {
    title: string
    subtitle: string
    searchLabel: string
    searchPlaceholder: string
    selectedTitle: string
    selectedCount: string
    print: string
    remove: string
    noSelected: string
    noResults: string
    minChars: string
    loading: string
    serial: string
  }
}

export function AssetLabelBatchTool({ locale, labels }: AssetLabelBatchToolProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const trimmedQuery = query.trim()
  const visibleResults = trimmedQuery.length < 2 ? [] : results
  const selectedIds = useMemo(() => new Set(selected.map((asset) => asset.id)), [selected])

  useEffect(() => {
    if (trimmedQuery.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as { results?: SearchResult[] } | null
        if (!response.ok) throw new Error("Search failed")
        setResults(payload?.results ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [locale, trimmedQuery])

  function addAsset(asset: SearchResult) {
    setSelected((current) => current.some((item) => item.id === asset.id) ? current : [...current, asset])
  }

  function removeAsset(id: string) {
    setSelected((current) => current.filter((asset) => asset.id !== id))
  }

  function printLabels() {
    if (selected.length === 0) return
    const params = new URLSearchParams()
    selected.forEach((asset) => params.append("id", asset.id))
    window.open(`/${locale}/assets/labels?${params.toString()}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.searchLabel}</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </label>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            {trimmedQuery.length < 2 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{labels.minChars}</div>
            ) : loading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.loading}
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{labels.noResults}</div>
            ) : (
              <div className="divide-y divide-border">
                {visibleResults.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={selectedIds.has(asset.id)}
                    onClick={() => addAsset(asset)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Plus className="h-4 w-4" />
                    </span>
                    <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{labels.selectedTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.length} {labels.selectedCount}</p>
            </div>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={printLabels}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {labels.print}
            </button>
          </div>

          {selected.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {labels.noSelected}
            </div>
          ) : (
            <div className="space-y-2">
              {selected.map((asset) => (
                <div key={asset.id} className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} compact />
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-danger hover:text-danger"
                    title={labels.remove}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function AssetLabelSearchResult({
  asset,
  serialLabel,
  compact,
}: {
  asset: SearchResult
  serialLabel: string
  compact?: boolean
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">{asset.title}</span>
        {!compact ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={asset.status.colorCode ? { backgroundColor: `${asset.status.colorCode}1A`, color: asset.status.colorCode } : undefined}
          >
            {asset.status.label}
          </span>
        ) : null}
      </span>
      <span className="mt-1 block text-sm text-foreground">{asset.subtitle}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {asset.serialNumber ? <span>{serialLabel}: {asset.serialNumber}</span> : null}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {asset.meta.location}
        </span>
      </span>
    </span>
  )
}
