"use client"

import { useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { describeApiError, type ApiErrorDescription } from "@/lib/api-error-catalog"

/** Thai (or English) message for a server error, keeping the original text for admins. */
export function useApiError() {
  const t = useTranslations("apiErrors")
  const tCommon = useTranslations("common")

  const describe = useCallback((error: unknown): ApiErrorDescription => {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : null
    return describeApiError(raw, { lookup: (key) => t(key), unknown: t("unknown"), empty: tCommon("error") })
  }, [t, tCommon])

  const showToast = useCallback((error: unknown) => {
    const { message, detail } = describe(error)
    if (detail) console.warn("[server error]", detail)
    toast.error(message, detail ? { description: detail } : undefined)
  }, [describe])

  return useMemo(() => ({ describe, toast: showToast }), [describe, showToast])
}
