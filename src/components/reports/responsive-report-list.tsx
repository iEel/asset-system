import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ResponsiveReportColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  className?: string
  mobileClassName?: string
}

export function ResponsiveReportList<Row>({
  rows,
  rowKey,
  columns,
  emptyLabel,
}: {
  rows: Row[]
  rowKey: (row: Row) => string
  columns: ResponsiveReportColumn<Row>[]
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
  }

  return (
    <>
      <div data-report-desktop-table className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
