import { useTranslations } from "next-intl"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { bangkokDayDiff } from "@/lib/preventive-maintenance"
import type { RepairStrip } from "@/lib/repair-list-view"
import { formatDate } from "@/lib/utils"

// The repair list's "ต้องจัดการ" strip (group 5 spec §11.1, plan 5 G5P5-R1, R2). Server-safe (no "use client"). The
// heading sums the four cells, with their parts on a visible line under it; at 0 it says there is nothing to handle and
// the strip still shows. The cells count globally, like the bell, and link to their plain targets: the open records,
// the stuck card on this page and the PM page's due filters. Only the stuck and PM-overdue cells can need attention.
// Day counts compare Bangkok days.
export function RepairListStrip({ strip, locale, current }: { strip: RepairStrip; locale: string; current: boolean }) {
  const t = useTranslations("repairRecord")
  const now = new Date()
  const longest = (earliest: Date | null) => (earliest ? t("stripLongestDays", { days: bangkokDayDiff(earliest, now) }) : undefined)
  const items: StatStripItem[] = [
    {
      key: "open",
      label: t("stripOpen"),
      value: formatCount(strip.open.count),
      href: `/${locale}/maintenance?status=in_progress`,
      current,
      foot: longest(strip.open.earliest),
      data: { "data-repair-strip-cell": "open" },
    },
    {
      key: "stuck",
      label: t("stripStuck"),
      value: formatCount(strip.stuck),
      href: "#stuck",
      attention: strip.stuck > 0,
      foot: strip.stuck > 0 ? t("stripStuckFoot") : undefined,
      data: { "data-repair-strip-cell": "stuck" },
    },
    {
      key: "pmOverdue",
      label: t("stripPmOverdue"),
      value: formatCount(strip.pmOverdue.count),
      href: `/${locale}/maintenance/pm?due=overdue`,
      attention: strip.pmOverdue.count > 0,
      foot: longest(strip.pmOverdue.earliest),
      data: { "data-repair-strip-cell": "pmOverdue" },
    },
    {
      key: "pmWeek",
      label: t("stripPmWeek"),
      value: formatCount(strip.pmWeek.count),
      href: `/${locale}/maintenance/pm?due=week`,
      foot: strip.pmWeek.earliest ? t("pmDueOn", { date: formatDate(strip.pmWeek.earliest) }) : t("stripPmWeekNone"),
      data: { "data-repair-strip-cell": "pmWeek" },
    },
  ]

  return (
    <section aria-labelledby="repair-strip-title" className="space-y-3">
      <div>
        <h2 id="repair-strip-title" className="text-base font-semibold text-foreground">
          {strip.total > 0 ? t("stripTitle", { count: formatCount(strip.total) }) : t("stripEmpty")}
        </h2>
        {strip.total > 0 ? (
          <p data-repair-strip-sum className="text-meta text-muted-foreground">
            {[strip.open.count, strip.stuck, strip.pmOverdue.count, strip.pmWeek.count].map((count) => formatCount(count)).join(" + ")}
          </p>
        ) : null}
      </div>
      <StatStrip items={items} />
    </section>
  )
}
