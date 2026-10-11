import Link from "next/link"
import type React from "react"
import { Inbox, ShieldAlert } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"
import { toneIcons } from "@/components/ui/tone-icons"

type ActionEmptyStateTone = "empty" | "error" | "permission"

type ActionEmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
  /** "secondary" draws the outlined button (for example "clear filters"), keeping the primary color for the page's main task. */
  actionVariant?: "primary" | "secondary"
  action?: React.ReactNode
  details?: React.ReactNode
  tone?: ActionEmptyStateTone
}

const DangerIcon = toneIcons.danger

// No frame and no fill, so the empty state never becomes a box inside its panel or table. A 24px icon carries the tone:
// faint for empty, red for an error, orange for a missing permission.
const toneStyles: Record<ActionEmptyStateTone, { icon: React.ReactNode; iconClassName: string }> = {
  empty: { icon: <Inbox />, iconClassName: "text-faint-foreground" },
  error: { icon: <DangerIcon />, iconClassName: "text-danger" },
  permission: { icon: <ShieldAlert />, iconClassName: "text-warning" },
}

export function ActionEmptyState({ icon, title, description, actionHref, actionLabel, actionVariant = "primary", action, details, tone = "empty" }: ActionEmptyStateProps) {
  const stateIcon = icon ?? toneStyles[tone].icon
  const actionNode = action ?? (actionHref && actionLabel ? (
    <Link href={actionHref} className={buttonVariants({ variant: actionVariant === "secondary" ? "outline" : "default", size: "md" })}>
      {actionLabel}
    </Link>
  ) : null)

  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div aria-hidden="true" className={`mb-3 flex [&>svg]:size-6 ${toneStyles[tone].iconClassName}`}>{stateIcon}</div>
      <div className="text-base font-semibold text-foreground text-balance">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">{description}</p> : null}
      {details ? <div className="mt-4 max-w-md">{details}</div> : null}
      {actionNode ? <div className="mt-4">{actionNode}</div> : null}
    </div>
  )
}
