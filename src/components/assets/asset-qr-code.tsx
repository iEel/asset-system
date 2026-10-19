"use client"

import { useTranslations } from "next-intl"
import { QRCodeSVG } from "qrcode.react"

// The QR panel of the asset page is the frame (spec 2D D9): no box inside it. includeMargin keeps the white quiet zone
// that a scanner needs, drawn by the SVG itself. qrcode.react draws <svg role="img">: its title is the image's name for
// a screen reader (WCAG 1.1.1; the E2E suite's findings TX-A2, AR2, M6).
export function AssetQrCode({ value, label }: { value: string; label: string }) {
  const t = useTranslations("asset")
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <QRCodeSVG value={value} size={160} level="M" includeMargin title={t("qrCodeTitle", { label })} />
      <div className="max-w-44 text-center text-sm text-foreground">
        <span className="tag font-medium">{label}</span>
      </div>
    </div>
  )
}
