import { useTranslations } from "next-intl"
import { Clock3 } from "lucide-react"
import { NotificationCenterActions, NotificationOpenLink } from "@/components/notifications/notification-center-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { topicStatePill, type NotificationTopicRow as TopicRow } from "@/lib/notifications-page-data"
import { cn } from "@/lib/utils"

export type NotificationRowLabels = Omit<Parameters<typeof NotificationCenterActions>[0]["labels"], "menu">

type Translate = ReturnType<typeof useTranslations<"notifications">>

// Board NT (group 9 plan 3 task 2, spec §5.2): one topic. The whole row is a link that marks the topic read and opens
// its queue; ⋯ sits beside it. Unread rows carry a dot and a bold title, read and snoozed rows are muted with a ring or
// a clock. From md the row is one line (marker, title and detail, count, change, pill); below md it stacks: title,
// detail, count with its change, then the pill. Server-safe; the link and ⋯ are client parts.
export function NotificationTopicRow({
  row,
  locale,
  now,
  previousDayLabel,
  assignees,
  labels,
}: {
  row: TopicRow
  locale: string
  now: Date
  /** null when the previous recorded day is yesterday. */
  previousDayLabel: string | null
  assignees: { id: string; label: string }[]
  labels: NotificationRowLabels
}) {
  const t = useTranslations("notifications")
  const title = t(row.key)
  const detail = t(row.detail.key, row.detail.values)
  const pill = topicStatePill(row, now, locale)
  const unread = row.state === "unread"

  return (
    <li className="flex items-start gap-1 border-b border-border-soft pr-2 last:border-b-0 hover:bg-row-hover md:items-center md:pr-3">
      <NotificationOpenLink
        item={{ key: row.key, count: row.count, href: row.href }}
        errorLabel={labels.error}
        className="grid min-w-0 flex-1 grid-cols-[0.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 py-2.5 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[0.75rem_minmax(0,1fr)_3.5rem_8.5rem_10rem] md:items-center md:pl-4"
      >
        <span className="flex h-5.5 items-center justify-center">
          {row.state === "snoozed" ? (
            <Clock3 aria-hidden="true" className="size-3.5 text-muted-foreground" />
          ) : (
            <span aria-hidden="true" className={cn("size-2 rounded-full", unread ? "bg-primary" : "border-[1.5px] border-control-border")} />
          )}
          <span className="sr-only">{t(`state.${row.state}`)}</span>
        </span>
        <span className="min-w-0">
          <span className={cn("block text-sm", row.state === "unread" ? "font-semibold text-foreground" : "text-muted-foreground")}>{title}</span>
          <span className="block text-meta text-muted-foreground">
            {detail}
            {row.assigneeName ? ` · ${t("detail.assignee", { name: row.assigneeName })}` : null}
          </span>
        </span>
        <span className="col-start-2 flex flex-wrap items-baseline gap-x-2 md:contents">
          <span className={cn("text-lg num md:text-right", unread ? "font-semibold text-foreground" : "text-muted-foreground")}>{formatCount(row.count)}</span>
          <span className="text-meta">{renderChange(t, row.change, previousDayLabel)}</span>
        </span>
        {pill ? (
          <span className="col-start-2 min-w-0 md:col-start-auto">
            <StatusBadge label={t(pill.key, pill.values)} tone="muted" />
          </span>
        ) : (
          <span aria-hidden="true" className="max-md:hidden" />
        )}
      </NotificationOpenLink>
      <NotificationCenterActions
        item={{ key: row.key, count: row.count, title, state: row.state, assignedToUserId: row.assigneeId }}
        assignees={assignees}
        labels={{ ...labels, menu: t("actions.menu", { title }) }}
      />
    </li>
  )
}

// ▲ n จากเมื่อวาน / ▼ n จากเมื่อวาน / เท่าเดิม / ใหม่; nothing when the previous day is unknown. The arrow is a picture: a
// screen reader hears เพิ่ม or ลด.
function renderChange(t: Translate, change: TopicRow["change"], previousDayLabel: string | null) {
  const amount = (count: number) =>
    previousDayLabel ? t("change.fromDay", { count, date: previousDayLabel }) : t("change.fromYesterday", { count })
  switch (change.kind) {
    case "up":
      return (
        <span className="num text-warning">
          <span aria-hidden="true">▲ </span>
          <span className="sr-only">{t("change.upWord")} </span>
          {amount(change.delta)}
        </span>
      )
    case "down":
      return (
        <span className="num text-success">
          <span aria-hidden="true">▼ </span>
          <span className="sr-only">{t("change.downWord")} </span>
          {amount(change.delta)}
        </span>
      )
    case "same":
      return <span className="text-muted-foreground">{t("change.same")}</span>
    case "new":
      return <StatusBadge label={t("change.new")} tone="warning" />
    case "unknown":
      return null
  }
}
