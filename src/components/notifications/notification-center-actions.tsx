"use client"

import { useRef, useState, useTransition, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CheckCheck, Clock3, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { RowActions, type RowActionGroup, type RowActionItem } from "@/components/ui/row-actions"
import {
  isPlainPrimaryClick,
  markAllNotificationsRead,
  markNotificationRead,
  notifyNotificationSummaryChanged,
} from "@/lib/notification-client-sync"

type AssigneeOption = {
  id: string
  label: string
}

// Board NT (group 9 plan 3 task 2, spec §5.2): the whole topic row is this link. A plain click marks the topic read
// before it opens the queue's page, as the bell and the old center did; a new-tab click goes straight through.
export function NotificationOpenLink({
  item,
  errorLabel,
  className,
  children,
}: {
  item: { key: string; count: number; href: string }
  errorLabel: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()

  const openItem = async (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isPlainPrimaryClick(event)) return

    event.preventDefault()
    try {
      if (await markNotificationRead(item)) {
        notifyNotificationSummaryChanged()
      } else {
        toast.error(errorLabel)
      }
    } finally {
      router.push(item.href)
    }
  }

  return (
    <Link href={item.href} onClick={(event) => void openItem(event)} className={className}>
      {children}
    </Link>
  )
}

// Spec §5.2: เลื่อนเตือน 1 วัน / 3 วัน / 1 สัปดาห์; the API takes 1–168 hours.
const SNOOZE_CHOICES = [
  { key: "day", hours: 24 },
  { key: "threeDays", hours: 72 },
  { key: "week", hours: 168 },
] as const

type NotificationCenterActionsProps = {
  item: {
    key: string
    count: number
    title: string
    state: "unread" | "read" | "snoozed"
    assignedToUserId: string | null
  }
  assignees: AssigneeOption[]
  labels: {
    menu: string
    markRead: string
    markUnread: string
    snooze: string
    snoozeDay: string
    snoozeThreeDays: string
    snoozeWeek: string
    cancelSnooze: string
    changeAssignee: string
    assignDialogTitle: string
    assignDialogDescription: string
    assignTo: string
    unassigned: string
    save: string
    saved: string
    error: string
  }
}

// The row's ⋯ (RowActions: a menu from md, a sheet below): ทำเป็นอ่านแล้ว or ทำเป็นยังไม่อ่าน, the snooze choices,
// ยกเลิกการเลื่อนเตือน on a snoozed row (the unread action, which clears the snooze) and เปลี่ยนผู้รับผิดชอบ…, which
// opens a dialog with the assignee list. Every save toasts, tells the bell and refreshes the page.
export function NotificationCenterActions({ item, assignees, labels }: NotificationCenterActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignedToUserId, setAssignedToUserId] = useState(item.assignedToUserId ?? "")
  const openerRef = useRef<HTMLElement | null>(null)

  const mutate = (
    payload: { action: "read" | "unread" | "snooze" | "assign"; assignedToUserId?: string | null; snoozeHours?: number },
    onSaved?: () => void,
  ) => {
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
        onSaved?.()
        toast.success(labels.saved)
        notifyNotificationSummaryChanged()
        router.refresh()
      } catch {
        toast.error(labels.error)
      }
    })
  }

  const snoozeLabels = { day: labels.snoozeDay, threeDays: labels.snoozeThreeDays, week: labels.snoozeWeek }
  const stateItem: RowActionItem =
    item.state === "read"
      ? { kind: "action", key: "unread", label: labels.markUnread, onSelect: () => mutate({ action: "unread" }) }
      : { kind: "action", key: "read", label: labels.markRead, onSelect: () => mutate({ action: "read" }) }
  const groups: RowActionGroup[] = [
    {
      key: "state",
      items: [
        { ...stateItem, icon: item.state === "read" ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" /> },
        ...(item.state === "snoozed"
          ? [{ kind: "action", key: "cancel-snooze", label: labels.cancelSnooze, onSelect: () => mutate({ action: "unread" }) }]
          : []) as RowActionItem[],
      ],
    },
    {
      key: "snooze",
      label: labels.snooze,
      items: SNOOZE_CHOICES.map((choice) => ({
        kind: "action" as const,
        key: `snooze-${choice.key}`,
        label: snoozeLabels[choice.key],
        icon: <Clock3 aria-hidden="true" />,
        onSelect: () => mutate({ action: "snooze", snoozeHours: choice.hours }),
      })),
    },
    {
      key: "assign",
      items: [
        {
          kind: "action",
          key: "assign",
          label: labels.changeAssignee,
          icon: <UserRound aria-hidden="true" />,
          onSelect: () => {
            setAssignedToUserId(item.assignedToUserId ?? "")
            setAssignOpen(true)
          },
        },
      ],
    },
  ]

  return (
    <>
      <RowActions code={item.title} menuLabel={labels.menu} groups={groups} openerRef={openerRef} className="shrink-0" />
      <AccessibleDialog
        open={assignOpen}
        title={labels.assignDialogTitle}
        description={labels.assignDialogDescription}
        busy={isPending}
        size="sm"
        returnFocusRef={openerRef}
        onClose={() => setAssignOpen(false)}
      >
        <AccessibleDialogBody>
          <p className="mb-3 text-sm font-medium text-foreground">{item.title}</p>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-muted-foreground">{labels.assignTo}</span>
            <NativeSelect
              fieldSize="md"
              value={assignedToUserId}
              disabled={isPending}
              onChange={(event) => setAssignedToUserId(event.target.value)}
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
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button
            type="button"
            disabled={isPending}
            onClick={() => mutate({ action: "assign", assignedToUserId: assignedToUserId || null }, () => setAssignOpen(false))}
          >
            {labels.save}
          </Button>
        </AccessibleDialogFooter>
      </AccessibleDialog>
    </>
  )
}

// ทำเป็นอ่านแล้วทั้งหมด: the existing read_all (the server marks every unread topic at its own count).
export function NotificationReadAllButton({
  locale,
  labels,
}: {
  locale: string
  labels: { markAllRead: string; saved: string; error: string }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const readAll = () => {
    startTransition(async () => {
      const summary = await markAllNotificationsRead(locale)
      if (!summary) {
        toast.error(labels.error)
        return
      }
      toast.success(labels.saved)
      notifyNotificationSummaryChanged()
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={readAll} disabled={isPending}>
      <CheckCheck aria-hidden="true" />
      {labels.markAllRead}
    </Button>
  )
}
