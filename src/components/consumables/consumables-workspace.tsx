"use client"

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ConsumableAdjustDialog } from "@/components/consumables/consumable-adjust-dialog"
import { ConsumableIssueDialog } from "@/components/consumables/consumable-issue-dialog"
import { ConsumableKindDialog } from "@/components/consumables/consumable-kind-dialog"
import { ConsumableReceiveDialog } from "@/components/consumables/consumable-receive-dialog"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, dataTableRowClasses } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { useApiError } from "@/components/ui/use-api-error"
import { componentFocusAfterRemoval } from "@/lib/asset-component-links"
import type { ConsumableStockState } from "@/lib/consumable-rules"
import type { ConsumableUsageRow } from "@/lib/consumable-service"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// The list page's client part (consumables plan 2 Task 2): header, low banner, table from md, cards below md, row menus
// and the phone ActionBar. Every button that changes stock calls onAction(kind, item); Task 3 mounts its dialogs on it
// (a new key per opening, so each starts fresh), deactivates through the shared ConfirmDialog, and returns focus to
// openerRef. ดูประวัติ and the kind name open the kind's history page (Task 4).
export type ConsumableAction = "issue" | "receive" | "adjust" | "edit" | "deactivate" | "create"

const stateBadges: Record<ConsumableStockState, { key: "state_ok" | "state_low" | "state_out"; tone: StatusTone }> = {
  ok: { key: "state_ok", tone: "success" },
  low: { key: "state_low", tone: "warning" },
  out: { key: "state_out", tone: "danger" },
}

type Translate = ReturnType<typeof useTranslations<"consumablesPage">>

// The visible copy of a row's control: the table from md, the cards below it (both carry data-consumable-row).
function visibleInRow(root: HTMLElement | null, rowId: string, selector: string): HTMLElement | null {
  if (!root) return null
  for (const row of root.querySelectorAll<HTMLElement>(`[data-consumable-row="${CSS.escape(rowId)}"]`)) {
    const target = row.querySelector<HTMLElement>(selector)
    if (target && target.getClientRects().length > 0) return target
  }
  return null
}

// The last fallback: the page's h1, made focusable from script only.
function pageHeading(root: HTMLElement | null): HTMLElement | null {
  const heading = root?.querySelector<HTMLElement>("h1") ?? null
  if (heading) heading.tabIndex = -1
  return heading
}

// Focus fell to <body> because the refresh removed or disabled the control that opened the last action.
function openerLost(opener: HTMLElement | null): boolean {
  if (!opener) return false
  const activeElement = document.activeElement
  if (activeElement !== null && activeElement !== document.body) return false
  return !opener.isConnected || (opener instanceof HTMLButtonElement && opener.disabled)
}

const ROW_NAME = "[data-consumable-name]"
const ROW_MENU = "[data-consumable-actions] [aria-haspopup]"

