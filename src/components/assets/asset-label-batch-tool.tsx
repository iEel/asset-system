"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ArrowDownAZ, Check, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"

type SelectOption = {
  id: string
  label: string
  companyId?: string
  branchId?: string
  branchLabel?: string
  shortLabel?: string
}

type LabelPrintInfo = {
  count: number
  batchId: string | null
  tapeSize: string | null
  printedAt: string | null
  printedBy: string | null
}

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  serialNumber: string | null
  createdAt?: string | null
  labelPrint?: LabelPrintInfo
  status: { name?: string | null; label: string; colorCode: string | null }
  meta: {
    custodian: string | null
    company?: string
    branch?: string
    location: string
    category: string
  }
}

type QueueMode = "unprinted" | "printed" | "recent"
type QueueSort = "created_desc" | "asset_tag" | "location" | "category"
type SelectedSort = "manual" | "asset_tag" | "location" | "category"

type QueueFilters = {
  mode: QueueMode
  sort: QueueSort
  companyId: string
  branchId: string
  categoryId: string
  locationId: string
  createdFrom: string
  createdTo: string
}

type AssetLabelBatchToolProps = {
  locale: string
  preselectedAssets?: SearchResult[]
  filterOptions: {
    companies: SelectOption[]
    branches: SelectOption[]
    categories: SelectOption[]
    locations: SelectOption[]
  }
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
    recentQueueTitle: string
    recentQueueHelp: string
    addFilteredQueue: string
    addFilteredQueueUnavailable: string
    recentQueueEmpty: string
    all: string
    queueScopeTitle: string
    queueScopeHelp: string
    queueScopeCompany: string
    queueScopeBranch: string
    queueScopeLocation: string
    queueScopeAll: string
    labelQueueFiltersTitle: string
    queueModeLabel: string
    queueModeUnprinted: string
    queueModePrinted: string
    queueModeRecent: string
    queueFilterCompany: string
    queueFilterBranch: string
    queueFilterCategory: string
    queueFilterLocation: string
    queueFilterCreatedFrom: string
    queueFilterCreatedTo: string
    queueSortLabel: string
    queueSortNewest: string
    queueSortAssetTag: string
    queueSortLocation: string
    queueSortCategory: string
    resetQueueFilters: string
    loadMoreQueue: string
    selectedSortLabel: string
    selectedSortManual: string
    printFirstLabel: string
    labelPrintedBadge: string
    labelUnprintedBadge: string
  }
}

const defaultQueueFilters: QueueFilters = {
  mode: "unprinted",
  sort: "created_desc",
  companyId: "all",
  branchId: "all",
  categoryId: "all",
  locationId: "all",
  createdFrom: "",
  createdTo: "",
}

