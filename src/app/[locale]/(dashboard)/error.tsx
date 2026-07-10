"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ActionButton } from "@/components/ui/action-button"

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const t = useTranslations("common")

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
      <div className="w-full max-w-xl">
        <ActionEmptyState
          tone="error"
          title={t("unexpectedErrorTitle")}
          description={t("unexpectedErrorDescription")}
          action={(
            <ActionButton variant="primary" onClick={unstable_retry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("tryAgain")}
            </ActionButton>
          )}
        />
      </div>
    </div>
  )
}
