"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AssetLabelPrintActions, AssetLabelPrintList, AssetLabelPrintSettings } from "@/components/assets/asset-label-print-list"
import { AssetLabelQueueCard, AssetLabelSearchCard, fetchLabelRows, type LabelFilterOptions } from "@/components/assets/asset-label-queue"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { PageHeader } from "@/components/ui/page-header"
import {
  buildLabelPrintUrl,
  labelTapeText,
  labelTestPrint,
  refreshLabelRows,
  sortLabelPrintList,
  type LabelPrintOrder,
} from "@/lib/asset-label-print-list-rules"
import type { AssetLabelPrintSettings as AssetLabelPrintSettingsData } from "@/lib/asset-label-print-settings"
import { LABEL_PRINT_BATCH_MAX } from "@/lib/asset-label-print-tracking"
import type { AssetLabelTapeSize } from "@/lib/asset-label-template"
import type { LabelQueueLocale, LabelQueueRow } from "@/lib/asset-label-queue"
import {
  fromRegisterCount,
  initialPrintList,
  mergeIntoPrintList,
  printListFocusAfterRemove,
  printListRoom,
  printListStatusKey,
} from "@/lib/asset-label-queue-rules"

// The labels page (group 4 plan 6, spec §11, board AR-Labels): the shell that holds the print list, its order, the tape,
// the note and the previewed label. The left column is asset-label-queue.tsx (search and queue); the right column is
// asset-label-print-list.tsx (the list, then the settings and the preview). From md the print bar is the page's last
// child, under both columns (P6-R10).

type AssetLabelBatchToolProps = {
  locale: LabelQueueLocale
  // The incoming ids' rows (?assetIds=), in their order, once each, the first 100 (P6-R1, P6-R11).
  preselectedRows?: LabelQueueRow[]
  // How many distinct ids the URL asked for: past 100 they are refused in the list's status line (P6-R2).
  incomingCount?: number
  // ?from=register: the rows came from the register's selection (P6-R1).
  fromRegister?: boolean
  filterOptions: LabelFilterOptions
  // Resolved on the server (recon X11): the templates, the default tape and the QR base.
  settings: AssetLabelPrintSettingsData
}

type PrintListState = {
  rows: LabelQueueRow[]
  lastAdd: { added: number; requested: number } | null
  // The register's ids (from=register); the line counts those still listed, none once the list is cleared.
  registerIds: ReadonlySet<string>
}

// Where focus goes once a removed row's X or the cleared bar has unmounted: a row's X, or the list's empty note.
type FocusRequest = { to: "row"; id: string } | { to: "empty" } | null

