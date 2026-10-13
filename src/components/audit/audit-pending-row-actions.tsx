"use client"

import { useRef, type SyntheticEvent } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Eye, ScanLine } from "lucide-react"
import { AuditMarkNotFoundButton, type AuditMarkNotFoundButtonHandle } from "@/components/audit/audit-mark-not-found-button"
import { RowActions } from "@/components/ui/row-actions"

// React sends events up the component tree, so a click inside the not-found dialog (a portal outside the row) would
// reach the clickable table row and open the asset page. The dialog's wrapper stops them before the row.
function stopPortalEvent(event: SyntheticEvent) {
  event.stopPropagation()
}

// The desktop row actions of a pending audit item (pattern ช1, spec 2B §5.4 row pending, bug §5.10 #9): "สแกนรายการนี้"
// as the next step, then ⋯ with "ดูทรัพย์สิน" and "บันทึกไม่พบ", the same three commands as the phone card. A menu never
// holds a dialog (R-m): AuditMarkNotFoundButton renders here without its trigger, opens through its handle, and gives
// focus back to ⋯ (openerRef). A small client file, because the pending page is a server component.
export function AuditPendingRowActions({
  itemId,
  assetTag,
  assetName,
  scanHref,
  assetHref,
}: {
  itemId: string
  assetTag: string
  assetName: string
  scanHref: string
  assetHref: string
}) {
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const notFoundRef = useRef<AuditMarkNotFoundButtonHandle>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  return (
    <>
      <RowActions
        code={assetTag}
        name={assetName}
        menuLabel={tCommon("moreActionsFor", { code: assetTag })}
        next={{ label: t("scanPendingAsset"), href: scanHref, icon: <ScanLine aria-hidden="true" /> }}
        groups={[
          {
            key: "item",
            items: [
              { kind: "link", key: "view", label: t("viewAsset"), href: assetHref, icon: <Eye aria-hidden="true" /> },
              { kind: "action", key: "notFound", label: t("markNotFound"), icon: <AlertTriangle aria-hidden="true" />, onSelect: () => notFoundRef.current?.open() },
            ],
          },
        ]}
        openerRef={openerRef}
      />
      <div data-no-row-click className="contents" onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
        <AuditMarkNotFoundButton ref={notFoundRef} itemId={itemId} hideTrigger returnFocusRef={openerRef} />
      </div>
    </>
  )
}
