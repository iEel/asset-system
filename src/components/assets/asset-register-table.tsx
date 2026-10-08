"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Download, Edit, Loader2, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn, formatCurrency } from "@/lib/utils"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { rememberAssetRegisterScrollPosition } from "@/lib/asset-register-view-memory"
import type { AssetActivityFilter } from "@/lib/asset-activity-filter"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import { AssetRegisterMobileList } from "@/components/assets/asset-register-mobile-list"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { AssetRegisterSortMenu } from "@/components/assets/asset-register-sort-menu"
import { AssetRegisterColumnPicker } from "@/components/assets/asset-register-column-picker"
import { AssetRegisterExportMenu } from "@/components/assets/asset-register-export-menu"
import { Pagination } from "@/components/ui/pagination"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import type { AssetRegisterTransaction } from "@/lib/asset-operation-policy"
import { getAssetStateTone, getDesktopTableOnlyClasses } from "@/lib/design-system"
import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
  assetRegisterColumnWidths,
  getAssetRegisterTableMinWidth,
  assetRegisterColumnStorageKey,
  normalizeAssetRegisterColumns,
  type AssetRegisterColumnKey,
  type AssetRegisterColumnPresetKey,
} from "@/lib/asset-register-columns"
import { useApiError } from "@/components/ui/use-api-error"

export type AssetRegisterRow = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  category: string
  companyBranch: string
  currentLocation: string
  custodian: string | null
  ownershipType: { value: string; label: string }
  status: { value: string; label: string }
  condition: { value: string; label: string }
  purchasePrice: number | null
  photo: { id: string; alt: string; fileType: string } | null
  transactions: Array<AssetRegisterTransaction & { href: string }>
}

type AssetRegisterTableProps = {
  locale: string
  assets: AssetRegisterRow[]
  filters: {
    search: string
    companyId: string
    branchId: string
    categoryId: string
    brandId: string
    modelId: string
    statusId: string
    conditionId: string
    ownershipType: string
    custodianId: string
    supplierId: string
    dataQuality: "" | AssetDataQualityFilter
    crossScope: "" | AssetCrossScopeFilter
    activity: AssetActivityFilter
    page: number
    pageSize: number
    sort: string
    direction: string
  }
  total: number
  totalPages: number
  fromRow: number
  toRow: number
  bulkOptions: {
    locations: { id: string; label: string }[]
    employees: { id: string; label: string }[]
  }
  permissions: AssetRegisterRowPermissions
  labels: {
    actions: string
    all: string
    condition: string
    category: string
    company: string
    currentLocation: string
    custodian: string
    ownershipType: string
    detail: string
    exportSelected: string
    bulkActions: string
    bulkUpdate: string
    bulkUpdateTitle: string
    bulkUpdateDescription: string
    clearSelection: string
    noChange: string
    reason: string
    remark: string
    applyBulkUpdate: string
    bulkUpdateSuccess: string
    bulkUpdateFailed: string
    cancel: string
    close: string
    printSelectedLabels: string
    noResultsTitle: string
    noResultsDescription: string
    noAssetsTitle: string
    noAssetsDescription: string
    clearAllFilters: string
    previous: string
    purchasePrice: string
    selectedCount: string
    assetName: string
    assetTag: string
    tableScrollHint: string
    next: string
    status: string
    statusHelpTitle: string
    statusHelpDescription: string
    statusHelpReady: string
    statusHelpPendingRepair: string
    statusHelpUnderMaintenance: string
    statusHelpPendingDisposal: string
    statusHelpLostMissing: string
    statusHelpUnderInspection: string
    conditionHelpTitle: string
    conditionHelpDescription: string
    conditionHelpGood: string
    conditionHelpDamaged: string
    conditionHelpNeedsReview: string
    conditionHelpMissing: string
  }
}

const assetRegisterStickyFirstColumnClasses = "sticky left-0"
const assetRegisterStickyActionsColumnClasses = "sticky right-0"
const assetRegisterStickyHeaderColumnClasses = "z-30 bg-muted"
const assetRegisterStickyBodyColumnClasses = "z-20 bg-surface group-hover:bg-accent/50 group-focus:bg-accent/50"
const assetRegisterActionsShadowClasses = "shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.25)]"
const cellClasses = "px-3 py-2"
const headerClasses = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground"

