"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  NOTIFICATION_POLL_MS,
  createLatestNotificationRequestGuard,
  fetchNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationSummaryItemRead,
  notificationSummaryChangedEvent,
  notifyNotificationSummaryChanged,
  type NotificationClientSummary,
} from "@/lib/notification-client-sync"
import { NOTIFICATION_ANNOUNCEMENT_CLEAR_MS, describeNotificationIncrease } from "@/lib/notification-announcement"

export type ShellNotificationsValue = {
  summary: NotificationClientSummary | null
  refresh(): Promise<void>
  markRead(key: string): Promise<boolean>
  markAllRead(): Promise<boolean>
}

const ShellNotificationsContext = createContext<ShellNotificationsValue | null>(null)

// One notification summary for the whole shell (menu B shell task 3): fetched on mount, every 2 minutes while the tab
// is visible, when the tab becomes visible again and on the app's change event. A failed fetch keeps the last summary.
export function ShellNotificationsProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const tNotifications = useTranslations("notifications")
  const [summary, setSummary] = useState<NotificationClientSummary | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [notificationRequestGuard] = useState(createLatestNotificationRequestGuard)
  // The last summary the server sent, never an optimistic one: new work is measured against it.
  const previousSummaryRef = useRef<NotificationClientSummary | null>(null)

  const applyServerSummary = useCallback((next: NotificationClientSummary) => {
    const sentence = describeNotificationIncrease(previousSummaryRef.current, next, {
      increase: (key, count) => tNotifications("increaseAnnouncement", { title: tNotifications(key), count }),
    })
    if (sentence) setAnnouncement(sentence)
    previousSummaryRef.current = next
    setSummary(next)
  }, [tNotifications])

  const refresh = useCallback(async () => {
    const requestId = notificationRequestGuard.begin()
    const data = await fetchNotificationSummary(locale)
    if (data && notificationRequestGuard.isLatest(requestId)) applyServerSummary(data)
  }, [applyServerSummary, locale, notificationRequestGuard])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }

    void refresh()
    const interval = window.setInterval(refreshWhenVisible, NOTIFICATION_POLL_MS)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    window.addEventListener(notificationSummaryChangedEvent, refresh)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.removeEventListener(notificationSummaryChangedEvent, refresh)
      // Voids any request still in flight, so its answer never lands after the shell lets go.
      notificationRequestGuard.begin()
    }
  }, [notificationRequestGuard, refresh])

  useEffect(() => {
    if (!announcement) return
    const timeout = window.setTimeout(() => setAnnouncement(""), NOTIFICATION_ANNOUNCEMENT_CLEAR_MS)
    return () => window.clearTimeout(timeout)
  }, [announcement])

  // true when saved (or nothing to save); false when the save failed and the summary is unchanged.
  const markRead = useCallback(async (key: string) => {
    const item = summary?.items.find((row) => row.key === key)
    if (!item || item.isRead) return true

    const saved = await markNotificationRead(item)
    if (saved) {
      setSummary((current) => current && markNotificationSummaryItemRead(current, key))
      notifyNotificationSummaryChanged()
    }
    return saved
  }, [summary])

  const markAllRead = useCallback(async () => {
    const requestId = notificationRequestGuard.begin()
    const next = await markAllNotificationsRead(locale)
    if (!next) return false
    if (notificationRequestGuard.isLatest(requestId)) applyServerSummary(next)
    notifyNotificationSummaryChanged()
    return true
  }, [applyServerSummary, locale, notificationRequestGuard])

  const value = useMemo<ShellNotificationsValue>(
    () => ({ summary, refresh, markRead, markAllRead }),
    [markAllRead, markRead, refresh, summary],
  )

  return (
    <ShellNotificationsContext.Provider value={value}>
      {children}
      <p role="status" className="sr-only" data-shell-notification-announcement>{announcement}</p>
    </ShellNotificationsContext.Provider>
  )
}

export function useShellNotifications(): ShellNotificationsValue {
  const value = useContext(ShellNotificationsContext)
  if (!value) throw new Error("useShellNotifications must be used inside <ShellNotificationsProvider>")
  return value
}
