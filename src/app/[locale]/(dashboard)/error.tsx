"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"

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
    <div className="flex min-h-[calc(100dvh_-_var(--shell-top)_-_4rem)] items-center justify-center">
      <div className="w-full max-w-xl">
        <ActionEmptyState
          tone="error"
          title={t("unexpectedErrorTitle")}
          description={t("unexpectedErrorDescription")}
          action={(
            <Button onClick={unstable_retry}>
              <RefreshCw aria-hidden="true" />
              {t("tryAgain")}
            </Button>
          )}
        />
      </div>
    </div>
  )
}