export function ConsumablesWorkspace({
  locale,
  rows,
  lowRows,
  chips = [],
  canCreate,
  canEdit,
  tabs,
}: {
  locale: string
  // The kinds the list shows: all of them, or the low and out ones under ?state=low (plan 4).
  rows: ConsumableUsageRow[]
  // The banner's low and out kinds, always from the whole list.
  lowRows: ConsumableUsageRow[]
  // The list's filter chips (?state=low), under the tabs.
  chips?: FilterChipItem[]
  // consumable:create: เบิก and รับเข้า.
  canCreate: boolean
  // consumable:edit: ปรับยอด, เพิ่มชนิดของ, แก้ชื่อหรือขั้นต่ำ and ปิดใช้งาน.
  canEdit: boolean
  // The page's รายการ / เครื่องที่เปลี่ยนของบ่อย TabNav (plan 3 Task 3), under the header.
  tabs?: ReactNode
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  const tAsset = useTranslations("asset")
  // The control that opened the last dialog; Task 3's dialogs give focus back to it.
  const openerRef = useRef<HTMLElement | null>(null)
  const router = useRouter()
  const confirm = useConfirm()
  const apiError = useApiError()
  // The last action and its kind (item null: from the header, the ActionBar or the empty state). It stays while the
  // dialog closes, so the closing dialog keeps its title; dialogOpen says whether it is open, and opening counts each
  // opening, the dialogs' key.
  const [active, setActive] = useState<{ kind: ConsumableAction; item: ConsumableUsageRow | null } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [opening, setOpening] = useState(0)
  const closeDialog = () => setDialogOpen(false)
  // Focus after a refresh (as asset-component-manager.tsx's focusAfterRemovalRef): the page root for the lookups, the
  // add-a-kind button (+ เพิ่มชนิดของ or the empty state's), the row the last action came from, the ids before the
  // refresh, and the pending removal of a deactivated kind.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const createButtonRef = useRef<HTMLButtonElement | null>(null)
  const openerRowRef = useRef<string | null>(null)
  const knownIdsRef = useRef<string[]>(rows.map((row) => row.id))
  const focusAfterRemovalRef = useRef<{ removedId: string; order: string[] } | null>(null)
  // ปิดใช้งาน in flight, per kind: no second confirm or PATCH, and the row's ⋯ is busy until the refresh drops the row.
  const deactivatingRef = useRef<Set<string>>(new Set())
  const [deactivatingIds, setDeactivatingIds] = useState<ReadonlySet<string>>(() => new Set())
  const setDeactivating = (id: string, on: boolean) => {
    if (on) deactivatingRef.current.add(id)
    else deactivatingRef.current.delete(id)
    setDeactivatingIds(new Set(deactivatingRef.current))
  }

  useEffect(() => {
    const previousIds = knownIdsRef.current
    const currentIds = rows.map((row) => row.id)
    knownIdsRef.current = currentIds
    const current = new Set(currentIds)
    // A deactivated kind stays locked until the refresh drops its row.
    if ([...deactivatingRef.current].some((id) => !current.has(id))) {
      for (const id of [...deactivatingRef.current]) if (!current.has(id)) deactivatingRef.current.delete(id)
      setDeactivatingIds(new Set(deactivatingRef.current))
    }
    const root = rootRef.current
    const pending = focusAfterRemovalRef.current
    if (pending) {
      if (current.has(pending.removedId)) return
      focusAfterRemovalRef.current = null
      // The next row's name, else the previous one's, else + เพิ่มชนิดของ (the empty state's once the list is empty), else the h1.
      const order = pending.order.filter((id) => id === pending.removedId || current.has(id))
      const targetId = componentFocusAfterRemoval(order, pending.removedId)
      const target = (targetId ? visibleInRow(root, targetId, ROW_NAME) : null) ?? createButtonRef.current ?? pageHeading(root)
      target?.focus()
      return
    }
    if (!openerLost(openerRef.current)) return
    // เบิก of a row's last unit becomes a disabled button: the row's ⋯. The empty state's เพิ่มชนิดของ leaves with the
    // first kind: that kind's name, else + เพิ่มชนิดของ.
    const added = currentIds.filter((id) => !previousIds.includes(id))
    const rowId = openerRowRef.current
    const target =
      (rowId && current.has(rowId) ? visibleInRow(root, rowId, ROW_MENU) : null) ??
      (added.length === 1 ? visibleInRow(root, added[0], ROW_NAME) : null) ??
      createButtonRef.current ??
      pageHeading(root)
    target?.focus()
  }, [rows])

  function onAction(kind: ConsumableAction, item: ConsumableUsageRow | null) {
    if (kind === "deactivate") {
      if (item) void deactivate(item)
      return
    }
    openerRowRef.current = item?.id ?? null
    setOpening((count) => count + 1)
    setActive({ kind, item })
    setDialogOpen(true)
  }

  // ปิดใช้งาน: the shared ConfirmDialog, then PATCH { isActive: false }; on hand and the history stay.
  async function deactivate(item: ConsumableUsageRow) {
    if (deactivatingRef.current.has(item.id)) return
    const confirmed = await confirm({
      title: t("deactivateTitle", { name: item.name }),
      description: item.onHand > 0 ? t("deactivateBody", { onHand: item.onHand, unit: item.unit }) : t("deactivateBodyEmpty"),
      confirmLabel: t("deactivateConfirm"),
      tone: "destructive",
      returnFocusRef: openerRef,
    })
    if (!confirmed || deactivatingRef.current.has(item.id)) return
    setDeactivating(item.id, true)
    try {
      const response = await fetch(`/api/consumables/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? t("errorFallback"))
      focusAfterRemovalRef.current = { removedId: item.id, order: rows.map((row) => row.id) }
      toast.success(t("deactivateToast", { name: item.name }))
      router.refresh()
    } catch (error) {
      setDeactivating(item.id, false)
      apiError.toast(error)
    }
  }

  const detailHref = (id: string) => `/${locale}/consumables/${id}`

  const rowGroups = (row: ConsumableUsageRow): RowActionGroup[] => [
    {
      key: "stock",
      items: [
        ...(canCreate ? [{ kind: "action", key: "receive", label: t("menu_receive"), onSelect: () => onAction("receive", row) } as const] : []),
        ...(canEdit ? [{ kind: "action", key: "adjust", label: t("menu_adjust"), onSelect: () => onAction("adjust", row) } as const] : []),
        { kind: "link", key: "history", label: t("menu_history"), href: detailHref(row.id) },
      ],
    },
    {
      key: "kind",
      items: canEdit
        ? [
            { kind: "action", key: "edit", label: t("menu_edit"), onSelect: () => onAction("edit", row) },
            { kind: "action", key: "deactivate", label: t("menu_deactivate"), destructive: true, onSelect: () => onAction("deactivate", row) },
          ]
        : [],
    },
  ]

  const kindActions = (row: ConsumableUsageRow) => (
    <KindActions
      row={row}
      canCreate={canCreate}
      groups={rowGroups(row)}
      deactivating={deactivatingIds.has(row.id)}
      menuLabel={tCommon("moreActionsFor", { code: row.name })}
      openerRef={openerRef}
      onAction={onAction}
      t={t}
    />
  )

  return (
    <div ref={rootRef} className={cn("space-y-6", canCreate && actionBarPagePadding.single)}>
      <PageHeader
        title={t("title")}
        meta={<span>{t("cabinet")}</span>}
        actions={
          canCreate ? (
            <>
              <Button variant="outline" size="md" onClick={(event) => { openerRef.current = event.currentTarget; onAction("receive", null) }}>
                {t("receive")}
              </Button>
              <Button variant="default" size="md" className="max-md:hidden" onClick={(event) => { openerRef.current = event.currentTarget; onAction("issue", null) }}>
                {t("issue")}
              </Button>
            </>
          ) : null
        }
      />

      {tabs}

      <FilterChipList chips={chips} label={tAsset("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />

      {lowRows.length > 0 ? (
        <Notice tone="warning" role="status">
          {t("lowBanner", { count: lowRows.length, list: lowRows.map((row) => t("lowItem", { name: row.name, onHand: row.onHand })).join(", ") })}
        </Notice>
      ) : null}

      {rows.length === 0 && chips.length > 0 ? (
        <ContentPanel>
          <EmptyNote padded>{t("filterLowEmpty")}</EmptyNote>
        </ContentPanel>
      ) : rows.length === 0 ? (
        <ContentPanel>
          <ActionEmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={canEdit ? (
              <Button ref={createButtonRef} variant="default" size="md" onClick={(event) => { openerRef.current = event.currentTarget; onAction("create", null) }}>
                {t("emptyAction")}
              </Button>
            ) : undefined}
          />
        </ContentPanel>
      ) : (
        <ContentPanel divided flush>
          <DataTable framed={false} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("col_name")}</DataTableHead>
                <DataTableHead align="right">{t("col_onHand")}</DataTableHead>
                <DataTableHead align="right">{t("col_min")}</DataTableHead>
                <DataTableHead>{t("col_state")}</DataTableHead>
                <DataTableHead align="right">{t("col_used90")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((row) => (
                <tr key={row.id} data-consumable-row={row.id} className={dataTableRowClasses}>
                  <DataTableCell className="min-w-48">
                    <Link data-consumable-name href={detailHref(row.id)} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>
                      {row.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell numeric>{formatCount(row.onHand)} <span className="text-muted-foreground">{row.unit}</span></DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.minQuantity)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={t(stateBadges[row.state].key)} tone={stateBadges[row.state].tone} />
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.issued90)}</DataTableCell>
                  <DataTableCell align="right" sticky="right">{kindActions(row)}</DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>

          {/* Phone: one card per kind with the table's facts; เบิก and ⋯ sit on the card. */}
          <div data-consumables-cards className="grid gap-3 p-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} data-consumable-row={row.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link data-consumable-name href={detailHref(row.id)} className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center break-words text-base font-semibold")}>
                    {row.name}
                  </Link>
                  <StatusBadge className="mt-3" label={t(stateBadges[row.state].key)} tone={stateBadges[row.state].tone} />
                </div>
                <KeyValueList
                  className="mt-2"
                  items={[
                    { key: "onHand", label: t("col_onHand"), value: <span className="num">{formatCount(row.onHand)} {row.unit}</span> },
                    { key: "min", label: t("col_min"), value: <span className="num">{formatCount(row.minQuantity)}</span> },
                    { key: "used90", label: t("col_used90"), value: <span className="num">{formatCount(row.issued90)}</span> },
                  ]}
                />
                <div className="mt-3">{kindActions(row)}</div>
              </article>
            ))}
          </div>

          {canEdit ? (
            <div className="border-t border-border-soft px-4 py-3 md:px-5">
              <Button ref={createButtonRef} variant="ghost" size="sm" className="text-primary" onClick={(event) => { openerRef.current = event.currentTarget; onAction("create", null) }}>
                {t("addKind")}
              </Button>
            </div>
          ) : null}
        </ContentPanel>
      )}

      {canCreate ? (
        <ActionBar
          label={tCommon("actions")}
          actions={[]}
          primaryAction={
            <Button variant="default" size="md" onClick={(event) => { openerRef.current = event.currentTarget; onAction("issue", null) }}>
              {t("issue")}
            </Button>
          }
        />
      ) : null}

      {canCreate ? (
        <ConsumableIssueDialog
          key={`issue-${opening}`}
          open={dialogOpen && active?.kind === "issue"}
          items={rows}
          initialItemId={active?.item?.id}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
      {canCreate ? (
        <ConsumableReceiveDialog
          key={`receive-${opening}`}
          open={dialogOpen && active?.kind === "receive"}
          items={rows}
          initialItemId={active?.item?.id}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
      {canEdit && active?.kind === "adjust" && active.item ? (
        <ConsumableAdjustDialog key={`adjust-${opening}`} open={dialogOpen} item={active.item} returnFocusRef={openerRef} onClose={closeDialog} />
      ) : null}
      {canEdit ? (
        <ConsumableKindDialog
          key={`kind-${opening}`}
          open={dialogOpen && (active?.kind === "create" || active?.kind === "edit")}
          item={active?.kind === "edit" ? active.item : null}
          returnFocusRef={openerRef}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  )
}

// เบิก, then ⋯. With nothing on hand เบิก stays in place, disabled, and names the reason (ของหมด) beside it.
function KindActions({
  row,
  canCreate,
  groups,
  deactivating,
  menuLabel,
  openerRef,
  onAction,
  t,
}: {
  row: ConsumableUsageRow
  canCreate: boolean
  groups: RowActionGroup[]
  // ปิดใช้งาน of this kind is in flight: the ⋯ is busy.
  deactivating: boolean
  menuLabel: string
  openerRef: RefObject<HTMLElement | null>
  onAction: (kind: ConsumableAction, item: ConsumableUsageRow | null) => void
  t: Translate
}) {
  const reasonId = useId()
  const out = row.onHand === 0

  return (
    <div data-consumable-actions className="flex items-center justify-end gap-1">
      {canCreate ? (
        out ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Button variant="ghost" size="sm" disabled aria-describedby={reasonId} className="disabled:border-transparent disabled:bg-transparent">
              {t("issueShort")}
            </Button>
            <span id={reasonId} className="text-meta text-muted-foreground">{t("outReason")}</span>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary-hover"
            onClick={(event) => {
              openerRef.current = event.currentTarget
              onAction("issue", row)
            }}
          >
            {t("issueShort")}
            <span className="sr-only"> {row.name}</span>
          </Button>
        )
      ) : null}
      <RowActions code={row.name} menuLabel={menuLabel} groups={groups} openerRef={openerRef} busy={deactivating} />
    </div>
  )
}
