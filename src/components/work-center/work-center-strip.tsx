import Link from "next/link"
import { useTranslations } from "next-intl"
import { buttonVariants } from "@/components/ui/button-variants"
import { formatCount } from "@/lib/display-format"
import { cn, formatDate } from "@/lib/utils"
import type { WorkCenterPageData } from "@/lib/work-center-page-data"
import { WORK_SHOW_STEP } from "@/lib/work-center-rows"
import { buildWorkCenterHref, type WorkCenterParams } from "@/lib/work-center-view"

const cardClasses = "flex min-w-0 flex-col rounded-lg border border-border bg-surface px-4 py-4 md:px-5"

// Board WC, spec §3 and §4.1: ต้องทำวันนี้ (รออนุมัติ + อนุมัติแล้วรอบันทึกตัดจำหน่าย, with its two links) and
// งานค้างทั้งหมด (with the previous recorded day, one cell per visible queue linking to its tab, and the sum written
// out). Every number is a database count of the current view; the rows on screen are only a slice. Two grid items:
// the page places them beside ติดตามแยก. Server-safe.
export function WorkCenterStrip({
  locale,
  params,
  summary,
  previous,
}: {
  locale: string
  params: WorkCenterParams
  summary: WorkCenterPageData["summary"]
  previous: WorkCenterPageData["previous"]
}) {
  const t = useTranslations("workCenter")
  const sumLine = `${summary.queues.map((entry) => formatCount(entry.count)).join(" + ")} = ${formatCount(summary.backlogTotal)}`

  return (
    <>
      <section aria-labelledby="work-center-today" data-slot="work-center-today" className={cn(cardClasses, "border-primary-border")}>
        <h2 id="work-center-today" className="text-sm font-semibold text-foreground">{t("today.title")}</h2>
        <p className="mt-0.5 text-metric num text-foreground">{formatCount(summary.today.total)}</p>
        <p className="mt-0.5 text-meta text-muted-foreground">
          {t("today.parts", { approvals: summary.today.approvals, approved: summary.today.approvedDisposals })}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {summary.approvalParts ? (
            <Link href={`/${locale}/admin/approvals`} className={cn(buttonVariants({ size: "md" }), "flex-1")}>
              {t("today.review", { count: summary.today.approvals })}
            </Link>
          ) : null}
          {summary.today.approvedDisposals > 0 ? (
            <Link href={`/${locale}/disposal?status=approved`} className={buttonVariants({ variant: "outline", size: "md" })}>
              {t("today.recordDisposal", { count: summary.today.approvedDisposals })}
            </Link>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="work-center-backlog" data-slot="work-center-backlog" className={cardClasses}>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 id="work-center-backlog" className="text-sm font-semibold text-foreground">{t("backlog.title")}</h2>
          <span className="text-xl font-semibold num text-foreground">{formatCount(summary.backlogTotal)}</span>
          {previous ? (
            <span className="ms-auto text-meta num text-muted-foreground">
              {previous.isYesterday
                ? t("backlog.yesterday", { count: previous.backlogTotal })
                : t("backlog.onDay", { date: formatDate(previous.dayLabelDate), count: previous.backlogTotal })}
              {previousChange(t, previous.backlogChange)}
            </span>
          ) : null}
        </div>
        {summary.queues.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summary.queues.map((entry) => (
              <li key={entry.queue} className="min-w-0">
                <Link
                  href={buildWorkCenterHref(locale, params, { panel: entry.queue, show: WORK_SHOW_STEP })}
                  className="block min-h-11 rounded-md border border-border px-2.5 py-2 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-meta text-muted-foreground">{t(`queue.${entry.queue}`)}</span>
                  <span className="block text-xl font-semibold num text-foreground">{formatCount(entry.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2.5 text-xs num text-muted-foreground">{t("backlog.sumNote", { sum: sumLine })}</p>
      </section>
    </>
  )
}

// " · เพิ่ม 5" / " · ลด 2" / " · เท่าเดิม"; nothing when the change is unknown.
function previousChange(t: (key: string, values?: Record<string, number>) => string, change: NonNullable<WorkCenterPageData["previous"]>["backlogChange"]) {
  if (change.kind === "unknown") return null
  const text = change.kind === "same"
    ? t("backlog.same")
    : change.kind === "down"
      ? t("backlog.down", { count: change.delta })
      : t("backlog.up", { count: change.delta })
  return ` · ${text}`
}
