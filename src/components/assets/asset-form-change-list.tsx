"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { orNil } from "@/components/ui/nil"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AssetDiffField } from "@/lib/asset-form-diff"

// The trigger's id: ไปที่ช่อง gives focus back to it when the row's field has no control to take it.
export const CHANGE_LIST_TRIGGER_ID = "asset-change-list-trigger"

// One row of the list: the field's label and its stored and new values as the form shows them. An action row (a purchase
// document added or taken off, P3-R5) has no old value: it reads its `to` alone, without the dash and the arrow.
export type AssetFormChangeRow = { field: AssetDiffField; label: string; from: string; to: string; automatic: boolean; action?: boolean }

// The edit footer's "แก้ไข n ช่อง" (group 4 plan 2 Task 8, spec §7.1, §7.5): every field the save writes, เดิม → ใหม่, with
// ไปที่ช่อง; the แผนก the save sets to the holder's says ปรับตามผู้ถือครอง; the reason shows when given. A Popover from
// 768 px, a bottom Sheet below it (the shared Sheet owns the bottom edge, so the form has no fixed bar of its own).
export function AssetFormChangeList({ changes, reason, onGoToField }: { changes: AssetFormChangeRow[]; reason: string; onGoToField: (field: AssetDiffField) => void }) {
  const t = useTranslations("asset")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  // ไปที่ช่อง closes the list; focus then goes to the field, not back to the trigger.
  const goingToField = useRef(false)
  const title = t("changeCount", { count: changes.length })

  function goTo(field: AssetDiffField) {
    goingToField.current = true
    setOpen(false)
    onGoToField(field)
  }

  function keepFocusOnField(event: Event) {
    if (!goingToField.current) return
    goingToField.current = false
    event.preventDefault()
  }

  const trigger = (
    <Button id={CHANGE_LIST_TRIGGER_ID} variant="outline" size="sm">
      {title}
    </Button>
  )
  const list = (
    <div className="grid gap-3 text-sm">
      <ul className="grid gap-3">
        {changes.map((change) => (
          <li key={change.field} className="grid gap-1 border-b border-border-soft pb-3 last:border-b-0 last:pb-0">
            <span className="font-medium text-foreground">{change.label}</span>
            {change.action ? (
              <span className="min-w-0 break-words text-foreground">{change.to}</span>
            ) : (
              <span className="min-w-0 break-words text-muted-foreground">
                {orNil(change.from)} <span aria-hidden="true">→</span>
                <span className="sr-only">{t("changeTo")}</span> <span className="text-foreground">{orNil(change.to)}</span>
              </span>
            )}
            <span className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
              {change.automatic ? <span>{t("followsHolderFix")}</span> : (
                <Button variant="ghost" size="sm" onClick={() => goTo(change.field)}>
                  {t("goToField")}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {reason ? <p className="min-w-0 break-words border-t border-border-soft pt-3 text-muted-foreground">{t("changeListReason", { reason })}</p> : null}
    </div>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" aria-label={title} className="w-80 max-w-full" onCloseAutoFocus={keepFocusOnField}>
          <p className="mb-3 font-medium text-foreground">{title}</p>
          <div className="max-h-96 overflow-y-auto">{list}</div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[85dvh] gap-0 rounded-t-xl" onCloseAutoFocus={keepFocusOnField}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto p-4">{list}</div>
      </SheetContent>
    </Sheet>
  )
}
