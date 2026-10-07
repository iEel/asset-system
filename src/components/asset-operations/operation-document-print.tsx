"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { VoidDocumentBanner, type VoidDocumentInfo } from "@/components/asset-operations/void-document-banner"

type DocumentField = {
  label: string
  value?: string | null
}

type SignatureBox = {
  title: string
  helper: string
  imageSrc?: string | null
}

type OperationDocumentPrintProps = {
  title: string
  subtitle: string
  backHref: string
  backLabel: string
  printLabel: string
  sections: Array<{
    title: string
    fields: DocumentField[]
  }>
  signatures: SignatureBox[]
  voidInfo?: VoidDocumentInfo | null
  toolbarActions?: React.ReactNode
}

export function OperationDocumentPrint({
  title,
  subtitle,
  backHref,
  backLabel,
  printLabel,
  sections,
  signatures,
  voidInfo,
  toolbarActions,
}: OperationDocumentPrintProps) {
  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          .operation-print-toolbar {
            display: none !important;
          }

          .operation-print-page {
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: none !important;
          }

          [data-void-watermark] {
            display: flex !important;
          }
        }
      `}</style>

      <div className="operation-print-toolbar border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href={backHref} className="inline-flex h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {toolbarActions}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <Printer className="h-4 w-4" />
              {printLabel}
            </button>
          </div>
        </div>
      </div>

      <section className="px-6 py-8 print:px-0 print:py-0">
        <div className="operation-print-page relative mx-auto max-w-5xl overflow-hidden rounded-md border border-slate-300 bg-white p-8 text-slate-950 shadow-sm">
          {voidInfo ? <div data-void-watermark className="pointer-events-none absolute inset-0 z-0 hidden items-center justify-center print:flex" aria-hidden="true"><span className="-rotate-12 text-8xl font-black tracking-[-0.03em] text-red-600/10">VOID</span></div> : null}
          <div className="relative z-10">
            {voidInfo ? <VoidDocumentBanner info={voidInfo} /> : null}
            <header className="border-b border-slate-300 pb-5">
              <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Asset Management System</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </header>

            <div className="mt-6 grid grid-cols-1 gap-5">
            {sections.map((section) => (
              <section key={section.title} className="break-inside-avoid">
                <h2 className="mb-2 text-sm font-bold text-slate-950">{section.title}</h2>
                <div className="grid grid-cols-1 border border-slate-300 sm:grid-cols-2">
                  {section.fields.map((field, index) => (
                    <div key={`${section.title}-${field.label}-${index}`} className="grid grid-cols-[38%_1fr] border-b border-r border-slate-200 last:border-b-0">
                      <dt className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{field.label}</dt>
                      <dd className="min-h-9 break-words px-3 py-2 text-sm text-slate-950">{field.value || "-"}</dd>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            </div>

            <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {signatures.map((signature) => (
              <div key={signature.title} className="break-inside-avoid rounded-sm border border-slate-300 p-4">
                <div className="flex h-20 items-center justify-center border-b border-slate-300">
                  {signature.imageSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signature.imageSrc} alt={signature.title} className="max-h-16 max-w-full object-contain" />
                  )}
                </div>
                <div className="mt-3 text-center text-sm font-semibold text-slate-950">{signature.title}</div>
                <div className="mt-1 text-center text-xs text-slate-500">{signature.helper}</div>
              </div>
            ))}
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
