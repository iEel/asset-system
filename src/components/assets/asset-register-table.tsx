"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Columns3, Download, Edit, Eye, FileDown, FileSpreadsheet, ImageIcon, Loader2, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { AssetDeleteButton } from "@/components/master-data/asset-delete-button"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"

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
  status: { label: string; color: string | null }
  condition: { label: string; color: string | null }
  purchasePrice: number | null
  photo: { id: string; alt: string; fileType: string } | null
}

type ColumnKey =
  | "assetTag"
  | "name"
  | "category"
  | "companyBranch"
  | "currentLocation"
  | "custodian"
  | "ownershipType"
  | "status"
  | "condition"
  | "purchasePrice"

type AssetRegisterTableProps = {
  locale: string
  assets: AssetRegisterRow[]
  filters: {
    search: string
    companyId: string
    branchId: string
    categoryId: string
    statusId: string
    conditionId: string
    ownershipType: string
    custodianId: string
    supplierId: string
    dataQuality: "" | AssetDataQualityFilter
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
  labels: {
    actions: string
    all: string
    columns: string
    condition: string
    category: string
    company: string
    currentLocation: string
    custodian: string
    ownershipType: string
    detail: string
    downloadTemplate: string
    edit: string
    exportFiltered: string
    exportSelected: string
    bulkActions: string
    bulkUpdate: string
    bulkUpdateTitle: string
    bulkUpdateDescription: string
    clearSelection: string
    selectLocation: string
    selectCustodian: string
    noChange: string
    reason: string
    remark: string
    applyBulkUpdate: string
    bulkUpdateSuccess: string
    bulkUpdateFailed: string
    cancel: string
    close: string
    printSelectedLabels: string
    noData: string
    of: string
    page: string
    previous: string
    purchasePrice: string
    selectedCount: string
    assetName: string
    assetTag: string
    next: string
    status: string
  }
}

const columnOrder: ColumnKey[] = [
  "assetTag",
  "name",
  "category",
  "companyBranch",
  "currentLocation",
  "custodian",
  "ownershipType",
  "status",
  "condition",
  "purchasePrice",
]

const previewableAssetPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])

