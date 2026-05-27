"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

type AssetStatusCorrectionButtonProps = {
  assetId: string
  readyStatusId: string
  labels: {
    button: string
    title: string
    description: string
    reason: string
    reasonPlaceholder: string
    cancel: string
    submit: string
    submitting: string
    errorFallback: string
  }
}

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitCorrection() {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/assets/${assetId}/status-correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatusId: readyStatusId, reason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error ?? labels.errorFallback)
        return
      }
      setOpen(false)
      setReason("")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
        {labels.button}
      </button>
      {open ? (
        <div className="rounded-md border border-warning/30 bg-background p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
          <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="asset-status-correction-reason">
            {labels.reason}
          </label>
          <textarea
            id="asset-status-correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={labels.reasonPlaceholder}
            className="mt-1 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={isSubmitting || reason.trim().length < 5}
              onClick={submitCorrection}
              className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? labels.submitting : labels.submit}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
