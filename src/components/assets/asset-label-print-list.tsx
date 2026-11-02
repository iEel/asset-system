"use client"

import { ChevronLeft, ChevronRight, Printer, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetLabelPreview } from "@/components/assets/asset-label-sheet"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { LABEL_PRINT_NOTE_MAX } from "@/lib/asset-label-print-hash"
import {
  labelPreviewIndex,
  labelPrintOrders,
  labelSheetAsset,
  labelTapeText,
  type LabelPrintOrder,
} from "@/lib/asset-label-print-list-rules"
import type { AssetLabelPrintSettings as AssetLabelPrintSettingsData } from "@/lib/asset-label-print-settings"
import type { LabelQueueRow } from "@/lib/asset-label-queue"
import { assetLabelTapeSizes, getAssetLabelTapePrinterSize, type AssetLabelTapeSize } from "@/lib/asset-label-template"
import { isLikelyLocalAssetQrValue } from "@/lib/asset-qr"

// The labels page's right column (group 4 plan 6 Task 5, spec §11, board AR-Labels): the numbered print list with its
// count and order, then the settings (tape and note) with a label-by-label preview. The shell holds the state. The two
// print actions sit in the page's bar from md (P6-R10) and at the end of the list card below md, where there is no bar.

/**
 * "พิมพ์ทดสอบ 1 ดวง" then "พิมพ์ป้าย {n} ดวง", the primary last. With an empty list both wait and point at the list's
 * empty note, the reason (spec §4.4); the handlers return first.
 */
export function AssetLabelPrintActions({
  count,
  onTestPrint,
  onPrint,
  className,
}: {
  count: number
  onTestPrint: () => void
  onPrint: () => void
  className?: string
}) {
  const t = useTranslations("assetTools.labelsPage")
  const waits = count === 0

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="md"
        aria-disabled={waits || undefined}
        aria-describedby={waits ? "asset-label-print-reason" : undefined}
        onClick={onTestPrint}
      >
        {t("testPrint")}
      </Button>
      <Button
        size="md"
        aria-disabled={waits || undefined}
        aria-describedby={waits ? "asset-label-print-reason" : undefined}
        onClick={onPrint}
      >
        <Printer aria-hidden="true" />
        {t("print", { count })}
      </Button>
    </div>
  )
}

