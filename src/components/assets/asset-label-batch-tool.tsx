"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AssetLabelPrintList, type AssetLabelPrintListLabels } from "@/components/assets/asset-label-print-list"
import { AssetLabelQueueCard, AssetLabelSearchCard, type LabelFilterOptions } from "@/components/assets/asset-label-queue"
import { PageHeader } from "@/components/ui/page-header"
import { LABEL_PRINT_BATCH_MAX } from "@/lib/asset-label-print-tracking"
import type { LabelQueueLocale, LabelQueueRow } from "@/lib/asset-label-queue"
import { mergeIntoPrintList, printListRoom, printListStatusKey } from "@/lib/asset-label-queue-rules"

// The labels page (group 4 plan 6, spec §11, board AR-Labels): the shell that holds the print list. The left column is
// asset-label-queue.tsx (search and queue, Task 4); the right column is asset-label-print-list.tsx (Task 5).

type AssetLabelBatchToolProps = {
  locale: LabelQueueLocale
  // The incoming ids' rows (?assetIds=), in their order (P6-R11).
  preselectedRows?: LabelQueueRow[]
  filterOptions: LabelFilterOptions
  labels: AssetLabelPrintListLabels & {
    title: string
    subtitle: string
  }
}

type PrintListState = { rows: LabelQueueRow[]; lastAdd: { added: number; requested: number } | null }

export function AssetLabelBatchTool({ locale, labels, preselectedRows = [], filterOptions }: AssetLabelBatchToolProps) {
  const t = useTranslations("assetTools.labelsPage")
  // P6-R2: the print list holds at most 100 labels, from every source (the incoming ids, search, a row, add-all).
  const [printList, setPrintList] = useState<PrintListState>(() => {
    const incoming = mergeIntoPrintList([], preselectedRows)
    return { rows: incoming.next, lastAdd: incoming.added < incoming.requested ? incoming : null }
  })
  const selected = printList.rows
  const selectedIds = useMemo(() => new Set(selected.map((asset) => asset.id)), [selected])
  const room = printListRoom(selected.length)
  const listStatus = printListStatusKey(selected.length, printList.lastAdd)
  const listStatusText = listStatus?.key === "listRefused"
    ? t("listRefused", listStatus.values)
    : listStatus?.key === "listFull"
      ? t("listFull", { max: LABEL_PRINT_BATCH_MAX })
      : null

  function addRows(rows: LabelQueueRow[]) {
    if (rows.length === 0) return
    setPrintList((current) => {
      const result = mergeIntoPrintList(current.rows, rows)
      return { rows: result.next, lastAdd: { added: result.added, requested: result.requested } }
    })
  }

  function removeRow(id: string) {
    setPrintList((current) => ({ rows: current.rows.filter((asset) => asset.id !== id), lastAdd: null }))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 overflow-x-hidden">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <AssetLabelSearchCard locale={locale} selectedIds={selectedIds} onAdd={addRows} />
          <AssetLabelQueueCard locale={locale} filterOptions={filterOptions} selectedIds={selectedIds} room={room} onAdd={addRows} />
        </div>

        <AssetLabelPrintList locale={locale} selected={selected} status={listStatusText} labels={labels} onRemove={removeRow} />
      </div>
    </div>
  )
}
