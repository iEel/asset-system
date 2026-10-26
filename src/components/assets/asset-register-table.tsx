"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Download, Edit, MoveHorizontal, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { toLocalDateInputValue } from "@/lib/local-date"
import { rememberAssetRegisterScrollPosition } from "@/lib/asset-register-view-memory"
import type { AssetActivityFilter } from "@/lib/asset-activity-filter"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetCustodianStateFilter } from "@/lib/asset-custodian-state-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTableBody, DataTableFoot, DataTableHead, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Nil, orNil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
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
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { AssetActionSet } from "@/lib/asset-actions"
import { getAssetStateTone, getDesktopTableOnlyClasses, getPanelClasses } from "@/lib/design-system"
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
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { atLeastOne, maxLength, required } from "@/lib/validation-rules"

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
  actions: AssetActionSet
}

// The bulk update's fields in visual order, keyed like the server's fieldErrors (validations/asset-operations.ts), with
// the id focus moves to (v-track M-R1).
const BULK_FIELD_IDS = {
  toLocationId: "asset-bulk-location",
  toCustodianId: "asset-bulk-custodian",
  reason: "asset-bulk-reason",
} as const
type BulkField = keyof typeof BULK_FIELD_IDS
const BULK_FIELD_ORDER = Object.keys(BULK_FIELD_IDS) as BulkField[]

type BulkUpdateValues = { toLocationId: string; toCustodianId: string; reason: string; remark: string }

