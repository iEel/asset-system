import Link from "next/link"
import type React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTableScrollArea } from "@/components/ui/data-table-scroll"
import { EmptyNote } from "@/components/ui/empty-note"
import { cn } from "@/lib/utils"

// The shared list table (spec 2B §3.4, mockup .table-wrap): a 12px white frame, a white 13/500 faint header in
// sentence case, soft row lines and p-3 cells (rows about 46px). One density only (spec I3): the asset register keeps
// its compact rows in its own file. The first and last columns get 16px gutters (20px from md) through first:/last:,
// which a plain class on a cell cannot override. Server-safe: no directive, no hooks, no context (R-j); the scroll
// hint is the one client leaf (DataTableScrollArea).
// For the tables that cannot move whole yet (R-e), the three class strings below are exported.
export const dataTableHeadClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5"
export const dataTableCellClasses = "border-b border-border-soft p-3 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5"
// "Instant on, soft off": the fill appears at once on hover or focus and fades out in 150ms. The row stays lit while a
// menu or popover it opened is open, because focus then sits in a portal outside the row.
export const dataTableRowClasses = "group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover"

const dataTableFrameClasses = "min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface"
const dataTableSortLinkClasses = "inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:-my-2.5 md:min-h-0"
// A pinned column draws a line on its inner edge, with no shadow (R-j). The cells set the side's color only, so cn()
// keeps the soft row line under them.
const dataTableStickyHeadClasses = {
  left: "sticky left-0 z-30 border-r border-border",
  right: "sticky right-0 z-30 border-l border-border",
} as const
const dataTableStickyCellClasses = {
  left: "sticky left-0 z-20 border-r border-r-border bg-surface transition-colors group-hover/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:bg-row-hover group-focus-within/row:duration-0 group-has-[[aria-expanded=true]]/row:bg-row-hover",
  right: "sticky right-0 z-20 border-l border-l-border bg-surface transition-colors group-hover/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:bg-row-hover group-focus-within/row:duration-0 group-has-[[aria-expanded=true]]/row:bg-row-hover",
} as const

export type DataTableProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** <colgroup>, <DataTableHeader> and <DataTableBody>. */
  children: React.ReactNode
  /** The table's name for screen readers (a visually hidden <caption>); also names the scroll region. */
  caption?: string
  /** Default true. false: no frame of its own, for a table inside a panel that already has one. */
  framed?: boolean
  /** "fixed" adds table-fixed for tables that set their widths in a <colgroup>. */
  layout?: "auto" | "fixed"
  /** In px, on the <table>. */
  minWidth?: number
  /** Shown above the table only while it overflows (B6), through DataTableScrollArea. */
  scrollHint?: string
  /** The content of DataTableFoot: a <Pagination> or a range line. */
  footer?: React.ReactNode
}

export function DataTable({ children, caption, framed = true, layout = "auto", minWidth, scrollHint, footer, className, ...props }: DataTableProps) {
  const table = (
    <table className={cn("w-full text-sm", layout === "fixed" && "table-fixed")} style={minWidth ? { minWidth } : undefined}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  )

  return (
    <div data-slot="data-table" className={cn(framed ? dataTableFrameClasses : "min-w-0 max-w-full", className)} {...props}>
      {scrollHint ? (
        <DataTableScrollArea hint={scrollHint} label={caption}>
          {table}
        </DataTableScrollArea>
      ) : (
        <div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">
          {table}
        </div>
      )}
      {footer ? <DataTableFoot>{footer}</DataTableFoot> : null}
    </div>
  )
}

// No fill: the header cells bring their white background (so R7 has nothing to count here).
export function DataTableHeader(props: React.ComponentProps<"thead">) {
  return <thead data-slot="data-table-header" {...props} />
}

export function DataTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="data-table-body" className={cn("[&>tr:last-child>td]:border-b-0", className)} {...props} />
}

export type DataTableSort = {
  href: string
  /** null: the column can be sorted but is not the sorted one now. */
  direction: "asc" | "desc" | null
  scroll?: boolean
}

export type DataTableHeadProps = Omit<React.ComponentProps<"th">, "scope"> & {
  align?: "left" | "right"
  sort?: DataTableSort
  sticky?: "left" | "right"
  /** The name stays for screen readers but is not shown, for example tCommon("actions") over a button column. */
  hideLabel?: boolean
}

// aria-sort only on the sorted column, and an arrow only there. The sort link is 44px tall on phones; max-md:-my-2.5
// takes the header's own padding back, so the header row stays 44 and does not grow to 64.
export function DataTableHead({ align = "left", sort, sticky, hideLabel = false, className, children, ...props }: DataTableHeadProps) {
  const direction = sort?.direction ?? null
  const label = hideLabel ? <span className="sr-only">{children}</span> : children

  return (
    <th
      data-slot="data-table-head"
      {...props}
      scope="col"
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}
      className={cn(dataTableHeadClasses, align === "right" && "text-right", sticky && dataTableStickyHeadClasses[sticky], className)}
    >
      {sort ? (
        <Link href={sort.href} scroll={sort.scroll} className={cn(dataTableSortLinkClasses, direction && "text-foreground")}>
          {hideLabel ? label : <span className="truncate">{children}</span>}
          {direction === "asc" ? <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          {direction === "desc" ? <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        </Link>
      ) : label}
    </th>
  )
}

export function DataTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="data-table-row" className={cn(dataTableRowClasses, className)} {...props} />
}

export type DataTableCellProps = React.ComponentProps<"td"> & {
  align?: "left" | "right"
  /** Right-aligned, on one line, with tabular figures (num). */
  numeric?: boolean
  sticky?: "left" | "right"
}

export function DataTableCell({ align = "left", numeric = false, sticky, className, ...props }: DataTableCellProps) {
  return (
    <td
      data-slot="data-table-cell"
      className={cn(
        dataTableCellClasses,
        align === "right" && "text-right",
        numeric && "text-right whitespace-nowrap num",
        sticky && dataTableStickyCellClasses[sticky],
        className,
      )}
      {...props}
    />
  )
}

// The table foot (mockup .table-foot): the place for <Pagination> or a range line.
export function DataTableFoot({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="data-table-foot" className={cn("border-t border-border bg-surface px-4 py-2.5 text-meta text-muted-foreground num md:px-5", className)} {...props} />
}

export type TableEmptyRowProps = { colSpan: number } & (
  | { children: React.ReactNode; tone?: "empty" | "clear"; emptyState?: never }
  | { emptyState: React.ComponentProps<typeof ActionEmptyState>; children?: never; tone?: never }
)

// The one empty row: a one-line note, or an ActionEmptyState when there is a title, a description or a button
// (clear filters as actionVariant "secondary"). No hover fill and no live region: the page reloads as a whole.
export function TableEmptyRow({ colSpan, ...content }: TableEmptyRowProps) {
  return (
    <tr data-slot="table-empty-row">
      <td colSpan={colSpan} className="p-0">
        {content.emptyState ? <ActionEmptyState {...content.emptyState} /> : <EmptyNote padded tone={content.tone}>{content.children}</EmptyNote>}
      </td>
    </tr>
  )
}
