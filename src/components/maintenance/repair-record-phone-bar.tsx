"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, FileText, Printer } from "lucide-react"
import { useRepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { ActionBar, type ActionBarLink } from "@/components/ui/action-bar"
import { Button } from "@/components/ui/button"
import type { RowActionGroup, RowActionItem } from "@/components/ui/row-actions"

// The record's phone bar (group 5 G5P3-R8, spec §8.6). With maintenance:edit on an open record, "ซ่อมเสร็จ" is the
// primaryAction and "เพิ่มเติม" holds เปิดหน้าทรัพย์สิน, พิมพ์, แก้ไขรายละเอียด and ยกเลิกบันทึก. Without the primary, the bar
// holds เปิดหน้าทรัพย์สิน and พิมพ์ as links, plus "เพิ่มเติม" when it has items (ActionBar hides an empty sheet). Every
// dialog gives focus back to the bar's button that opened it (Review Focus 5). The page pads itself to match.
export function RepairRecordPhoneBar({
  repairNo,
  assetName,
  assetHref,
  printHref,
  canEdit,
  isOpen,
}: {
  repairNo: string
  assetName: string
  assetHref: string
  printHref: string
  canEdit: boolean
  isOpen: boolean
}) {
  const t = useTranslations("repairRecord")
  const tCommon = useTranslations("common")
  const { openComplete, openCancel, openEdit } = useRepairRecordActions()
  // RowActions points this at the bar's ⋯ before it calls an item's onSelect.
  const moreTriggerRef = useRef<HTMLElement | null>(null)
  const canComplete = canEdit && isOpen

  const links: ActionBarLink[] = [
    { href: assetHref, label: t("openAsset"), icon: <FileText className="h-4 w-4" /> },
    { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
  ]
  const recordItems: RowActionItem[] = [
    ...(canEdit ? [{ kind: "action" as const, key: "edit", label: t("edit"), onSelect: () => openEdit(moreTriggerRef.current) }] : []),
    ...(canComplete ? [{ kind: "action" as const, key: "cancel", label: t("cancel"), onSelect: () => openCancel(moreTriggerRef.current), destructive: true }] : []),
  ]
  const groups: RowActionGroup[] = canComplete
    ? [
        { key: "go", items: links.map((link): RowActionItem => ({ kind: "link", key: link.href, label: link.label, href: link.href, icon: link.icon })) },
        { key: "record", items: recordItems },
      ]
    : [{ key: "record", items: recordItems }]
  const actions = canComplete ? [] : links
  const primary = canComplete ? (
    <Button size="md" onClick={(event) => openComplete(event.currentTarget)}>
      <CheckCircle2 aria-hidden="true" />
      {t("complete")}
    </Button>
  ) : undefined

  return (
    <ActionBar
      label={tCommon("actions")}
      actions={actions}
      primaryAction={primary}
      more={{ label: t("detail.phoneMore"), code: repairNo, name: assetName, groups, openerRef: moreTriggerRef }}
    />
  )
}
