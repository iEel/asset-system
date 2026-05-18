import Link from "next/link"
import type React from "react"

type ActionEmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
}

export function ActionEmptyState({ icon, title, description, actionHref, actionLabel }: ActionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
