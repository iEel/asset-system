"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ConsumableAdjustDialog } from "@/components/consumables/consumable-adjust-dialog"
import { ConsumableIssueDialog } from "@/components/consumables/consumable-issue-dialog"
import { ConsumableKindDialog } from "@/components/consumables/consumable-kind-dialog"
import { ConsumableReceiveDialog } from "@/components/consumables/consumable-receive-dialog"
import { Button } from "@/components/ui/button"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import type { ConsumableStockState } from "@/lib/consumable-rules"
import type { ConsumableHistory } from "@/lib/consumable-service"

// The kind history page's header (consumables plan 2 Task 4): breadcrumbs, the count line with the state badge, the
// back link, and the list's actions on this one kind through Task 3's dialogs (a new key per opening, so each starts
// fresh; focus returns to the button that opened it). An inactive kind keeps its history readable: the badge
// ปิดใช้งานแล้ว and no action or dialog at all.
type HeaderAction = "issue" | "receive" | "adjust" | "edit"

const stateBadges: Record<ConsumableStockState, { key: "state_ok" | "state_low" | "state_out"; tone: StatusTone }> = {
  ok: { key: "state_ok", tone: "success" },
  low: { key: "state_low", tone: "warning" },
  out: { key: "state_out", tone: "danger" },
}

export function ConsumableHistoryHeader({
  locale,
  item,
  canCreate,
  canEdit,
}: {
  locale: string
  item: ConsumableHistory["item"]
  // consumable:create: เบิก and รับเข้า.
  canCreate: boolean
  // consumable:edit: ปรับยอด and แก้.
  canEdit: boolean
}) {
  const t = useTranslations("consumablesPage")
  const openerRef = useRef<HTMLElement | null>(null)
  const receiveRef = useRef<HTMLButtonElement | null>(null)
  const reasonId = useId()
  const [active, setActive] = useState<HeaderAction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [opening, setOpening] = useState(0)
  const closeDialog = () => setDialogOpen(false)

  const showCreate = item.isActive && canCreate
  const showEdit = item.isActive && canEdit
  const out = item.onHand === 0
  const listHref = `/${locale}/consumables`
  const dialogItems = [item]

  // Issuing the last unit disables เบิก after the refresh and the browser drops its focus: รับเข้า takes it (as the list's
  // focus after removal), only while focus is lost on <body>.
  useEffect(() => {
    const opener = openerRef.current
    if (!out || !(opener instanceof HTMLButtonElement) || !opener.disabled) return
    const activeElement = document.activeElement
    if (activeElement !== null && activeElement !== document.body && activeElement !== opener) return
    receiveRef.current?.focus()
  }, [out])

  function onOpen(kind: HeaderAction, opener: HTMLElement) {
    openerRef.current = opener
    setOpening((count) => count + 1)
    setActive(kind)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: listHref }, { label: item.name }]}
        title={item.name}
        meta={
          <>
            <span className="num">{t("detailMeta", { onHand: item.onHand, unit: item.unit, min: item.minQuantity })}</span>
            {item.isActive ? (
              <StatusBadge label={t(stateBadges[item.stockState].key)} tone={stateBadges[item.stockState].tone} />
            ) : (
              <StatusBadge label={t("inactiveBadge")} tone="muted" />
            )}
          </>
        }
        back={<PageBackLink href={listHref} label={t("backToList")} />}
        actions={
          showCreate || showEdit ? (
            <>
              {showEdit ? (
                <>
                  <Button variant="outline" size="md" onClick={(event) => onOpen("edit", event.currentTarget)}>
                    {t("editShort")}
                  </Button>
                  <Button variant="outline" size="md" onClick={(event) => onOpen("adjust", event.currentTarget)}>
                    {t("adjustShort")}
                  </Button>
                </>
              ) : null}
              {showCreate ? (
                <>
                  <Button ref={receiveRef} variant="outline" size="md" onClick={(event) => onOpen("receive", event.currentTarget)}>
                    {t("receive")}
                  </Button>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Button
                      variant="default"
                      size="md"
                      disabled={out}
                      aria-describedby={out ? reasonId : undefined}
                      onClick={(event) => onOpen("issue", event.currentTarget)}
                    >
                      {t("issueShort")}
                    </Button>
                    {out ? <span id={reasonId} className="text-meta text-muted-foreground">{t("outReason")}</span> : null}
                  </span>
                </>
              ) : null}
            </>
          ) : null
        }
      />

      {showCreate ? (
        <ConsumableIssueDialog
          key={`issue-${opening}`}
          open={dialogOpen && active === "issue"}
          items={dialogItems}
          initialItemId={item.id}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
      {showCreate ? (
        <ConsumableReceiveDialog
          key={`receive-${opening}`}
          open={dialogOpen && active === "receive"}
          items={dialogItems}
          initialItemId={item.id}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
      {showEdit && active === "adjust" ? (
        <ConsumableAdjustDialog key={`adjust-${opening}`} open={dialogOpen} item={item} returnFocusRef={openerRef} onClose={closeDialog} />
      ) : null}
      {showEdit ? (
        <ConsumableKindDialog
          key={`kind-${opening}`}
          open={dialogOpen && active === "edit"}
          item={item}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
    </>
  )
}
