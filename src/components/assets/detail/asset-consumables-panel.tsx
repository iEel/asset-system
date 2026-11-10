"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { ConsumableIssueDialog, type ConsumableDialogItem } from "@/components/consumables/consumable-issue-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import type { AssetConsumableIssue } from "@/lib/consumable-service"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

/** The issues the panel shows; the page reads this many (getAssetConsumableIssues' limit). */
export const ASSET_CONSUMABLES_LIMIT = 10

export type AssetConsumablesPanelProps = {
  locale: string
  assetId: string
  issues: AssetConsumableIssue[]
  total: number
  often: Array<{ itemId: string; itemName: string; count: number }>
  /** consumable:create and an asset that can take consumables (consumableIssueAssetError is null). */
  canRecord: boolean
  /** The active kinds for the dialog; read only when canRecord. */
  items: ConsumableDialogItem[]
  lockedAsset: { id: string; label: string }
}

const standaloneLink = cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")

// ของใช้สิ้นเปลือง plan 3 task 2: the machine's replacements on its overview, in the recent panel's shape (a desktop
// table, phone rows). The often notice names each kind changed CONSUMABLE_OFTEN_COUNT times within 90 days; "+ บันทึก
// เปลี่ยนของ" opens plan 2's issue dialog locked to this machine (it posts and refreshes the page). The page renders it
// only with consumable:view; empty, it hides from those who cannot record.
export function AssetConsumablesPanel({ locale, assetId, issues, total, often, canRecord, items, lockedAsset }: AssetConsumablesPanelProps) {
  const t = useTranslations("assetConsumables")
  const [open, setOpen] = useState(false)
  const [opening, setOpening] = useState(0)
  const openerRef = useRef<HTMLButtonElement | null>(null)

  if (issues.length === 0 && !canRecord) return null

  const quantity = (issue: AssetConsumableIssue) => (
    <span className="num">{formatCount(issue.quantity)} {issue.unit}</span>
  )

  return (
    <>
      <ContentPanel divided flush title={t("title")} actions={
          canRecord || total > 0 ? (
            <>
              {/* Plan 3 final review: the report over its widest window (365 days), with no count it could disagree with. */}
              {total > 0 ? (
                <Link href={`/${locale}/consumables?view=frequent&days=365&asset=${encodeURIComponent(assetId)}`} className={standaloneLink}>
                  {t("report")}
                </Link>
              ) : null}
              {canRecord ? (
                <Button
                  ref={openerRef}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpening((count) => count + 1)
                    setOpen(true)
                  }}
                >
                  {t("record")}
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      >
        {often.length > 0 ? (
          <div className="px-4 pt-4 md:px-5">
            <Notice tone="warning" data-slot="asset-consumables-often">
              <ul>
                {often.map((kind) => (
                  <li key={kind.itemId}>{t("often", { itemName: kind.itemName, count: kind.count })}</li>
                ))}
              </ul>
            </Notice>
          </div>
        ) : null}
        {issues.length === 0 ? (
          <EmptyNote padded>{t("empty")}</EmptyNote>
        ) : (
          <>
            <DataTable framed={false} className="hidden md:block" caption={t("title")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("col_date")}</DataTableHead>
                  <DataTableHead>{t("col_item")}</DataTableHead>
                  <DataTableHead>{t("col_qty")}</DataTableHead>
                  <DataTableHead>{t("col_by")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {issues.map((issue) => (
                  <DataTableRow key={issue.id}>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="num">{formatAssetDetailDate(issue.performedAt, locale)}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-48">
                      <span className="block font-medium text-foreground">{issue.itemName}</span>
                      {issue.note ? <span className="block break-words text-meta text-muted-foreground">{issue.note}</span> : null}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{quantity(issue)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{issue.performedByName ?? <Nil />}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <ContentPanelRows className="md:hidden">
              {issues.map((issue) => (
                <li key={issue.id} className="space-y-1">
                  <div className="text-meta text-faint-foreground">
                    <span className="num">{formatAssetDetailDate(issue.performedAt, locale)}</span> · {issue.performedByName ?? <Nil />}
                  </div>
                  <div className="break-words text-sm text-foreground">
                    <span className="font-medium">{issue.itemName}</span> · {quantity(issue)}
                  </div>
                  {issue.note ? <div className="break-words text-sm text-muted-foreground">{issue.note}</div> : null}
                </li>
              ))}
            </ContentPanelRows>
            {total > ASSET_CONSUMABLES_LIMIT ? (
              <p data-slot="asset-consumables-shown" className="px-4 py-3 text-meta text-muted-foreground md:px-5">{t("shown", { total })}</p>
            ) : null}
          </>
        )}
      </ContentPanel>
      {canRecord ? (
        <ConsumableIssueDialog
          key={`issue-${opening}`}
          open={open}
          items={items}
          lockedAsset={lockedAsset}
          returnFocusRef={openerRef}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