export function AssetRegisterTable({
  locale,
  assets,
  filters,
  total,
  totalPages,
  fromRow,
  toRow,
  bulkOptions,
  permissions,
  labels,
}: AssetRegisterTableProps) {
  const t = useTranslations("asset")
  const apiError = useApiError()
  const tCommon = useTranslations("common")
  const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"
  const { isPending } = useAssetRegisterNavigation()
  const rangeLabel = t("registerRange", {
    from: fromRow.toLocaleString(numberLocale),
    to: toRow.toLocaleString(numberLocale),
    total: total.toLocaleString(numberLocale),
  })
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<AssetRegisterColumnKey>>(new Set(assetRegisterColumnPresets.operations))
  const [columnPreferencesLoaded, setColumnPreferencesLoaded] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    toLocationId: "",
    toCustodianId: "",
    reason: "",
    remark: "",
  })
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.has(asset.id)),
    [assets, selectedIds]
  )
  const allCurrentPageSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id))
  const visibleColumnCount = assetRegisterColumnOrder.filter((column) => visibleColumns.has(column)).length
  const visibleColumnList = assetRegisterColumnOrder.filter((column) => visibleColumns.has(column))
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [hasMoreRight, setHasMoreRight] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth + 1)
      setHasMoreRight(hasRemainingHorizontalContent(element))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [])
  const assetStatusHelp = {
    title: labels.statusHelpTitle,
    description: labels.statusHelpDescription,
    items: [
      labels.statusHelpReady,
      labels.statusHelpPendingRepair,
      labels.statusHelpUnderMaintenance,
      labels.statusHelpPendingDisposal,
      labels.statusHelpLostMissing,
      labels.statusHelpUnderInspection,
    ],
  }
  const assetConditionHelp = {
    title: labels.conditionHelpTitle,
    description: labels.conditionHelpDescription,
    items: [
      labels.conditionHelpGood,
      labels.conditionHelpDamaged,
      labels.conditionHelpNeedsReview,
      labels.conditionHelpMissing,
    ],
  }
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedColumns = window.localStorage.getItem(assetRegisterColumnStorageKey)
        if (storedColumns) {
          setVisibleColumns(new Set(normalizeAssetRegisterColumns(JSON.parse(storedColumns))))
        }
      } catch {
        setVisibleColumns(new Set(assetRegisterColumnPresets.operations))
      } finally {
        setColumnPreferencesLoaded(true)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!columnPreferencesLoaded) return

    try {
      window.localStorage.setItem(
        assetRegisterColumnStorageKey,
        JSON.stringify(assetRegisterColumnOrder.filter((column) => visibleColumns.has(column)))
      )
    } catch {
      // Ignore storage failures, the table still works with in-memory preferences.
    }
  }, [columnPreferencesLoaded, visibleColumns])

  function toggleAsset(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allCurrentPageSelected) {
        assets.forEach((asset) => next.delete(asset.id))
      } else {
        assets.forEach((asset) => next.add(asset.id))
      }
      return next
    })
  }

  function toggleColumn(column: AssetRegisterColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current)
      if (next.has(column) && next.size > 1) next.delete(column)
      else next.add(column)
      return next
    })
  }

  function applyColumnPreset(preset: AssetRegisterColumnPresetKey) {
    setVisibleColumns(new Set(assetRegisterColumnPresets[preset]))
  }

  function exportSelected() {
    if (selectedAssets.length === 0) return

    const headers = [
      labels.assetTag,
      labels.assetName,
      "Serial Number",
      labels.category,
      labels.company,
      labels.currentLocation,
      labels.custodian,
      labels.ownershipType,
      labels.status,
      labels.condition,
      labels.purchasePrice,
    ]
    const rows = selectedAssets.map((asset) => [
      asset.assetTag,
      asset.name,
      asset.serialNumber ?? "",
      asset.category,
      asset.companyBranch,
      asset.currentLocation,
      asset.custodian ?? "",
      asset.ownershipType.label,
      asset.status.label,
      asset.condition.label,
      asset.purchasePrice == null ? "" : String(asset.purchasePrice),
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function printSelectedLabels() {
    if (selectedAssets.length === 0) return

    const params = new URLSearchParams()
    selectedAssets.forEach((asset) => params.append("id", asset.id))
    window.open(`/${locale}/assets/labels?${params.toString()}`, "_blank", "noopener,noreferrer")
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function toggleSelectMode() {
    if (selectMode) clearSelection()
    setSelectMode(!selectMode)
  }

  async function submitBulkUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedAssets.length === 0 || (!bulkForm.toLocationId && !bulkForm.toCustodianId)) return

    setBulkSaving(true)
    try {
      const response = await fetch("/api/assets/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedAssets.map((asset) => asset.id),
          ...bulkForm,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.bulkUpdateFailed)

      toast.success(labels.bulkUpdateSuccess)
      setBulkUpdateOpen(false)
      setBulkForm({ toLocationId: "", toCustodianId: "", reason: "", remark: "" })
      clearSelection()
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : labels.bulkUpdateFailed)
    } finally {
      setBulkSaving(false)
    }
  }

  function buildHref(overrides: { page?: number; sort?: string; direction?: string }) {
    return `/${locale}/assets?${buildAssetQueryString(filters, overrides)}`
  }

  const registerReturnHref = buildHref({})

  function buildAssetDetailHref(assetId: string) {
    return appendReturnTo(`/${locale}/assets/${encodeURIComponent(assetId)}`, registerReturnHref)
  }

  function buildAssetEditHref(assetId: string) {
    return appendReturnTo(`/${locale}/assets/${encodeURIComponent(assetId)}/edit`, registerReturnHref)
  }

  function buildAssetCloneHref(assetId: string) {
    return appendReturnTo(`/${locale}/assets/new?cloneFrom=${encodeURIComponent(assetId)}`, registerReturnHref)
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.companyId ||
      filters.branchId ||
      filters.categoryId ||
      filters.brandId ||
      filters.modelId ||
      filters.statusId ||
      filters.conditionId ||
      filters.ownershipType ||
      filters.custodianId ||
      filters.supplierId ||
      filters.dataQuality ||
      filters.crossScope ||
      filters.pageSize !== 25 ||
      filters.sort !== "createdAt" ||
      filters.direction !== "desc"
  )
  const clearAllFiltersHref = `/${locale}/assets?page=1&pageSize=25&sort=createdAt&direction=desc`
  const emptyState = {
    title: hasActiveFilters ? labels.noResultsTitle : labels.noAssetsTitle,
    description: hasActiveFilters ? labels.noResultsDescription : labels.noAssetsDescription,
    ...(hasActiveFilters ? { actionHref: clearAllFiltersHref, actionLabel: labels.clearAllFilters } : {}),
  }

  function rememberDetailReturnScroll() {
    rememberAssetRegisterScrollPosition(registerReturnHref)
  }

  return (
    <div aria-busy={isPending} className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div data-asset-register-summary className="flex items-center justify-between gap-2 border-b border-border px-3 md:px-4 py-0 md:py-2">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <AssetRegisterSortMenu />
          <button
            type="button"
            onClick={toggleSelectMode}
            aria-pressed={selectMode}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {selectMode ? t("selectModeDone") : t("selectMode")}
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <AssetRegisterColumnPicker visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onApplyPreset={applyColumnPreset} />
            <AssetRegisterExportMenu exportHref={`/api/assets/export?${buildAssetQueryString(filters)}`} templateHref="/api/assets/import-template" />
          </div>
        </div>
      </div>
      {selectedAssets.length > 0 ? (
        <div
          data-asset-bulk-bar
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg md:static md:z-auto md:rounded-none md:border-0 md:border-b md:bg-primary-soft md:px-4 md:py-3 md:shadow-none lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <div className="hidden text-sm font-semibold text-foreground md:block">{labels.bulkActions}</div>
            <div className="text-sm text-muted-foreground md:mt-0.5">
              {selectedAssets.length} {labels.selectedCount}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={printSelectedLabels}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              {labels.printSelectedLabels}
            </button>
            <button
              type="button"
              onClick={() => setBulkUpdateOpen(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Edit className="h-4 w-4" />
              {labels.bulkUpdate}
            </button>
            <button
              type="button"
              onClick={exportSelected}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              {labels.exportSelected}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <X className="h-4 w-4" />
              {labels.clearSelection}
            </button>
          </div>
        </div>
      ) : null}

      {assets.length === 0 ? (
        <div className="p-3 md:hidden">
          <ActionEmptyState {...emptyState} />
        </div>
      ) : (
        <AssetRegisterMobileList
          assets={assets}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleAsset={toggleAsset}
          permissions={permissions}
          detailHref={buildAssetDetailHref}
          editHref={buildAssetEditHref}
          cloneHref={buildAssetCloneHref}
          onNavigate={rememberDetailReturnScroll}
          reserveBulkBarSpace={selectedAssets.length > 0}
        />
      )}

      {isOverflowing ? (
        <div
          data-asset-table-scroll-hint
          className={`${getDesktopTableOnlyClasses()} border-b border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground`}
        >
          {labels.tableScrollHint}
        </div>
      ) : null}

      <div
        data-asset-desktop-table className={`${getDesktopTableOnlyClasses()} relative overflow-x-auto overscroll-x-contain`}
        ref={scrollRef}
        onScroll={(event) => setHasMoreRight(hasRemainingHorizontalContent(event.currentTarget))}
      >
        <table className="w-full table-fixed divide-y divide-border text-sm" style={{ minWidth: getAssetRegisterTableMinWidth(visibleColumnList) }}>
          <colgroup>
            <col style={{ width: assetRegisterColumnWidths.select }} />
            {visibleColumnList.map((column) => (
              <col key={column} style={column === "name" ? undefined : { width: assetRegisterColumnWidths[column] }} />
            ))}
            <col style={{ width: assetRegisterColumnWidths.actions }} />
          </colgroup>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className={headerClasses}>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={toggleCurrentPage}
                  aria-label={labels.all}
                  className="h-4 w-4 rounded border-border text-primary"
                />
              </th>
              {visibleColumns.has("assetTag") && (
                <SortableHeader
                  filters={filters}
                  field="assetTag"
                  label={labels.assetTag}
                  buildHref={buildHref}
                  className={`${assetRegisterStickyHeaderColumnClasses} ${assetRegisterStickyFirstColumnClasses} border-r border-border`}
                  linkClassName="block truncate"
                />
              )}
              {visibleColumns.has("name") && (
                <SortableHeader
                  filters={filters}
                  field="name"
                  label={labels.assetName}
                  buildHref={buildHref}
                  className=""
                  linkClassName="block truncate"
                />
              )}
              {visibleColumns.has("category") && <th scope="col" className={`${headerClasses} truncate`}>{labels.category}</th>}
              {visibleColumns.has("companyBranch") && <th scope="col" className={`${headerClasses} truncate`}>{labels.company}</th>}
              {visibleColumns.has("currentLocation") && <th scope="col" className={`${headerClasses} truncate`}>{labels.currentLocation}</th>}
              {visibleColumns.has("custodian") && <th scope="col" className={`${headerClasses} truncate`}>{labels.custodian}</th>}
              {visibleColumns.has("ownershipType") && <th scope="col" className={`${headerClasses} truncate`}>{labels.ownershipType}</th>}
              {visibleColumns.has("status") && (
                <th scope="col" className={headerClasses}>
                  <HeaderWithHelp label={labels.status} help={assetStatusHelp} />
                </th>
              )}
              {visibleColumns.has("condition") && (
                <th scope="col" className={headerClasses}>
                  <HeaderWithHelp label={labels.condition} help={assetConditionHelp} />
                </th>
              )}
              {visibleColumns.has("purchasePrice") && (
                <SortableHeader filters={filters} field="purchasePrice" label={labels.purchasePrice} buildHref={buildHref} linkClassName="block truncate" />
              )}
              <th
                scope="col"
                className={cn(headerClasses, "text-right", assetRegisterStickyHeaderColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)}
              >
                {labels.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount + 2} className="px-4 py-6">
                  <ActionEmptyState {...emptyState} />
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <ClickableTableRow
                  key={asset.id}
                  href={buildAssetDetailHref(asset.id)}
                  label={`${labels.detail}: ${asset.assetTag}`}
                  className="group"
                  onNavigate={rememberDetailReturnScroll}
                >
                  <td className={cellClasses}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      aria-label={asset.assetTag}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className={`${assetRegisterStickyBodyColumnClasses} ${assetRegisterStickyFirstColumnClasses} ${cellClasses} truncate border-r border-border font-medium text-foreground`} title={asset.assetTag}>
                      {asset.assetTag}
                    </td>
                  )}
                  {visibleColumns.has("name") && (
                    <td className={`${cellClasses} text-foreground`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={asset.name}>{asset.name}</div>
                          {asset.serialNumber ? (
                            <div className="truncate text-xs text-muted-foreground" title={asset.serialNumber}>{asset.serialNumber}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has("category") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.category}>{asset.category}</td>}
                  {visibleColumns.has("companyBranch") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.companyBranch}>{asset.companyBranch}</td>}
                  {visibleColumns.has("currentLocation") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.currentLocation}>{asset.currentLocation}</td>}
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{asset.custodian || "-"}</td>}
                  {visibleColumns.has("ownershipType") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.ownershipType.label} tone={ownershipTypeTone(asset.ownershipType.value)} />
                    </td>
                  )}
                  {visibleColumns.has("status") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.status.label} tone={getAssetStateTone(asset.status.value)} />
                    </td>
                  )}
                  {visibleColumns.has("condition") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} />
                    </td>
                  )}
                  {visibleColumns.has("purchasePrice") && <td className={`${cellClasses} truncate text-muted-foreground`}>{formatCurrency(asset.purchasePrice)}</td>}
                  <td className={cn(assetRegisterStickyBodyColumnClasses, assetRegisterStickyActionsColumnClasses, cellClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)}>
                    <AssetRegisterRowActions
                      variant="desktop"
                      assetId={asset.id}
                      assetTag={asset.assetTag}
                      assetName={asset.name}
                      transactions={asset.transactions}
                      editHref={buildAssetEditHref(asset.id)}
                      cloneHref={buildAssetCloneHref(asset.id)}
                      permissions={permissions}
                      onNavigate={rememberDetailReturnScroll}
                    />
                  </td>
                </ClickableTableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <Pagination
          page={filters.page}
          totalPages={totalPages}
          previousHref={buildHref({ page: Math.max(1, filters.page - 1) })}
          nextHref={buildHref({ page: Math.min(totalPages, filters.page + 1) })}
          labels={{
            navigation: tCommon("pagination"),
            previous: labels.previous,
            next: labels.next,
            pageOf: tCommon("pageOf", { page: filters.page, total: totalPages }),
          }}
        />
      </div>

      <AccessibleDialog
        open={bulkUpdateOpen}
        title={labels.bulkUpdateTitle}
        description={`${labels.bulkUpdateDescription} (${selectedAssets.length} ${labels.selectedCount})`}
        busy={bulkSaving}
        size="md"
        closeLabel={labels.close}
        onClose={() => setBulkUpdateOpen(false)}
      >
            <form onSubmit={submitBulkUpdate} className="space-y-4 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.currentLocation}</span>
                <select
                  value={bulkForm.toLocationId}
                  onChange={(event) => setBulkForm((current) => ({ ...current, toLocationId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">{labels.noChange}</option>
                  {bulkOptions.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.custodian}</span>
                <select
                  value={bulkForm.toCustodianId}
                  onChange={(event) => setBulkForm((current) => ({ ...current, toCustodianId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">{labels.noChange}</option>
                  {bulkOptions.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.reason}</span>
                <input
                  value={bulkForm.reason}
                  onChange={(event) => setBulkForm((current) => ({ ...current, reason: event.target.value }))}
                  required
                  maxLength={500}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.remark}</span>
                <textarea
                  value={bulkForm.remark}
                  onChange={(event) => setBulkForm((current) => ({ ...current, remark: event.target.value }))}
                  rows={3}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setBulkUpdateOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving || (!bulkForm.toLocationId && !bulkForm.toCustodianId)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {labels.applyBulkUpdate}
                </button>
              </div>
            </form>
      </AccessibleDialog>
    </div>
  )
}

function SortableHeader({
  filters,
  field,
  label,
  buildHref,
  className = "",
  linkClassName = "",
}: {
  filters: { sort: string; direction: string }
  field: string
  label: string
  buildHref: (overrides: { page?: number; sort?: string; direction?: string }) => string
  className?: string
  linkClassName?: string
}) {
  const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc"
  const suffix = filters.sort === field ? (filters.direction === "asc" ? " ↑" : " ↓") : ""
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground ${className}`}
    >
      <Link href={buildHref({ sort: field, direction, page: 1 })} className={`hover:text-primary ${linkClassName}`}>
        {label}
        {suffix}
      </Link>
    </th>
  )
}

function HeaderWithHelp({
  label,
  help,
}: {
  label: string
  help: { title: string; description: string; items: string[] }
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <AssetStateHelpPopover {...help} />
    </span>
  )
}

function ownershipTypeTone(value: string): StatusTone {
  if (value === "software_license") return "info"
  if (value === "stock") return "warning"
  if (value === "shared") return "success"
  if (value === "component") return "primary"
  return "muted"
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
