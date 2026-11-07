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
export function WorkCenterViewSwitch({ locale, params }: { locale: string; params: WorkCenterParams }) {
  const t = useTranslations("workCenter")
  return (
    <nav aria-label={t("viewNavigation")} data-slot="work-center-view-switch" className="max-w-full overflow-x-auto">
      <ul className={cn("inline-flex", segmentedFrameClasses)}>
        {workCenterViews.map((view) => {
          const selected = view === params.view
          return (
            <li key={view} className="flex">
              <Link
                href={buildWorkCenterHref(locale, params, { view, show: WORK_SHOW_STEP })}
                aria-current={selected ? "page" : undefined}
                className={cn(segmentedOptionClasses, segmentedSizeClasses.md, "whitespace-nowrap px-3", selected ? segmentedPressedClasses : segmentedIdleClasses)}
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
    <TabNav
      aria-label={t("focusNavigation")}
      current={params.panel}
      items={items}
      scroll={false}
    />
  )
}
