import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { PaceBar } from "@/components/ui/pace-bar"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import type { WorkCenterPageData } from "@/lib/work-center-page-data"
import { WORK_SHOW_STEP } from "@/lib/work-center-rows"
import { buildWorkCenterHref, type WorkCenterParams } from "@/lib/work-center-view"

const rowLinkClasses = "flex min-h-11 items-center gap-2 rounded-sm text-sm text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"

// Board WC, spec §4.1: ติดตามแยก ไม่นับเป็นงานค้าง. The open round with most items left (its scan page), ข้อมูลทะเบียน
// ไม่ครบ (to the assets tab; null without asset:view) and เตือนล่วงหน้า (to the notifications page's section, shown
// while an advance key is visible). None of these is in งานค้างทั้งหมด. Hidden when all three are absent. Server-safe.
export function WorkCenterTracking({
  locale,
  params,
  tracking,
  showAdvance,
  className,
}: {
  locale: string
  params: WorkCenterParams
  tracking: WorkCenterPageData["tracking"]
  showAdvance: boolean
  className?: string
}) {
  const t = useTranslations("workCenter")
  const { round, dataIssues, advanceTotal } = tracking
  if (!round && dataIssues === null && !showAdvance) return null

  return (
    <section aria-labelledby="work-center-tracking" data-slot="work-center-tracking" className={cn("min-w-0 rounded-lg border border-border bg-surface px-4 py-3.5", className)}>
      <h2 id="work-center-tracking" className="text-sm font-semibold text-foreground">{t("tracking.title")}</h2>
      {round ? (
        <div className="mt-2.5 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="min-w-0 flex-1 break-words text-foreground">{round.name}</span>
            <span className="shrink-0 num text-muted-foreground max-md:hidden">{t("tracking.roundProgress", { checked: round.checked, total: round.total })}</span>
            <span className="shrink-0 num text-muted-foreground md:hidden">{t("tracking.roundChecked", { checked: round.checked, total: round.total })}</span>
          </div>
          <div className="mt-1.5">
            <PaceBar value={round.total > 0 ? round.checked / round.total : 0} pace={null} behind={false} label={t("tracking.roundBar", { checked: round.checked, total: round.total })} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span className="tag">{round.auditNo}</span>
            <span>· {t("tracking.pending", { count: round.pending })}</span>
            <Link href={`/${locale}/audit/rounds/${round.id}/scan`} className={cn(linkVariants(), "ms-auto inline-flex min-h-11 items-center md:min-h-0")}>
              {t("tracking.continueScan")}
            </Link>
          </div>
        </div>
      ) : null}
      {dataIssues !== null || showAdvance ? (
        <ul className={cn("flex flex-col gap-2", round && "mt-2.5 border-t border-border-soft pt-2.5")}>
          {dataIssues !== null ? (
            <li>
              <Link href={buildWorkCenterHref(locale, params, { panel: "assets", show: WORK_SHOW_STEP })} className={rowLinkClasses}>
                <span className="min-w-0 flex-1">{t("tracking.dataIssues")}</span>
                <span className="font-semibold num">{t("tracking.pieces", { count: dataIssues })}</span>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-faint-foreground" />
              </Link>
            </li>
          ) : null}
          {showAdvance ? (
            <li>
              <Link href={`/${locale}/notifications#advance`} className={rowLinkClasses}>
                <span className="min-w-0 flex-1">{t("tracking.advance")}</span>
                <span className="font-semibold num">{formatCount(advanceTotal)}</span>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-faint-foreground" />
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  )
}