export function AssetLabelPrintList({
  rows,
  order,
  onOrderChange,
  status,
  fromRegisterCount,
  summary,
  onRemove,
  onTestPrint,
  onPrint,
}: {
  // In print order, at most 100 (P6-R2).
  rows: LabelQueueRow[]
  order: LabelPrintOrder
  onOrderChange: (order: LabelPrintOrder) => void
  // The list's status line (P6-R2): what an add could not take, that the list is full, or that a refresh failed.
  status: string | null
  // How many came from the register's selection (P6-R1); 0 hides the line.
  fromRegisterCount: number
  // "{n} ดวงที่จะพิมพ์ · เทป {size}", the bar's line, over the actions below md.
  summary: string
  onRemove: (id: string) => void
  onTestPrint: () => void
  onPrint: () => void
}) {
  const t = useTranslations("assetTools.labelsPage")

  return (
    <ContentPanel
      divided
      flush
      title={t("listTitle")}
      actions={
        <>
          <StatusBadge label={t("listCount", { count: rows.length })} tone="info" />
          <NativeSelect
            aria-label={t("orderLabel")}
            fieldSize="md"
            value={order}
            onChange={(event) => onOrderChange(event.target.value as LabelPrintOrder)}
            className="w-auto"
          >
            {labelPrintOrders.map((value) => (
              <option key={value} value={value}>{t(`order.${value}`)}</option>
            ))}
          </NativeSelect>
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyNote id="asset-label-print-reason" padded>{t("listEmpty")}</EmptyNote>
      ) : (
        <ol aria-label={t("listTitle")} className="divide-y divide-border-soft">
          {rows.map((asset, index) => (
            <li key={asset.id} data-label-selected-row={asset.id} className="flex min-h-14 min-w-0 items-center gap-2.5 py-2 pr-2 pl-4 md:pl-5">
              <span aria-hidden="true" className="num w-6 shrink-0 text-meta text-muted-foreground">{formatCount(index + 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-foreground">{asset.name}</span>
                <span className="block text-meta text-muted-foreground">
                  <span className="tag">{asset.assetTag}</span>
                </span>
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(asset.id)} aria-label={t("remove", { tag: asset.assetTag })}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <p role="status" className="border-t border-border-soft px-4 py-2.5 text-meta text-muted-foreground empty:hidden md:px-5">{status}</p>
      {fromRegisterCount > 0 ? (
        <p className="border-t border-border-soft px-4 py-2.5 text-meta text-muted-foreground md:px-5">{t("fromRegister", { count: fromRegisterCount })}</p>
      ) : null}
      <div className="grid gap-2 border-t border-border-soft px-4 py-3 md:hidden">
        {rows.length > 0 ? <p className="text-meta text-muted-foreground">{summary}</p> : null}
        <AssetLabelPrintActions count={rows.length} onTestPrint={onTestPrint} onPrint={onPrint} className="grid gap-2 sm:grid-cols-2" />
      </div>
    </ContentPanel>
  )
}

export function AssetLabelPrintSettings({
  rows,
  settings,
  tapeSize,
  onTapeSizeChange,
  note,
  onNoteChange,
  previewIndex,
  onPreviewIndexChange,
}: {
  // In print order: the preview steps through them.
  rows: LabelQueueRow[]
  settings: Pick<AssetLabelPrintSettingsData, "templates" | "qrBaseUrl">
  tapeSize: AssetLabelTapeSize
  onTapeSizeChange: (size: AssetLabelTapeSize) => void
  note: string
  onNoteChange: (note: string) => void
  previewIndex: number
  onPreviewIndexChange: (index: number) => void
}) {
  const t = useTranslations("assetTools.labelsPage")
  const tAsset = useTranslations("asset")
  const index = labelPreviewIndex(previewIndex, rows.length)
  const shown = rows[index]
  // The QR as it will print, built from the base the server resolved (recon X11).
  const sheetAsset = shown ? labelSheetAsset(shown, settings.qrBaseUrl) : null
  const tapeText = labelTapeText(tapeSize, t("tapeCustom"))

  return (
    <ContentPanel divided title={t("settingsTitle")}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span id="asset-label-tape-size" className="text-sm font-medium text-foreground">{t("tapeSize")}</span>
          <Segmented
            labelledBy="asset-label-tape-size"
            fill
            value={tapeSize}
            onValueChange={onTapeSizeChange}
            options={assetLabelTapeSizes.map((size) => ({ value: size, label: labelTapeText(size, t("tapeCustom")) }))}
          />
        </div>
        <Field label={t("note")} hint={t("noteHint", { max: LABEL_PRINT_NOTE_MAX })}>
          <Input
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={LABEL_PRINT_NOTE_MAX}
            placeholder={t("notePlaceholder")}
          />
        </Field>
        {sheetAsset ? (
          <div className="grid gap-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <span className="text-sm font-medium text-foreground">{t("previewTitle")}</span>
              <span className="num ml-auto text-meta text-muted-foreground">{t("previewPosition", { index: index + 1, total: rows.length })}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("previewPrevious")}
                aria-disabled={index === 0 || undefined}
                onClick={() => {
                  if (index > 0) onPreviewIndexChange(index - 1)
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("previewNext")}
                aria-disabled={index >= rows.length - 1 || undefined}
                onClick={() => {
                  if (index < rows.length - 1) onPreviewIndexChange(index + 1)
                }}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
            {/* The shared part is the forced-light paper: the label looks printed on either theme (dark mode P-R3). */}
            <AssetLabelPreview
              asset={sheetAsset}
              template={settings.templates.tapes[tapeSize]}
              scanHint={tAsset("scanToOpenDetail")}
              compactAssetNameEnabled={settings.templates.compactAssetNameEnabled}
              label={t("previewName", { size: tapeText, tag: sheetAsset.assetTag })}
            />
          </div>
        ) : null}
        <Notice tone="neutral">{t("brotherHint", { size: getAssetLabelTapePrinterSize(tapeSize) })}</Notice>
        {sheetAsset ? (
          <>
            <p className="text-meta text-muted-foreground">
              {t("qrTarget")} <span className="break-all font-mono text-foreground">{sheetAsset.qrValue}</span>
            </p>
            {isLikelyLocalAssetQrValue(sheetAsset.qrValue) ? <Notice tone="warning">{tAsset("labelQrLocalWarning")}</Notice> : null}
          </>
        ) : null}
      </div>
    </ContentPanel>
  )
}
