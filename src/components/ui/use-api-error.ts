"use client"

import { useCallback, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { describeApiError, isUnauthorizedError, type ApiErrorDescription } from "@/lib/api-error-catalog"
import { redirectToSessionExpiredLogin } from "@/lib/session-expiry"

/** Thai (or English) message for a server error, keeping the original text for admins. */
export function useApiError() {
  const t = useTranslations("apiErrors")
  const tCommon = useTranslations("common")
  const locale = useLocale()

  const describe = useCallback((error: unknown): ApiErrorDescription => {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : null
    return describeApiError(raw, { lookup: (key) => t(key), unknown: t("unknown"), empty: tCommon("error") })
  }, [t, tCommon])

  const showToast = useCallback((error: unknown) => {
    // A 401 means the session ended: go to the login with the reason instead of a toast; offline, the toast still shows.
    if (isUnauthorizedError(error) && redirectToSessionExpiredLogin(locale)) return
    const { message, detail } = describe(error)
    if (detail) console.warn("[server error]", detail)
    toast.error(message, detail ? { description: detail } : undefined)
  }, [describe, locale])

  return useMemo(() => ({ describe, toast: showToast }), [describe, showToast])
}