export function AssetRegisterTable({
  locale,
  assets,
  filters,
  total,
  totalPages,
  fromRow,
  toRow,
  bulkOptions,
  labels,
}: AssetRegisterTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(columnOrder))
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
  const visibleColumnCount = columnOrder.filter((column) => visibleColumns.has(column)).length

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

  function toggleColumn(column: ColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current)
      if (next.has(column) && next.size > 1) next.delete(column)
      else next.add(column)
      return next
    })
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
      toast.error(error instanceof Error ? error.message : labels.bulkUpdateFailed)
    } finally {
      setBulkSaving(false)
    }
  }

  function buildHref(overrides: { page?: number; sort?: string; direction?: string }) {
    return `/${locale}/assets?${buildAssetQueryString(filters, overrides)}`
  }

  function downloadFile(href: string) {
    window.location.href = href
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {fromRow}-{toRow} {labels.of} {total}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <details className="relative min-w-0">
            <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto">
              <Columns3 className="h-4 w-4" />
              {labels.columns}
            </summary>
            <div className="absolute left-0 z-10 mt-2 w-[calc(100vw-3rem)] max-w-64 rounded-md border border-border bg-surface p-2 shadow-lg sm:left-auto sm:right-0 sm:w-56">
              {columnOrder.map((column) => (
                <label key={column} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(column)}
                    onChange={() => toggleColumn(column)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>{columnLabel(column, labels)}</span>
                </label>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => downloadFile(`/api/assets/export?${buildAssetQueryString(filters)}`)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
          >
            <FileDown className="h-4 w-4" />
            {labels.exportFiltered}
          </button>
          <button
            type="button"
            onClick={() => downloadFile("/api/assets/import-template")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {labels.downloadTemplate}
          </button>
        </div>
      </div>
      {selectedAssets.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-border bg-primary/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">{labels.bulkActions}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {selectedAssets.length} {labels.selectedCount}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={printSelectedLabels}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-9 sm:min-h-0 sm:w-auto"
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

      <div className={`${getMobileCardListClasses()} p-3`}>
        {assets.length === 0 ? (
          <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            {labels.noData}
          </div>
        ) : (
          assets.map((asset) => (
            <article key={asset.id} className="min-w-0 rounded-md border border-border bg-background p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={() => toggleAsset(asset.id)}
                  aria-label={asset.assetTag}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-border text-primary"
                />
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                  {asset.photo && previewableAssetPhotoTypes.has(asset.photo.fileType) ? (
                    <Image
                      src={`/api/attachments/${asset.photo.id}?inline=1`}
                      alt={asset.photo.alt}
                      fill
                      unoptimized
                      className="object-contain p-1"
                      sizes="56px"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/${locale}/assets/${asset.id}`} className="block break-words text-sm font-semibold text-foreground hover:text-primary">
                    {asset.assetTag}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{asset.name}</p>
                  {asset.serialNumber ? <p className="mt-1 break-words text-xs text-muted-foreground">{asset.serialNumber}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <OwnershipTypePill value={asset.ownershipType.value} label={asset.ownershipType.label} />
                <StatusPill label={asset.status.label} color={asset.status.color} />
                <StatusPill label={asset.condition.label} color={asset.condition.color} />
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <MobileAssetField label={labels.category} value={asset.category} />
                <MobileAssetField label={labels.company} value={asset.companyBranch} />
                <MobileAssetField label={labels.currentLocation} value={asset.currentLocation} />
                <MobileAssetField label={labels.custodian} value={asset.custodian || "-"} />
                <MobileAssetField label={labels.purchasePrice} value={formatCurrency(asset.purchasePrice)} />
              </dl>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Eye className="h-4 w-4" />
                  {labels.detail}
                </Link>
                <Link
                  href={`/${locale}/assets/${asset.id}/edit`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Edit className="h-4 w-4" />
                  {labels.edit}
                </Link>
              </div>
              <div className="mt-2 flex justify-end">
                <AssetDeleteButton id={asset.id} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <ColumnHeader>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={toggleCurrentPage}
                  aria-label={labels.all}
                  className="h-4 w-4 rounded border-border text-primary"
                />
              </ColumnHeader>
              {visibleColumns.has("assetTag") && (
                <SortableHeader filters={filters} field="assetTag" label={labels.assetTag} buildHref={buildHref} />
              )}
              {visibleColumns.has("name") && (
                <SortableHeader filters={filters} field="name" label={labels.assetName} buildHref={buildHref} />
              )}
              {visibleColumns.has("category") && <ColumnHeader>{labels.category}</ColumnHeader>}
              {visibleColumns.has("companyBranch") && <ColumnHeader>{labels.company}</ColumnHeader>}
              {visibleColumns.has("currentLocation") && <ColumnHeader>{labels.currentLocation}</ColumnHeader>}
              {visibleColumns.has("custodian") && <ColumnHeader>{labels.custodian}</ColumnHeader>}
              {visibleColumns.has("ownershipType") && <ColumnHeader>{labels.ownershipType}</ColumnHeader>}
              {visibleColumns.has("status") && <ColumnHeader>{labels.status}</ColumnHeader>}
              {visibleColumns.has("condition") && <ColumnHeader>{labels.condition}</ColumnHeader>}
              {visibleColumns.has("purchasePrice") && (
                <SortableHeader filters={filters} field="purchasePrice" label={labels.purchasePrice} buildHref={buildHref} />
              )}
              <ColumnHeader align="right">{labels.actions}</ColumnHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount + 2} className="h-32 px-4 text-center text-muted-foreground">
                  {labels.noData}
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <ClickableTableRow
                  key={asset.id}
                  href={`/${locale}/assets/${asset.id}`}
                  label={`${labels.detail}: ${asset.assetTag}`}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      aria-label={asset.assetTag}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{asset.assetTag}</td>
                  )}
                  {visibleColumns.has("name") && (
                    <td className="min-w-56 px-4 py-3 text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                          {asset.photo && previewableAssetPhotoTypes.has(asset.photo.fileType) ? (
                            <Image
                              src={`/api/attachments/${asset.photo.id}?inline=1`}
                              alt={asset.photo.alt}
                              fill
                              unoptimized
                              className="object-contain p-1"
                              sizes="48px"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{asset.name}</div>
                          {asset.serialNumber && <div className="truncate text-xs text-muted-foreground">{asset.serialNumber}</div>}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has("category") && <td className="min-w-40 px-4 py-3 text-muted-foreground">{asset.category}</td>}
                  {visibleColumns.has("companyBranch") && (
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.companyBranch}</td>
                  )}
                  {visibleColumns.has("currentLocation") && (
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.currentLocation}</td>
                  )}
                  {visibleColumns.has("custodian") && (
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.custodian || "-"}</td>
                  )}
                  {visibleColumns.has("ownershipType") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <OwnershipTypePill value={asset.ownershipType.value} label={asset.ownershipType.label} />
                    </td>
                  )}
                  {visibleColumns.has("status") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.status.label} color={asset.status.color} />
                    </td>
                  )}
                  {visibleColumns.has("condition") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.condition.label} color={asset.condition.color} />
                    </td>
                  )}
                  {visibleColumns.has("purchasePrice") && (
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCurrency(asset.purchasePrice)}</td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/${locale}/assets/${asset.id}`}
                        title={labels.detail}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/${locale}/assets/${asset.id}/edit`}
                        title={labels.edit}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <AssetDeleteButton id={asset.id} />
                    </div>
                  </td>
                </ClickableTableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          {fromRow}-{toRow} {labels.of} {total}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaginationLink href={buildHref({ page: Math.max(1, filters.page - 1) })} disabled={filters.page <= 1}>
            {labels.previous}
          </PaginationLink>
          <span className="px-2">
            {labels.page} {filters.page} / {totalPages}
          </span>
          <PaginationLink href={buildHref({ page: Math.min(totalPages, filters.page + 1) })} disabled={filters.page >= totalPages}>
            {labels.next}
          </PaginationLink>
        </div>
      </div>

      {bulkUpdateOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{labels.bulkUpdateTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.bulkUpdateDescription} ({selectedAssets.length} {labels.selectedCount})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkUpdateOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={labels.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {labels.applyBulkUpdate}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SortableHeader({
  filters,
  field,
  label,
  buildHref,
}: {
  filters: { sort: string; direction: string }
  field: string
  label: string
  buildHref: (overrides: { page?: number; sort?: string; direction?: string }) => string
}) {
  const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc"
  const suffix = filters.sort === field ? (filters.direction === "asc" ? " ↑" : " ↓") : ""
  return (
    <ColumnHeader>
      <Link href={buildHref({ sort: field, direction, page: 1 })} className="hover:text-primary">
        {label}
        {suffix}
      </Link>
    </ColumnHeader>
  )
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-md border border-border px-3 text-muted-foreground opacity-50">
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className="inline-flex h-9 items-center rounded-md border border-border px-3 hover:bg-accent">
      {children}
    </Link>
  )
}

function MobileAssetField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color?: string | null }) {
  if (!color) return <ActiveBadge label={label} />

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {label}
    </span>
  )
}

function OwnershipTypePill({ value, label }: { value: string; label: string }) {
  const tone = ownershipTypeTone(value)

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  )
}

function ownershipTypeTone(value: string) {
  if (value === "software_license") return "bg-info/10 text-info"
  if (value === "stock") return "bg-warning/10 text-warning"
  if (value === "shared") return "bg-success/10 text-success"
  if (value === "component") return "bg-primary/10 text-primary"
  return "bg-muted text-muted-foreground"
}

function columnLabel(column: ColumnKey, labels: AssetRegisterTableProps["labels"]) {
  const map: Record<ColumnKey, string> = {
    assetTag: labels.assetTag,
    name: labels.assetName,
    category: labels.category,
    companyBranch: labels.company,
    currentLocation: labels.currentLocation,
    custodian: labels.custodian,
    ownershipType: labels.ownershipType,
    status: labels.status,
    condition: labels.condition,
    purchasePrice: labels.purchasePrice,
  }

  return map[column]
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
