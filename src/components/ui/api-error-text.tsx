"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { useApiError } from "@/components/ui/use-api-error"
import { isUnauthorizedError } from "@/lib/api-error-catalog"
import { redirectToSessionExpiredLogin } from "@/lib/session-expiry"

/** Inline server error: Thai first line, original server text as a small grey second line. */
export function ApiErrorText({ error, className }: { error: unknown; className?: string }) {
  const { describe } = useApiError()
  const locale = useLocale()
  const { message, detail } = describe(error)

  useEffect(() => {
    if (detail) console.warn("[server error]", detail)
  }, [detail])

  // A 401 shown inline also ends the session: the redirect runs after render, never during it.
  useEffect(() => {
    if (isUnauthorizedError(error)) redirectToSessionExpiredLogin(locale)
  }, [error, locale])

  return (
    <span className={className}>
      {message}
      {detail ? <span className="block text-xs font-normal text-muted-foreground">{detail}</span> : null}
    </span>
  )
}
