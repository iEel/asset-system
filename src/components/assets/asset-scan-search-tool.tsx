"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, PackageSearch, Search } from "lucide-react"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { buildDirectAssetHrefFromScanValue } from "@/lib/asset-scan-routing"

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  serialNumber: string | null
  status: { label: string; colorCode: string | null }
  meta: { custodian: string | null; location: string; category: string }
}

type AssetScanSearchToolProps = {
  locale: string
  labels: {
    title: string
    subtitle: string
    queryLabel: string
    placeholder: string
    openAsset: string
    noResults: string
    minChars: string
    loading: string
    serial: string
    custodian: string
    scanner: {
      start: string
      stop: string
      title: string
      help: string
      cameraUnsupported: string
      cameraNotFound: string
      cameraError: string
      cameraDevice: string
      cameraDeviceFallback: string
      cameraRear: string
      scanning: string
      scanned: string
    }
  }
}

export function AssetScanSearchTool({ locale, labels }: AssetScanSearchToolProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const trimmedQuery = query.trim()
  const directAssetHref = buildDirectAssetHrefFromScanValue(trimmedQuery, locale)
  const visibleResults = directAssetHref || trimmedQuery.length < 2 ? [] : results

  useEffect(() => {
    if (directAssetHref || trimmedQuery.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}&scope=asset`, {
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
  }, [directAssetHref, locale, trimmedQuery])

  function openAsset(href: string) {
    router.push(href)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-foreground">{labels.title}</h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      <section className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.queryLabel}</span>
          <ScannerTextInput
            value={query}
            onChange={setQuery}
            labels={labels.scanner}
            placeholder={labels.placeholder}
            scanMode="asset-qr"
            inputClassName="h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
      </section>

      {directAssetHref ? (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <button
            type="button"
            onClick={() => openAsset(directAssetHref)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <PackageSearch className="h-4 w-4" />
            {labels.openAsset}
          </button>
        </section>
      ) : trimmedQuery.length < 2 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {labels.minChars}
        </section>
      ) : loading ? (
        <section className="flex items-center gap-2 rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {labels.loading}
        </section>
      ) : visibleResults.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {labels.noResults}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="divide-y divide-border">
            {visibleResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => openAsset(result.href)}
                className="flex w-full min-w-0 gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Search className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-semibold text-foreground">{result.title}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={result.status.colorCode ? { backgroundColor: `${result.status.colorCode}1A`, color: result.status.colorCode } : undefined}
                    >
                      {result.status.label}
                    </span>
                  </span>
                  <span className="mt-1 block break-words text-sm text-foreground">{result.subtitle}</span>
                  <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {result.serialNumber ? <span>{labels.serial}: {result.serialNumber}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {result.meta.location}
                    </span>
                    {result.meta.custodian ? <span>{labels.custodian}: {result.meta.custodian}</span> : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
