"use client"

import { QRCodeSVG } from "qrcode.react"

// The QR panel of the asset page is the frame (spec 2D D9): no box inside it. includeMargin keeps the white quiet zone
// that a scanner needs, drawn by the SVG itself.
export function AssetQrCode({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <QRCodeSVG value={value} size={160} level="M" includeMargin />
      <div className="max-w-44 text-center text-sm text-foreground">
        <span className="tag font-medium">{label}</span>
      </div>
    </div>
  )
}
