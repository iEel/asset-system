"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A field the person changed on an edit page (group 4 plan 2 Task 8, spec §7.1; shared by group 5 plan 4 G5P4-R8 for the
// PM form): its frame, "แก้แล้ว", "เดิม: <the stored value>" (the stored label, so it reads for a record that is no longer
// active too) and คืนค่าเดิม, which puts the stored value back. A value the save sets by itself says why instead
// (automaticLabel, the asset form's ปรับตามผู้ถือครอง) and has no คืนค่าเดิม; a change without onRestore has none either.
// The wrapper is the same element with or without a change: a field that becomes changed while the person types keeps
// its DOM nodes, and so its focus. Its data-slot stays the asset form's stable hook.
export type FormFieldChange = { was: string; automaticLabel?: string; onRestore?: () => void }

export function FormChangedField({ change, children }: { change: FormFieldChange | null; children: ReactNode }) {
  const t = useTranslations("common")

  return (
    <div
      data-slot="asset-changed-field"
      data-changed={change ? "" : undefined}
      className={cn("grid min-w-0 content-start gap-2", change && "rounded-md border border-primary-border p-3")}
    >
      {children}
      {change ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
          <span className="font-medium text-primary">{t("fieldChanged")}</span>
          <span className="min-w-0 break-words">{t("fieldWas", { value: change.was })}</span>
          {change.automaticLabel ? (
            <span>{change.automaticLabel}</span>
          ) : change.onRestore ? (
            <Button variant="ghost" size="sm" onClick={change.onRestore}>
              {t("restoreField")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
