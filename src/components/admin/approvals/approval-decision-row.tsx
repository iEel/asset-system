"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type ApprovalDecisionRowData = {
  id: string
  // The decision chip's word (อนุมัติ, ปฏิเสธ, ปิดงาน, ดำเนินการ) and its tone.
  decisionLabel: string
  tone: StatusTone
  actorLabel: string
  // The logged action, already Thai (the shared presenter).
  actionLabel: string
  // The document number and the asset (name before tag); docNo null falls back to the record label.
  record: { docNo: string | null; assetName: string | null; assetTag: string | null }
  recordLabel: string
  // What the presenter's summary adds after the record.
  detail: string
  moduleLabel: string
  // The Bangkok time, "15:10" (the day is the group heading).
  time: string
  changes: { field: string; before: string; after: string }[]
  remark: string | null
  href: string | null
  openRecordLabel: string
}

export type ApprovalDecisionRowLabels = {
  viewDetails: string
  hideDetails: string
  field: string
  before: string
  after: string
  remark: string
}

// Group 12 plan 2 task 4 (spec §5, board AD-ApprovalHistory): one decision. The decision chip, then who did what to which
// document (the document number links to the record), the asset's name before its tag and what the summary adds, the
// module and the time; "ดูรายละเอียด" (aria-expanded) opens the Thai before/after table, the remark and the record's
// link. The detail stays in the DOM while closed (hidden), so aria-controls always points at it.
export function ApprovalDecisionRow({ row, labels }: { row: ApprovalDecisionRowData; labels: ApprovalDecisionRowLabels }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  const recordText = row.record.docNo ?? (row.record.assetName ? null : row.recordLabel !== "-" ? row.recordLabel : null)
  return (
    <li className={cn("min-w-0 px-4 py-3 md:px-5", open && "bg-background")}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 md:grid-cols-[6.5rem_minmax(0,1fr)_8rem_auto] md:gap-x-4">
        <div className="col-start-1 row-start-1 md:col-start-auto md:row-start-auto">
          <StatusBadge label={row.decisionLabel} tone={row.tone} />
        </div>
        <div className="col-span-2 row-start-2 min-w-0 break-words md:col-span-1 md:row-start-auto">
          <p className="text-foreground">
            {row.actorLabel} <span className="font-semibold">{row.actionLabel}</span>
            {recordText ? (
              <>
                {" "}
                {row.href ? (
                  <Link href={row.href} className={cn(linkVariants({ size: "inherit" }), "tag")}>
                    {recordText}
                  </Link>
                ) : (
                  <span className="tag">{recordText}</span>
                )}
              </>
            ) : null}
          </p>
          {row.record.assetName || row.detail ? (
            <p className="mt-0.5 text-meta text-muted-foreground">
              {row.record.assetName ? (
                <>
                  {row.record.assetName} <span className="tag">{row.record.assetTag}</span>
                </>
              ) : null}
              {row.record.assetName && row.detail ? " · " : null}
              {row.detail}
            </p>
          ) : null}
        </div>
        <div className="col-span-2 row-start-3 flex items-center gap-2 md:col-span-1 md:row-start-auto md:block md:space-y-1">
          <Chip>{row.moduleLabel}</Chip>
          <span className="block text-meta text-muted-foreground tabular-nums">{row.time}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((value) => !value)}
          className="col-start-2 row-start-1 justify-self-end text-primary aria-expanded:font-semibold md:col-start-auto md:row-start-auto"
        >
          {open ? labels.hideDetails : labels.viewDetails}
          <span className="sr-only"> {recordText ?? row.recordLabel}</span>
          <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </Button>
      </div>
      <div id={detailId} hidden={!open} className="mt-3 min-w-0 max-w-3xl space-y-2 md:ms-30">
        {row.changes.length > 0 ? (
          <DataTable caption={labels.viewDetails}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.field}</DataTableHead>
                <DataTableHead>{labels.before}</DataTableHead>
                <DataTableHead>{labels.after}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {row.changes.map((change, index) => (
                <DataTableRow key={`${row.id}-${change.field}-${index}`}>
                  <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                  <DataTableCell className="break-words text-muted-foreground">{change.before}</DataTableCell>
                  <DataTableCell className="break-words font-medium text-foreground">{change.after}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
        {row.remark || row.href ? (
          <p className="text-meta text-muted-foreground">
            {row.remark ? (
              <>
                <span className="font-medium text-foreground">{labels.remark}:</span> {row.remark}
              </>
            ) : null}
            {row.remark && row.href ? " · " : null}
            {row.href ? (
              <Link href={row.href} className={linkVariants({ size: "inherit" })}>
                {row.openRecordLabel}
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  )
}
