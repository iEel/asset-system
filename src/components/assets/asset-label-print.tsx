"use client"

import { useEffect, useMemo, useState } from "react"
import { Printer } from "lucide-react"
import { AssetLabelSheet, type AssetLabelSheetAsset } from "@/components/assets/asset-label-sheet"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { PageBackLink } from "@/components/ui/page-header"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { isLikelyLocalAssetQrValue } from "@/lib/asset-qr"
import { parseAssetLabelPrintHash } from "@/lib/asset-label-print-hash"
import {
  assetLabelTapeSizes,
  defaultAssetLabelTemplates,
  formatAssetLabelPageSize,
  getAssetLabelTapePrinterSize,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"
import { cn } from "@/lib/utils"
import { maxLength } from "@/lib/validation-rules"

// The print's one field, keyed like the server's fieldErrors (the label-prints route), with the id focus moves to
// (v-track M-R1). The tape size always holds one of its choices.
const FIELD_IDS = {
  reason: "asset-label-print-reason",
} as const
type PrintField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as PrintField[]

// noValidate turns the browser's check off, so this restates the reason's maxLength, the server's max(500) (v-track M-R2).
function validate(values: { reason: string }): Partial<Record<PrintField, string>> {
  const errors: Partial<Record<PrintField, string>> = {}
  const check = (key: PrintField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", maxLength(values.reason, 500))
  return errors
}

// The label's data and drawing live in the shared sheet (group 4 plan 6 Task 2); the labels page's preview draws the same.
export type AssetLabelPrintItem = AssetLabelSheetAsset

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
  const fieldErrors = useFieldErrors<PrintField>()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const config = labelTemplates.tapes[tapeSize]
  const itemCountText = useMemo(() => `${assets.length} ${translations.assetTag}`, [assets.length, translations.assetTag])
  const pageSize = formatAssetLabelPageSize(config)
  const printerTapeSize = getAssetLabelTapePrinterSize(tapeSize)
  const printerTapeGuidance = translations.printerTapeGuidance.replace("{tapeSize}", printerTapeSize)
  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets])
  const qrPrintTarget = assets[0]?.qrValue ?? ""
  const hasLocalQrTarget = useMemo(() => assets.some((asset) => isLikelyLocalAssetQrValue(asset.qrValue)), [assets])

  // The labels page sends tape and note in the hash (P6-R9). They only fill the fields: nothing prints or records until
  // the print button is pressed, so a reload of this page records nothing (Review Focus 5). Unknown values keep the
  // defaults. After hydration, as the asset form reads its hash.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const prefill = parseAssetLabelPrintHash(window.location.hash, labelTemplates.defaultTapeSize)
      setTapeSize(prefill.tapeSize)
      setPrintReason(prefill.note)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [labelTemplates.defaultTapeSize])

  async function handlePrint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (recordingPrint || assetIds.length === 0) return
    fieldErrors.setErrors(validate({ reason: printReason }))
    if (focusFirstError()) return

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
      if (!response.ok) {
        // A refusal of the reason shows under it; any other keeps the record error (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error("Unable to record label print")
      }
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
          {/* The shared back button (outline md, an icon button below md); self-start keeps it from stretching in the phone column. */}
          <PageBackLink href={backHref} label={translations.back} className="max-md:self-start" />
          {/* The toolbar is the print's form: Enter in the reason prints, and the reason's error shows under the row. */}
          <form onSubmit={handlePrint} noValidate className="grid min-w-0 gap-1.5">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={cn(
                  "flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-base sm:min-w-[240px] sm:flex-nowrap sm:py-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus",
                  // The field error look of the shared fields (cn drops border-input); focus turns it teal again.
                  fieldErrors.errors.reason && "border-danger ring-1 ring-danger shadow-field-error",
                )}
              >
                <span className="shrink-0 font-medium text-muted-foreground">{translations.printReason}</span>
                <input
                  id="asset-label-print-reason"
                  type="text"
                  value={printReason}
                  onChange={(event) => {
                    setPrintReason(event.target.value)
                    fieldErrors.clear("reason")
                  }}
                  aria-invalid={fieldErrors.errors.reason ? true : undefined}
                  aria-describedby={fieldErrors.errors.reason ? "asset-label-print-reason-error" : undefined}
                  placeholder={translations.printReasonPlaceholder}
                  maxLength={500}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              {/* Spec 2D M27: shrink-0 keeps the tape box at its value's width; the reason box beside it takes the shrink. */}
              <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base sm:w-auto sm:shrink-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
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
              <Button type="submit" size="lg" busy={recordingPrint} className="w-full sm:w-auto">
                <Printer aria-hidden="true" />
                {translations.print}
              </Button>
            </div>
            {fieldErrors.errors.reason ? <FieldError id="asset-label-print-reason-error">{fieldErrors.message("reason")}</FieldError> : null}
          </form>
        </div>
        {/* Spec 2D D7: the tape advice is guidance (neutral); a local QR address is a warning box, the public one neutral. */}
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 pb-4 sm:px-6">
          <Notice tone="neutral">{printerTapeGuidance}</Notice>
          <Notice tone={hasLocalQrTarget ? "warning" : "neutral"} title={translations.qrPrintTarget}>
            <span className="break-all font-mono">{qrPrintTarget}</span>
            {hasLocalQrTarget ? <span className="mt-1 block">{translations.qrLocalWarning}</span> : null}
          </Notice>
        </div>
        {recordError || recordedBatchId ? (
          <div className="mx-auto max-w-5xl px-3 pb-4 sm:px-6">
            {recordError ? (
              <Notice tone="danger" role="alert">{recordError}</Notice>
            ) : (
              <Notice tone="success" role="status">{translations.printRecorded}</Notice>
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
        {/* The shared sheet is the forced-light scope: the labels stay as they print on a dark page (dark mode P-R3). */}
        <AssetLabelSheet
          assets={assets}
          template={config}
          scanHint={translations.scanHint}
          compactAssetNameEnabled={labelTemplates.compactAssetNameEnabled}
        />
      </section>
    </main>
  )
}
