"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, dataTableCellClasses, dataTableRowClasses } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"

export type LogEventData = {
  id: string
  // formatDateTime, already Thai.
  time: string
  userLabel: string
  actionLabel: string
  // An asset's name and tag (the name comes first); null for other records.
  asset: { name: string; tag: string } | null
  // The record's label ("-" when there is none).
  recordLabel: string
  href: string | null
  // The summary after the record (system-log-row systemLogEventDetail).
  detail: string
  moduleLabel: string
  changes: { field: string; before: string; after: string }[]
  remark: string | null
  // An asset's page, for "เปิดหน้าทรัพย์สิน".
  assetHref: string | null
  expandLabel: string
  collapseLabel: string
}

export type LogEventLabels = {
  field: string
  before: string
  after: string
  remark: string
  changesCaption: string
  noChanges: string
  openAsset: string
}

// Spec §4 (board AD-Logs): one log as a table row of five columns (เวลา · ผู้ใช้ · เหตุการณ์ · โมดูล · expand). The
// arrow button (aria-expanded, aria-controls) opens a second row under it with the before/after table, the remark and,
// for assets, "เปิดหน้าทรัพย์สิน". The detail row stays in the DOM while closed (hidden), so aria-controls always points
// at it.
export function LogEventRow({ log, labels }: { log: LogEventData; labels: LogEventLabels }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  return (
    <>
      <DataTableRow>
        <DataTableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{log.time}</DataTableCell>
        <DataTableCell className="min-w-32 text-foreground">{log.userLabel}</DataTableCell>
        <DataTableCell className="min-w-72">
          <LogEventSentence log={log} clamp />
        </DataTableCell>
        <DataTableCell className="whitespace-nowrap">
          <Chip>{log.moduleLabel}</Chip>
        </DataTableCell>
        <DataTableCell align="right" className="w-12">
          <ExpandButton open={open} onToggle={() => setOpen((value) => !value)} controls={detailId} log={log} />
        </DataTableCell>
      </DataTableRow>
      <tr hidden={!open} className={dataTableRowClasses}>
        <td id={detailId} colSpan={5} className={cn(dataTableCellClasses, "bg-background")}>
          <LogEventDetails log={log} labels={labels} />
        </td>
      </tr>
    </>
  )
}

// Below md: the same parts as a card, and the arrow button stays.
export function LogEventCard({ log, labels }: { log: LogEventData; labels: LogEventLabels }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  return (
    <li className="min-w-0 rounded-lg border border-border bg-surface p-4">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-meta text-muted-foreground tabular-nums">
            {log.time} · <span className="text-foreground">{log.userLabel}</span>
          </p>
          <LogEventSentence log={log} clamp />
          <Chip>{log.moduleLabel}</Chip>
        </div>
        <ExpandButton open={open} onToggle={() => setOpen((value) => !value)} controls={detailId} log={log} />
      </div>
      <div id={detailId} hidden={!open} className="mt-3 border-t border-border-soft pt-3">
        <LogEventDetails log={log} labels={labels} />
      </div>
    </li>
  )
}

// One sentence: the action, then the record (an asset's name before its tag, linked when there is an href), then
// what the summary adds. In the list the summary is clamped to two lines (a create log's summary can run long); the
// expanded part shows it in full.
function LogEventSentence({ log, clamp = false }: { log: LogEventData; clamp?: boolean }) {
  const record = log.asset ? (
    <>
      {log.asset.name} <span className="tag">{log.asset.tag}</span>
    </>
  ) : log.recordLabel !== "-" ? (
    log.recordLabel
  ) : null
  return (
    <div className="min-w-0 break-words">
      <p className="text-foreground">
        <span className="font-semibold text-foreground">{log.actionLabel}</span>
        {record ? (
          <>
            {" "}
            {log.href ? (
              <Link href={log.href} className={linkVariants({ size: "inherit" })}>
                {record}
              </Link>
            ) : (
              record
            )}
          </>
        ) : null}
      </p>
      {log.detail ? <p className={cn("mt-0.5 text-muted-foreground", clamp && "line-clamp-2")}>{log.detail}</p> : null}
    </div>
  )
}

function ExpandButton({ open, onToggle, controls, log }: { open: boolean; onToggle: () => void; controls: string; log: LogEventData }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? log.collapseLabel : log.expandLabel}
      onClick={onToggle}
      className="aria-expanded:text-primary"
    >
      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
    </Button>
  )
}

function LogEventDetails({ log, labels }: { log: LogEventData; labels: LogEventLabels }) {
  return (
    <div className="min-w-0 space-y-2">
      {log.detail ? <p className="break-words text-foreground">{log.detail}</p> : null}
      {log.changes.length > 0 ? (
        <DataTable caption={labels.changesCaption}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{labels.field}</DataTableHead>
              <DataTableHead>{labels.before}</DataTableHead>
              <DataTableHead>{labels.after}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {log.changes.map((change, index) => (
              <DataTableRow key={`${log.id}-${change.field}-${index}`}>
                <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                <DataTableCell className="break-words text-muted-foreground">{change.before}</DataTableCell>
                <DataTableCell className="break-words text-foreground">{change.after}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      ) : (
        <p className="text-meta text-muted-foreground">{labels.noChanges}</p>
      )}
      {log.remark ? (
        <p className="text-meta text-muted-foreground">
          <span className="font-medium text-foreground">{labels.remark}:</span> {log.remark}
        </p>
      ) : null}
      {/* A stand-alone link: 44px tall below md (linkVariants' contract). */}
      {log.assetHref ? (
        <p className="text-meta">
          <Link href={log.assetHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
            {labels.openAsset}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
