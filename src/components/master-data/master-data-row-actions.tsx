"use client"

import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Ban, Check, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"
import { deactivateMenuItem } from "@/lib/deactivate-menu-item"

// The words of one list's ⋯ (spec §3), translated by the server page, so one component serves companies, branches and
// departments (group 8 plan 1 Tasks 2–4).
export type MasterDataDeactivateLabels = {
  action: string
  // "ไม่มีสาขา แผนก … จึงปิดได้ ระบบจะถามยืนยันอีกครั้ง" under the menu item (board MD-Companies).
  hint?: string
  confirmTitle: string
  confirmBody: string
  // The confirm's checklist: what the page checked is clear ("ไม่มีสาขา", …).
  clearItems: readonly string[]
  success: string
}

export type MasterDataReactivateLabels = {
  action: string
  confirmTitle: string
  confirmBody: string
  success: string
}

export type MasterDataReactivate = {
  endpoint: string
  // The stored fields the PUT route's schema needs; sent with isActive = true.
  record: Record<string, unknown>
  labels: MasterDataReactivateLabels
}

export type MasterDataRowLink = { key: string; label: string; href: string; icon?: ReactNode }

// React sends the events of the dialog's portal up the component tree to the list's clickable row, which would open the
// edit page on a click or an Enter inside the dialog. The dialog sits in an empty hidden span that stops events coming
// from outside it (the LocationDeactivateButton pattern).
function stopPortalEvent(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

async function sendOrThrow(endpoint: string, init: RequestInit, fallback: string) {
  const response = await fetch(endpoint, init)
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.error ?? fallback)
  }
}

// PUT the stored record with isActive = true after a confirm (the location reactivate pattern).
function useReactivate(reactivate: MasterDataReactivate | null, returnFocusRef: RefObject<HTMLElement | null>) {
  const tCommon = useTranslations("common")
  const router = useRouter()
  const confirm = useConfirm()
  const apiError = useApiError()
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!reactivate || busy) return
    const confirmed = await confirm({
      title: reactivate.labels.confirmTitle,
      description: reactivate.labels.confirmBody,
      confirmLabel: reactivate.labels.action,
      returnFocusRef,
    })
    if (!confirmed) return
    setBusy(true)
    try {
      await sendOrThrow(
        reactivate.endpoint,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...reactivate.record, isActive: true }) },
        tCommon("error")
      )
      toast.success(reactivate.labels.success)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  return { busy, run }
}

// A master-data list row's ⋯ (spec §3, boards MD-Companies / MD-Branches / MD-Departments): no next button (the row
// opens the edit page), ⋯ holds the links (แก้ไข first, then the board's), then ปิดใช้งาน or เปิดใช้งาน.
// deactivate: null hides it (an inactive row, or no <module>:delete); blocked is the reason the server would give, shown
// on the unavailable item (deactivateMenuItem); otherwise the item opens a confirm with the checklist and sends DELETE.
// reactivate: null hides it (an active row, or no <module>:edit). The server checks again either way (409 with its reason).
export function MasterDataRowActions({
  code,
  name,
  menuLabel,
  links,
  deactivate,
  reactivate,
  className,
}: {
  code: string
  name: string
  menuLabel: string
  links: readonly MasterDataRowLink[]
  deactivate: { endpoint: string; blocked: string | null; labels: MasterDataDeactivateLabels } | null
  reactivate: MasterDataReactivate | null
  className?: string
}) {
  const tCommon = useTranslations("common")
  const router = useRouter()
  const apiError = useApiError()
  const openerRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const reactivation = useReactivate(reactivate, openerRef)

  async function runDeactivate() {
    if (!deactivate) return
    setBusy(true)
    try {
      await sendOrThrow(deactivate.endpoint, { method: "DELETE" }, tCommon("error"))
      setOpen(false)
      toast.success(deactivate.labels.success)
      router.refresh()
    } catch (error) {
      setOpen(false)
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  const linkItems: RowActionItem[] = links.map((link) => ({ kind: "link", key: link.key, label: link.label, href: link.href, icon: link.icon }))
  // deactivateMenuItem decides hidden / unavailable with the reason / action. Its onSelect is attached here, in an object
  // literal: the React compiler refuses a closure over state setters passed to a function during render.
  const deactivateItem = deactivateMenuItem({
    label: deactivate?.labels.action ?? "",
    canDeactivate: Boolean(deactivate),
    blocked: deactivate?.blocked ?? null,
    icon: <Ban aria-hidden="true" />,
    onSelect: () => undefined,
  })
  const statusItems: RowActionItem[] = []
  if (deactivateItem?.kind === "action") {
    statusItems.push({ ...deactivateItem, hint: deactivate?.labels.hint, onSelect: () => setOpen(true) })
  } else if (deactivateItem) {
    statusItems.push(deactivateItem)
  }
  if (reactivate) {
    statusItems.push({
      kind: "action",
      key: "reactivate",
      label: reactivate.labels.action,
      icon: <RotateCcw aria-hidden="true" />,
      onSelect: () => void reactivation.run(),
    })
  }

  return (
    <>
      <RowActions
        code={code}
        name={name}
        menuLabel={menuLabel}
        next={null}
        openerRef={openerRef}
        className={className}
        groups={[
          { key: "links", items: linkItems },
          { key: "status", items: statusItems },
        ]}
      />
      {deactivate && !deactivate.blocked ? (
        <span hidden onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
          <AlertDialog open={open} onOpenChange={(value) => !busy && setOpen(value)}>
            <AlertDialogContent
              onCloseAutoFocus={(event) => {
                if (!openerRef.current?.isConnected) return
                event.preventDefault()
                openerRef.current.focus()
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{deactivate.labels.confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>{deactivate.labels.confirmBody}</p>
                    {deactivate.labels.clearItems.length > 0 ? (
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-success">
                        {deactivate.labels.clearItems.map((item) => (
                          <li key={item} className="flex items-center gap-1">
                            <Check className="size-3.5 shrink-0" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>{tCommon("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault()
                    void runDeactivate()
                  }}
                >
                  {deactivate.labels.action}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </span>
      ) : null}
    </>
  )
}

// "เปิดใช้งาน" beside the ไม่ใช้งาน badge (board MD-Companies), the same PUT as ⋯ เปิดใช้งาน.
export function MasterDataReactivateButton({ reactivate }: { reactivate: MasterDataReactivate }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const reactivation = useReactivate(reactivate, buttonRef)
  return (
    <Button ref={buttonRef} type="button" variant="ghost" size="sm" busy={reactivation.busy} className="text-primary" onClick={() => void reactivation.run()}>
      {reactivate.labels.action}
    </Button>
  )
}