export function AssetLabelBatchTool({ locale, preselectedRows = [], incomingCount = 0, fromRegister = false, filterOptions, settings }: AssetLabelBatchToolProps) {
  const t = useTranslations("assetTools.labelsPage")
  // P6-R2: the print list holds at most 100 labels, from every source (the incoming ids, search, a row, add-all).
  const [printList, setPrintList] = useState<PrintListState>(() => {
    const incoming = initialPrintList(preselectedRows, { incomingCount, fromRegister })
    return { rows: incoming.rows, lastAdd: incoming.lastAdd, registerIds: incoming.registerIds }
  })
  const [order, setOrder] = useState<LabelPrintOrder>("selected")
  const [tapeSize, setTapeSize] = useState<AssetLabelTapeSize>(settings.defaultTapeSize)
  const [note, setNote] = useState("")
  const [previewIndex, setPreviewIndex] = useState(0)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const focusRequest = useRef<FocusRequest>(null)
  const ordered = useMemo(() => sortLabelPrintList(printList.rows, order), [printList.rows, order])
  const listIds = useMemo(() => printList.rows.map((asset) => asset.id), [printList.rows])
  const selectedIds = useMemo(() => new Set(listIds), [listIds])
  const room = printListRoom(ordered.length)
  const registerCount = fromRegisterCount(ordered, printList.registerIds)
  const listStatus = printListStatusKey(ordered.length, printList.lastAdd)
  const listStatusText = listStatus?.key === "listRefused"
    ? t("listRefused", listStatus.values)
    : listStatus?.key === "listFull"
      ? t("listFull", { max: LABEL_PRINT_BATCH_MAX })
      : null
  // A failed refresh is about the rows listed: with none left the line goes too (final review).
  const status = [listStatusText, refreshFailed && ordered.length > 0 ? t("listRefreshFailed") : null].filter(Boolean).join(" · ") || null
  const summary = t("barSummary", { count: ordered.length, size: labelTapeText(tapeSize, t("tapeCustom")) })

  // P6-R13: the print route records in another tab. When this tab is visible again, the list's rows are asked again
  // through the lookup, so their print states and tags are today's; the queue refreshes itself the same way.
  useEffect(() => {
    async function refreshList() {
      if (document.visibilityState !== "visible" || listIds.length === 0) return
      try {
        const rows = await fetchLabelRows(listIds, locale)
        setPrintList((current) => ({ ...current, rows: refreshLabelRows(current.rows, rows) }))
        setRefreshFailed(false)
      } catch {
        setRefreshFailed(true)
      }
    }

    document.addEventListener("visibilitychange", refreshList)
    return () => document.removeEventListener("visibilitychange", refreshList)
  }, [listIds, locale])

  // The X that held focus, or the bar with its clear button, has unmounted: focus moves on purpose, never to <body>
  // (final review; the bulk-move pattern).
  useEffect(() => {
    const request = focusRequest.current
    if (!request) return
    focusRequest.current = null
    const target = request.to === "row"
      ? document.querySelector<HTMLElement>(`[data-label-remove="${CSS.escape(request.id)}"]`)
      : document.getElementById("asset-label-print-reason")
    target?.focus()
  }, [ordered])

  function addRows(rows: LabelQueueRow[]) {
    if (rows.length === 0) return
    setPrintList((current) => {
      const result = mergeIntoPrintList(current.rows, rows)
      return { ...current, rows: result.next, lastAdd: { added: result.added, requested: result.requested } }
    })
  }

  function removeRow(id: string) {
    const next = printListFocusAfterRemove(ordered.map((asset) => asset.id), id)
    setPrintList((current) => ({ ...current, rows: current.rows.filter((asset) => asset.id !== id), lastAdd: null }))
    focusRequest.current = next ? { to: "row", id: next } : { to: "empty" }
  }

  function clearList() {
    setPrintList({ rows: [], lastAdd: null, registerIds: new Set() })
    setPreviewIndex(0)
    setRefreshFailed(false)
    focusRequest.current = { to: "empty" }
  }

  // The print route opens in a new tab (P6-R9): the ids in the query, tape and note in the hash. It records nothing
  // until its own print button is pressed.
  function openPrint(ids: readonly string[], printNote: string) {
    window.open(buildLabelPrintUrl({ locale, ids, tapeSize, note: printNote }), "_blank", "noopener,noreferrer")
  }

  function printLabels() {
    if (ordered.length === 0) return
    openPrint(ordered.map((asset) => asset.id), note)
  }

  function testPrint() {
    // P6-R8: the label the preview shows, as a batch of 1; with no note, "พิมพ์ทดสอบ" so the history tells it apart.
    const request = labelTestPrint(ordered, previewIndex, note, t("testPrintNote"))
    if (!request) return
    openPrint(request.ids, request.note)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 overflow-x-clip">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <AssetLabelSearchCard locale={locale} selectedIds={selectedIds} onAdd={addRows} />
          <AssetLabelQueueCard locale={locale} filterOptions={filterOptions} selectedIds={selectedIds} room={room} onAdd={addRows} />
        </div>

        <div className="min-w-0 space-y-5">
          <AssetLabelPrintList
            rows={ordered}
            order={order}
            onOrderChange={setOrder}
            status={status}
            fromRegisterCount={registerCount}
            summary={summary}
            onRemove={removeRow}
            onTestPrint={testPrint}
            onPrint={printLabels}
          />
          <AssetLabelPrintSettings
            rows={ordered}
            settings={settings}
            tapeSize={tapeSize}
            onTapeSizeChange={setTapeSize}
            note={note}
            onNoteChange={setNote}
            previewIndex={previewIndex}
            onPreviewIndexChange={setPreviewIndex}
          />
        </div>
      </div>

      {ordered.length > 0 ? (
        <DesktopSelectionBar
          label={t("listTitle")}
          countLabel={summary}
          clearLabel={t("clearList")}
          onClear={clearList}
          actions={<AssetLabelPrintActions count={ordered.length} onTestPrint={testPrint} onPrint={printLabels} className="contents" />}
        />
      ) : null}
    </div>
  )
}
