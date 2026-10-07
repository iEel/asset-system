"use client"

import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export type ActivityDrawerItem = {
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
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  returnFocusRef,
}: {
  title: string
  triggerLabel: string
  emptyLabel: string
  items: ActivityDrawerItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const tCommon = useTranslations("common")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <SheetTrigger asChild>
          <Button variant="outline">
            <Activity aria-hidden="true" />
            {triggerLabel}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className="w-full gap-0 bg-surface p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-16">
          <SheetTitle className="text-base font-semibold text-foreground">{title}</SheetTitle>
        </SheetHeader>
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
      </SheetContent>
    </Sheet>
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
