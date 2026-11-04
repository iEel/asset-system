"use client"

import { useImperativeHandle, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref, type RefObject } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Pause, Pencil, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { RowActions, type RowActionGroup, type RowNextAction } from "@/components/ui/row-actions"
import { useApiError } from "@/components/ui/use-api-error"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import type { PmPlanOpenRecord, PmPlanTab } from "@/lib/pm-plan-list"
import { cn } from "@/lib/utils"

type PlanStateAction = "pause" | "resume" | "end"

export type MaintenancePlanStateButtonHandle = { open: () => void }

const stateActionIcons: Record<PlanStateAction, ReactNode> = {
  pause: <Pause aria-hidden="true" />,
  resume: <Play aria-hidden="true" />,
  end: <Square aria-hidden="true" />,
}

// One state change of a plan with its confirm (2C batch 3, K12: the dialog waits with busy while the plan saves). An
// owner (the row ⋯ menu) renders it with hideTrigger, opens it through ref.current?.open() and passes its own button as
// returnFocusRef, so focus goes back to ⋯ when the dialog closes. The call is the one the inline buttons made: a PATCH
// of the action, which the state machine checks (src/lib/maintenance-plan-service.ts).
export function MaintenancePlanStateButton({
  planId,
  action,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  planId: string
  action: PlanStateAction
  ref?: Ref<MaintenancePlanStateButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const apiError = useApiError()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))

  async function submitAction() {
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      toast.success(t(`pmActions.${action}Success`))
      setOpen(false)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <Button ref={triggerRef} variant={action === "end" ? "danger" : "outline"} size="sm" onClick={() => setOpen(true)}>
          {stateActionIcons[action]}
          {t(`pmActions.${action}`)}
        </Button>
      )}
      <AccessibleDialog
        open={open}
        title={t(`pmActions.${action}Title`)}
        description={t(`pmActions.${action}Help`)}
        busy={saving}
        returnFocusRef={returnFocusRef ?? triggerRef}
        onClose={() => setOpen(false)}
      >
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button variant={action === "end" ? "destructive" : "default"} busy={saving} onClick={submitAction}>
            {t(`pmActions.${action}`)}
          </Button>
        </AccessibleDialogFooter>
      </AccessibleDialog>
    </>
  )
}

// React sends the events of a dialog's portal up the component tree to the table row, which would open the edit page
// on a click or an Enter inside the dialog. The dialogs sit in this empty hidden span, which stops events that come
// from outside it, as RowActions does for its own menu (src/components/disposal/disposal-row-actions.tsx).
function stopPortalEvent(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

export type MaintenancePlanRowActionsProps = {
  plan: { id: string; planNo: string; title: string; planState: PmPlanTab }
  locale: string
  // The PM page as it is (tab, search, due, page), so every link brings the person back to it.
  returnTo: string
  canCreate: boolean
  canEdit: boolean
  openRecord: PmPlanOpenRecord | null
}

// The actions of one PM plan (group 5 spec §9, G5P4-R5, R6). The next step is "บันทึกว่าทำแล้ว" (create, an active plan
// whose asset has no open repair record); with an open record, the text link to that record takes its place, for
// anyone who reads the page, because a new record would be refused (MAINTENANCE_OPEN_RECORD_EXISTS). ⋯ (edit) holds
// แก้ไข, พักแผน or เปิดใช้งานต่อ, then จบแผน. Its confirms sit outside the menu with hideTrigger. An ended plan has no actions.
export function MaintenancePlanRowActions({ plan, locale, returnTo, canCreate, canEdit, openRecord }: MaintenancePlanRowActionsProps) {
  const t = useTranslations("maintenancePage")
  const tRecord = useTranslations("repairRecord")
  const tCommon = useTranslations("common")
  const openerRef = useRef<HTMLElement | null>(null)
  const toggleRef = useRef<MaintenancePlanStateButtonHandle | null>(null)
  const endRef = useRef<MaintenancePlanStateButtonHandle | null>(null)
  if (plan.planState === "ended") return null

  const toggle: PlanStateAction = plan.planState === "active" ? "pause" : "resume"
  const recordDone: RowNextAction | null =
    canCreate && plan.planState === "active" && !openRecord
      ? { label: tRecord("pmRecordDone"), href: appendOperationalReturnTo(`/${locale}/maintenance/new?planId=${plan.id}`, returnTo) }
      : null
  const groups: RowActionGroup[] = canEdit
    ? [
        {
          key: "plan",
          items: [
            { kind: "link", key: "edit", label: tCommon("edit"), href: appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, returnTo), icon: <Pencil aria-hidden="true" /> },
            { kind: "action", key: toggle, label: t(`pmActions.${toggle}`), onSelect: () => toggleRef.current?.open(), icon: stateActionIcons[toggle] },
          ],
        },
        {
          key: "end",
          items: [{ kind: "action", key: "end", label: t("pmActions.end"), hint: t("pmActions.endHint"), destructive: true, onSelect: () => endRef.current?.open(), icon: stateActionIcons.end }],
        },
      ]
    : []
  if (!openRecord && !recordDone && !canEdit) return null

  return (
    <div data-no-row-click className="flex items-center justify-end gap-2">
      {openRecord ? (
        <Link href={appendOperationalReturnTo(`/${locale}/maintenance/${openRecord.id}`, returnTo)} className={cn(linkVariants(), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>
          {t("pmOpenRecord", { repairNo: openRecord.repairNo })}
        </Link>
      ) : null}
      <RowActions
        code={plan.planNo}
        name={plan.title}
        menuLabel={t("pmRowActions", { planNo: plan.planNo })}
        next={openRecord ? undefined : recordDone}
        groups={groups}
        openerRef={openerRef}
      />
      {canEdit ? (
        <span hidden onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
          <MaintenancePlanStateButton planId={plan.id} action={toggle} ref={toggleRef} hideTrigger returnFocusRef={openerRef} />
          <MaintenancePlanStateButton planId={plan.id} action="end" ref={endRef} hideTrigger returnFocusRef={openerRef} />
        </span>
      ) : null}
    </div>
  )
}
