"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Bell, CircleCheck } from "lucide-react"
import { useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { useShellNotifications } from "@/components/layout/shell-notifications"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { SessionUser } from "@/lib/auth-utils"
import { isPlainPrimaryClick, type NotificationClientItem } from "@/lib/notification-client-sync"
import {
  getNotificationBellNameKey,
  getNotificationHeaderAction,
  getNotificationRowState,
  groupNotificationItems,
} from "@/lib/notification-groups"
import { hasNavigationPermission } from "@/lib/navigation-permissions"

// The bell and its box (spec §6.4). The shell's provider owns the fetch and the polling (menu B shell task 3); the bell
// only reads its summary. Every row stays listed: read and snoozed rows dim by ink and carry a pill, never by opacity.
export function NotificationBell({ user }: { user: SessionUser }) {
  const tNotifications = useTranslations("notifications")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const { summary, markRead, markAllRead } = useShellNotifications()
  const total = summary?.total ?? 0
  const items = summary?.items ?? []
  const bellName = tNotifications(getNotificationBellNameKey(summary), { count: total })
  const headerAction = getNotificationHeaderAction(summary)
  const { decide, follow } = groupNotificationItems(items)
  // C2: the work center needs dashboard:view, so the box offers it only to people who can open it.
  const canOpenWorkCenter = hasNavigationPermission(user, { module: "dashboard", action: "view" })
  const groups = [
    { id: "decide", label: tNotifications("groupDecide"), rows: decide },
    { id: "follow", label: tNotifications("groupFollow"), rows: follow },
  ].filter((group) => group.rows.length > 0)
  const updatedTime = summary
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(summary.generatedAt))
    : null

  // On success the focus moves to the box title, because the button it was on turns into plain text.
  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      if (await markAllRead()) titleRef.current?.focus()
      else toast.error(tNotifications("saveFailed"))
    } finally {
      setMarkingAll(false)
    }
  }

  // Only an unread row is marked read; a snoozed row stays snoozed. The page opens whether or not the save worked.
  const handleRowClick = async (event: ReactMouseEvent<HTMLAnchorElement>, item: NotificationClientItem) => {
    if (!isPlainPrimaryClick(event)) {
      setOpen(false)
      return
    }

    event.preventDefault()
    try {
      if (getNotificationRowState(item) === "unread" && !(await markRead(item.key))) toast.error(tNotifications("saveFailed"))
    } finally {
      setOpen(false)
      router.push(item.href)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={bellName} title={bellName}>
          <Bell aria-hidden="true" className="size-5" />
          {total > 0 ? (
            <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-danger-foreground">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[22rem] p-0" aria-labelledby={titleId}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-sm font-semibold text-foreground outline-none">
              {tNotifications("title")}
            </h2>
            {updatedTime ? <p className="mt-0.5 text-meta text-muted-foreground">{tNotifications("updatedAt", { time: updatedTime })}</p> : null}
          </div>
          {headerAction === "markAllRead" ? (
            <Button variant="ghost" size="sm" busy={markingAll} onClick={() => void handleMarkAllRead()}>
              {tNotifications("markAllRead")}
            </Button>
          ) : headerAction === "allRead" ? (
            <p className="shrink-0 text-meta text-muted-foreground">{tNotifications("allRead")}</p>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto overscroll-contain p-2">
          {summary === null ? (
            <EmptyNote className="px-3 py-3">{tCommon("loading")}</EmptyNote>
          ) : items.length === 0 ? (
            <ActionEmptyState icon={<CircleCheck />} title={tNotifications("bellEmpty")} description={tNotifications("bellEmptyDetail")} />
          ) : (
            groups.map((group) => (
              <section key={group.id} aria-labelledby={`${titleId}-${group.id}`} className="py-1">
                <h3 id={`${titleId}-${group.id}`} className="px-3 py-1 text-meta font-semibold text-muted-foreground">
                  {group.label}
                </h3>
                {group.rows.map((item) => {
                  const rowState = getNotificationRowState(item)
                  const unread = rowState === "unread"
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={(event) => void handleRowClick(event, item)}
                      className="flex items-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: rowState === "unread" ? item.tone : "muted" }), "mt-2")} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", unread ? "text-foreground" : "text-muted-foreground")}>{tNotifications(item.key)}</p>
                        <p className={cn("mt-0.5 text-xs", unread ? "text-muted-foreground" : "text-faint-foreground")}>
                          {tNotifications(`${item.key}Detail`)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("num font-semibold", unread ? "text-foreground" : "text-muted-foreground")}>{formatCount(item.count)}</span>
                        {rowState === "read" ? (
                          <StatusBadge label={tNotifications("read")} tone="muted" />
                        ) : rowState === "snoozed" ? (
                          <StatusBadge label={tNotifications("snoozed")} tone="muted" />
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </section>
            ))
          )}
        </div>
        <div className="grid gap-1 border-t border-border p-2">
          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full")}
          >
            {tNotifications("openNotificationCenter")}
          </Link>
          {canOpenWorkCenter ? (
            <Link
              href={`/${locale}/work-center`}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost", size: "md" }), "w-full")}
            >
              {tNotifications("openWorkCenter")}
            </Link>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
