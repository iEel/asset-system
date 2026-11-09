"use client"

import { useId, useRef, useState, type RefObject } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, dataTableRowClasses } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import type { ConsumableStockState } from "@/lib/consumable-rules"
import type { ConsumableUsageRow } from "@/lib/consumable-service"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// The list page's client part (consumables plan 2 Task 2): header, low banner, table from md, cards below md, row menus
// and the phone ActionBar. Every button that changes stock calls onAction(kind, item); Task 3 mounts its dialogs on it
// and returns focus to openerRef. ดูประวัติ and the kind name open the kind's history page (Task 4).
export type ConsumableAction = "issue" | "receive" | "adjust" | "edit" | "deactivate" | "create"

const stateBadges: Record<ConsumableStockState, { key: "state_ok" | "state_low" | "state_out"; tone: StatusTone }> = {
  ok: { key: "state_ok", tone: "success" },
  low: { key: "state_low", tone: "warning" },
  out: { key: "state_out", tone: "danger" },
}

type Translate = ReturnType<typeof useTranslations<"consumablesPage">>

export function ConsumablesWorkspace({
  locale,
  rows,
  canCreate,
  canEdit,
}: {
  locale: string
  rows: ConsumableUsageRow[]
  // consumable:create: เบิก and รับเข้า.
  canCreate: boolean
  // consumable:edit: ปรับยอด, เพิ่มชนิดของ, แก้ชื่อหรือขั้นต่ำ and ปิดใช้งาน.
  canEdit: boolean
}) {
  const t = useTranslations("consumablesPage")
  const tCommon = useTranslations("common")
  // The control that opened the last dialog; Task 3's dialogs give focus back to it.
  const openerRef = useRef<HTMLElement | null>(null)
  // The open action and its kind (null: from the header, the ActionBar or the empty state). Task 3 renders its dialogs
  // from this state; until then nothing opens.
  const [, setActive] = useState<{ kind: ConsumableAction; item: ConsumableUsageRow | null } | null>(null)

  function onAction(kind: ConsumableAction, item: ConsumableUsageRow | null) {
    setActive({ kind, item })
  }

  const detailHref = (id: string) => `/${locale}/consumables/${id}`
  const lowRows = rows.filter((row) => row.state !== "ok")

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
      menuLabel={tCommon("moreActionsFor", { code: row.name })}
      openerRef={openerRef}
      onAction={onAction}
      t={t}
    />
  )

  return (
    <div className={cn("space-y-6", canCreate && actionBarPagePadding.single)}>
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

      {lowRows.length > 0 ? (
        <Notice tone="warning" role="status">
          {t("lowBanner", { count: lowRows.length, list: lowRows.map((row) => t("lowItem", { name: row.name, onHand: row.onHand })).join(", ") })}
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <ContentPanel>
          <ActionEmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={canEdit ? (
              <Button variant="default" size="md" onClick={(event) => { openerRef.current = event.currentTarget; onAction("create", null) }}>
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
                <tr key={row.id} className={dataTableRowClasses}>
                  <DataTableCell className="min-w-48">
                    <Link href={detailHref(row.id)} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>
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
              <article key={row.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={detailHref(row.id)} className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center break-words text-base font-semibold")}>
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
              <Button variant="ghost" size="sm" className="text-primary" onClick={(event) => { openerRef.current = event.currentTarget; onAction("create", null) }}>
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
    </div>
  )
}

// เบิก, then ⋯. With nothing on hand เบิก stays in place, disabled, and names the reason (ของหมด) beside it.
function KindActions({
  row,
  canCreate,
  groups,
  menuLabel,
  openerRef,
  onAction,
  t,
}: {
  row: ConsumableUsageRow
  canCreate: boolean
  groups: RowActionGroup[]
  menuLabel: string
  openerRef: RefObject<HTMLElement | null>
  onAction: (kind: ConsumableAction, item: ConsumableUsageRow | null) => void
  t: Translate
}) {
  const reasonId = useId()
  const out = row.onHand === 0

  return (
    <div className="flex items-center justify-end gap-1">
      {canCreate ? (
        out ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Button variant="ghost" size="sm" disabled aria-describedby={reasonId}>
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
      <RowActions code={row.name} menuLabel={menuLabel} groups={groups} openerRef={openerRef} />
    </div>
  )
}
