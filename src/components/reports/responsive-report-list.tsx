import type { ReactNode } from "react"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { cn } from "@/lib/utils"

export type ResponsiveReportColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  className?: string
  mobileClassName?: string
  // A count or an amount: the head and the cell sit on the right, on one line, with tabular figures (spec 2B §5.7).
  numeric?: boolean
}

// Wide report rows (spec 2B §5.6): the shared DataTable from md, without a frame of its own because the panel around
// it is the frame, and two-column cards below md. caption names the table for screen readers (the panel's title).
export function ResponsiveReportList<Row>({
  rows,
  rowKey,
  columns,
  emptyLabel,
  caption,
}: {
  rows: Row[]
  rowKey: (row: Row) => string
  columns: ResponsiveReportColumn<Row>[]
  emptyLabel: string
  caption?: string
}) {
  if (rows.length === 0) {
    return <EmptyNote padded>{emptyLabel}</EmptyNote>
  }

  return (
    <>
      <DataTable data-report-desktop-table framed={false} caption={caption} className="hidden md:block">
        <DataTableHeader>
          <tr>
            {columns.map((column) => (
              <DataTableHead key={column.key} align={column.numeric ? "right" : "left"}>
                {column.label}
              </DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => (
            <DataTableRow key={rowKey(row)}>
              {columns.map((column) => (
                <DataTableCell key={column.key} numeric={column.numeric} className={column.className}>
                  {column.render(row)}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <div data-report-mobile-list className="grid gap-2 p-2 md:hidden">
        {rows.map((row) => (
          <article key={rowKey(row)} className="min-w-0 rounded-md border border-border bg-surface p-3">
            <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
              {columns.map((column) => (
                <div key={column.key} className={cn("min-w-0", column.mobileClassName)}>
                  <dt className="text-xs font-medium leading-4 text-muted-foreground">{column.label}</dt>
                  <dd className="mt-0.5 min-w-0 break-words text-sm leading-5 text-foreground">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}
