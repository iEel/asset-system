import Link from "next/link"
import { Plus, Search } from "lucide-react"

export function MasterDataHeader({
  title,
  subtitle,
  createHref,
  createLabel,
}: {
  title: string
  subtitle: string
  createHref: string
  createLabel: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Link
        href={createHref}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        {createLabel}
      </Link>
    </div>
  )
}

export function MasterDataSearch({
  action,
  defaultValue,
  placeholder,
  submitLabel,
}: {
  action: string
  defaultValue: string
  placeholder: string
  submitLabel: string
}) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <form className="flex flex-col gap-3 sm:flex-row" action={action}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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

export function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
      {label}
    </span>
  )
}
