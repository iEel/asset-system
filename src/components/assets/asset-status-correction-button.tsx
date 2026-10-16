"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"

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
    errorFallback: string
  }
}

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const panelId = useId()
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
      {/* Spec 2D M27: the trigger says whether the panel is open; aria-controls only points at a panel that exists. */}
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
      {open ? (
        // A quiet grouping inside the lifecycle panel: controls never sit in a warning box (spec 2D D7).
        <div id={panelId} className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <Notice tone="neutral" className="mt-1">{labels.description}</Notice>
          <Field label={labels.reason} className="mt-3">
            <Textarea
              id="asset-status-correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={labels.reasonPlaceholder}
              className="min-h-24"
            />
          </Field>
          {error ? <p className="mt-2 text-sm text-danger"><ApiErrorText error={error} /></p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              {labels.cancel}
            </Button>
            <Button busy={isSubmitting} disabled={reason.trim().length < 5} onClick={submitCorrection}>
              {labels.submit}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
