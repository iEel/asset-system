"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

// A field the person changed on the edit page (group 4 plan 2 Task 8, spec §7.1): its frame, "แก้แล้ว", "เดิม: <the stored
// value>" (the stored label, so it reads for a record that is no longer active too) and คืนค่าเดิม, which puts the stored
// value back. The แผนก the save sets to the holder's (the automatic fix, P2-R1) says ปรับตามผู้ถือครอง instead; a แผนก
// locked to a new holder has no คืนค่าเดิม (the holder brings it back). Without a change, the field renders as it is.
export type AssetFieldChange = { was: string; automatic: boolean; onRestore?: () => void }

export function AssetFormChangedField({ change, children }: { change: AssetFieldChange | null; children: ReactNode }) {
  const t = useTranslations("asset")
  if (!change) return <>{children}</>

  return (
    <div data-slot="asset-changed-field" className="grid min-w-0 content-start gap-2 rounded-md border border-primary-border p-3">
      {children}
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
    </div>
  )
}
