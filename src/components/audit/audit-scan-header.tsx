"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

export function AuditScanHeader({
  roundName,
  backHref,
  progress,
}: {
  roundName: string
  backHref: string
  progress: { total: number; checked: number; mismatched: number }
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"
  const percent = progress.total === 0 ? 0 : Math.round((progress.checked / progress.total) * 100)

  return (
    <header data-audit-scan-header className="mb-2">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={backHref}
          aria-label={tCommon("back")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground md:text-xl" title={roundName}>
          {roundName}
        </h1>
      </div>
      <div className="mt-1 px-1">
        <div
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.checked}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
          <span>{t("progressChecked", { checked: progress.checked.toLocaleString(numberLocale), total: progress.total.toLocaleString(numberLocale) })}</span>
          {progress.mismatched > 0 ? (
            <span className="font-medium text-warning">{t("progressMismatch", { count: progress.mismatched.toLocaleString(numberLocale) })}</span>
          ) : null}
        </div>
      </div>
    </header>
  )
}
