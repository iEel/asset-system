import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Bell } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { WorkCenterAssetsPanel } from "@/components/work-center/work-center-assets-panel"
import { WorkCenterStrip } from "@/components/work-center/work-center-strip"
import { WorkCenterTabs, WorkCenterViewSwitch } from "@/components/work-center/work-center-tabs"
import { WorkCenterTracking } from "@/components/work-center/work-center-tracking"
import { WorkRowsTable } from "@/components/work-center/work-rows-table"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { getWorkCenterPageData } from "@/lib/work-center-page-data"
import { buildWorkCenterHref, parseWorkCenterParams, type WorkCenterParamInput } from "@/lib/work-center-view"

type WorkCenterPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<WorkCenterParamInput>
}

// Board WC (group 9 plan 2 Task 2, spec §4): ศูนย์งานค้าง with the view switch and the notifications link; the strip
// (ต้องทำวันนี้, งานค้างทั้งหมด with the previous day, a cell per queue, the sum) beside ติดตามแยก; the queue tabs; one
// ranked table with the urgency, the next step and ⋯, and แสดงเพิ่ม; the ข้อมูลไม่ครบ tab keeps its fix cards and list.
// Every number and row comes from getWorkCenterPageData; the page reads nothing else.
// Board WC-Phone (Task 3, spec §4.2 "Phone"): below md the view switch is full width under the title, the strip's grid
// dissolves (contents), ติดตามแยก is rendered a second time after the list (each copy hidden at the other width, so
// the DOM order is the reading order), the tabs are a 3 × 2 grid and rows are cards.
export default async function WorkCenterPage({ params, searchParams }: WorkCenterPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "dashboard", "view")
  // The rows' links come back here with the same view, tab and rows on screen.
  const returnTo = buildWorkCenterHref(locale, parseWorkCenterParams(rawSearchParams))
  const t = await getTranslations("workCenter")
  const data = await getWorkCenterPageData(user, { searchParams: rawSearchParams, locale, returnTo })

  return (
    <div className="flex flex-col gap-4 md:block md:space-y-4">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <WorkCenterViewSwitch locale={locale} params={data.params} className="max-md:hidden" />
            <Link
              href={`/${locale}/notifications`}
              aria-label={t("notificationsLinkLabel", { count: data.unreadTopics })}
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              <Bell aria-hidden="true" />
              {t("notificationsLink")}
              {data.unreadTopics > 0 ? (
                <span aria-hidden="true" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold num text-primary-foreground">
                  {formatCount(data.unreadTopics)}
                </span>
              ) : null}
            </Link>
          </>
        }
      />

      <WorkCenterViewSwitch locale={locale} params={data.params} fullWidth className="md:hidden" />

      {data.mineUnavailable ? <Notice tone="warning">{t("myWorkUnavailable")}</Notice> : null}

      <div className="contents md:grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,20rem)]">
        <WorkCenterStrip locale={locale} params={data.params} summary={data.summary} previous={data.previous} />
        <WorkCenterTracking
          locale={locale}
          params={data.params}
          tracking={data.tracking}
          showAdvance={data.summary.advance.keys.length > 0}
          className="max-md:hidden md:col-span-2 xl:col-span-1"
        />
      </div>

      <WorkCenterTabs locale={locale} params={data.params} summary={data.summary} dataIssues={data.tracking.dataIssues} />

      {data.table ? (
        <WorkRowsTable locale={locale} params={data.params} summary={data.summary} counts={data.counts} table={data.table} />
      ) : null}
      {data.assets ? <WorkCenterAssetsPanel locale={locale} assets={data.assets} /> : null}
      {/* Phone: ติดตามแยก after the list in the DOM too, so reading, focus and heading order match what shows. */}
      <WorkCenterTracking
        locale={locale}
        params={data.params}
        tracking={data.tracking}
        showAdvance={data.summary.advance.keys.length > 0}
        headingId="work-center-tracking-phone"
        className="md:hidden"
      />
    </div>
  )
}
