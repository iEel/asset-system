"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { buttonVariants } from "@/components/ui/button-variants"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export function AuditScanHeader({
  roundName,
  roundCode,
  backHref,
  progress,
}: {
  /** "code - name": the h1 text for screen readers and the title, shown in full from md up. */
  roundName: string
  /** What a phone shows in the h1, so the counts fit on the same line. */
  roundCode: string
  backHref: string
  progress: { total: number; checked: number; mismatched: number }
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const percent = progress.total === 0 ? 0 : Math.round((progress.checked / progress.total) * 100)

  return (
    <header data-audit-scan-header className="mb-1">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={backHref}
          aria-label={tCommon("back")}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground md:text-xl" title={roundName}>
          <span aria-hidden="true" className="md:hidden">{roundCode}</span>
          <span className="sr-only md:not-sr-only">{roundName}</span>
        </h1>
        <p className="shrink-0 pr-1 text-meta num text-muted-foreground">
          {t("progressChecked", { checked: formatCount(progress.checked), total: formatCount(progress.total) })}
          {" · "}
          <span className={cn(progress.mismatched > 0 && "font-medium text-warning")}>
            {t("progressMismatch", { count: formatCount(progress.mismatched) })}
          </span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t("progress")}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.checked}
        className="h-1 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </header>
  )
}
