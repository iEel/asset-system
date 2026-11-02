"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  buildAssetLabelTokenValues,
  renderAssetLabelTemplate,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"

// The one label drawing (group 4 plan 6 Task 2, recon X1): the print route's sheet and the labels page's preview both
// draw it. The label sizes itself in mm from its template with inline styles and prints black on white, so it looks the
// same wherever it renders; nothing here sets a page size or a print rule (the print route keeps those, and the labels page
// must never get them). Both wrappers are forced-light scopes: the label looks printed on a dark page (dark mode P-R3).

export type AssetLabelSheetAsset = {
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

export type AssetLabelTapeTemplate = AssetLabelTemplates["tapes"][AssetLabelTapeSize]

type AssetLabelContentProps = {
  template: AssetLabelTapeTemplate
  scanHint: string
  compactAssetNameEnabled: boolean
}

const cssPxPerMm = 96 / 25.4

export function AssetLabelItem({ asset, template, scanHint, compactAssetNameEnabled }: AssetLabelContentProps & { asset: AssetLabelSheetAsset }) {
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
  const lines = template.lines.map((line) => renderAssetLabelTemplate(line, values).trim()).filter(Boolean)

  const isSmallTape = template.heightMm <= 12
  const primaryClass = isSmallTape
    ? "asset-label-text-line truncate text-[10px] font-black leading-[1.18] text-black"
    : "asset-label-text-line truncate text-[13px] font-black leading-[1.18] text-black"
  const secondaryClass = isSmallTape
    ? "asset-label-text-line mt-[0.6mm] truncate text-[6.5px] font-black leading-[1.25] text-black"
    : "asset-label-text-line mt-[0.7mm] truncate text-[7.5px] font-black leading-[1.25] text-black"
  // The QR's title names the svg (qrcode.react gives it role="img"), so axe's svg-img-alt passes.
  const qr = (
    <div className="shrink-0 rounded-sm border border-slate-300 bg-white p-[0.8mm]">
      <QRCodeSVG value={asset.qrValue} title={asset.assetTag} size={template.qrSize} level="M" includeMargin={false} />
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
    <div
      className="asset-label-item overflow-hidden rounded border border-slate-300 bg-white text-black"
      style={{
        width: `${template.widthMm}mm`,
        height: `${template.heightMm}mm`,
        padding: `${template.marginMm}mm`,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        className={
          template.layout === "qr-top"
            ? "flex h-full flex-col items-center justify-center"
            : "grid h-full items-center"
        }
        style={
          template.layout === "qr-left"
            ? { gridTemplateColumns: "auto minmax(0, 1fr)", gap: `${template.gapMm}mm` }
            : { gap: `${template.gapMm}mm` }
        }
      >
        {template.layout === "text-only" ? text : template.layout === "qr-only" ? qr : template.layout === "qr-top" ? (
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

// The print route's sheet: every label stacked on white paper, each shown 1.2× (1.45× from sm). The print route's own
// print rules (its global style block) drop the scale, the paper and the gaps through the asset-label-* classes.
export function AssetLabelSheet({ assets, template, scanHint, compactAssetNameEnabled }: AssetLabelContentProps & { assets: AssetLabelSheetAsset[] }) {
  return (
    <div data-theme="light" className="asset-label-sheet w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md bg-white p-3 text-slate-950 shadow-sm [--asset-label-scale:1.2] sm:w-fit sm:p-4 sm:[--asset-label-scale:1.45]">
      <div className="asset-label-preview-list flex w-max min-w-full flex-col items-center gap-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="asset-label-preview-frame flex-none overflow-hidden"
            style={{ width: `calc(${template.widthMm}mm * var(--asset-label-scale))`, height: `calc(${template.heightMm}mm * var(--asset-label-scale))` }}
          >
            <div className="asset-label-preview-inner origin-top-left" style={{ transform: "scale(var(--asset-label-scale))" }}>
              <AssetLabelItem asset={asset} template={template} scanHint={scanHint} compactAssetNameEnabled={compactAssetNameEnabled} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// One label scaled to fit its frame (the labels page's preview): never wider than the frame and at most maxScale times
// its printed size. The frame is light paper on either theme; it has no print rules.
export function AssetLabelPreview({
  asset,
  template,
  scanHint,
  compactAssetNameEnabled,
  label,
  maxScale = 2,
}: AssetLabelContentProps & { asset: AssetLabelSheetAsset; label?: string; maxScale?: number }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const labelWidthPx = template.widthMm * cssPxPerMm
  const labelHeightPx = template.heightMm * cssPxPerMm

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const fit = () => {
      const room = frame.clientWidth
      if (room > 0) setScale(Math.min(maxScale, room / labelWidthPx))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [labelWidthPx, maxScale])

  return (
    <div
      data-theme="light"
      role={label ? "group" : undefined}
      aria-label={label}
      className="flex justify-center rounded-md border border-border bg-muted p-4 text-foreground"
    >
      <div ref={frameRef} className="flex w-full min-w-0 justify-center">
        <div className="flex-none overflow-hidden" style={{ width: labelWidthPx * scale, height: labelHeightPx * scale }}>
          <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
            <AssetLabelItem asset={asset} template={template} scanHint={scanHint} compactAssetNameEnabled={compactAssetNameEnabled} />
          </div>
        </div>
      </div>
    </div>
  )
}