// noValidate turns the browser's check off, so this restates the reason's required and maxLength, and the server's rule
// that one of the two changes is chosen, with the server's own code under the location (v-track M-R2, spec §4.4).
function validate(values: BulkUpdateValues): Partial<Record<BulkField, string>> {
  const errors: Partial<Record<BulkField, string>> = {}
  const check = (key: BulkField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId]) ? "bulkUpdateFieldRequired" : null)
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
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
    custodianState: AssetCustodianStateFilter
    locationId: string
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
const assetRegisterStickyHeaderColumnClasses = "z-30 bg-surface"
// The pinned cells take the row fill together with the row (instant on, soft off), also while the row's ⋯ menu is
// open. A side line replaces the old edge shadow (spec 2B R-j); each cell sets that side's color only, so the soft row
// line under it stays.
const assetRegisterStickyBodyColumnClasses = "z-20 bg-surface transition-colors group-hover/row:bg-row-hover group-focus-within/row:bg-row-hover group-has-[[aria-expanded=true]]/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:duration-0"
// Dense rows are the register's own until phase 3 (spec 2B I3, B3(3)): the DataTable look (white 13/500 faint header,
// soft row lines) with px-3 py-2 cells instead of p-3, and no 16/20px gutters on the first and last columns, because
// the widths in src/lib/asset-register-columns.ts count none. Rows are 56px: the name cell holds a 40px thumbnail.
const cellClasses = "border-b border-border-soft px-3 py-2 align-top"
const headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"

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
  const { isPending } = useAssetRegisterNavigation()
  const rangeLabel = t("registerRange", {
    from: formatCount(fromRow),
    to: formatCount(toRow),
    total: formatCount(total),
  })
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<AssetRegisterColumnKey>>(new Set(assetRegisterColumnPresets.operations))
  const [columnPreferencesLoaded, setColumnPreferencesLoaded] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkForm, setBulkForm] = useState<BulkUpdateValues>({
    toLocationId: "",
    toCustodianId: "",
    reason: "",
    remark: "",
  })
  const bulkErrors = useFieldErrors<BulkField>()
  const focusBulkError = () => bulkErrors.focusFirst(BULK_FIELD_ORDER, { idFor: (key) => BULK_FIELD_IDS[key] })
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.has(asset.id)),
    [assets, selectedIds]
  )
  const allCurrentPageSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id))
  const visibleColumnCount = assetRegisterColumnOrder.filter((column) => visibleColumns.has(column)).length
  const visibleColumnList = assetRegisterColumnOrder.filter((column) => visibleColumns.has(column))
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  // The hint line shows only while the table really overflows (DESIGN.md, asset register). The pinned actions column
  // has no edge shadow any more (spec 2B R-j), so nothing else is measured and the scroller needs no onScroll.
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => setIsOverflowing(element.scrollWidth > element.clientWidth + 1)
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
    link.download = `assets-${toLocalDateInputValue()}.csv`
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

  function openBulkUpdate() {
    bulkErrors.setErrors({})
    setBulkUpdateOpen(true)
  }

  function setBulkField(field: keyof BulkUpdateValues, value: string) {
    setBulkForm((current) => ({ ...current, [field]: value }))
    // The two changes are one rule: choosing either clears it (spec §4.3).
    if (field === "toLocationId" || field === "toCustodianId") bulkErrors.clear("toLocationId", "toCustodianId")
    else if (field === "reason") bulkErrors.clear("reason")
  }

  async function submitBulkUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The dialog opens only from the bar of a selection; the rest are the fields' rules.
    if (selectedAssets.length === 0) return
    bulkErrors.setErrors(validate(bulkForm))
    if (focusBulkError()) return

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
      if (!response.ok) {
        // A refusal that names a field shows under it in the dialog; any other keeps the toast (spec §4.1).
        if (bulkErrors.applyServer(payload) && focusBulkError()) return
        throw new Error(payload?.error ?? labels.bulkUpdateFailed)
      }

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

  // DataTableHead sort (spec 2B I3): as the old SortableHeader did, the link flips the sorted column and starts any
  // other column ascending; aria-sort and the arrow icon mark only the sorted column.
  function sortOf(field: string): DataTableSort {
    const current = filters.sort === field ? (filters.direction === "asc" ? "asc" : "desc") : null
    return { href: buildHref({ sort: field, direction: current === "asc" ? "desc" : "asc", page: 1 }), direction: current }
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
      filters.custodianState ||
      filters.locationId ||
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
    // "Clear filters" is the outline button: the primary color stays with the page's own main action (spec 2B §7.8.5).
    ...(hasActiveFilters ? { actionHref: clearAllFiltersHref, actionLabel: labels.clearAllFilters, actionVariant: "secondary" as const } : {}),
  }

  function rememberDetailReturnScroll() {
    rememberAssetRegisterScrollPosition(registerReturnHref)
  }

  return (
    // The frame carries aria-busy, so it cannot be ContentPanel: it takes the panel classes (spec 2D D9, 2D-2 R4).
    <div aria-busy={isPending} className={cn(getPanelClasses(), "overflow-hidden")}>
      <div data-asset-register-summary className="flex items-center justify-between gap-2 border-b border-border px-3 md:px-4 py-0 md:py-2">
        <p className="text-meta text-muted-foreground num">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <AssetRegisterSortMenu />
          <Button variant="ghost" size="md" aria-pressed={selectMode} onClick={toggleSelectMode} className="md:hidden">
            {selectMode ? t("selectModeDone") : t("selectMode")}
          </Button>
          <div className="hidden items-center gap-2 md:flex">
            <AssetRegisterColumnPicker visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onApplyPreset={applyColumnPreset} />
            <AssetRegisterExportMenu exportHref={`/api/assets/export?${buildAssetQueryString(filters)}`} templateHref={permissions.canCreate ? "/api/assets/import-template" : undefined} />
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
              {formatCount(selectedAssets.length)} {labels.selectedCount}
            </div>
          </div>
          {/* The bar keeps its place and its frame until phase 3 (spec 2B R-q); its buttons are the shared Button (§7.8.7). */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button size="md" onClick={printSelectedLabels} className="w-full sm:w-auto">
              <Printer aria-hidden="true" />
              {labels.printSelectedLabels}
            </Button>
            <Button variant="outline" size="md" onClick={openBulkUpdate} className="w-full sm:w-auto">
              <Edit aria-hidden="true" />
              {labels.bulkUpdate}
            </Button>
            <Button variant="outline" size="md" onClick={exportSelected} className="w-full sm:w-auto">
              <Download aria-hidden="true" />
              {labels.exportSelected}
            </Button>
            <Button variant="outline" size="md" onClick={clearSelection} className="w-full sm:w-auto">
              <X aria-hidden="true" />
              {labels.clearSelection}
            </Button>
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

      {/* The hint line of DataTableScrollArea (data-table-scroll.tsx): no fill, faint 13px text after the scroll icon. */}
      {isOverflowing ? (
        <p
          data-asset-table-scroll-hint
          className="hidden items-center gap-1.5 border-b border-border-soft px-4 py-1.5 text-meta text-faint-foreground md:flex [&>svg]:size-4 [&>svg]:shrink-0"
        >
          <MoveHorizontal aria-hidden="true" />
          {labels.tableScrollHint}
        </p>
      ) : null}

      <div
        data-asset-desktop-table className={`${getDesktopTableOnlyClasses()} relative overflow-x-auto overscroll-x-contain`}
        ref={scrollRef}
      >
        <table className="w-full table-fixed text-sm" style={{ minWidth: getAssetRegisterTableMinWidth(visibleColumnList) }}>
          <colgroup>
            <col style={{ width: assetRegisterColumnWidths.select }} />
            {visibleColumnList.map((column) => (
              <col key={column} style={column === "name" ? undefined : { width: assetRegisterColumnWidths[column] }} />
            ))}
            <col style={{ width: assetRegisterColumnWidths.actions }} />
          </colgroup>
          <thead>
            <tr>
              {/* The label fills the 44px column (O1, K16); the box draws its own focus outline. */}
              <th scope="col" className={cn(headerClasses, "p-0")}>
                <label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleCurrentPage}
                    aria-label={labels.all}
                    className={checkboxVariants()}
                  />
                </label>
              </th>
              {visibleColumns.has("assetTag") && (
                <DataTableHead
                  sort={sortOf("assetTag")}
                  className={cn(assetRegisterStickyHeaderColumnClasses, assetRegisterStickyFirstColumnClasses, "border-r border-border")}
                >
                  {labels.assetTag}
                </DataTableHead>
              )}
              {visibleColumns.has("name") && <DataTableHead sort={sortOf("name")}>{labels.assetName}</DataTableHead>}
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
                <DataTableHead align="right" sort={sortOf("purchasePrice")}>{t("purchasePriceBaht")}</DataTableHead>
              )}
              {/* pl-1.5 pr-2: the 172px column keeps 157.5px for the 156px RowActions pair (spec 2B I3, I26). */}
              <th
                scope="col"
                className={cn(headerClasses, "pl-1.5 pr-2 text-right", assetRegisterStickyHeaderColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-border")}
              >
                <span className="sr-only">{labels.actions}</span>
              </th>
            </tr>
          </thead>
          <DataTableBody>
            {assets.length === 0 ? (
              <TableEmptyRow colSpan={visibleColumnCount + 2} emptyState={emptyState} />
            ) : (
              assets.map((asset) => (
                <ClickableTableRow
                  key={asset.id}
                  href={buildAssetDetailHref(asset.id)}
                  label={`${labels.detail}: ${asset.assetTag}`}
                  onNavigate={rememberDetailReturnScroll}
                >
                  <td className={cn(cellClasses, "p-0")}>
                    {/* ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click
                        beside the box from opening the asset (spec 2B §7.8.3). */}
                    <label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleAsset(asset.id)}
                        aria-label={asset.assetTag}
                        className={checkboxVariants()}
                      />
                    </label>
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className={cn(assetRegisterStickyBodyColumnClasses, assetRegisterStickyFirstColumnClasses, cellClasses, "truncate border-r border-r-border text-foreground")} title={asset.assetTag}>
                      <span className="tag font-medium">{asset.assetTag}</span>
                    </td>
                  )}
                  {visibleColumns.has("name") && (
                    <td className={`${cellClasses} text-foreground`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={asset.name}>{asset.name}</div>
                          {asset.serialNumber ? (
                            <div className="truncate text-meta text-muted-foreground" title={asset.serialNumber}><span className="tag">{asset.serialNumber}</span></div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has("category") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.category}>{asset.category}</td>}
                  {visibleColumns.has("companyBranch") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.companyBranch}>{asset.companyBranch}</td>}
                  {visibleColumns.has("currentLocation") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.currentLocation}>{asset.currentLocation}</td>}
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{orNil(asset.custodian, t("noCustodian"))}</td>}
                  {visibleColumns.has("ownershipType") && (
                    <td className={cellClasses}>
                      {/* The ownership type is a name, not a state (2D-2 R2): the shared Chip, cut with its title in the 120px column. */}
                      <Chip title={asset.ownershipType.label}>{asset.ownershipType.label}</Chip>
                    </td>
                  )}
                  {visibleColumns.has("status") && (
                    <td className={cellClasses}>
                      <StatusBadge label={asset.status.label} tone={getAssetStateTone(asset.status.value)} />
                    </td>
                  )}
                  {visibleColumns.has("condition") && (
                    <td className={cellClasses}>
                      <StatusBadge label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} />
                    </td>
                  )}
                  {visibleColumns.has("purchasePrice") && <td className={cn(cellClasses, "truncate text-right text-muted-foreground num")}>{formatMoney(asset.purchasePrice) ?? <Nil />}</td>}
                  <td className={cn(cellClasses, "pl-1.5 pr-2", assetRegisterStickyBodyColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-l-border")}>
                    <AssetRegisterRowActions
                      variant="desktop"
                      assetId={asset.id}
                      assetTag={asset.assetTag}
                      assetName={asset.name}
                      actions={asset.actions}
                      editHref={buildAssetEditHref(asset.id)}
                      cloneHref={buildAssetCloneHref(asset.id)}
                      permissions={permissions}
                      onNavigate={rememberDetailReturnScroll}
                    />
                  </td>
                </ClickableTableRow>
              ))
            )}
          </DataTableBody>
        </table>
      </div>

      <DataTableFoot>
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
            range: rangeLabel,
          }}
        />
      </DataTableFoot>

      <AccessibleDialog
        open={bulkUpdateOpen}
        title={labels.bulkUpdateTitle}
        description={`${labels.bulkUpdateDescription} (${formatCount(selectedAssets.length)} ${labels.selectedCount})`}
        busy={bulkSaving}
        size="md"
        onClose={() => setBulkUpdateOpen(false)}
      >
        <form onSubmit={submitBulkUpdate} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <Field label={labels.currentLocation} id="asset-bulk-location" error={bulkErrors.message("toLocationId")}>
              <NativeSelect
                value={bulkForm.toLocationId}
                onChange={(event) => setBulkField("toLocationId", event.target.value)}
              >
                <option value="">{labels.noChange}</option>
                {bulkOptions.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={labels.custodian} id="asset-bulk-custodian" error={bulkErrors.message("toCustodianId")}>
              <NativeSelect
                value={bulkForm.toCustodianId}
                onChange={(event) => setBulkField("toCustodianId", event.target.value)}
              >
                <option value="">{labels.noChange}</option>
                {bulkOptions.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={labels.reason} id="asset-bulk-reason" required error={bulkErrors.message("reason")}>
              <Input
                value={bulkForm.reason}
                onChange={(event) => setBulkField("reason", event.target.value)}
                required
                maxLength={500}
              />
            </Field>
            <Field label={labels.remark}>
              <Textarea
                value={bulkForm.remark}
                onChange={(event) => setBulkField("remark", event.target.value)}
                rows={3}
                className="min-h-24"
              />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            <Button type="submit" busy={bulkSaving}>
              {labels.applyBulkUpdate}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </div>
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

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
