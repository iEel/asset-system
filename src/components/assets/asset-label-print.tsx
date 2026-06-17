"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Info, Loader2, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { isLikelyLocalAssetQrValue } from "@/lib/asset-qr"
import {
  assetLabelTapeSizes,
  buildAssetLabelTokenValues,
  defaultAssetLabelTemplates,
  formatAssetLabelPageSize,
  getAssetLabelTapePrinterSize,
  renderAssetLabelTemplate,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"

export type AssetLabelPrintItem = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
  category: string
  company: string
  branch: string
  location: string
  qrValue: string
}

type AssetLabelPrintProps = {
  assets: AssetLabelPrintItem[]
  backHref: string
  labelTemplates?: AssetLabelTemplates
  translations: {
    title: string
    preview: string
    print: string
    back: string
    tapeSize: string
    tape12mm: string
    tape18mm: string
    tape24mm: string
    tapeCustom: string
    printReason: string
    printReasonPlaceholder: string
    recordingPrint: string
    printRecorded: string
    printRecordFailed: string
    printerTapeGuidance: string
    qrPrintTarget: string
    qrLocalWarning: string
    scanHint: string
    assetTag: string
    assetName: string
    serialNumber: string
    category: string
    branch: string
    currentLocation: string
  }
}

export function AssetLabelPrint({
  assets,
  backHref,
  labelTemplates = defaultAssetLabelTemplates,
  translations,
}: AssetLabelPrintProps) {
  const [tapeSize, setTapeSize] = useState<AssetLabelTapeSize>(labelTemplates.defaultTapeSize)
  const [printReason, setPrintReason] = useState("")
  const [recordingPrint, setRecordingPrint] = useState(false)
  const [recordedBatchId, setRecordedBatchId] = useState<string | null>(null)
  const [recordError, setRecordError] = useState<string | null>(null)
  const config = labelTemplates.tapes[tapeSize]
  const itemCountText = useMemo(() => `${assets.length} ${translations.assetTag}`, [assets.length, translations.assetTag])
  const labelHeight = config.heightMm
  const pageSize = formatAssetLabelPageSize(config)
  const printerTapeSize = getAssetLabelTapePrinterSize(tapeSize)
  const printerTapeGuidance = translations.printerTapeGuidance.replace("{tapeSize}", printerTapeSize)
  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets])
  const qrPrintTarget = assets[0]?.qrValue ?? ""
  const hasLocalQrTarget = useMemo(() => assets.some((asset) => isLikelyLocalAssetQrValue(asset.qrValue)), [assets])

  async function handlePrint() {
    if (recordingPrint || assetIds.length === 0) return

    setRecordingPrint(true)
    setRecordError(null)
    setRecordedBatchId(null)
    try {
      const response = await fetch("/api/assets/label-prints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds,
          tapeSize,
          reason: printReason.trim() || null,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { batchId?: string } | null
      if (!response.ok) throw new Error("Unable to record label print")
      setRecordedBatchId(payload?.batchId ?? "recorded")
      window.print()
    } catch {
      setRecordError(translations.printRecordFailed)
    } finally {
      setRecordingPrint(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white">
      <style jsx global>{`
        @page {
          size: ${pageSize};
          margin: 0;
        }

        .asset-label-item {
          width: ${config.widthMm}mm;
          height: ${labelHeight}mm;
          color: #000000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .asset-label-item * {
          color: #000000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .asset-label-sheet {
          --asset-label-preview-scale: 1.2;
        }

        .asset-label-preview-frame {
          width: calc(${config.widthMm}mm * var(--asset-label-preview-scale));
          height: calc(${labelHeight}mm * var(--asset-label-preview-scale));
          flex: none;
          overflow: hidden;
        }

        .asset-label-preview-inner {
          width: ${config.widthMm}mm;
          height: ${labelHeight}mm;
          transform: scale(var(--asset-label-preview-scale));
          transform-origin: top left;
        }

        @media (min-width: 640px) {
          .asset-label-sheet {
            --asset-label-preview-scale: 1.45;
          }
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          .asset-label-toolbar,
          .asset-label-title {
            display: none !important;
          }

          .asset-label-preview {
            min-height: auto !important;
            padding: 0 !important;
          }

          .asset-label-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            overflow: visible !important;
          }

          .asset-label-preview-list {
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            gap: 0 !important;
          }

          .asset-label-preview-frame {
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
          }

          .asset-label-preview-inner {
            width: auto !important;
            height: auto !important;
            transform: none !important;
          }

          .asset-label-item {
            border: 0 !important;
            border-radius: 0 !important;
            page-break-after: always;
            break-after: page;
          }

          .asset-label-item:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <div className="asset-label-toolbar border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-h-10"
          >
            <ArrowLeft className="h-4 w-4" />
            {translations.back}
          </Link>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm sm:h-10 sm:min-w-[240px] sm:flex-nowrap sm:py-0">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.printReason}</span>
              <input
                type="text"
                value={printReason}
                onChange={(event) => setPrintReason(event.target.value)}
                placeholder={translations.printReasonPlaceholder}
                maxLength={500}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm sm:h-10 sm:w-auto">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.tapeSize}</span>
              <select
                value={tapeSize}
                onChange={(event) => setTapeSize(event.target.value as AssetLabelTapeSize)}
                className="min-w-0 flex-1 bg-transparent font-medium outline-none sm:flex-none"
              >
                {assetLabelTapeSizes.map((size) => (
                  <option key={size} value={size}>
                    {size === "12"
                      ? `${translations.tape12mm} / 0.47"`
                      : size === "18"
                        ? `${translations.tape18mm} / 0.70"`
                        : size === "24"
                          ? `${translations.tape24mm} / 0.94"`
                          : translations.tapeCustom}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handlePrint}
              disabled={recordingPrint}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:w-auto"
            >
              {recordingPrint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {recordingPrint ? translations.recordingPrint : translations.print}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 pb-4 sm:px-6">
          <p className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{printerTapeGuidance}</span>
          </p>
          <div
            className={
              hasLocalQrTarget
                ? "flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm"
                : "flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            }
          >
            {hasLocalQrTarget ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-foreground">{translations.qrPrintTarget}</div>
              <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{qrPrintTarget}</div>
              {hasLocalQrTarget ? <div className="mt-1 text-xs font-medium text-warning">{translations.qrLocalWarning}</div> : null}
            </div>
          </div>
        </div>
        {recordError || recordedBatchId ? (
          <div className="mx-auto max-w-5xl px-3 pb-4 text-sm sm:px-6">
            {recordError ? (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-danger">{recordError}</p>
            ) : (
              <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-success">{translations.printRecorded}</p>
            )}
          </div>
        ) : null}
      </div>

      <section className="asset-label-title mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-bold">{translations.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {translations.preview} · {itemCountText}
        </p>
      </section>

      <section className="asset-label-preview flex min-h-[calc(100vh-160px)] max-w-full items-start justify-center overflow-hidden px-3 pb-10 sm:px-6">
        <div className="asset-label-sheet w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md bg-white p-3 text-slate-950 shadow-sm sm:w-fit sm:p-4">
          <div className="asset-label-preview-list flex w-max min-w-full flex-col items-center gap-3">
            {assets.map((asset) => (
              <div key={asset.assetTag} className="asset-label-preview-frame">
                <div className="asset-label-preview-inner">
                  <AssetLabelItem
                    asset={asset}
                    config={config}
                    scanHint={translations.scanHint}
                    compactAssetNameEnabled={labelTemplates.compactAssetNameEnabled}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function AssetLabelItem({
  asset,
  config,
  scanHint,
  compactAssetNameEnabled,
}: {
  asset: AssetLabelPrintItem
  config: AssetLabelTemplates["tapes"][AssetLabelTapeSize]
  scanHint: string
  compactAssetNameEnabled: boolean
}) {
  const values = buildAssetLabelTokenValues({
    assetTag: asset.assetTag,
    assetName: asset.name,
    serialNumber: asset.serialNumber,
    category: asset.category,
    company: asset.company,
    branch: asset.branch,
    location: asset.location,
    scanHint,
  }, { compactAssetNameEnabled })
  const lines = config.lines.map((line) => renderAssetLabelTemplate(line, values).trim()).filter(Boolean)

  const isSmallTape = config.heightMm <= 12
  const primaryClass = isSmallTape
    ? "asset-label-text-line truncate text-[10px] font-black leading-[1.18] text-black"
    : "asset-label-text-line truncate text-[13px] font-black leading-[1.18] text-black"
  const secondaryClass = isSmallTape
    ? "asset-label-text-line mt-[0.6mm] truncate text-[6.5px] font-black leading-[1.25] text-black"
    : "asset-label-text-line mt-[0.7mm] truncate text-[7.5px] font-black leading-[1.25] text-black"
  const qr = (
    <div className="shrink-0 rounded-sm border border-slate-300 bg-white p-[0.8mm]">
      <QRCodeSVG value={asset.qrValue} size={config.qrSize} level="M" includeMargin={false} />
    </div>
  )
  const text = (
    <div className="min-w-0 overflow-hidden text-black">
      <div className={primaryClass}>{lines[0] || asset.assetTag}</div>
      {lines.slice(1).map((line, index) => (
        <div key={`${asset.assetTag}-${index}-${line}`} className={secondaryClass}>
          {line}
        </div>
      ))}
    </div>
  )

  return (
    <div className="asset-label-item overflow-hidden rounded border border-slate-300 bg-white" style={{ padding: `${config.marginMm}mm` }}>
      <div
        className={
          config.layout === "qr-top"
            ? "flex h-full flex-col items-center justify-center"
            : "grid h-full items-center"
        }
        style={
          config.layout === "qr-left"
            ? { gridTemplateColumns: "auto minmax(0, 1fr)", gap: `${config.gapMm}mm` }
            : { gap: `${config.gapMm}mm` }
        }
      >
        {config.layout === "text-only" ? text : config.layout === "qr-only" ? qr : config.layout === "qr-top" ? (
          <>
            {qr}
            <div className="w-full text-center">{text}</div>
          </>
        ) : (
          <>
            {qr}
            {text}
          </>
        )}
      </div>
    </div>
  )
}
