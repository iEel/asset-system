"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildDirectAssetHrefFromScanValue } from "@/lib/asset-scan-routing"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { getAssetStateTone } from "@/lib/design-system"

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  serialNumber: string | null
  // name comes from /api/search since plan 2D-1 (D8); it sets the badge tone (M23).
  status: { name?: string | null; label: string; colorCode: string | null }
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
      cameraOpening: string
      torchOn: string
      torchOff: string
      torchUnsupported: string
      zoomCamera: string
      zoomUnsupported: string
    }
  }
}

export function AssetScanSearchTool({ locale, labels }: AssetScanSearchToolProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const scanReturnHref = `/${locale}/asset-management/scan`
  const trimmedQuery = query.trim()
  const directAssetHref = buildDirectAssetHrefFromScanValue(trimmedQuery, locale)
  const visibleResults = directAssetHref || trimmedQuery.length < 2 ? [] : results

  useEffect(() => {
    if (!directAssetHref) return
    router.push(appendReturnTo(directAssetHref, scanReturnHref))
  }, [directAssetHref, router, scanReturnHref])

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
    router.push(appendReturnTo(href, scanReturnHref))
  }

  function handleScannedValue(value: string) {
    const href = buildDirectAssetHrefFromScanValue(value, locale)
    if (href) router.push(appendReturnTo(href, scanReturnHref))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <ContentPanel>
        <Field label={labels.queryLabel}>
          <ScannerTextInput
            id="asset-scan-query"
            value={query}
            onChange={setQuery}
            labels={labels.scanner}
            placeholder={labels.placeholder}
            scanMode="asset-qr"
            onScanSuccess={handleScannedValue}
          />
        </Field>
        {!directAssetHref && trimmedQuery.length < 2 ? <EmptyNote className="mt-2">{labels.minChars}</EmptyNote> : null}
      </ContentPanel>

      {/* Spec 2D D9: a found code is one Button, no tinted box; results are rows of one panel, each a link to the asset. */}
      {directAssetHref ? (
        <div>
          <Button onClick={() => openAsset(directAssetHref)} className="w-full sm:w-auto">
            <PackageSearch aria-hidden="true" />
            {labels.openAsset}
          </Button>
        </div>
      ) : trimmedQuery.length < 2 ? null : (
        <ContentPanel divided flush className="overflow-hidden">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground md:px-5">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              {labels.loading}
            </p>
          ) : visibleResults.length === 0 ? (
            <EmptyNote padded>{labels.noResults}</EmptyNote>
          ) : (
            <ul className="divide-y divide-border-soft">
              {visibleResults.map((result) => (
                <li key={result.id}>
                  <Link
                    href={appendReturnTo(result.href, scanReturnHref)}
                    className="flex min-h-11 w-full min-w-0 gap-3 px-4 py-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tag font-medium text-foreground">{result.title}</span>
                        <StatusBadge label={result.status.label} tone={getAssetStateTone(result.status.name)} />
                      </span>
                      <span className="mt-1 block break-words text-sm text-foreground">{result.subtitle}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground">
                        {result.serialNumber ? <span>{labels.serial}: {result.serialNumber}</span> : null}
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="h-3 w-3" />
                          {result.meta.location}
                        </span>
                        {result.meta.custodian ? <span>{labels.custodian}: {result.meta.custodian}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ContentPanel>
      )}
    </div>
  )
}
