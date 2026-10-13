"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
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
      <Button variant="outline" onClick={() => setOpen((value) => !value)}>
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
      {open ? (
        <div className="rounded-md border border-warning-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
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
