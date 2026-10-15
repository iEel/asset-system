import Link from "next/link"
import type React from "react"
import { buttonVariants } from "@/components/ui/button-variants"
import { getMobileActionGridClass } from "@/lib/mobile-action-layout"
import { cn } from "@/lib/utils"

export type ActionBarLink = {
  label: string
  href: string
  icon?: React.ReactNode
  primary?: boolean
  disabled?: boolean
}

// The room a page leaves under its content for the bar, the iPhone home indicator included (spec 2C section 6.10,
// O11). A page puts one of these on its root next to <ActionBar>, so the bar and its room change together. The bar
// hides from md, and so does the room.
export const actionBarPagePadding = {
  single: "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0",
  withPrimary: "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0",
} as const

// The phone action bar of a detail page (K23): up to four links, or three under a full-width primaryAction (the next
// step of a disposal request). No directive and no hook, so the server pages render it. A link is the primary button
// only when it says so (primary); a disabled item stays a link to screen readers (role="link", aria-disabled, no href)
// and takes the shared aria-disabled look.
export function ActionBar({
  label,
  actions,
  primaryAction,
}: {
  label: string
  actions: readonly ActionBarLink[]
  primaryAction?: React.ReactNode
}) {
  const visibleActions = actions.slice(0, primaryAction ? 3 : 4)

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="action-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
    >
      <div className="mx-auto grid min-w-0 max-w-lg gap-2">
        {primaryAction ? <div className="min-w-0 [&>button]:w-full">{primaryAction}</div> : null}
        <div className={cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))}>
          {visibleActions.map((action) => {
            const className = cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2")
            return action.disabled ? (
              <a key={action.label} role="link" aria-disabled="true" className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </a>
            ) : (
              <Link key={action.label} href={action.href} className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
