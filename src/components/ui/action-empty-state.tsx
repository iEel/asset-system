import Link from "next/link"
import type React from "react"
import { AlertTriangle, Inbox, ShieldAlert } from "lucide-react"

type ActionEmptyStateTone = "empty" | "error" | "permission"

type ActionEmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
  action?: React.ReactNode
  details?: React.ReactNode
  tone?: ActionEmptyStateTone
}

const toneStyles: Record<ActionEmptyStateTone, { icon: React.ReactNode; iconClassName: string }> = {
  empty: { icon: <Inbox className="h-6 w-6" aria-hidden="true" />, iconClassName: "bg-muted text-muted-foreground" },
  error: { icon: <AlertTriangle className="h-6 w-6" aria-hidden="true" />, iconClassName: "bg-danger/10 text-danger" },
  permission: { icon: <ShieldAlert className="h-6 w-6" aria-hidden="true" />, iconClassName: "bg-warning/10 text-warning" },
}

export function ActionEmptyState({ icon, title, description, actionHref, actionLabel, action, details, tone = "empty" }: ActionEmptyStateProps) {
  const stateIcon = icon ?? toneStyles[tone].icon

  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${toneStyles[tone].iconClassName}`}>{stateIcon}</div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {details ? <div className="mt-4 max-w-md">{details}</div> : null}
      {action ?? (actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-9 sm:min-h-0"
        >
          {actionLabel}
        </Link>
      ) : null)}
    </div>
  )
}
