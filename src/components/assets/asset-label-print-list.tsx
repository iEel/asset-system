"use client"

import { useMemo, useState } from "react"
import { ArrowDownAZ, Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { formatCount } from "@/lib/display-format"
import type { LabelQueueRow } from "@/lib/asset-label-queue"

// The labels page's right column: the print list, its order and the two print buttons. Group 4 plan 6 Task 4 moved
// it here from the tool unchanged in what it does (rows are LabelQueueRow now); Task 5 rebuilds it (P6-R1, R8-R10).

type SelectedSort = "manual" | "asset_tag" | "location" | "category"

export type AssetLabelPrintListLabels = {
  selectedTitle: string
  selectedCount: string
  print: string
  remove: string
  noSelected: string
  selectedSortLabel: string
  selectedSortManual: string
  queueSortAssetTag: string
  queueSortLocation: string
  queueSortCategory: string
  printFirstLabel: string
}

export function AssetLabelPrintList({
  locale,
  selected,
  status,
  labels,
  onRemove,
}: {
  locale: string
  selected: LabelQueueRow[]
  // The list's status line (P6-R2): what an add could not take, or that the list is full.
  status: string | null
  labels: AssetLabelPrintListLabels
  onRemove: (id: string) => void
}) {
  const [selectedSort, setSelectedSort] = useState<SelectedSort>("manual")
  const selectedForPrint = useMemo(() => sortSelectedAssets(selected, selectedSort), [selected, selectedSort])

  function removeAsset(id: string) {
    onRemove(id)
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

  return (
    <ContentPanel
      title={labels.selectedTitle}
      description={`${formatCount(selected.length)} ${labels.selectedCount}`}
      className="xl:sticky xl:top-20 xl:self-start"
    >
      <div className="mb-4 flex flex-col gap-3">
        <Field label={<span className="inline-flex items-center gap-1"><ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-primary" />{labels.selectedSortLabel}</span>}>
          <NativeSelect value={selectedSort} onChange={(event) => setSelectedSort(event.target.value as SelectedSort)}>
            <option value="manual">{labels.selectedSortManual}</option>
            <option value="asset_tag">{labels.queueSortAssetTag}</option>
            <option value="location">{labels.queueSortLocation}</option>
            <option value="category">{labels.queueSortCategory}</option>
          </NativeSelect>
        </Field>
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
        <p role="status" className="text-meta text-muted-foreground empty:hidden">{status}</p>
      </div>

      {selectedForPrint.length === 0 ? (
        <EmptyNote id="asset-label-print-reason">{labels.noSelected}</EmptyNote>
      ) : (
        <div className="max-h-[44rem] space-y-2 overflow-y-auto pr-1">
          {selectedForPrint.map((asset) => (
            <div key={asset.id} data-label-selected-row={asset.id} className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-foreground">{asset.name}</span>
                <span className="block text-meta text-muted-foreground">
                  <span className="tag">{asset.assetTag}</span>
                </span>
              </span>
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
  )
}

function buildPrintUrl(locale: string, assets: LabelQueueRow[]) {
  const params = new URLSearchParams()
  assets.forEach((asset) => params.append("id", asset.id))
  return `/${locale}/assets/labels?${params.toString()}`
}

function codeName(value: { code: string; name: string } | null) {
  return value ? `${value.code} - ${value.name}` : ""
}

function sortSelectedAssets(assets: LabelQueueRow[], selectedSort: SelectedSort) {
  if (selectedSort === "manual") return assets

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
  const valueOf = (asset: LabelQueueRow) =>
    selectedSort === "asset_tag" ? asset.assetTag : selectedSort === "location" ? codeName(asset.location) : codeName(asset.category)
  return [...assets].sort((left, right) => collator.compare(valueOf(left), valueOf(right)) || collator.compare(left.assetTag, right.assetTag))
}
