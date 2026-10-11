"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { cn } from "@/lib/utils"

export type FileQueueItem = { id: string; name: string; detail?: ReactNode }

type FileQueueListProps = {
  items: readonly FileQueueItem[]
  onRemove: (id: string) => void
  // Name of the list. Default: common.selectedFiles; a screen reader already says how many items a list has.
  label?: string
  // Shown as an EmptyNote when nothing is queued. Without it an empty queue renders nothing.
  emptyLabel?: string
  disabled?: boolean
  className?: string
}

// Files picked but not uploaded yet (spec 2C section 7.6.2, I15). Taking one out deletes nothing that is saved, so
// the remove button is neutral (outline) with an X, and its name carries the file name so every row can be told apart.
export function FileQueueList({ items, onRemove, label, emptyLabel, disabled, className }: FileQueueListProps) {
  const t = useTranslations("common")

  if (items.length === 0) {
    return emptyLabel ? <EmptyNote className={className}>{emptyLabel}</EmptyNote> : null
  }

  return (
    <ul data-slot="file-queue-list" aria-label={label ?? t("selectedFiles")} className={cn("grid gap-2", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface py-1 pl-3 pr-1 text-sm">
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-foreground">{item.name}</span>
            {item.detail ? <span className="truncate text-meta text-faint-foreground">{item.detail}</span> : null}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            aria-label={t("removeFile", { name: item.name })}
            onClick={() => onRemove(item.id)}
          >
            <X aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
