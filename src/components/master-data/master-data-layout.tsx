import Link from "next/link"
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"

export function MasterDataHeader({
  title,
  subtitle,
  createHref,
  createLabel,
  actions,
  compactOnMobile = false,
}: {
  title: string
  subtitle: string
  createHref: string
  createLabel: string
  actions?: React.ReactNode
  compactOnMobile?: boolean
}) {
  // A thin wrapper of PageHeader (spec 2B I2, R-h): the 11 callers get the new header now, and each page plan
  // replaces its call with PageHeader. Plan 2B-5 deletes this function after the asset register (2B-3) moves.
  return (
    <PageHeader
      title={title}
      meta={subtitle}
      compactOnMobile={compactOnMobile}
      className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"}
      actions={
        <>
          {actions}
          <Link href={createHref} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {createLabel}
          </Link>
        </>
      }
    />
  )
}

export function MasterDataSearch({
  action,
  defaultValue,
  placeholder,
  submitLabel,
  hiddenInputs = {},
}: {
  action: string
  defaultValue: string
  placeholder: string
  submitLabel: string
  hiddenInputs?: Record<string, string | number>
}) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4">
      <form className="flex flex-col gap-3 sm:flex-row" action={action}>
        {Object.entries(hiddenInputs).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}

export function ColumnHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  )
}

export function SortableColumnHeader<TSort extends string>({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: TSort
  current: MasterDataListState<TSort>
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildMasterDataQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

export function MasterDataPagination<TSort extends string>({
  current,
  total,
  basePath,
  labels,
}: {
  current: MasterDataListState<TSort>
  total: number
  basePath: string
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildMasterDataQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {current.page} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildMasterDataQueryString(current, { page: previousPage })}`}
          aria-disabled={current.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildMasterDataQueryString(current, { page: nextPage })}`}
          aria-disabled={current.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

export function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success">
      {label}
    </span>
  )
}
