"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

type AssetLabelPrintProps = {
  asset: {
    assetTag: string
    name: string
    serialNumber?: string | null
    category: string
    company: string
    branch: string
    location: string
  }
  backHref: string
  qrValue: string
  translations: {
    title: string
    preview: string
    print: string
    back: string
    scanHint: string
    assetTag: string
    assetName: string
    serialNumber: string
    category: string
    branch: string
    currentLocation: string
  }
}

export function AssetLabelPrint({ asset, backHref, qrValue, translations }: AssetLabelPrintProps) {
  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
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

      <section className="asset-label-title mx-auto max-w-5xl px-6 py-6">
        <h1 className="text-2xl font-bold">{translations.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{translations.preview}</p>
      </section>

      <section className="asset-label-preview flex min-h-[calc(100vh-160px)] items-start justify-center px-6 pb-10">
        <div className="asset-label-sheet w-[100mm] rounded-md border border-slate-300 bg-white p-[6mm] text-slate-950 shadow-sm">
          <div className="grid grid-cols-[32mm_1fr] gap-[5mm]">
            <div className="flex flex-col items-center">
              <div className="rounded-sm border border-slate-300 bg-white p-1">
                <QRCodeSVG value={qrValue} size={112} level="M" includeMargin />
              </div>
              <div className="mt-2 text-center text-[8px] leading-tight text-slate-600">{translations.scanHint}</div>
            </div>

            <div className="min-w-0">
              <div className="text-[7px] font-semibold uppercase tracking-normal text-slate-500">
                {translations.assetTag}
              </div>
              <div className="break-words text-[17px] font-bold leading-tight text-slate-950">{asset.assetTag}</div>

              <div className="mt-2 text-[7px] font-semibold uppercase tracking-normal text-slate-500">
                {translations.assetName}
              </div>
              <div className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-900">{asset.name}</div>

              <dl className="mt-3 grid grid-cols-1 gap-1 text-[8px] leading-tight">
                <LabelRow label={translations.serialNumber} value={asset.serialNumber} />
                <LabelRow label={translations.category} value={asset.category} />
                <LabelRow label={translations.branch} value={`${asset.company} / ${asset.branch}`} />
                <LabelRow label={translations.currentLocation} value={asset.location} />
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function LabelRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[20mm_1fr] gap-1">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-900">{value || "-"}</dd>
    </div>
  )
}
