"use client"

import type React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { DataTableCell, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
import { linkVariants } from "@/components/ui/button-variants"
import { auditRoundResultBadge } from "@/lib/audit-round-page-rules"
import { getAssetStateTone } from "@/lib/design-system"
import type { InspectionPageRow } from "@/lib/inspection-confirm-page-model"
import type { InspectionTargetStatusName } from "@/lib/inspection-confirm-rules"
import { cn, formatDate } from "@/lib/utils"

export type InspectionRowProps = {
  locale: string
  /** The round: a finding link keeps it, so the findings list is this round's and its back link returns here. */
  roundId: string
  row: InspectionPageRow
  canConfirm: boolean
  statusLabels: Record<InspectionTargetStatusName, string>
  /** The tick (Task 3 wires the selection). Only rendered when canConfirm (the owner passes: ready tab and asset:edit). */
  tick?: React.ReactNode
  /** The id of the handoverUnclear text, which a disabled tick points at with aria-describedby. */
  unclearId?: string
  /** The damaged tab's buttons (plan 4 task 3): a last column on the table, a footer on the card. Undefined: no column. */
  actions?: React.ReactNode
}

/** The status a row would take: a not-found row becomes Missing (plan 2's data); otherwise the confirm target. */
function rowTarget(row: InspectionPageRow): InspectionTargetStatusName | null {
  return row.tab === "notFound" ? "Missing" : row.targetStatusName
}

function useRowParts({ locale, roundId, row, statusLabels, unclearId }: Pick<InspectionRowProps, "locale" | "roundId" | "row" | "statusLabels" | "unclearId">) {
  const t = useTranslations("inspectionConfirmPage")
  const tRound = useTranslations("auditRound")
  const badge = auditRoundResultBadge(row.auditStatus, row.auditResult)
  const target = rowTarget(row)
  const assetHref = `/${locale}/assets/${row.assetId}`
  const findingHref = row.tab === "awaitingReview" && row.firstPendingFindingId ? `/${locale}/audit/findings?status=pending&roundId=${roundId}&finding=${row.firstPendingFindingId}` : null

  const result = (
    <div className="space-y-1">
      <StatusBadge label={tRound(badge.labelKey)} tone={badge.tone} />
      {row.scannedAt || row.conditionNameTh ? (
        <div className="text-meta text-muted-foreground">
          {row.scannedAt ? <span>{formatDate(row.scannedAt)}</span> : null}
          {row.scannedAt && row.conditionNameTh ? <span> · </span> : null}
          {row.conditionNameTh ? <span>{row.conditionNameTh}</span> : null}
        </div>
      ) : null}
    </div>
  )
  const holder = row.custodianName ?? <span className="text-muted-foreground">{t("noHolder")}</span>
  // A row still waiting on a decision or a check has no target yet: the decision decides it (look step, plan 3).
  const targetCell = row.tab === "awaitingReview" || row.tab === "notScanned" ? (
    <Nil />
  ) : target ? (
    <StatusBadge label={statusLabels[target]} tone={getAssetStateTone(target)} />
  ) : (
    <span id={unclearId} className="text-warning text-pretty">{t("handoverUnclear")}</span>
  )
  const findingLink = findingHref ? (
    <Link href={findingHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
      {t("openFinding")}
    </Link>
  ) : null

  return { t, assetHref, result, holder, targetCell, findingLink }
}

/** The desktop row: tick (Task 3) · ครุภัณฑ์ · ผลตรวจนับ · ที่ตั้ง · ผู้ถือครอง · จะตั้งสถานะเป็น · the damaged tab's actions. */
export function InspectionTableRow({ locale, roundId, row, canConfirm, statusLabels, tick, unclearId, actions }: InspectionRowProps) {
  const { assetHref, result, holder, targetCell, findingLink } = useRowParts({ locale, roundId, row, statusLabels, unclearId })
  return (
    <DataTableRow>
      {canConfirm ? <DataTableCell className="w-10">{tick}</DataTableCell> : null}
      <DataTableCell className="min-w-56 text-foreground">
        <Link href={assetHref} className={linkVariants({ size: "inherit" })}>
          <span className="tag font-medium">{row.assetTag}</span>
        </Link>
        <div className="mt-0.5 text-foreground">{row.assetName}</div>
        {findingLink ? <div className="mt-1">{findingLink}</div> : null}
      </DataTableCell>
      <DataTableCell className="min-w-40">{result}</DataTableCell>
      <DataTableCell className="min-w-40 text-foreground">{row.locationName ?? <Nil />}</DataTableCell>
      <DataTableCell className="min-w-40 text-foreground">{holder}</DataTableCell>
      <DataTableCell className="min-w-48">{targetCell}</DataTableCell>
      {actions !== undefined ? <DataTableCell className="min-w-56">{actions}</DataTableCell> : null}
    </DataTableRow>
  )
}

/** The phone card: the same data, the same tick when the viewer can confirm. */
export function InspectionRowCard({ locale, roundId, row, canConfirm, statusLabels, tick, unclearId, actions }: InspectionRowProps) {
  const { t, assetHref, result, holder, targetCell, findingLink } = useRowParts({ locale, roundId, row, statusLabels, unclearId })
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-3">
      <div className="flex min-w-0 items-start gap-2">
        {canConfirm ? <div className="shrink-0">{tick}</div> : null}
        <div className="min-w-0 flex-1">
          <Link href={assetHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 min-w-0 items-center md:min-h-0")}>
            <span className="tag min-w-0 whitespace-normal break-all font-medium">{row.assetTag}</span>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-foreground">{row.assetName}</p>
        </div>
      </div>
      <KeyValueList
        className="mt-3"
        items={[
          { key: "result", label: t("col_result"), value: result },
          { key: "location", label: t("col_location"), value: row.locationName },
          { key: "holder", label: t("col_holder"), value: holder },
          { key: "target", label: t("col_target"), value: targetCell },
        ]}
      />
      {findingLink ? <div className="mt-2">{findingLink}</div> : null}
      {actions !== undefined ? <div className="mt-3">{actions}</div> : null}
    </article>
  )
}
