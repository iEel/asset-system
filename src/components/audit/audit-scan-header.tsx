"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { buttonVariants } from "@/components/ui/button-variants"
import { PaceBar } from "@/components/ui/pace-bar"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// The field scan's own two-line header (spec §11; LFG LH1 and LB1 keep its h1 and back link): the round's code over its
// name, "x / y" over "ไม่ตรง N" (data-audit-scan-progress, which the E2E reads), then the round's PaceBar (The Data
// Bars Rule; the words beside it carry the same).
export function AuditScanHeader({
  roundName,
  roundCode,
  backHref,
  progress,
}: {
  /** The round's name, the small second line. */
  roundName: string
  /** The round's number, the first line. */
  roundCode: string
  backHref: string
  /** The round's own items (P3-R1); ไม่ตรง as the round page folds it (P3-R2). */
  progress: { total: number; checked: number; mismatched: number }
}) {
  const t = useTranslations("auditScan")
  const checked = formatCount(progress.checked)
  const total = formatCount(progress.total)

  return (
    <header data-audit-scan-header className="mb-1 space-y-1.5">
      <div className="flex min-w-0 items-center gap-1">
        <Link href={backHref} aria-label={t("backToRound")} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 text-foreground">
          <span className="block truncate text-base font-semibold md:text-xl">{roundCode}</span>
          <span className="block truncate text-meta text-muted-foreground">{roundName}</span>
        </h1>
        <p data-audit-scan-progress className="shrink-0 pr-1 text-right text-meta num text-muted-foreground">
          <span className="block font-medium text-foreground">{t("progressCount", { checked, total })}</span>
          <span className={cn("block", progress.mismatched > 0 && "font-medium text-warning")}>{t("progressMismatch", { count: formatCount(progress.mismatched) })}</span>
        </p>
      </div>
      <PaceBar value={progress.total === 0 ? 0 : progress.checked / progress.total} pace={null} label={t("progressChecked", { checked, total })} behind={false} />
    </header>
  )
}
