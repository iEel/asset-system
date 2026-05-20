import Link from "next/link"
import type { ReactNode } from "react"
import { Bell, CheckCircle2, Clock3, UserRound } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getNotificationCenter } from "@/lib/notification-summary"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"

type NotificationsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { locale } = await params
  const user = await requireAuth()
  const t = await getTranslations("notifications")
  const [center, assignees, deliveredNotifications] = await Promise.all([
    getNotificationCenter(user, locale),
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        employee: { select: { fullNameTh: true, fullNameEn: true } },
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const activeItems = center.items.filter((item) => !item.isSuppressed)
  const readItems = center.items.filter((item) => item.isRead)
  const snoozedItems = center.items.filter((item) => item.isSnoozed)
  const assignedItems = center.items.filter((item) => item.assignedToUserId)
  const assigneeOptions = assignees.map((assignee) => ({
    id: assignee.id,
    label: assignee.employee?.[locale === "th" ? "fullNameTh" : "fullNameEn"] || assignee.displayName || assignee.username,
  }))
  const assigneeNameById = new Map(assigneeOptions.map((assignee) => [assignee.id, assignee.label]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("centerTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("centerSubtitle")}</p>
        </div>
        <Link
          href={`/${locale}/work-center`}
          className="inline-flex h-10 w-fit items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {t("openWorkCenter")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard icon={<Bell className="h-5 w-5" />} label={t("active")} value={activeItems.length} tone="primary" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label={t("read")} value={readItems.length} tone="success" />
        <SummaryCard icon={<Clock3 className="h-5 w-5" />} label={t("snoozed")} value={snoozedItems.length} tone="warning" />
        <SummaryCard icon={<UserRound className="h-5 w-5" />} label={t("assigned")} value={assignedItems.length} tone="muted" />
      </section>

      <section className="space-y-3">
        {center.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className={`rounded-lg border bg-surface p-4 shadow-sm ${item.isSuppressed ? "opacity-70" : ""}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-foreground">{t(item.key)}</h2>
                    <span className={toneClass(item.tone)}>{item.count.toLocaleString(locale === "th" ? "th-TH" : "en-US")}</span>
                    {item.isRead ? <StatusBadge>{t("read")}</StatusBadge> : null}
                    {item.isSnoozed ? <StatusBadge>{t("snoozed")}</StatusBadge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`${item.key}Detail`)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.snoozedUntil ? <span>{t("mutedUntil")}: {formatDate(item.snoozedUntil, locale)}</span> : null}
                    {item.assignedToUserId ? <span>{t("assignedTo")}: {assigneeNameById.get(item.assignedToUserId) ?? item.assignedToUserId}</span> : null}
                  </div>
                </div>
              </div>
              <NotificationCenterActions
                item={item}
                assignees={assigneeOptions}
                labels={{
                  openItem: t("openItem"),
                  markRead: t("markRead"),
                  markUnread: t("markUnread"),
                  snoozeOneDay: t("snoozeOneDay"),
                  assignTo: t("assignTo"),
                  unassigned: t("unassigned"),
                  saved: t("saved"),
                  error: t("saveFailed"),
                }}
              />
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("deliveredDigestTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("deliveredDigestSubtitle")}</p>
        </div>
        {deliveredNotifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
            {t("deliveredDigestEmpty")}
          </div>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <span className={notificationToneClass(notification.type)}>{notification.type}</span>
                    {notification.isRead ? <StatusBadge>{t("read")}</StatusBadge> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(notification.createdAt.toISOString(), locale)}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "primary" | "success" | "warning" | "muted" }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{children}</span>
}

function toneClass(tone: "danger" | "warning" | "primary") {
  if (tone === "danger") return "rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
  if (tone === "warning") return "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning"
  return "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
}

function notificationToneClass(tone: string) {
  if (tone === "danger") return "rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
  if (tone === "warning") return "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning"
  if (tone === "success") return "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success"
  return "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
}

function summaryClass(tone: "primary" | "success" | "warning" | "muted") {
  if (tone === "primary") return "border-primary/30 bg-primary/5 text-primary"
  if (tone === "success") return "border-success/30 bg-success/5 text-success"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  return "border-border bg-surface text-muted-foreground"
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
