"use client"

import { useState } from "react"
import { Activity, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ActivityDrawerItem = {
  label: string
  value: string
  meta?: string
  tone?: "neutral" | "primary" | "info" | "success" | "warning" | "danger"
}

export function ActivityDrawer({
  title,
  triggerLabel,
  emptyLabel,
  items,
}: {
  title: string
  triggerLabel: string
  emptyLabel: string
  items: ActivityDrawerItem[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Activity className="h-4 w-4" />
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </div>
              ) : (
                <ol className="space-y-3">
                  {items.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", getToneDotClass(item.tone))} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
                          <div className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</div>
                          {item.meta ? <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div> : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}

function getToneDotClass(tone: ActivityDrawerItem["tone"]) {
  if (tone === "danger") return "bg-danger"
  if (tone === "warning") return "bg-warning"
  if (tone === "success") return "bg-success"
  if (tone === "info") return "bg-info"
  if (tone === "primary") return "bg-primary"
  return "bg-muted-foreground"
}