export function AssetLabelBatchTool({ locale, labels, preselectedAssets = [], filterOptions }: AssetLabelBatchToolProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentAssets, setRecentAssets] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult[]>(() => preselectedAssets)
  const [queueFilters, setQueueFilters] = useState<QueueFilters>(defaultQueueFilters)
  const [queuePageSize, setQueuePageSize] = useState(20)
  const [selectedSort, setSelectedSort] = useState<SelectedSort>("manual")
  const [loading, setLoading] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const trimmedQuery = query.trim()
  const visibleResults = trimmedQuery.length < 2 ? [] : results
  const selectedIds = useMemo(() => new Set(selected.map((asset) => asset.id)), [selected])
  const selectedForPrint = useMemo(() => sortSelectedAssets(selected, selectedSort), [selected, selectedSort])
  const queueRequestUrl = useMemo(
    () => buildQueueRequestUrl(locale, queuePageSize, queueFilters),
    [locale, queuePageSize, queueFilters]
  )
  const filteredBranchOptions = useMemo(
    () => queueFilters.companyId === "all"
      ? filterOptions.branches
      : filterOptions.branches.filter((branch) => branch.companyId === queueFilters.companyId),
    [filterOptions.branches, queueFilters.companyId]
  )
  const filteredLocationOptions = useMemo(
    () => filterOptions.locations
      .filter((location) => {
        if (queueFilters.branchId !== "all") return location.branchId === queueFilters.branchId
        if (queueFilters.companyId !== "all") return location.companyId === queueFilters.companyId
        return true
      })
      .map((location) => ({
        ...location,
        label: getLocationOptionLabel(location, queueFilters.companyId, queueFilters.branchId),
      })),
    [filterOptions.locations, queueFilters.branchId, queueFilters.companyId]
  )
  const queueScopeSummary = useMemo(
    () => getQueueScopeSummary(queueFilters, filterOptions, labels),
    [filterOptions, labels, queueFilters]
  )
  const canLoadMoreQueue = recentAssets.length >= queuePageSize && queuePageSize < 100

  useEffect(() => {
    if (trimmedQuery.length < 2) return

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
  }, [locale, trimmedQuery])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRecentAssets() {
      setQueueLoading(true)
      try {
        const response = await fetch(queueRequestUrl, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as { data?: AssetApiRow[] } | null
        if (!response.ok) throw new Error("Queue failed")
        setRecentAssets((payload?.data ?? []).map((asset) => toSearchResult(asset, locale)))
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setRecentAssets([])
      } finally {
        setQueueLoading(false)
      }
    }

    void loadRecentAssets()

    return () => {
      controller.abort()
    }
  }, [locale, queueRequestUrl])

  function addAsset(asset: SearchResult) {
    setSelected((current) => current.some((item) => item.id === asset.id) ? current : [...current, asset])
  }

  function removeAsset(id: string) {
    setSelected((current) => current.filter((asset) => asset.id !== id))
  }

  function addRecentAssets() {
    // Nothing in this scope is a prerequisite, not a field: the button waits and the line beside it says why (spec §4.4,
    // v-track final task 2). Enter or Space on it still reaches here.
    if (recentAssets.length === 0) return
    setSelected((current) => mergeSelectedAssets(current, recentAssets))
  }

  function printLabels() {
    if (selectedForPrint.length === 0) return
    window.open(buildPrintUrl(locale, selectedForPrint), "_blank", "noopener,noreferrer")
  }

  function printFirstLabel() {
    const [firstAsset] = selectedForPrint
    if (!firstAsset) return
    window.open(buildPrintUrl(locale, [firstAsset]), "_blank", "noopener,noreferrer")
  }

  function loadMoreQueue() {
    setQueuePageSize((current) => Math.min(current + 20, 100))
  }

  function updateQueueFilter<Key extends keyof QueueFilters>(key: Key, value: QueueFilters[Key]) {
    setQueuePageSize(20)
    setQueueFilters((current) => ({ ...current, [key]: value }))
  }

  function changeCompanyFilter(companyId: string) {
    updateQueueFilter("companyId", companyId)
    const nextBranchId = queueFilters.branchId !== "all" &&
      companyId !== "all" &&
      !filterOptions.branches.some((branch) => branch.id === queueFilters.branchId && branch.companyId === companyId)
        ? "all"
        : queueFilters.branchId
    if (
      queueFilters.branchId !== "all" &&
      companyId !== "all" &&
      !filterOptions.branches.some((branch) => branch.id === queueFilters.branchId && branch.companyId === companyId)
    ) {
      updateQueueFilter("branchId", "all")
    }
    if (!isLocationInScope(filterOptions.locations, queueFilters.locationId, companyId, nextBranchId)) {
      updateQueueFilter("locationId", "all")
    }
  }

  function changeBranchFilter(branchId: string) {
    updateQueueFilter("branchId", branchId)
    if (!isLocationInScope(filterOptions.locations, queueFilters.locationId, queueFilters.companyId, branchId)) {
      updateQueueFilter("locationId", "all")
    }
  }

  function resetQueueFilters() {
    setQueuePageSize(20)
    setQueueFilters(defaultQueueFilters)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 overflow-x-hidden">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <ContentPanel>
            <Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}>
              <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchPlaceholder} />
            </Field>

            {trimmedQuery.length >= 2 ? (
              <div className="mt-3 overflow-hidden rounded-md border border-border">
                {loading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    {labels.loading}
                  </div>
                ) : visibleResults.length === 0 ? (
                  <EmptyNote padded>{labels.noResults}</EmptyNote>
                ) : (
                  // The result and queue rows stay list buttons (plan 2D-3 R5): two lines of text that add to the print list.
                  // An added row keeps the shared disabled look (no opacity) and shows a check instead of the plus.
                  <div className="divide-y divide-border-soft">
                    {visibleResults.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={selectedIds.has(asset.id)}
                        onClick={() => addAsset(asset)}
                        className="flex min-h-11 w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:bg-background"
                      >
                        <span aria-hidden="true" className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
                          {selectedIds.has(asset.id) ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </span>
                        <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </ContentPanel>

          <ContentPanel title={labels.recentQueueTitle} description={labels.recentQueueHelp}>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{labels.queueScopeTitle}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Chip>{queueScopeSummary.label}</Chip>
                    <span className="min-w-0 break-words text-foreground">{queueScopeSummary.detail}</span>
                  </div>
                  {queueScopeSummary.detail !== labels.queueScopeHelp ? (
                    <p className="mt-1 text-meta text-muted-foreground">{labels.queueScopeHelp}</p>
                  ) : null}
                  {recentAssets.length === 0 ? (
                    <p id="asset-label-add-filtered-reason" className="mt-1 text-meta text-muted-foreground">
                      {labels.addFilteredQueueUnavailable}
                    </p>
                  ) : null}
                </div>
                <Button
                  aria-disabled={recentAssets.length === 0 || undefined}
                  aria-describedby={recentAssets.length === 0 ? "asset-label-add-filtered-reason" : undefined}
                  onClick={addRecentAssets}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Plus aria-hidden="true" />
                  {labels.addFilteredQueue}
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  {labels.labelQueueFiltersTitle}
                </div>
                <Button variant="outline" onClick={resetQueueFilters}>
                  <RotateCcw aria-hidden="true" />
                  {labels.resetQueueFilters}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <QueueSelect
                  label={labels.queueModeLabel}
                  value={queueFilters.mode}
                  onChange={(value) => updateQueueFilter("mode", value as QueueMode)}
                  options={[
                    { id: "unprinted", label: labels.queueModeUnprinted },
                    { id: "printed", label: labels.queueModePrinted },
                    { id: "recent", label: labels.queueModeRecent },
                  ]}
                />
                <QueueSelect
                  label={labels.queueSortLabel}
                  value={queueFilters.sort}
                  onChange={(value) => updateQueueFilter("sort", value as QueueSort)}
                  options={queueSortOptions(labels)}
                />
                <QueueSelect
                  label={labels.queueFilterCompany}
                  value={queueFilters.companyId}
                  onChange={changeCompanyFilter}
                  options={filterOptions.companies}
                  allLabel={labels.all}
                />
                <QueueSelect
                  label={labels.queueFilterBranch}
                  value={queueFilters.branchId}
                  onChange={changeBranchFilter}
                  options={filteredBranchOptions}
                  allLabel={labels.all}
                />
                <QueueSelect
                  label={labels.queueFilterCategory}
                  value={queueFilters.categoryId}
                  onChange={(value) => updateQueueFilter("categoryId", value)}
                  options={filterOptions.categories}
                  allLabel={labels.all}
                />
                <QueueSelect
                  label={labels.queueFilterLocation}
                  value={queueFilters.locationId}
                  onChange={(value) => updateQueueFilter("locationId", value)}
                  options={filteredLocationOptions}
                  allLabel={labels.all}
                />
                {/* A filter, not a form: the end cannot be picked before the start (spec U4, §7.4), like the disposal list. */}
                <Field label={labels.queueFilterCreatedFrom}>
                  <Input
                    type="date"
                    value={queueFilters.createdFrom}
                    max={queueFilters.createdTo || undefined}
                    onChange={(event) => updateQueueFilter("createdFrom", event.target.value)}
                  />
                </Field>
                <Field label={labels.queueFilterCreatedTo}>
                  <Input
                    type="date"
                    value={queueFilters.createdTo}
                    min={queueFilters.createdFrom || undefined}
                    onChange={(event) => updateQueueFilter("createdTo", event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-border">
              {queueLoading ? (
                <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  {labels.loading}
                </div>
              ) : recentAssets.length === 0 ? (
                <EmptyNote padded>{labels.recentQueueEmpty}</EmptyNote>
              ) : (
                <div className="max-h-[32rem] divide-y divide-border-soft overflow-y-auto">
                  {recentAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={selectedIds.has(asset.id)}
                      onClick={() => addAsset(asset)}
                      className="flex min-h-11 w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:bg-background"
                    >
                      {selectedIds.has(asset.id) ? (
                        <Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Plus aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} compact />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {canLoadMoreQueue ? (
              <Button variant="outline" onClick={loadMoreQueue} className="mt-3 w-full">
                {labels.loadMoreQueue}
              </Button>
            ) : null}
          </ContentPanel>
        </div>

        <ContentPanel
          title={labels.selectedTitle}
          description={`${formatCount(selected.length)} ${labels.selectedCount}`}
          className="xl:sticky xl:top-20 xl:self-start"
        >
          <div className="mb-4 flex flex-col gap-3">
            <QueueSelect
              label={labels.selectedSortLabel}
              value={selectedSort}
              onChange={(value) => setSelectedSort(value as SelectedSort)}
              options={[
                { id: "manual", label: labels.selectedSortManual },
                { id: "asset_tag", label: labels.queueSortAssetTag },
                { id: "location", label: labels.queueSortLocation },
                { id: "category", label: labels.queueSortCategory },
              ]}
              icon={<ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-primary" />}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button
                variant="outline"
                aria-disabled={selectedForPrint.length === 0 || undefined}
                aria-describedby={selectedForPrint.length === 0 ? "asset-label-print-reason" : undefined}
                onClick={printFirstLabel}
                className="w-full"
              >
                <Printer aria-hidden="true" />
                {labels.printFirstLabel}
              </Button>
              <Button
                aria-disabled={selectedForPrint.length === 0 || undefined}
                aria-describedby={selectedForPrint.length === 0 ? "asset-label-print-reason" : undefined}
                onClick={printLabels}
                className="w-full"
              >
                <Printer aria-hidden="true" />
                {labels.print}
              </Button>
            </div>
          </div>

          {selectedForPrint.length === 0 ? (
            <EmptyNote id="asset-label-print-reason">{labels.noSelected}</EmptyNote>
          ) : (
            <div className="max-h-[44rem] space-y-2 overflow-y-auto pr-1">
              {selectedForPrint.map((asset) => (
                <div key={asset.id} className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} compact />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => removeAsset(asset.id)}
                    className="shrink-0"
                    title={labels.remove}
                    aria-label={labels.remove}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ContentPanel>
      </div>
    </div>
  )
}

type AssetApiRow = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  createdAt?: string | null
  company: { code: string; nameTh: string; nameEn?: string | null } | null
  branch: { code: string; name: string } | null
  category: { code: string; name: string } | null
  brand: { name: string } | null
  model: { name: string } | null
  currentLocation: { code: string; name: string } | null
  custodian: { code: string; fullNameTh: string } | null
  status: { name: string; nameTh: string; colorCode: string | null } | null
  labelPrint?: LabelPrintInfo
}

function toSearchResult(asset: AssetApiRow, locale: string): SearchResult {
  const category = asset.category ? `${asset.category.code} - ${asset.category.name}` : "-"

  return {
    id: asset.id,
    title: asset.assetTag,
    subtitle: buildAssetLabelSubtitle(asset, category),
    href: `/${locale}/assets/${asset.id}`,
    serialNumber: asset.serialNumber,
    createdAt: asset.createdAt ?? null,
    labelPrint: asset.labelPrint,
    status: {
      name: asset.status?.name ?? null,
      label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
      colorCode: asset.status?.colorCode ?? null,
    },
    meta: {
      custodian: asset.custodian?.fullNameTh ?? null,
      company: asset.company ? `${asset.company.code} - ${locale === "th" ? asset.company.nameTh : asset.company.nameEn ?? asset.company.nameTh}` : "-",
      branch: asset.branch ? `${asset.branch.code} - ${asset.branch.name}` : "-",
      location: asset.currentLocation ? `${asset.currentLocation.code} - ${asset.currentLocation.name}` : "-",
      category,
    },
  }
}

function mergeSelectedAssets(current: SearchResult[], assets: SearchResult[]) {
  const selectedIds = new Set(current.map((asset) => asset.id))
  const next = [...current]
  for (const asset of assets) {
    if (!selectedIds.has(asset.id)) {
      next.push(asset)
      selectedIds.add(asset.id)
    }
  }
  return next
}

function buildPrintUrl(locale: string, assets: SearchResult[]) {
  const params = new URLSearchParams()
  assets.forEach((asset) => params.append("id", asset.id))
  return `/${locale}/assets/labels?${params.toString()}`
}

function buildQueueRequestUrl(locale: string, pageSize: number, filters: QueueFilters) {
  const params = new URLSearchParams({
    mode: filters.mode,
    pageSize: String(pageSize),
    locale,
    sort: filters.sort,
  })
  appendFilterParam(params, "companyId", filters.companyId)
  appendFilterParam(params, "branchId", filters.branchId)
  appendFilterParam(params, "categoryId", filters.categoryId)
  appendFilterParam(params, "locationId", filters.locationId)
  appendFilterParam(params, "createdFrom", filters.createdFrom)
  appendFilterParam(params, "createdTo", filters.createdTo)
  return `/api/assets/label-prints?${params.toString()}`
}

function appendFilterParam(params: URLSearchParams, key: string, value: string) {
  if (value && value !== "all") params.set(key, value)
}

function sortSelectedAssets(assets: SearchResult[], selectedSort: SelectedSort) {
  if (selectedSort === "manual") return assets

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
  return [...assets].sort((left, right) => {
    const leftValue = selectedSort === "asset_tag" ? left.title : selectedSort === "location" ? left.meta.location : left.meta.category
    const rightValue = selectedSort === "asset_tag" ? right.title : selectedSort === "location" ? right.meta.location : right.meta.category
    return collator.compare(leftValue, rightValue) || collator.compare(left.title, right.title)
  })
}

function queueSortOptions(labels: AssetLabelBatchToolProps["labels"]): SelectOption[] {
  return [
    { id: "created_desc", label: labels.queueSortNewest },
    { id: "asset_tag", label: labels.queueSortAssetTag },
    { id: "location", label: labels.queueSortLocation },
    { id: "category", label: labels.queueSortCategory },
  ]
}

function getQueueScopeSummary(
  filters: QueueFilters,
  options: AssetLabelBatchToolProps["filterOptions"],
  labels: AssetLabelBatchToolProps["labels"]
) {
  if (filters.locationId !== "all") {
    const location = options.locations.find((item) => item.id === filters.locationId)
    return {
      label: labels.queueScopeLocation,
      detail: location ? getLocationOptionLabel(location, filters.companyId, filters.branchId) : labels.queueScopeAll,
    }
  }

  if (filters.branchId !== "all") {
    const branch = options.branches.find((item) => item.id === filters.branchId)
    return {
      label: labels.queueScopeBranch,
      detail: branch?.label ?? labels.queueScopeAll,
    }
  }

  if (filters.companyId !== "all") {
    const company = options.companies.find((item) => item.id === filters.companyId)
    return {
      label: labels.queueScopeCompany,
      detail: company?.label ?? labels.queueScopeAll,
    }
  }

  return {
    label: labels.queueScopeAll,
    detail: labels.queueScopeHelp,
  }
}

function getLocationOptionLabel(location: SelectOption, companyId: string, branchId: string) {
  const shortLabel = location.shortLabel ?? location.label
  if (branchId !== "all") return shortLabel
  if (companyId !== "all") {
    return location.branchLabel ? `${location.branchLabel} / ${shortLabel}` : shortLabel
  }
  return location.label
}

function isLocationInScope(locations: SelectOption[], locationId: string, companyId: string, branchId: string) {
  if (locationId === "all") return true
  const location = locations.find((item) => item.id === locationId)
  if (!location) return false
  if (branchId !== "all") return location.branchId === branchId
  if (companyId !== "all") return location.companyId === companyId
  return true
}

function QueueSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  allLabel?: string
  icon?: ReactNode
}) {
  return (
    <Field label={icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}>
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel ? <option value="all">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

function AssetLabelSearchResult({
  asset,
  serialLabel,
  printLabels,
  compact,
}: {
  asset: SearchResult
  serialLabel: string
  printLabels: Pick<AssetLabelBatchToolProps["labels"], "labelPrintedBadge" | "labelUnprintedBadge">
  compact?: boolean
}) {
  const printCount = asset.labelPrint ? asset.labelPrint.count : 0
  const printBadge = printCount > 0
    ? printLabels.labelPrintedBadge.replace("COUNT", formatCount(printCount))
    : printLabels.labelUnprintedBadge

  // Spec 2D M23: the state is the shared StatusBadge toned from status.name; database colors are not shown.
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="tag font-medium text-foreground">{asset.title}</span>
        {!compact ? <StatusBadge label={asset.status.label} tone={getAssetStateTone(asset.status.name)} /> : null}
        <StatusBadge label={printBadge} tone={printCount > 0 ? "success" : "muted"} />
      </span>
      <span className="mt-1 block break-words text-sm text-foreground">{asset.subtitle}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground">
        {asset.serialNumber ? <span className="break-all">{serialLabel}: {asset.serialNumber}</span> : null}
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin aria-hidden="true" className="h-3 w-3" />
          <span className="break-words">{asset.meta.location}</span>
        </span>
      </span>
    </span>
  )
}
