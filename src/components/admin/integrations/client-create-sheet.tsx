"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import type { IntegrationLabels } from "@/components/admin/IntegrationClientManager"
import { Button } from "@/components/ui/button"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Notice } from "@/components/ui/notice"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// The plain token of a create or a rotate, held by the composer's state only, with what step 1's summary shows.
export type OneTimeToken = {
  clientId: string
  displayName: string
  scopes: readonly string[]
  token: string
}

export type CopyFeedback = {
  tone: "success" | "error"
  message: string
}

type ClientCreateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  labels: IntegrationLabels
  scopeLabels: Readonly<Record<string, string>>
  // Step 1 before create: the create form (its fields, validation and submit stay with the composer).
  form: ReactNode
  error: string | null
  token: OneTimeToken | null
  tokenAcknowledgement: boolean
  onTokenAcknowledgementChange: (checked: boolean) => void
  copyFeedback: CopyFeedback | null
  onCopyToken: () => void
  dismissToken: () => void
}

// Board AD-Integrations (group 12 spec §10): สร้าง client in a side panel. Step 1 is the form; after create it collapses
// to a summary (the display name, the client ID and the scopes) and step 2 shows the one-time token with copy, the
// warning and the acknowledgement. While a token is shown and not acknowledged, the panel cannot close: the X, Escape
// and a click outside are all refused, and the hint under the dismiss button says why. A rotate opens the same panel
// at step 2.
export function ClientCreateSheet({
  open,
  onOpenChange,
  title,
  labels,
  scopeLabels,
  form,
  error,
  token,
  tokenAcknowledgement,
  onTokenAcknowledgementChange,
  copyFeedback,
  onCopyToken,
  dismissToken,
}: ClientCreateSheetProps) {
  const hintId = useId()
  const tokenStepRef = useRef<HTMLHeadingElement | null>(null)
  const gated = token !== null && !tokenAcknowledgement

  // The form unmounts on create, so focus moves to step 2's heading, which a screen reader then reads.
  useEffect(() => {
    if (token) tokenStepRef.current?.focus()
  }, [token])

  function requestOpenChange(next: boolean) {
    if (!next && gated) return
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (gated) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (gated) event.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section aria-labelledby={`${hintId}-step1`} className="space-y-3 border-b border-border-soft px-4 py-4">
            <h3 id={`${hintId}-step1`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <StepNumber done={token !== null}>1</StepNumber>
              {labels.stepDetails}
            </h3>
            {token ? (
              <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-2 gap-y-1 pl-8 text-meta">
                <dt className="text-muted-foreground">{labels.displayName}</dt>
                <dd className="min-w-0 break-words text-foreground">{token.displayName}</dd>
                <dt className="text-muted-foreground">{labels.clientId}</dt>
                <dd className="min-w-0 truncate text-foreground">
                  <span className="tag">{token.clientId}</span>
                </dd>
                <dt className="text-muted-foreground">{labels.scopes}</dt>
                <dd className="min-w-0 text-foreground">{token.scopes.map((scope) => scopeLabels[scope] ?? scope).join(" · ")}</dd>
              </dl>
            ) : (
              <>
                {error ? (
                  <Notice tone="danger" role="alert">
                    {labels.error}: {error}
                  </Notice>
                ) : null}
                {form}
              </>
            )}
          </section>
          {token ? (
            <section aria-labelledby={`${hintId}-step2`} className="space-y-4 px-4 py-4">
              <h3 id={`${hintId}-step2`} ref={tokenStepRef} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold text-foreground focus-visible:outline-none">
                <StepNumber done={false}>2</StepNumber>
                {labels.tokenPanelTitle}
              </h3>
              <Notice tone="warning">{labels.tokenPanelWarning}</Notice>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">
                  {labels.tokenFor} <span className="tag">{token.clientId}</span>
                </div>
                {/* The token is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
                <div className="mt-1 break-all font-mono text-sm text-foreground">{token.token}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={onCopyToken}>
                  <Copy aria-hidden="true" />
                  {labels.copyToken}
                </Button>
                {copyFeedback ? (
                  <Notice tone={copyFeedback.tone === "success" ? "success" : "danger"} role="status">
                    {copyFeedback.message}
                  </Notice>
                ) : null}
              </div>
              <label className="flex min-h-11 items-start gap-3 rounded-md border border-border px-3 py-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={tokenAcknowledgement}
                  onChange={(event) => onTokenAcknowledgementChange(event.target.checked)}
                  className={cn(checkboxVariants(), "mt-0.5")}
                />
                <span>{labels.tokenAcknowledgement}</span>
              </label>
            </section>
          ) : null}
        </div>
        {token ? (
          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
            {gated ? <p id={hintId} className="text-meta text-muted-foreground sm:mr-auto">{labels.dismissHint}</p> : null}
            <Button onClick={dismissToken} disabled={!tokenAcknowledgement} aria-describedby={gated ? hintId : undefined}>
              {labels.dismissToken}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function StepNumber({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-control border text-meta font-semibold",
        done ? "border-primary bg-primary text-primary-foreground" : "border-primary-border bg-primary-soft text-primary"
      )}
    >
      {done ? <Check className="size-3.5" /> : children}
    </span>
  )
}
