import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { getNotificationCenter } from "@/lib/notification-summary"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

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
      <PageHeader
        title={t("centerTitle")}
        meta={t("centerSubtitle")}
        actions={
          <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openWorkCenter")}
          </Link>
        }
      />

      <StatStrip
        items={[
          { key: "active", label: t("active"), value: formatCount(activeItems.length) },
          { key: "read", label: t("read"), value: formatCount(readItems.length) },
          { key: "snoozed", label: t("snoozed"), value: formatCount(snoozedItems.length) },
          { key: "assigned", label: t("assigned"), value: formatCount(assignedItems.length) },
        ]}
      />

      <section className="space-y-3">
        {center.items.length === 0 ? (
          <EmptyNote padded>{t("empty")}</EmptyNote>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className="rounded-lg border bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={item.isSuppressed ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>{t(item.key)}</h2>
                    <span className={toneClass(item.tone)}>{formatCount(item.count)}</span>
                    {item.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
                    {item.isSnoozed ? <StatusBadge label={t("snoozed")} tone="muted" /> : null}
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
          <EmptyNote padded>{t("deliveredDigestEmpty")}</EmptyNote>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <StatusBadge label={t.has(`type_${notification.type}`) ? t(`type_${notification.type}`) : notification.type} tone={notification.type} />
                    {notification.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
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

function toneClass(tone: "danger" | "warning" | "primary") {
  if (tone === "danger") return "rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
  if (tone === "warning") return "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning"
  return "rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
