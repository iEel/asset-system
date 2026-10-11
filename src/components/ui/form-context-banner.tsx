import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FormContextBannerProps = {
  label: string
  // A string or an element. Never cut: a title tooltip does not work on touch screens.
  value: ReactNode
  // A record code in the mono tag style before the value. Pass it only when the caller already has the code on its own.
  code?: string
  className?: string
}

// The record a form is about, as one quiet data row (spec 2C section 3.10, K24): no tinted box, no capitals. Server-safe.
export function FormContextBanner({ label, value, code, className }: FormContextBannerProps) {
  return (
    <dl data-slot="form-context-banner" className={cn("flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5", className)}>
      <dt className="text-meta text-faint-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">
        {code ? (
          <>
            <span className="tag">{code}</span>{" "}
          </>
        ) : null}
        {value}
      </dd>
    </dl>
  )
}
