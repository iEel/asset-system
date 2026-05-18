"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  defaultAssetLabelTemplates,
  assetLabelTapeSizes,
  renderAssetLabelTemplate,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"

export type AssetLabelPrintItem = {
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
  const config = labelTemplates.tapes[tapeSize]
  const itemCountText = useMemo(() => `${assets.length} ${translations.assetTag}`, [assets.length, translations.assetTag])
  const labelHeight = config.heightMm

  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white">
      <style jsx global>{`
        @page {
          size: ${config.widthMm}mm ${labelHeight}mm;
          margin: 0;
        }

        .asset-label-item {
          width: ${config.widthMm}mm;
          height: ${labelHeight}mm;
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
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {translations.back}
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
              <span className="font-medium text-muted-foreground">{translations.tapeSize}</span>
              <select
                value={tapeSize}
                onChange={(event) => setTapeSize(event.target.value as AssetLabelTapeSize)}
                className="bg-transparent font-medium outline-none"
              >
                {assetLabelTapeSizes.map((size) => (
                  <option key={size} value={size}>
                    {size === "12"
                      ? translations.tape12mm
                      : size === "18"
                        ? translations.tape18mm
                        : size === "24"
                          ? translations.tape24mm
                          : translations.tapeCustom}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Printer className="h-4 w-4" />
              {translations.print}
            </button>
          </div>
        </div>
      </div>

      <section className="asset-label-title mx-auto max-w-5xl px-6 py-6">
        <h1 className="text-2xl font-bold">{translations.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {translations.preview} · {itemCountText}
        </p>
      </section>

      <section className="asset-label-preview flex min-h-[calc(100vh-160px)] items-start justify-center px-6 pb-10">
        <div className="asset-label-sheet flex max-w-full flex-col gap-3 rounded-md bg-white p-4 text-slate-950 shadow-sm">
          {assets.map((asset) => (
            <AssetLabelItem key={asset.assetTag} asset={asset} config={config} scanHint={translations.scanHint} />
          ))}
        </div>
      </section>
    </main>
  )
}

function AssetLabelItem({
  asset,
  config,
  scanHint,
}: {
  asset: AssetLabelPrintItem
  config: AssetLabelTemplates["tapes"][AssetLabelTapeSize]
  scanHint: string
}) {
  const values = {
    assetTag: asset.assetTag,
    assetName: asset.name,
    serialNumber: asset.serialNumber ?? "",
    category: asset.category,
    company: asset.company,
    branch: asset.branch,
    location: asset.location,
    scanHint,
  }
  const lines = config.lines.map((line) => renderAssetLabelTemplate(line, values).trim()).filter(Boolean)

  const isSmallTape = config.heightMm <= 12
  const primaryClass = isSmallTape ? "truncate text-[10px] font-bold leading-none" : "truncate text-[13px] font-bold leading-tight"
  const secondaryClass = isSmallTape ? "mt-[0.8mm] truncate text-[6px] leading-tight text-slate-600" : "mt-[0.8mm] truncate text-[7px] leading-tight text-slate-700"
  const qr = (
    <div className="shrink-0 rounded-sm border border-slate-300 bg-white p-[0.8mm]">
      <QRCodeSVG value={asset.qrValue} size={config.qrSize} level="M" includeMargin={false} />
    </div>
  )
  const text = (
    <div className="min-w-0">
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
            ? { gridTemplateColumns: "auto 1fr", gap: `${config.gapMm}mm` }
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
