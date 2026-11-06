"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Ban, Check, Plus } from "lucide-react"
import { toast } from "sonner"
import { RowActions, type RowActionItem, type RowNextAction } from "@/components/ui/row-actions"
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
import { useApiError } from "@/components/ui/use-api-error"
import { formatCount } from "@/lib/display-format"
import { locationDeactivateBlockers, type LocationDeactivateCounts } from "@/lib/location-tree-view"

// The row actions of a location in the tree and the list (spec §6.1). DELETE /api/locations/[id] only sets
// isActive = false, so ⋯ says "ปิดใช้งาน". The confirm reads the counts the page loaded with the rows: while assets are
// here, assets have their home here, active children remain or an audit round uses it, it names each with its count and
// offers no deactivate button (Review Focus 4). The server checks again, so a count that changed meanwhile still refuses.
// ⋯ also holds "เพิ่มที่ตั้งในนี้" on an active location. An inactive one has nothing in ⋯: it comes back from its edit page.
export function LocationDeactivateButton({
  endpoint,
  name,
  path,
  isActive,
  counts,
  addChildHref,
  menuLabel,
  next,
  className,
}: {
  endpoint: string
  name: string
  // The name path, so the confirm says which "ห้อง 301" this is.
  path: string
  isActive: boolean
  counts: LocationDeactivateCounts
  addChildHref: string
  menuLabel: string
  next: RowNextAction
  className?: string
}) {
  const t = useTranslations("location")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const apiError = useApiError()
  const openerRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const blockers = locationDeactivateBlockers(counts)
  const blocked = blockers.length > 0

  async function deactivate() {
    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }
      setOpen(false)
      toast.success(t("deactivate.success"))
      router.refresh()
    } catch (error) {
      setOpen(false)
      apiError.toast(error)
    } finally {
      setBusy(false)
    }
  }

  const items: RowActionItem[] = isActive
    ? [
        { kind: "link", key: "add-child", label: t("tree.addChild"), href: addChildHref, icon: <Plus aria-hidden="true" /> },
        {
          kind: "action",
          key: "deactivate",
          label: t("deactivate.action"),
          icon: <Ban aria-hidden="true" />,
          destructive: true,
          onSelect: () => setOpen(true),
        },
      ]
    : []

  return (
    <>
      <RowActions
        code={name}
        menuLabel={menuLabel}
        next={next}
        openerRef={openerRef}
        className={className}
        groups={items.length > 0 ? [{ key: "location", items }] : []}
      />
      <AlertDialog open={open} onOpenChange={(value) => !busy && setOpen(value)}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (!openerRef.current?.isConnected) return
            event.preventDefault()
            openerRef.current.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivate.confirmTitle", { name })}</AlertDialogTitle>
            <p className="text-meta text-muted-foreground">{path}</p>
            {blocked ? (
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <ul className="space-y-1 text-sm text-foreground">
                    {blockers.map((blocker) => (
                      <li key={blocker.key} className="flex items-center gap-2">
                        <Ban className="size-4 shrink-0 text-danger" aria-hidden="true" />
                        {t(`deactivate.blocked.${blocker.key}`, { n: formatCount(blocker.count) })}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">{t("deactivate.blockedFooter")}</p>
                </div>
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>{t("deactivate.confirmBody")}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-success">
                    {(["assets", "children", "auditRounds"] as const).map((key) => (
                      <li key={key} className="flex items-center gap-1">
                        <Check className="size-3.5 shrink-0" aria-hidden="true" />
                        {t(`deactivate.clear.${key}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{blocked ? tCommon("close") : tCommon("cancel")}</AlertDialogCancel>
            {blocked ? null : (
              <AlertDialogAction
                variant="destructive"
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault()
                  void deactivate()
                }}
              >
                {t("deactivate.action")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
