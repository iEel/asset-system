"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A field the person changed on the edit page (group 4 plan 2 Task 8, spec §7.1): its frame, "แก้แล้ว", "เดิม: <the stored
// value>" (the stored label, so it reads for a record that is no longer active too) and คืนค่าเดิม, which puts the stored
// value back. The แผนก the save sets to the holder's (the automatic fix, P2-R1) says ปรับตามผู้ถือครอง instead; a แผนก
// locked to a new holder has no คืนค่าเดิม (the holder brings it back). The wrapper is the same element with or without a
// change (final review): a field that becomes changed while the person types keeps its DOM nodes, and so its focus.
export type AssetFieldChange = { was: string; automatic: boolean; onRestore?: () => void }

export function AssetFormChangedField({ change, children }: { change: AssetFieldChange | null; children: ReactNode }) {
  const t = useTranslations("asset")

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
          {change.automatic ? (
            <span>{t("followsHolderFix")}</span>
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
