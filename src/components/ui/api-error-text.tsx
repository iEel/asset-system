"use client"

import { useEffect } from "react"
import { useApiError } from "@/components/ui/use-api-error"

/** Inline server error: Thai first line, original server text as a small grey second line. */
export function ApiErrorText({ error, className }: { error: unknown; className?: string }) {
  const { describe } = useApiError()
  const { message, detail } = describe(error)

  useEffect(() => {
    if (detail) console.warn("[server error]", detail)
  }, [detail])

  return (
    <span className={className}>
      {message}
      {detail ? <span className="block text-xs font-normal text-muted-foreground">{detail}</span> : null}
    </span>
  )
}
