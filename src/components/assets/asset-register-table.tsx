"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Columns3, Download, Edit, Eye, FileDown, FileSpreadsheet, ImageIcon, Printer } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { AssetDeleteButton } from "@/components/master-data/asset-delete-button"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"

export type AssetRegisterRow = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  category: string
  companyBranch: string
  currentLocation: string
  custodian: string | null
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
    page: number
    pageSize: number
    sort: string
    direction: string
  }
  total: number
  totalPages: number
  fromRow: number
  toRow: number
  labels: {
    actions: string
    all: string
    columns: string
    condition: string
    category: string
    company: string
    currentLocation: string
    custodian: string
    detail: string
    downloadTemplate: string
    edit: string
    exportFiltered: string
    exportSelected: string
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
  labels,
}: AssetRegisterTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(columnOrder))
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

  function buildHref(overrides: { page?: number; sort?: string; direction?: string }) {
    return `/${locale}/assets?${buildAssetQueryString(filters, overrides)}`
  }

  function downloadFile(href: string) {
    window.location.href = href
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedAssets.length > 0 ? `${selectedAssets.length} ${labels.selectedCount}` : `${fromRow}-${toRow} ${labels.of} ${total}`}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <details className="relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
              <Columns3 className="h-4 w-4" />
              {labels.columns}
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-border bg-surface p-2 shadow-lg">
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
            onClick={exportSelected}
            disabled={selectedAssets.length === 0}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {labels.exportSelected}
          </button>
          <button
            type="button"
            onClick={printSelectedLabels}
            disabled={selectedAssets.length === 0}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            {labels.printSelectedLabels}
          </button>
          <button
            type="button"
            onClick={() => downloadFile(`/api/assets/export?${buildAssetQueryString(filters)}`)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <FileDown className="h-4 w-4" />
            {labels.exportFiltered}
          </button>
          <button
            type="button"
            onClick={() => downloadFile("/api/assets/import-template")}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {labels.downloadTemplate}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
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
                <tr
                  key={asset.id}
                  tabIndex={0}
                  onClick={() => router.push(`/${locale}/assets/${asset.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      router.push(`/${locale}/assets/${asset.id}`)
                    }
                  }}
                  aria-label={`${labels.detail}: ${asset.assetTag}`}
                  className="cursor-pointer hover:bg-accent/50 focus:bg-accent/50 focus:outline-none"
                >
                  <td className="whitespace-nowrap px-4 py-3" onClick={(event) => event.stopPropagation()}>
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
                  <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          {fromRow}-{toRow} {labels.of} {total}
        </div>
        <div className="flex items-center gap-2">
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

function columnLabel(column: ColumnKey, labels: AssetRegisterTableProps["labels"]) {
  const map: Record<ColumnKey, string> = {
    assetTag: labels.assetTag,
    name: labels.assetName,
    category: labels.category,
    companyBranch: labels.company,
    currentLocation: labels.currentLocation,
    custodian: labels.custodian,
    status: labels.status,
    condition: labels.condition,
    purchasePrice: labels.purchasePrice,
  }

  return map[column]
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
