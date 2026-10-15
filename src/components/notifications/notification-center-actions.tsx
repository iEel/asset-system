"use client"

import { useState, useTransition, type MouseEvent as ReactMouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Clock3, ExternalLink, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
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
        {/* md, beside the md assignee select (36px from md, 44px below). One transition drives both buttons and the
            select, so they keep the shared disabled look instead of a spinner (2C O17). */}
        <Link
          href={item.href}
          onClick={(event) => void openItem(event)}
          className={buttonVariants({ variant: "outline", size: "md" })}
        >
          <ExternalLink aria-hidden="true" />
          {labels.openItem}
        </Link>
        <Button
          variant="outline"
          size="md"
          onClick={() => mutate({ action: item.isRead ? "unread" : "read" })}
          disabled={isPending}
        >
          {item.isRead ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
          {item.isRead ? labels.markUnread : labels.markRead}
        </Button>
        <Button variant="outline" size="md" onClick={() => mutate({ action: "snooze", snoozeHours: 24 })} disabled={isPending}>
          <Clock3 aria-hidden="true" />
          {labels.snoozeOneDay}
        </Button>
      </div>

      <label className="flex min-w-0 items-center gap-2 text-sm">
        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-muted-foreground">{labels.assignTo}</span>
        <NativeSelect
          fieldSize="md"
          value={assignedToUserId}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value
            setAssignedToUserId(value)
            mutate({ action: "assign", assignedToUserId: value || null })
          }}
          className="min-w-44"
        >
          <option value="">{labels.unassigned}</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </NativeSelect>
      </label>
    </div>
  )
}
