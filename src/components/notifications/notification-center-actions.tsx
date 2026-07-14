"use client"

import { useState, useTransition, type MouseEvent as ReactMouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Clock3, ExternalLink, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import {
  isPlainPrimaryClick,
  markNotificationRead,
  notifyNotificationSummaryChanged,
} from "@/lib/notification-client-sync"

type AssigneeOption = {
  id: string
  label: string
}

type NotificationCenterActionsProps = {
  item: {
    key: string
    count: number
    href: string
    isRead: boolean
    assignedToUserId: string | null
  }
  assignees: AssigneeOption[]
  labels: {
    openItem: string
    markRead: string
    markUnread: string
    snoozeOneDay: string
    assignTo: string
    unassigned: string
    saved: string
    error: string
  }
}

export function NotificationCenterActions({ item, assignees, labels }: NotificationCenterActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignedToUserId, setAssignedToUserId] = useState(item.assignedToUserId ?? "")

  const openItem = async (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isPlainPrimaryClick(event)) return

    event.preventDefault()
    try {
      if (await markNotificationRead(item)) {
        notifyNotificationSummaryChanged()
      } else {
        toast.error(labels.error)
      }
    } finally {
      router.push(item.href)
    }
  }

  const mutate = (payload: { action: "read" | "unread" | "snooze" | "assign"; assignedToUserId?: string | null; snoozeHours?: number }) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: item.key,
            count: item.count,
            ...payload,
          }),
        })
        if (!response.ok) {
          toast.error(labels.error)
          return
        }
        toast.success(labels.saved)
        notifyNotificationSummaryChanged()
        router.refresh()
      } catch {
        toast.error(labels.error)
      }
    })
  }

  return (
    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <Link
          href={item.href}
          onClick={(event) => void openItem(event)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ExternalLink className="h-4 w-4" />
          {labels.openItem}
        </Link>
        <button
          type="button"
          onClick={() => mutate({ action: item.isRead ? "unread" : "read" })}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {item.isRead ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {item.isRead ? labels.markUnread : labels.markRead}
        </button>
        <button
          type="button"
          onClick={() => mutate({ action: "snooze", snoozeHours: 24 })}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          <Clock3 className="h-4 w-4" />
          {labels.snoozeOneDay}
        </button>
      </div>

      <label className="flex min-w-0 items-center gap-2 text-sm">
        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-muted-foreground">{labels.assignTo}</span>
        <select
          value={assignedToUserId}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value
            setAssignedToUserId(value)
            mutate({ action: "assign", assignedToUserId: value || null })
          }}
          className="h-9 min-w-44 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">{labels.unassigned}</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
