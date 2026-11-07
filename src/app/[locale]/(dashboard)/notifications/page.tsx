import type { ReactNode } from "react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Check } from "lucide-react"
import { NotificationReadAllButton } from "@/components/notifications/notification-center-actions"
import { NotificationDigestPanel } from "@/components/notifications/notification-digest-panel"
import { NotificationTopicRow, type NotificationRowLabels } from "@/components/notifications/notification-topic-row"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"
import { requireAuth } from "@/lib/auth-utils"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import {
  buildNotificationsHref,
  getNotificationsPageData,
  NOTIFICATION_STATUS_TABS,
  type NotificationTopicRow as TopicRow,
} from "@/lib/notifications-page-data"
import { cn } from "@/lib/utils"

type NotificationsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string | string[]; assigned?: string | string[]; digest?: string | string[] }>
}

// A previous recorded day is a Bangkok date stored at UTC midnight.
function formatPreviousDay(day: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(day)
}

// Board NT (group 9 plan 3 task 2, spec §5.2, §6.2): การแจ้งเตือน with the unread-topic number (the bell's and the work
// center's), the help strip, the status tabs with the มอบหมายแล้ว chip and ทำเป็นอ่านแล้วทั้งหมด, the งานค้าง and
// เตือนล่วงหน้า sections of topic rows, the footer sum, and สรุปรายวันที่ส่งแล้ว beside the list from lg (after it on
// phones). Every number and row comes from getNotificationsPageData, which also records today's counts (G9P3-R2).
export default async function NotificationsPage({ params, searchParams }: NotificationsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requireAuth()
  const t = await getTranslations("notifications")
  const data = await getNotificationsPageData(user, { searchParams: rawSearchParams, locale })
  // C2: the work center needs dashboard:view; the loader reads it with hasPermission(user, "dashboard", "view").
  const canOpenWorkCenter = data.canOpenWorkCenter
  const now = new Date()
  const previousDayLabel = data.previousDay && !data.previousDay.isYesterday ? formatPreviousDay(data.previousDay.day, locale) : null

  const statusItems: TabNavItem[] = NOTIFICATION_STATUS_TABS.map((status) => ({
    key: status,
    label: t(`tabs.${status}`),
    count: formatCount(data.counts[status]),
    href: buildNotificationsHref(locale, data.params, { status }),
  }))

  const rowLabels: NotificationRowLabels = {
    markRead: t("actions.markRead"),
    markUnread: t("actions.markUnread"),
    snooze: t("actions.snooze"),
    snoozeDay: t("actions.snoozeDay"),
    snoozeThreeDays: t("actions.snoozeThreeDays"),
    snoozeWeek: t("actions.snoozeWeek"),
    cancelSnooze: t("actions.cancelSnooze"),
    changeAssignee: t("actions.changeAssignee"),
    assignDialogTitle: t("actions.assignDialogTitle"),
    assignDialogDescription: t("actions.assignDialogDescription"),
    assignTo: t("assignTo"),
    unassigned: t("unassigned"),
    save: t("actions.save"),
    saved: t("saved"),
    error: t("saveFailed"),
  }
  const renderRows = (rows: TopicRow[]) =>
    rows.map((row) => (
      <NotificationTopicRow
        key={row.key}
        row={row}
        locale={locale}
        now={now}
        previousDayLabel={previousDayLabel}
        assignees={data.assignees}
        labels={rowLabels}
      />
    ))
  const sectionTotals = (items: number, previousItems: number | null) => {
    const parts = [t("sections.items", { count: items })]
    if (previousItems !== null) {
      parts.push(previousDayLabel ? t("sections.onDay", { date: previousDayLabel, count: previousItems }) : t("sections.yesterday", { count: previousItems }))
    }
    return parts.join(" · ")
  }
  const hasRows = data.backlog.rows.length + data.advance.rows.length > 0

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {t("title")}
            {data.counts.unread > 0 ? (
              <span aria-hidden="true" className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold num text-primary-foreground">
                {formatCount(data.counts.unread)}
              </span>
            ) : null}
          </span>
        }
        meta={
          <>
            <span className="font-medium text-foreground num">{t("bellLine", { count: data.counts.unread })}</span>
            <span>{t("pageSubtitle")}</span>
          </>
        }
        actions={canOpenWorkCenter ? (
          <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openWorkCenter")}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : undefined}
      />

      <Notice tone="info">{t.rich("help", { b: (chunks) => <b className="font-semibold text-foreground">{chunks}</b> })}</Notice>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        {/* Phone: the four tabs are a 2 × 2 grid below sm, so nothing scrolls sideways. */}
        <nav aria-label={t("statusNavigation")} className="sm:hidden">
          <ul className="grid grid-cols-2 gap-1.5 sm:hidden">
            {statusItems.map((item) => {
              const selected = item.key === data.params.status
              return (
                <li key={item.key} className="flex min-w-0">
                  <Link
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-row-hover",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="num">{item.count}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <TabNav aria-label={t("statusNavigation")} current={data.params.status} items={statusItems} scroll={false} className="min-w-0 flex-1 max-sm:hidden" />
        <div className="flex flex-wrap items-center gap-2 sm:pb-1.5">
          <Link
            href={buildNotificationsHref(locale, data.params, { assigned: !data.params.assigned })}
            aria-current={data.params.assigned ? "true" : undefined}
            scroll={false}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-8",
              data.params.assigned ? "border-primary-border bg-primary-soft font-semibold text-primary-hover" : "border-control-border bg-surface text-foreground hover:border-input",
            )}
          >
            {data.params.assigned ? <Check aria-hidden="true" className="size-4" /> : null}
            <span className="num">{t("assignedFilter", { count: data.counts.assigned })}</span>
          </Link>
          {data.counts.unread > 0 ? (
            <NotificationReadAllButton
              locale={locale}
              labels={{ markAllRead: t("markAllReadCommand"), saved: t("saved"), error: t("saveFailed") }}
            />
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div aria-label={t("topicsLabel", { count: data.counts.all })} role="region" className={cn(getPanelClasses(), "min-w-0 overflow-hidden")}>
          {hasRows ? null : <EmptyNote padded>{t(`empty.${data.params.status}`)}</EmptyNote>}
          {data.backlog.rows.length > 0 ? (
            <TopicSection
              id="backlog"
              title={t("sections.backlog")}
              meta={t("sections.backlogMeta", { queues: data.backlog.queues })}
              totals={sectionTotals(data.backlog.items, data.backlog.previousItems)}
            >
              {renderRows(data.backlog.rows)}
            </TopicSection>
          ) : null}
          {data.advance.rows.length > 0 ? (
            <TopicSection
              id="advance"
              title={t("sections.advance")}
              meta={t("sections.advanceMeta")}
              totals={sectionTotals(data.advance.items, data.advance.previousItems)}
            >
              {renderRows(data.advance.rows)}
            </TopicSection>
          ) : null}
          <p className="border-t border-border px-4 py-2.5 text-xs num text-muted-foreground">
            {t("footer", { total: data.counts.all, unread: data.counts.unread, read: data.counts.read, snoozed: data.counts.snoozed })}
          </p>
        </div>

        <NotificationDigestPanel locale={locale} params={data.params} digest={data.digest} />
      </div>
    </div>
  )
}

// One section of the list: a tinted head (title, what it holds, its items and the previous day) over its rows.
function TopicSection({ id, title, meta, totals, children }: { id: string; title: string; meta: string; totals: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-border first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-soft bg-background px-4 py-2.5">
        <h2 id={`${id}-heading`} className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{meta}</span>
        <span className="ms-auto text-meta num text-muted-foreground">{totals}</span>
      </div>
      <ul>{children}</ul>
    </section>
  )
}
