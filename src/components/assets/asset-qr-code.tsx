"use client"

import { QRCodeSVG } from "qrcode.react"

export function AssetQrCode({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
      <QRCodeSVG value={value} size={160} level="M" includeMargin />
      <div className="max-w-44 text-center text-xs font-medium text-foreground">{label}</div>
    </div>
  )
}
