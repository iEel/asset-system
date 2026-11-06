"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Ban, Package } from "lucide-react"
import { toast } from "sonner"
import { RowActions, type RowActionGroup, type RowActionItem, type RowNextAction } from "@/components/ui/row-actions"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"
import { deactivateMenuItem } from "@/lib/deactivate-menu-item"

// The row actions of an employee on the list (board MD-Employees, group 7 follow-ups Task 2). The next step stays the
// edit link; ⋯ holds "ดูทรัพย์สินที่ถือครอง ({n})" (the register filtered by custodian) while the employee holds any,
// and "ปิดใช้งาน" (G7F-R2). DELETE /api/employees/[id] only sets isActive = false, so it says ปิดใช้งาน, not ลบ. The page
// passes deactivate only for an active employee and a user with employee:delete; blocked is the reason the server would
// give (getEmployeeDeleteBlockReason over the counts the page read for its rows), shown on the unavailable item. The
// server checks again, so a blocker that appeared meanwhile still refuses with its 409 reason.
export function EmployeeRowActions({
  code,
  name,
  menuLabel,
  next,
  heldAssets,
  deactivate,
  className,
}: {
  code: string
  name: string
  menuLabel: string
  next: RowNextAction
  heldAssets: { label: string; href: string } | null
  deactivate: { endpoint: string; blocked: string | null } | null
  className?: string
}) {
  const t = useTranslations("employee")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const confirm = useConfirm()
  const apiError = useApiError()
  const openerRef = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)

  async function runDeactivate() {
    if (!deactivate) return
    const confirmed = await confirm({
      title: t("deactivate.confirmTitle", { name }),
      description: t("deactivate.confirmBody"),
      confirmLabel: t("deactivate.action"),
      tone: "destructive",
      returnFocusRef: openerRef,
    })
    if (!confirmed) return

    setBusy(true)
    try {
      const response = await fetch(deactivate.endpoint, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }
      toast.success(t("deactivate.success"))
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  const viewItems: RowActionItem[] = heldAssets
    ? [{ kind: "link", key: "held-assets", label: heldAssets.label, href: heldAssets.href, icon: <Package aria-hidden="true" /> }]
    : []
  // deactivateMenuItem decides hidden / unavailable with the reason / action. Its onSelect is attached here, in an object
  // literal: the React compiler refuses a closure over openerRef passed to a function during render.
  const deactivateItem = deactivateMenuItem({
    label: t("deactivate.action"),
    canDeactivate: Boolean(deactivate),
    blocked: deactivate?.blocked ?? null,
    icon: <Ban aria-hidden="true" />,
    onSelect: () => undefined,
  })
  const deactivateItems: RowActionItem[] = !deactivateItem
    ? []
    : deactivateItem.kind === "action"
      ? [
          {
            ...deactivateItem,
            onSelect: () => {
              if (!busy) void runDeactivate()
            },
          },
        ]
      : [deactivateItem]
  const groups: RowActionGroup[] = [
    { key: "view", items: viewItems },
    { key: "deactivate", items: deactivateItems },
  ]

  return <RowActions code={code} name={name} menuLabel={menuLabel} next={next} openerRef={openerRef} className={className} groups={groups} />
}
