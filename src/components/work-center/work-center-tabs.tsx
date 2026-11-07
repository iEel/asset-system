import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  segmentedFrameClasses,
  segmentedIdleClasses,
  segmentedOptionClasses,
  segmentedPressedClasses,
  segmentedSizeClasses,
} from "@/components/ui/segmented"
import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { WORK_SHOW_STEP } from "@/lib/work-center-rows"
import { buildWorkCenterHref, workCenterViews, type WorkCenterPanel, type WorkCenterParams } from "@/lib/work-center-view"
import type { WorkQueueSummary } from "@/lib/work-queues"

// Board WC: งานทั้งหมด / งานของฉัน beside the title. The view is in the URL, so each option is a link named by the
// <nav> and marked with aria-current (R-g), drawn in Segmented's look like RecordStatusSegmented. It keeps the panel
// and drops show (a new view starts at the first 8 rows). Server-safe.
// Board WC-Phone: below md the page renders a second copy fullWidth under the title (the header's copy is hidden there).
export function WorkCenterViewSwitch({
  locale,
  params,
  fullWidth = false,
  className,
}: {
  locale: string
  params: WorkCenterParams
  fullWidth?: boolean
  className?: string
}) {
  const t = useTranslations("workCenter")
  return (
    <nav aria-label={t("viewNavigation")} data-slot="work-center-view-switch" className={cn("max-w-full overflow-x-auto", className)}>
      <ul className={cn(fullWidth ? "flex w-full" : "inline-flex", segmentedFrameClasses)}>
        {workCenterViews.map((view) => {
          const selected = view === params.view
          return (
            <li key={view} className={cn("flex", fullWidth && "flex-1")}>
              <Link
                href={buildWorkCenterHref(locale, params, { view, show: WORK_SHOW_STEP })}
                aria-current={selected ? "page" : undefined}
                className={cn(segmentedOptionClasses, segmentedSizeClasses.md, "whitespace-nowrap px-3", fullWidth && "flex-1", selected ? segmentedPressedClasses : segmentedIdleClasses)}
              >
                {view === "all" ? t("allWork") : t("myWork")}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Board WC: ภาพรวม (งานค้างทั้งหมด), one tab per visible queue with its count, and ข้อมูลไม่ครบ (n ชิ้น) only with
// asset:view (the loader gives its count as null without it). The links keep view and drop show.
export function WorkCenterTabs({
  locale,
  params,
  summary,
  dataIssues,
}: {
  locale: string
  params: WorkCenterParams
  summary: WorkQueueSummary
  dataIssues: number | null
}) {
  const t = useTranslations("workCenter")
  const hrefFor = (panel: WorkCenterPanel) => buildWorkCenterHref(locale, params, { panel, show: WORK_SHOW_STEP })
  const items: TabNavItem[] = [
    { key: "overview", label: t("tabs.overview"), count: formatCount(summary.backlogTotal), href: hrefFor("overview") },
    ...summary.queues.map((entry) => ({
      key: entry.queue,
      label: t(`queue.${entry.queue}`),
      count: formatCount(entry.count),
      href: hrefFor(entry.queue),
    })),
    ...(dataIssues !== null
      ? [{ key: "assets", label: t("tabs.assets"), count: t("tracking.pieces", { count: dataIssues }), href: hrefFor("assets") }]
      : []),
  ]
  return (
    <>
      {/* Board WC-Phone: a 3 × 2 grid below md, each cell its label over its count; ข้อมูลไม่ครบ takes the sixth cell
          on the page's background with a muted word (it is tracking, not a queue; N2 keeps dashed lines for the drop
          zone). */}
      <nav aria-label={t("focusNavigation")} className="md:hidden">
        <ul data-slot="work-center-tabs-grid" className="grid grid-cols-3 gap-1.5 md:hidden">
          {items.map((item) => {
            const selected = item.key === params.panel
            return (
              <li key={item.key} className="flex min-w-0">
                <Link
                  href={item.href}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full min-w-0 flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center text-meta leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : item.key === "assets"
                        ? "border-border bg-background text-muted-foreground hover:bg-row-hover"
                        : "border-border bg-surface text-foreground hover:bg-row-hover",
                  )}
                >
                  <span className="max-w-full truncate">{item.label}</span>
                  <span className={cn("num", item.key === "assets" && !selected ? "font-medium" : "font-semibold")}>{item.count}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <TabNav
        aria-label={t("focusNavigation")}
        current={params.panel}
        items={items}
        scroll={false}
        className="max-md:hidden"
      />
    </>
  )
}
